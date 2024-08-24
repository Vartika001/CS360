var gl;
var color;
var animation;
var degree0 = 0;
var degree1 = 0;
var offset = 0;
var direction = 1;
var currentView = "Point";
var matrixStack = [];

var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleBuf;
var circleIndexBuf;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 3.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
}


function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function fragmentShaderSetup(fragShaderCode) {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, fragShaderCode);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders() {
    shaderProgram = gl.createProgram();

    var vertexShader = vertexShaderSetup(vertexShaderCode);
    var fragmentShader = fragmentShaderSetup(fragShaderCode);

    // attach the shaders
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //link the shader program
    gl.linkProgram(shaderProgram);

    // check for compilation and linking status
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log(gl.getShaderInfoLog(vertexShader));
        console.log(gl.getShaderInfoLog(fragmentShader));
    }

    //finally use the program.
    gl.useProgram(shaderProgram);

    return shaderProgram;
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl2"); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
}

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([
        0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.vertexAttribPointer(
        aPositionLocation,
        sqVertexPositionBuffer.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

    gl.uniform4fv(uColorLoc, color);

    // now draw the square
    if (currentView === "Point") {
        // Draw points view
        gl.drawElements(
            gl.POINTS,
            sqVertexIndexBuffer.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    } else if (currentView === "Wireframe") {
        // Draw wireframe view
        gl.drawElements(
            gl.LINE_LOOP,
            sqVertexIndexBuffer.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    } else if (currentView === "Solid") {
        // Draw solid view
        gl.drawElements(
            gl.TRIANGLE_STRIP,
            sqVertexIndexBuffer.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    }
}

function initTriangleBuffer() {
    // buffer for point locations
    const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
    triangleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    triangleBuf.itemSize = 2;
    triangleBuf.numItems = 3;

    // buffer for point indices
    const triangleIndices = new Uint16Array([0, 1, 2]);
    triangleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
    triangleIndexBuf.itemsize = 1;
    triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // buffer for point locations
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        triangleBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // buffer for point indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

    gl.uniform4fv(uColorLoc, color);

    // now draw the Triangle

    if (currentView === "Point") {
        // Draw points view
        gl.drawElements(gl.POINTS, triangleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (currentView === "Wireframe") {
        // Draw wireframe view
        gl.drawElements(
            gl.LINE_LOOP,
            triangleIndexBuf.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    } else if (currentView === "Solid") {
        // Draw solid view
        gl.drawElements(
            gl.TRIANGLE_STRIP,
            triangleIndexBuf.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

function initCircleBuffer() {
    // Initialize circle vertex buffer
    const circleVertices = [];
    for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * 2 * Math.PI;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        circleVertices.push(x, y);
    }

    // Create a buffer for the circle vertex positions
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(circleVertices),
        gl.STATIC_DRAW
    );
    circleBuf.itemSize = 2;
    circleBuf.numItems = 50;

    // Create a buffer for circle indices (fan arrangement)
    const circleIndices = [];
    for (let i = 1; i < 50 - 1; i++) {
        circleIndices.push(0, i, i + 1);
    }
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(circleIndices),
        gl.STATIC_DRAW
    );
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = circleIndices.length;
}

function drawCircle(color, mMatrix) {
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

    // Bind the circle vertex buffer and set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionLocation);

    // Bind the circle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);

    // Set the circle color
    gl.uniform4fv(uColorLoc, color);

    // Draw the cicle
    if (currentView === "Point") {
        // Draw points view
        gl.drawElements(gl.POINTS, circleIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    } else if (currentView === "Wireframe") {
        // Draw wireframe view
        gl.drawElements(
            gl.LINE_LOOP,
            circleIndexBuf.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    } else if (currentView === "Solid") {
        // Draw solid view
        gl.drawElements(
            gl.TRIANGLE_STRIP,
            circleIndexBuf.numItems,
            gl.UNSIGNED_SHORT,
            0
        );
    }
}

////////////////////////////////////////
function drawMountain(mMatrix) {
    mMatrix = mat4.scale(mMatrix, [2.0, 0.5, 1.0]);
    color = [0.50196, 0.27451, 0.10588, 1.0];
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.09, 0.01, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(10), [0.0, 0.0, 1.0]);
    color = [0.6118, 0.4392, 0.2431, 1.0];
    drawTriangle(color, mMatrix);
}
//////////////////////////////////////////
function drawTree(mMatrix) {
    color = [0.5451, 0.27059, 0.07451, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.04, 0.3, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.7, 0]);
    mMatrix = mat4.scale(mMatrix, [8, 1, 1.0]);
    color = [0.0, 0.4, 0.2, 1.0];
    drawTriangle(color, mMatrix);
    color = [0.0, 0.6, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0, 0.1, 0]);
    mMatrix = mat4.scale(mMatrix, [1.1, 1, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0, 0.1, 0]);
    mMatrix = mat4.scale(mMatrix, [1.1, 1, 1.0]);
    color = [0.2, 1.0, 0.2, 1.0];
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    pushMatrix(matrixStack, mMatrix);
}

function drawBird(mMatrix) {
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.09, 0.14, 1.0]);
    pushMatrix(matrixStack, mMatrix);
    drawSquare(color, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [3.0, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [7.0, 0.5, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-3.0, 0.5, 0]);
    mMatrix = mat4.scale(mMatrix, [7.0, 0.5, 1.0]);
    drawTriangle(color, mMatrix);
}

function drawCloud(mMatrix) {
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.25, 0.13, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [1.2, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [1.2, -0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [0.75, 0.75, 1.0]);
    drawCircle(color, mMatrix);
}

function drawBush(mMatrix) {
    color = [0.0, 0.4, 0.2, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.15, 0.12, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-2.7, 0.0, 0]);
    mMatrix = mat4.scale(mMatrix, [1.0, 1.0, 1.0]);
    color = [0.1098, 0.6902, 0.2863, 1.0];
    drawCircle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [1.3, 0.15, 0]);
    mMatrix = mat4.scale(mMatrix, [1.25, 1.25, 1.0]);
    color = [0.0902, 0.5725, 0.2353, 1.0];
    drawCircle(color, mMatrix);
}

function drawCar(mMatrix) {
    pushMatrix(matrixStack, mMatrix);
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.25, 0.0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.15, 0.15, 1.0]);
    pushMatrix(matrixStack, mMatrix);
    drawCircle(color, mMatrix);
    color = [0.3765, 0.3765, 0.3765, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.translate(mMatrix, [-5.0, 0.0, 0]);
    color = [0.0, 0.0, 0.0, 1.0];
    drawCircle(color, mMatrix);
    pushMatrix(matrixStack, mMatrix);
    drawCircle(color, mMatrix);
    color = [0.3765, 0.3765, 0.3765, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = popMatrix(matrixStack);
    pushMatrix(matrixStack, mMatrix);
    color = [0.5843, 0.1529, 0.1529, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.12, 0.4, 0]);
    mMatrix = mMatrix = mat4.scale(mMatrix, [0.48, 0.28, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-1.0, 0.0, 0]);
    drawTriangle(color, mMatrix);
    color = [0.2941, 0.498, 0.6039, 1.0];
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.translate(mMatrix, [-0.12, 0.2, 0]);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mMatrix = mat4.scale(mMatrix, [1.1, 0.28, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.translate(mMatrix, [0.55, 0.0, 0]);
    mMatrix = mMatrix = mat4.scale(mMatrix, [0.48, 0.28, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-2.29, 0.0, 0]);
    drawTriangle(color, mMatrix);
}

function drawHouse(mMatrix) {
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mMatrix = mat4.scale(mMatrix, [0.8, 0.5, 1.0]);
    drawSquare(color, mMatrix);
    color = [1.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
    mMatrix = mMatrix = mat4.scale(mMatrix, [0.7, 0.8, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-1.0, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [0.5, -1.075, 0]);
    mMatrix = mMatrix = mat4.scale(mMatrix, [0.2, 0.6, 1.0]);
    color = [0.8549, 0.6471, 0.1255, 1.0];
    drawSquare(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [2.3, 0.5, 0]);
    mMatrix = mMatrix = mat4.scale(mMatrix, [1.0, 0.45, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = mat4.translate(mMatrix, [-4.6, 0.0, 0]);
    drawSquare(color, mMatrix);
}

function drawWindPoll(mMatrix) {
    color = [0.0, 0.0, 0.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [0.7, -0.2, 0]);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.45, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.translate(mMatrix, [-1.1, 0.0, 0]);
    mMatrix = mat4.scale(mMatrix, [0.03, 0.45, 1.0]);
    drawSquare(color, mMatrix);
}

function drawWindblades(mMatrix) {
    for (let i = 0; i < 4; i++) {
        mMatrix = mat4.rotate(mMatrix, degToRad(90 * i), [0.0, 0.0, 1.0]);
        pushMatrix(matrixStack, mMatrix);

        mMatrix = mat4.scale(mMatrix, [0.05, 0.4, 1.0]);
        color = [0.6, 0.6196, 0.0863, 1.0];
        drawTriangle(color, mMatrix);

        mMatrix = popMatrix(matrixStack);
    }
}

function drawSun(mMatrix) {
    color = [1.0, 1.0, 0.2, 1.0];
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 0.0]);
    drawCircle(color, mMatrix);
    for (let i = 0; i < 8; i++) {
        mMatrix = mat4.rotate(mMatrix, degToRad(45 * i), [0.0, 0.0, 1.0]);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.scale(mMatrix, [0.09, 3.0, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
    }
}

function drawBoat(mMatrix) {
    color = [0.0, 0.0, 0.0, 1.0];
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [0.01, 0.5, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.translate(mMatrix, [0.12, 0.0, 0]);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.02, 0.5, 0.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.rotate(mMatrix, degToRad(27), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.1, 0.03, 0]);
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.0]);
    color = [1.0, 0.0, 0.0, 1.0];
    drawTriangle(color, mMatrix);
    color = [1.0, 1.0, 1.0, 1.0];
    mMatrix = mat4.translate(mMatrix, [-0.9, -0.8, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-27), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [1.0, 0.5, 0.0]);
    drawSquare(color, mMatrix);
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [0.5, 0.0, 0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.rotate(mMatrix, degToRad(-180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-0.5, 0.0, 0]);
    drawTriangle(color, mMatrix);
}
////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    // stop the current loop of animation
    if (animation) {
        window.cancelAnimationFrame(animation);
    }
    var animate = function() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // initialize the model matrix to identity matrix
        mat4.identity(mMatrix);

        degree0 += 1.0;
        degree1 -= 2.0;
        if (offset <= -0.8 || offset >= 0.8) {
            direction = -1 * direction;
        }
        offset += direction * 0.002;

        //draw square
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0.0]);
        mMatrix = mat4.scale(mMatrix, [2, 1.0, 0.25]);

        pushMatrix(matrixStack, mMatrix);
        color = [0.529, 0.808, 0.922, 1.0];
        drawSquare(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix); //unit matrix
        //Mountains
        mMatrix = mat4.translate(mMatrix, [-0.75, 0.01, 0]);
        mMatrix = mat4.scale(mMatrix, [0.6, 0.5, 1.0]);
        drawMountain(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        drawMountain(mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.35, 0.0, 0]);
        mMatrix = mat4.scale(mMatrix, [0.5, 0.35, 1.0]);
        color = [0.6118, 0.4392, 0.2431, 1.0];
        drawTriangle(color, mMatrix);

        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix); //unitmatrix
        mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
        mMatrix = mat4.scale(mMatrix, [2, 1.0, 0.25]);
        pushMatrix(matrixStack, mMatrix); //chnaged matrix1
        // mMatrix = mat4.translate(mMatrix, [0.0, -1.0, 0]);
        color = [0.565, 0.933, 0.565, 1.0];
        drawSquare(color, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.25, -0.15, 0]);
        mMatrix = mat4.scale(mMatrix, [1.0, 1.5, 0]);
        mMatrix = mat4.rotate(mMatrix, degToRad(50), [0.0, 0.0, 1.0]);
        color = [0.4902, 0.6902, 0.1373, 1.0];
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = mat4.translate(mMatrix, [0.0, 0.35, 0.0]);
        mMatrix = mat4.scale(mMatrix, [2, 0.22, 0.0]);
        pushMatrix(matrixStack, mMatrix);
        color = [0.1373, 0.5373, 0.8549, 1.0];
        drawSquare(color, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.0, 0.2, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.1, 0.015, 0.0]);
        color = [1.0, 1.0, 1.0, 1.0];
        drawSquare(color, mMatrix);
        mMatrix = mat4.translate(mMatrix, [1.5, -35.0, 0.0]);
        drawSquare(color, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-3.1, 15.0, 0.0]);
        drawSquare(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = popMatrix(matrixStack); //unit matrix
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.8, 0.13, 0.0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.49, 0.16, 0.0]);
        mMatrix = mat4.scale(mMatrix, [1.2, 1.2, 0.0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.24, 0.1, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0.0]);
        drawTree(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.15, 0.52, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.2, 0.15, 0.0]);
        drawBird(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.25, 0.65, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 0.0]);
        drawBird(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.3, 0.8, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.14, 0.1, 0.0]);
        drawBird(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.08, 0.8, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.12, 0.08, 0.0]);
        drawBird(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.08, 0.9, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.08, 0.04, 0.0]);
        drawBird(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [offset, 0.0, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.0]);
        drawBoat(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        drawWindPoll(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [0.7, 0.0, 0.0]);
        mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [0.0, 0.0, 1.0]);
        drawWindblades(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        color = [0.0, 0.0, 0.0, 1.0];
        mMatrix = mat4.translate(mMatrix, [0.7, 0.0, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0.0]);
        drawCircle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.4, 0.0, 0.0]);
        mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [0.0, 0.0, 1.0]);
        drawWindblades(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        color = [0.0, 0.0, 0.0, 1.0];
        mMatrix = mat4.translate(mMatrix, [-0.4, 0.0, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.03, 0.03, 0.0]);
        drawCircle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.7, 0.85, 0.0]);
        mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
        drawSun(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.85, 0.65, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.8, 0.85, 0.0]);
        drawCloud(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.15, -0.55, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.0]);
        pushMatrix(matrixStack, mMatrix);
        drawBush(mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = mat4.translate(mMatrix, [-1.3, 0.0, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0.0]);
        pushMatrix(matrixStack, mMatrix);
        drawBush(mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = mat4.translate(mMatrix, [4.7, 0.3, 0.0]);
        mMatrix = mat4.scale(mMatrix, [1.5, 1.5, 0.0]);
        pushMatrix(matrixStack, mMatrix);
        drawBush(mMatrix);
        mMatrix = popMatrix(matrixStack);
        mMatrix = mat4.translate(mMatrix, [-1.3, -1.08, 0.0]);
        mMatrix = mat4.scale(mMatrix, [1.5, 1.5, 0.0]);
        drawBush(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.6, -0.47, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.6, 0.6, 0.0]);
        drawHouse(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);
        mMatrix = mat4.translate(mMatrix, [-0.5, -0.85, 0.0]);
        mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.0]);
        drawCar(mMatrix);
        mMatrix = popMatrix(matrixStack);
        pushMatrix(matrixStack, mMatrix);

        animation = window.requestAnimationFrame(animate);
    };

    animate();
}

function changeView(view) {
    currentView = view;
    drawScene();
}

// This is the entry point from the html
function webGLStart() {
    var canvas = document.getElementById("HierarchicalTransformation");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);

    uColorLoc = gl.getUniformLocation(shaderProgram, "color");

    initSquareBuffer();
    initTriangleBuffer();
    initCircleBuffer();

    drawScene();
}