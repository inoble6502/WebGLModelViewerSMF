var canvas, gl, program;
var vertices = [];
var faces = [];
var norms = [];
var colors = [];
var indices = [];
var points = [];

var near = 0.3;
var far = 1;
var radius = 5.55e-17;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var  fovy = 145.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect = 1.0;       // Viewport aspect ratio

var orthLeft = -1.0;
var orthRight = 1.0;
var orthYtop = 1.0;
var orthBottom = -1.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var ambientColor, diffuseColor, specularColor;

var projSwitch = 0; //0 - ortho, 1 - perspective
var loaded = 0;
var incrVal = 0.2;

window.onload = function init() {
	glSetup();

	//load .smf data into arrays once a file has been chosen
	document.getElementById('file').onchange = function() {
		loaded = 0;
		//reset all data each time file is loaded
		vertices = [];
		faces = [];
		norms = [];
		colors = [];
		points = [];
		indices = [];
		
		resetProjValues();
		
		var file = this.files[0]; //ensure only one file is read

		var reader = new FileReader();
		reader.onload = function(progressEvent) {
			// Entire file
			//console.log(this.result);

			// By lines
			var lines = this.result.split('\n');
			for (var line = 0; line < lines.length; line++) {
				//console.log(lines[line]);
				var parts = lines[line].trimRight().split(' '); //split each line up into an array
				//push to vertices and faces arrays their respective values
				if ( parts.length > 0 ) {
					if(parts[0] == 'v'){
						vertices.push(vec3(parseFloat(parts[1])/1, parseFloat(parts[2])/1,parseFloat(parts[3])/1));
					} else if (parts[0] == 'f'){
						faces.push([parseInt(parts[1]),parseInt(parts[2]),parseInt(parts[3])]);
					}
				}
			}
			
			colorCube();
			
			//colors
			var clrBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, clrBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
			var vColor = gl.getAttribLocation(program, "vColor");
			gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vColor);

			//vert
			var vtBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vtBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
			var vPosition = gl.getAttribLocation(program, "vPosition");
			gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vPosition);
			loaded = 1;
		};
		reader.readAsText(file);
	};
	
	//key listeners
	window.onkeydown = function(event) {
		var key = String.fromCharCode(event.keyCode);
		switch (key) {
			case 'I': //increase camera radius
				radius += incrVal;
				break;
			case 'O': //decrease camera radius
				radius -= incrVal;
				break;
			case 'J': //increase height
				theta += incrVal;
				break;
			case 'K': //decrease height
				theta -= incrVal;
				break;
			case 'N': //Rotate left
				phi -= incrVal;
				break;
			case 'M': //Rotate right
				phi += incrVal;
				break;
			case 'R': //reset all values
				resetProjValues();
				break;
		}
	};

	modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

	render();
}

function resetProjValues() {
	//resets all values upon switchin projection types
	near = -1;
	far = 1;
	radius = 5.55e-17;
    theta  = 0.0;
	phi    = 0.0;
	dr = 5.0 * Math.PI/180.0;

	fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
	aspect = 1.0;       // Viewport aspect ratio

	orthLeft = -1.0;
	orthRight = 1.0;
	orthYtop = 1.0;
	orthBottom = -1.0;
}

function glSetup() {
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		alert("WebGL isn't available");
	}

	gl.viewport(0, 0, canvas.width, canvas.height);
	
	//aspect =  canvas.width/canvas.height;
	
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	
	gl.enable(gl.DEPTH_TEST);

	//load shaders and init attr. buffers
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);
}

function colorCube() {
	for(var i = 0; i < faces.length; ++i){
		tri(faces[i][0] - 1, faces[i][1] - 1, faces[i][2] - 1);
	}
}

function tri(a, b, c) {
	//calculate surface normals in this function
	indices = [a, b, c];
	
	points.push(vertices[a]);
	points.push(vertices[b]);
	points.push(vertices[c]);
	
	//x - 0, y - 1, z - 2
	var u, v, normal;
	var normX, normY, normZ;
	u = [vertices[b][0] - vertices[a][0], vertices[b][1] - vertices[a][1], vertices[b][2] - vertices[a][2]];
	v = [vertices[c][0] - vertices[a][0], vertices[c][1] - vertices[a][1], vertices[c][2] - vertices[a][2]];
	
	normX = (u[1] * v[2]) - (u[2] * v[1]);
	normY = (u[2] * v[0]) - (u[0] * v[2]);
	normZ = (u[0] * v[1]) - (u[1] * v[0]);
	normal = normalize(vec3(normX, normY, normZ));
	
	var clrVec = vec3(Math.abs(normal[0]),Math.abs(normal[1]),Math.abs(normal[2]));
	colors.push(clrVec);
	colors.push(clrVec);
	colors.push(clrVec);
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta), radius*Math.cos(phi));
	modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(orthLeft, orthRight, orthBottom, orthYtop, near, far);

	gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

	if(loaded == 1){ //prevent drawing non-existent
		gl.drawArrays(gl.TRIANGLES, 0, points.length);
	}
	
	window.requestAnimFrame(render);
}