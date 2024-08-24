//  A simple WebGL program to show how to load JSON model

var gl;
var canvas;
var matrixStack = [];

var animation;
var eyex = 0.0;
var eyey = 1.5;
var eyez = 1.0;
var zAngle = 0.0;
var yAngle = 0.0;
var rangle = 0;
var flag = 0.0;
var flagLocation;
var prevMouseX = 0;
var prevMouseY = 0;
var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uVMatrixLocation;
var uMMatrixLocation;
var uPMatrixLocation;
var uWNMatrixLocation;
var uEyePositionLocation;

var sampleTexture;
var sampleTexture2;
var objVertexPositionBuffer;
var objVertexNormalBuffer;
var objVertexIndexBuffer;
var cubemapTexture;
var uDiffuseTermLocation;
var cubeBuf;
var cubeIndexBuf;
var cubeNormalBuf;
var cubeTexBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];

///phong
var lightPosition = [3, 3, 4];
var ambientColor = [1, 1, 1];
var diffuseColor = [0.0, 0.9, 0.8];
var specularColor = [0.0, 0.9, 0.8];

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var wnMatrix = mat4.create(); //projection matrix

var eyePos = [0.0, 0.5, 1.5];
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

// Inpur JSON model file to load
input_JSON = "texture_and_other_files/teapot.json";
var uTextureLocation;
var ucubeMapTextureLocation;
var textureFile = "texture_and_other_files/wood_texture.jpg";
var rubrixcube = "texture_and_other_files/rcube.png";
var cubeMapPath = "texture_and_other_files/Nvidia_cubemap/";
var posx, posy, posz, negx, negy, negz;

var posx_file = cubeMapPath.concat("posx.jpg");
var posy_file = cubeMapPath.concat("posy.jpg");
var posz_file = cubeMapPath.concat("posz.jpg");
var negx_file = cubeMapPath.concat("negx.jpg");
var negy_file = cubeMapPath.concat("negy.jpg");
var negz_file = cubeMapPath.concat("negz.jpg");

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoords;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
out vec3 v_worldPosition;
out vec3 v_worldNormal;
out vec2 fragTexCoord;
///phong
uniform vec3 uLightPosition;
out vec3 vPosEyeSpace;
out vec3 normalEyeSpace;
out vec3 L;
out vec3 V;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

  // pass texture coordinate to frag shader
  fragTexCoord = aTexCoords;
  v_worldPosition = mat3(uMMatrix) * aPosition;
  mat4 worldNormal = transpose(mat4(inverse(uMMatrix)));
  v_worldNormal = mat3(worldNormal) * aNormal; 
  //phong
  // Transform vertex position to eye space
    vPosEyeSpace = (uVMatrix * uMMatrix * vec4(aPosition, 1.0)).xyz;

    // Transform vertex normal and normalize
    normalEyeSpace = normalize(mat3(uVMatrix * uMMatrix) * aNormal);
    // Compute light vector and normalize
    L = normalize(uLightPosition - vPosEyeSpace);
    V = normalize(-vPosEyeSpace); 
  // calcuie clip space position
  gl_Position =  projectionModelView * vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision highp float;
///phong
in vec3 normalEyeSpace;
in vec3 L;
in vec3 V;
in vec3 vPosEyeSpace;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec2 fragTexCoord;
uniform float flag;
uniform vec3 eyePos; // in world space
uniform samplerCube cubeMap;
uniform sampler2D imageTexture;
out vec4 fragColor;
void main() {
  fragColor = vec4(0,0,0,1);
  ///////phong
  vec3 normal = normalEyeSpace;
    vec3 lightVector = L;
    vec3 viewVector = V;
    // Calculate reflection direction
    vec3 reflectionVector = normalize(-reflect(lightVector, normal));
    // Compute Phong shading
    float diffuse = max(dot(normal, lightVector), 0.0);
    float specular = pow(max(dot(reflectionVector, viewVector), 0.0), 32.0);
    float ambient = 0.15;
    vec3 fColor = uAmbientColor * ambient + uDiffuseColor * diffuse + uSpecularColor * specular;
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition - eyePos);
  vec3 directionReflection = reflect(eyeToSurfaceDir,worldNormal);
  vec4 cubeMapReflectCol = texture(cubeMap, directionReflection);
  vec3 directionRefraction = refract(eyeToSurfaceDir,worldNormal,0.9);
  vec4 cubeMapRefractCol = texture(cubeMap, directionReflection);
  //look up texture color
  vec4 textureColor =  texture(imageTexture, fragTexCoord); 
  fragColor =textureColor;


if(flag ==0.0)
{
    fragColor = mix(textureColor,cubeMapReflectCol,0.4);   
}
else if(flag ==1.0)
{
    fragColor =cubeMapReflectCol;   
}
else if(flag ==2.0)
{
    fragColor =textureColor;   
}
else if(flag ==3.0)
{
    fragColor =vec4(fColor, 1.0);   
}
else if(flag ==4.0)
{
    fragColor =mix(vec4(fColor, 1.0),cubeMapReflectCol,0.6);   
}
else if(flag ==5.0)
{
    fragColor = cubeMapRefractCol;   
}
}`;

function vertexShaderSetup(vertexShaderCode) {
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vertexShaderCode);
    gl.compileShader(shader);
    // Error check whether the shader is compiled correctly
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
    // Error check whether the shader is compiled correctly
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

function degToRad(degrees) {
    return (degrees * Math.PI) / 180;
}

function pushMatrix(stack, m) {
    //necessary because javascript only does shallow push
    var copy = mat4.create(m);
    stack.push(copy);
}

function popMatrix(stack) {
    if (stack.length > 0) return stack.pop();
    else console.log("stack has no matrix to pop!");
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

function drawSquare(color) {
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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.drawElements(
        gl.TRIANGLE_STRIP,
        sqVertexIndexBuffer.numItems,
        gl.UNSIGNED_SHORT,
        0
    );
}

function initCubeBuffer() {
    var vertices = [
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
    ];
    cubeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeBuf.itemSize = 3;
    cubeBuf.numItems = vertices.length / 3;

    var normals = [
        // Front face
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        // Back face
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
        // Top face
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
        // Bottom face
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
        // Right face
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        // Left face
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
    ];
    cubeNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    cubeNormalBuf.itemSize = 3;
    cubeNormalBuf.numItems = normals.length / 3;

    var texCoords = [
        // Front face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        // Back face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        // Top face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        // Bottom face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        // Right face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        // Left face
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    ];
    cubeTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    cubeTexBuf.itemSize = 2;
    cubeTexBuf.numItems = texCoords.length / 2;

    var indices = [
        0,
        1,
        2,
        0,
        2,
        3, // Front face
        4,
        5,
        6,
        4,
        6,
        7, // Back face
        8,
        9,
        10,
        8,
        10,
        11, // Top face
        12,
        13,
        14,
        12,
        14,
        15, // Bottom face
        16,
        17,
        18,
        16,
        18,
        19, // Right face
        20,
        21,
        22,
        20,
        22,
        23, // Left face
    ];
    cubeIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
    );
    cubeIndexBuf.itemSize = 1;
    cubeIndexBuf.numItems = indices.length;
}

function drawCube() {
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        cubeBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // draw normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.vertexAttribPointer(
        aNormalLocation,
        cubeNormalBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuf);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
    gl.vertexAttribPointer(
        aTexCoordLocation,
        cubeTexBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniform3fv(uLightPositionLocation, lightPosition);
    gl.uniform3fv(uAmbientColorLocation, ambientColor);
    gl.uniform3fv(uDiffuseColorLocation, diffuseColor);
    gl.uniform3fv(uSpecularColorLocation, specularColor);
    gl.drawElements(gl.TRIANGLES, cubeIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function initSphere(nslices, nstacks, radius) {
    for (var i = 0; i <= nslices; i++) {
        var angle = (i * Math.PI) / nslices;
        var comp1 = Math.sin(angle);
        var comp2 = Math.cos(angle);

        for (var j = 0; j <= nstacks; j++) {
            var phi = (j * 2 * Math.PI) / nstacks;
            var comp3 = Math.sin(phi);
            var comp4 = Math.cos(phi);

            var xcood = comp4 * comp1;
            var ycoord = comp2;
            var zcoord = comp3 * comp1;
            var utex = 1 - j / nstacks;
            var vtex = i / nslices;

            spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
            spNormals.push(xcood, ycoord, zcoord);
            spTexCoords.push(utex, vtex);
        }
    }

    // now compute the indices here
    for (var i = 0; i < nslices; i++) {
        for (var j = 0; j < nstacks; j++) {
            var id1 = i * (nstacks + 1) + j;
            var id2 = id1 + nstacks + 1;

            spIndicies.push(id1, id2, id1 + 1);
            spIndicies.push(id2, id2 + 1, id1 + 1);
        }
    }
}

function initSphereBuffer() {
    var nslices = 50;
    var nstacks = 50;
    var radius = 1.0;

    initSphere(nslices, nstacks, radius);

    // buffer for vertices
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = spVerts.length / 3;

    // buffer for indices
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint32Array(spIndicies),
        gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = spIndicies.length;

    // buffer for normals
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = spNormals.length / 3;

    // buffer for texture coordinates
    spTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
    spTexBuf.itemSize = 2;
    spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(
        aPositionLocation,
        spBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
    gl.vertexAttribPointer(
        aTexCoordLocation,
        spTexBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    // Draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(
        aNormalLocation,
        spNormalBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );
    // wnMatrix = mat4.transpose(mat4.inverse(mMatrix));
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    // gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);
    gl.uniform3fv(uLightPositionLocation, lightPosition);
    gl.uniform3fv(uAmbientColorLocation, ambientColor);
    gl.uniform3fv(uDiffuseColorLocation, diffuseColor);
    gl.uniform3fv(uSpecularColorLocation, specularColor);

    // for texture binding
    gl.activeTexture(gl.TEXTURE1); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture); // bind the texture object to the texture unit
    // gl.uniform1i(uTextureLocation, 0); // pass the texture unit to the shader

    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

function initObject() {
    // XMLHttpRequest objects are used to interact with servers
    // It can be used to retrieve any type of data, not just XML.
    var request = new XMLHttpRequest();
    request.open("GET", input_JSON);
    // MIME: Multipurpose Internet Mail Extensions
    // It lets users exchange different kinds of data files
    request.overrideMimeType("application/json");
    request.onreadystatechange = function() {
        //request.readyState == 4 means operation is done
        if (request.readyState == 4) {
            processObject(JSON.parse(request.responseText));
        }
    };
    request.send();
}

function processObject(objData) {
    objVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(objData.vertexPositions),
        gl.STATIC_DRAW
    );
    objVertexPositionBuffer.itemSize = 3;
    objVertexPositionBuffer.numItems = objData.vertexPositions.length / 3;

    objVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint32Array(objData.indices),
        gl.STATIC_DRAW
    );
    objVertexIndexBuffer.itemSize = 1;
    objVertexIndexBuffer.numItems = objData.indices.length;

    objVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(objData.vertexNormals),
        gl.STATIC_DRAW
    );
    objVertexNormalBuffer.itemSize = 3;
    objVertexNormalBuffer.numItems = objData.vertexNormals.length / 3;
    drawScene();
}

function drawObject(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer);
    gl.vertexAttribPointer(
        aPositionLocation,
        objVertexPositionBuffer.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, objVertexNormalBuffer);
    gl.vertexAttribPointer(
        aNormalLocation,
        objVertexNormalBuffer.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuffer);
    gl.uniform4fv(uDiffuseTermLocation, color);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);

    gl.drawElements(
        gl.TRIANGLES,
        objVertexIndexBuffer.numItems,
        gl.UNSIGNED_INT,
        0
    );
}

function initCubeMap() {
    faceImages = [{
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            url: posx_file,
        },

        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            url: negx_file,
        },

        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            url: posy_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            url: negy_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            url: posz_file,
        },
        {
            target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
            url: negz_file,
        },
    ];
    gl.activeTexture(gl.TEXTURE0);
    cubemapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);

    faceImages.forEach((faceInfos) => {
        const { target, url } = faceInfos;
        // Upload the canvas to the cubemap face.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 512;
        const height = 512;
        const format = gl.RGBA;
        const type = gl.UNSIGNED_BYTE;
        // setup each face so it's immediately renderable
        gl.texImage2D(
            target,
            level,
            internalFormat,
            width,
            height,
            0,
            format,
            type,
            null
        );
        const image = new Image();
        image.src = url;
        image.addEventListener("load", function() {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
            gl.texImage2D(target, level, internalFormat, format, type, image);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            drawScene();
        });
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(
        gl.TEXTURE_CUBE_MAP,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
    );
}

function initTextures(textureFile) {
    var tex = gl.createTexture();
    tex.image = new Image();
    tex.image.src = textureFile;
    tex.image.onload = function() {
        handleTextureLoaded(tex);
    };

    return tex;
}

function handleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // if (shape === "sphere")
    //     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
    gl.texImage2D(
        gl.TEXTURE_2D, // 2D texture
        0, // mipmap level
        gl.RGB, // internal format
        gl.RGB, // format
        gl.UNSIGNED_BYTE, // type of data
        texture.image // array or <img>
    );

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
    );

    drawScene();
}

function drawTable() {
    pushMatrix(matrixStack, mMatrix);
    pushMatrix(matrixStack, mMatrix);
    flag = 0.0;
    gl.uniform1f(flagLocation, flag);
    mMatrix = mat4.scale(mMatrix, [3.0, 0.2, 3.0]);
    drawSphere(color);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.scale(mMatrix, [0.3, 4.0, 0.5]);
    mMatrix = mat4.translate(mMatrix, [-6.5, -0.5, -3.0]);
    gl.activeTexture(gl.TEXTURE1); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture); // bind the texture object to the texture unit
    drawCube();
    mMatrix = mat4.translate(mMatrix, [12.5, 0.0, 0.0]);
    drawCube();
    mMatrix = mat4.translate(mMatrix, [0.0, 0.0, 6.0]);
    drawCube();
    mMatrix = mat4.translate(mMatrix, [-12.5, 0.0, 0.0]);
    drawCube();
    mMatrix = popMatrix(matrixStack);
}

function drawTeepot() {
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 0.08]);
    mMatrix = mat4.translate(mMatrix, [-7.0, 10.7, -25.0]);
    drawObject(color);
}

function drawRoom() {
    pushMatrix(matrixStack, mMatrix);
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.scale(mMatrix, [2.2, 2.2, 2.2]);
    gl.bindTexture(gl.TEXTURE_2D, posy);
    mMatrix = popMatrix(matrixStack);
    drawSkyBox();
}

function drawShinySphere() {
    mMatrix = popMatrix(matrixStack);
    pushMatrix(matrixStack, mMatrix);
    ambientColor = [0.2, 0.2, 0.2];
    diffuseColor = [0.5412, 0.1686, 0.8863];
    specularColor = [0.5412, 0.1686, 0.8863];
    mMatrix = mat4.scale(mMatrix, [0.3, 0.3, 0.3]);
    mMatrix = mat4.translate(mMatrix, [2.0, 1.7, -1.0]);
    drawSphere(color);
    mMatrix = mat4.scale(mMatrix, [1.2, 1.2, 1.2]);
    mMatrix = mat4.translate(mMatrix, [-4.0, 0.1, 1.0]);
    diffuseColor = [0.1333, 0.5451, 0.1333];
    specularColor = [0.1333, 0.5451, 0.1333];
    drawSphere(color);
}

function drawRubrixCube() {
    mMatrix = mat4.scale(mMatrix, [0.9, 0.9, 0.9]);
    mMatrix = mat4.translate(mMatrix, [2.5, -0.4, 0.0]);
    gl.activeTexture(gl.TEXTURE1); // set texture unit 0 to use
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture2); // bind the texture object to the texture unit
    drawCube();
}

function drawGlasscube() {
    mMatrix = popMatrix(matrixStack);
    mMatrix = mat4.scale(mMatrix, [0.6, 0.9, 0.45]);
    mMatrix = mat4.translate(mMatrix, [-3.0, 0.7, -2.5]);
    drawCube();
}

function drawSkyBox() {
    //     // Back side of the cube
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negz); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [0, 0, -99.5]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);

    //     // Front side of the cube
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posz); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [0, 0, 99.5]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [1, 0, 0]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);

    //     //left
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posx); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [99.5, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(270), [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);
    //     ////right
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negx); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [-99.5, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);
    //     ///top
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, posy); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [0, 99.5, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);
    //     /////bottom
    pushMatrix(matrixStack, mMatrix);

    // texture setup for use
    gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, negy); // bind the texture object
    gl.uniform1i(uTextureLocation, 1); // pass the texture unit

    // transformations
    mMatrix = mat4.translate(mMatrix, [0, -99.5, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [1, 0, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
    mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

    color = [0.0, 1.0, 1.0, 1.0];
    drawSquare(color);

    mMatrix = popMatrix(matrixStack);
}

//////////////////////////////////////////////////////////////////////
//The main drawing routine
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    if (animation) {
        window.cancelAnimationFrame(animation);
    }
    var animate = function() {
        const radius = 3.0; // Adjust this value to control the orbit radius
        rangle += 0.002; // Adjust the rotation speed
        // const eyey = Math.sin(rangle) * 1.5;
        const eyex = radius * Math.cos(rangle);
        const eyez = radius * Math.sin(rangle * 1);
        const eyePos = [eyex, eyey, eyez];
        gl.clearColor(0.9, 0.9, 0.9, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //set up the model matrix
        mat4.identity(mMatrix);
        mat4.identity(vMatrix);
        vMatrix = mat4.lookAt(eyePos, [0, 0, 0], [0, 1, 0], vMatrix);

        // gl.uniform3fv(uEyePositionLocation, eyePos);

        //set up projection matrix
        mat4.identity(pMatrix);
        mat4.perspective(60, 1.0, 0.01, 1000, pMatrix);

        mMatrix = mat4.rotate(mMatrix, degToRad(yAngle), [1, 0, 0]);
        mMatrix = mat4.rotate(mMatrix, degToRad(zAngle), [0, 1, 0]);
        gl.uniform3fv(uEyePositionLocation, eyePos);

        //draw teapot
        mMatrix = mat4.translate(mMatrix, [1.0, -0.2, 0.9]);
        pushMatrix(matrixStack, mMatrix);
        color = [0.7, 0.2, 0.2, 1.0];
        drawTable();
        pushMatrix(matrixStack, mMatrix);
        flag = 1.0;
        gl.uniform1f(flagLocation, flag);
        drawTeepot();
        flag = 2.0;
        gl.uniform1f(flagLocation, flag);
        drawRoom();
        flag = 4.0;
        gl.uniform1f(flagLocation, flag);
        drawShinySphere();
        flag = 2.0;
        gl.uniform1f(flagLocation, flag);
        drawRubrixCube();
        flag = 5.0;
        gl.uniform1f(flagLocation, flag);
        drawGlasscube();
        animation = window.requestAnimationFrame(animate);
    };

    animate();
}

function onMouseDown(event) {
    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("mouseout", onMouseOut, false);

    if (
        event.layerX <= canvas.width &&
        event.layerX >= 0 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        prevMouseX = event.clientX;
        prevMouseY = canvas.height - event.clientY;
    }
}

function onMouseMove(event) {
    // make mouse interaction only within canvas
    if (
        event.layerX <= canvas.width &&
        event.layerX >= 0 &&
        event.layerY <= canvas.height &&
        event.layerY >= 0
    ) {
        var mouseX = event.clientX;
        var diffX = mouseX - prevMouseX;
        zAngle = zAngle + diffX / 5;
        prevMouseX = mouseX;

        var mouseY = canvas.height - event.clientY;
        var diffY = mouseY - prevMouseY;
        yAngle = yAngle - diffY / 5;
        prevMouseY = mouseY;

        drawScene();
    }
}

function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
    document.removeEventListener("mousemove", onMouseMove, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("mouseout", onMouseOut, false);
}

// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("Assignment3");
    document.addEventListener("mousedown", onMouseDown, false);

    initGL(canvas);
    shaderProgram = initShaders();

    gl.enable(gl.DEPTH_TEST);

    //get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
    uEyePositionLocation = gl.getUniformLocation(shaderProgram, "eyePos");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
    uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");
    uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
    ucubeMapTextureLocation = gl.getUniformLocation(shaderProgram, "cubeMap");
    aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
    uLightPositionLocation = gl.getUniformLocation(
        shaderProgram,
        "uLightPosition"
    );
    uAmbientColorLocation = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    uDiffuseColorLocation = gl.getUniformLocation(shaderProgram, "uDiffuseColor");
    uSpecularColorLocation = gl.getUniformLocation(
        shaderProgram,
        "uSpecularColor"
    );
    flagLocation = gl.getUniformLocation(shaderProgram, "flag");
    gl.uniform3fv(uEyePositionLocation, eyePos);
    gl.uniform1f(flagLocation, flag);
    gl.uniform1i(ucubeMapTextureLocation, 0);
    gl.uniform1i(uTextureLocation, 1);
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);
    gl.enableVertexAttribArray(aTexCoordLocation);
    initSquareBuffer();
    initObject();
    initSphereBuffer();
    initCubeBuffer();
    initCubeMap();
    posx = initTextures(posx_file);
    posy = initTextures(posy_file);
    posz = initTextures(posz_file);
    negz = initTextures(negz_file);
    negx = initTextures(negx_file);
    negy = initTextures(negy_file);
    sampleTexture = initTextures(textureFile);
    sampleTexture2 = initTextures(rubrixcube);
}