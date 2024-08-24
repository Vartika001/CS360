var gl;
var canvas;
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
var uTextureLocation;
var uaTextureLocation;

var circleBuf;
var circleIndexBuf;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;
var squareTexBuf;
var aTexCoordLocation;
var flag = 2.0;
var mode = 0.0;
var Contrast = 0.0;
var Brightness = 0.0;
var textureHeight;
var textureWidth;
var textureHeightLocation;
var textureWidthLocation;
var textureSizeLocation;
var flagLocation;
var modeLocation;
var contrastLocation;
var brightnessLocation;
var textureFile1 = null;
var textureFile2 = null;
var kernelLocation;
var kernelWeightLocation;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoords;
uniform mat4 uMMatrix;
out vec2 fragTexCoord;
void main() {
  gl_Position = vec4(aPosition,0.0,1.0);
  fragTexCoord = aTexCoords;
  gl_PointSize = 3.0;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
in vec2 fragTexCoord;
out vec4 fragColor;
uniform float flag;
uniform float mode;
uniform float contrast;
uniform float brightness;
uniform sampler2D imageTexture;
uniform sampler2D alphaimageTexture;
uniform vec2 textureSize;
uniform float textureWidth;
uniform float textureHeight;
uniform vec4 color;




void main() {
    
    
    vec4 textureColor =  texture(imageTexture, fragTexCoord);
    vec4 textureColor2 =  texture(alphaimageTexture, fragTexCoord);  
    if(mode==2.0)
    {
        textureColor =textureColor2 * textureColor2.a + textureColor * (1.0 - textureColor2.a);
    }
    textureColor.rgb=0.5 + (contrast + 1.0) * (textureColor.rgb - 0.5);
    textureColor.rgb = clamp(textureColor.rgb + brightness, -0.6, 0.6);
    float sepiaR = 0.393 * textureColor.r + 0.769 * textureColor.g + 0.189 * textureColor.b;
    float sepiaG = 0.349 * textureColor.r + 0.686 * textureColor.g + 0.168 * textureColor.b;
    float sepiaB = 0.272 * textureColor.r + 0.534 * textureColor.g + 0.131 * textureColor.b;
    
    vec2 onePixel =  vec2(10.0 / textureWidth, 10.0 / textureHeight);
    
    vec4 colorSum = vec4(0.0);
    vec2 smallOffset = vec2(0.003, 0.003); // Small offset for debugging
   
    if(flag==0.0)
    {
        fragColor =textureColor;
    }
    else if(flag==1.0)
    
    {
        
    vec3 color2 = textureColor.rgb;
    float gray = dot(color2, vec3(0.2126, 0.7152, 0.0722));
    fragColor = vec4(vec3(gray), 1.0);
      
    }
    else if(flag==2.0)
    {
        fragColor =color;
    }
    else if(flag==3.0){
        fragColor=vec4(sepiaR, sepiaG, sepiaB, textureColor.a);
    }
    else if(flag==4.0)
    {
        fragColor =textureColor;
    }
   else if(flag==5.0)
   {
    
    // Just a small offset for debugging
    const float kernel[9] = float[9](
        1.0/9.0, 1.0/9.0, 1.0/9.0,
        1.0/9.0, 1.0/9.0, 1.0/9.0,
        1.0/9.0, 1.0/9.0, 1.0/9.0
    );
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            vec2 offset = vec2((float(i) - 1.0) * smallOffset.x, (float(j) - 1.0) * smallOffset.y);
            colorSum += texture(imageTexture, fragTexCoord + offset) * kernel[i*3 + j];
        }
    }
    fragColor = colorSum;
        
}
   
   else if(flag==6.0)
   {
    
    // Just a small offset for debugging
    const float kernel[9] = float[9](
        0.0, -1.0, 0.0,
    -1.0, 5.0, -1.0,
    0.0, -1.0, 0.0
    );
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            vec2 offset = vec2((float(i) - 1.0) * smallOffset.x, (float(j) - 1.0) * smallOffset.y);
            colorSum += texture(imageTexture, fragTexCoord + offset) * kernel[i*3 + j];
        }
    }
    fragColor = colorSum;
        
    
   }
   else if (flag==7.0)
   {
    vec4 up = texture(imageTexture, fragTexCoord + vec2(0.0, smallOffset.y));
    vec4 down = texture(imageTexture, fragTexCoord - vec2(0.0, smallOffset.y));
    vec4 left = texture(imageTexture, fragTexCoord - vec2(smallOffset.x, 0.0));
    vec4 right = texture(imageTexture, fragTexCoord + vec2(smallOffset.x, 0.0));
    
    // Calculate the gradients in the x and y directions
    vec4 dx = (right - left) * 0.5;
    vec4 dy = (up - down) * 0.5;

    // Compute the magnitude of the gradient
    vec4 gradientMag = sqrt(dx * dx + dy * dy);
    fragColor=gradientMag;

   }
   else if(flag==8.0)
   {
    
    // Just a small offset for debugging
    const float kernel[9] = float[9](
        0.0, -1.0, 0.0,
    -1.0, 4.0, -1.0,
    0.0, -1.0, 0.0
    );
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            vec2 offset = vec2((float(i) - 1.0) * smallOffset.x, (float(j) - 1.0) * smallOffset.y);
            colorSum += texture(imageTexture, fragTexCoord + offset) * kernel[i*3 + j];
        }
    }
    fragColor = colorSum;
        
    
   }
    
  
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
        gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true }); // the graphics webgl2 context
        gl.viewportWidth = canvas.width; // the width of the canvas
        gl.viewportHeight = canvas.height; // the height
    } catch (e) {}
    if (!gl) {
        alert("WebGL initialization failed");
    }
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
    gl.texImage2D(
        gl.TEXTURE_2D, // 2D texture
        0, // mipmap level
        gl.RGBA, // internal format
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type of data
        texture.image // array or <img>
    );
    if (texture == sampleTexture1) {
        textureWidth = texture.image.width; // Width of the image for texture1
        textureHeight = texture.image.height; // Height of the image for texture1
        gl.uniform1f(textureWidthLocation, textureWidth);
        gl.uniform1f(textureWidthLocation, textureHeight);
    }

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
    );
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    drawScene();
}

document.addEventListener("DOMContentLoaded", function() {
    // Get a reference to the checkbox element.
    const background = document.getElementById("BackgroundOnly");
    const AlphaBlended = document.getElementById("AlphaBlended");

    const GrayScale = document.getElementById("GrayScale");
    const Sepia = document.getElementById("Sepia");
    const Contraste = document.getElementById("Contrast");
    const Brightnesse = document.getElementById("Brightness");
    const Smooth = document.getElementById("Smooth");
    const Sharpen = document.getElementById("Sharpen");
    const Gradient = document.getElementById("Gradient");
    const Laplacian = document.getElementById("Laplacian");

    const screenshot = document.getElementById("screenshot");

    screenshot.addEventListener("click", function() {
        canvas.toBlob((blob) => {
            saveBlob(blob, `processed_output.png`);
        });
    });

    const saveBlob = (function() {
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        return function saveData(blob, fileName) {
            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    }());



    // Get a reference to the paragraph where the message will be displayed.

    // Add an event listener to the checkbox.
    background.addEventListener("change", function() {
        if (background.checked) {
            // Checkbox is checked, execute your function here.
            mode = 1.0;
            gl.uniform1f(modeLocation, mode);
            flag = 0.0;
            gl.uniform1f(flagLocation, flag);
            if (textureFile1) {
                // You can now use the 'textureFile' variable for further processing.
                console.log("*");
                // sampleTexture = initTextures(textureFile);
                initializeTexture();


            } else {
                console.log("No file selected.");
            }
            drawScene();
        } else {
            // Checkbox is unchecked, execute your function here.

            flag = 0.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();

        }
    });
    AlphaBlended.addEventListener("change", function() {
        if (AlphaBlended.checked) {
            // Checkbox is checked, execute your function here.
            mode = 2.0;
            gl.uniform1f(modeLocation, mode);
            console.log("Checkbox is checked.");
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            GrayScale.checked = false;
            Sepia.checked = false;

            if (textureFile2) {
                // You can now use the 'textureFile' variable for further processing.

                // sampleTexture = initTextures(textureFile);
                initializeTexture();
            } else {
                console.log("No file selected.");
            }
            drawScene();
        } else {
            // Checkbox is unchecked, execute your function here.

            flag = 0.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();

        }
    });
    GrayScale.addEventListener("change", function() {
        if (GrayScale.checked) {
            // Checkbox is checked, execute your function here.

            flag = 1.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();

        }

    });
    Sepia.addEventListener("change", function() {
        if (Sepia.checked) {
            // Checkbox is checked, execute your function here.

            flag = 3.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();

        }
    });
    Contraste.addEventListener('input', (event) => {
        Contrast = parseFloat(event.target.value);
        gl.uniform1f(contrastLocation, Contrast);
        // Redraw the scene
        drawScene();
    });
    Brightnesse.addEventListener('input', (event) => {
        Brightness = parseFloat(event.target.value);
        gl.uniform1f(brightnessLocation, Brightness);
        // Redraw the scene
        drawScene();
    });
    Smooth.addEventListener("change", function() {

        if (Smooth.checked) {
            // Checkbox is checked, execute your function here.
            flag = 5.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        }
    });
    Sharpen.addEventListener("change", function() {

        if (Sharpen.checked) {
            // Checkbox is checked, execute your function here.
            flag = 6.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        }
    });
    Gradient.addEventListener("change", function() {

        if (Gradient.checked) {
            // Checkbox is checked, execute your function here.
            flag = 7.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        }
    });
    Laplacian.addEventListener("change", function() {

        if (Laplacian.checked) {
            // Checkbox is checked, execute your function here.
            flag = 8.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        } else {
            flag = 4.0;
            gl.uniform1f(flagLocation, flag);
            drawScene();
        }
    });

});


document.addEventListener("DOMContentLoaded", function() {
    const imageInput = document.getElementById("imageInput");
    const foregroundImageInput = document.getElementById("foregroundImageInput");

    // const uploadButton = document.getElementById("uploadButton");
    // let textureFile = null;

    // Your event handling code here...
    imageInput.addEventListener("input", function(event) {
        const selectedFiles = event.target.files;
        if (selectedFiles.length > 0) {
            textureFile1 = URL.createObjectURL(selectedFiles[0]);
        } else {
            textureFile1 = null; // No file selected
        }
    });
    foregroundImageInput.addEventListener("input", function(event) {
        const selectedFiles = event.target.files;
        if (selectedFiles.length > 0) {
            textureFile2 = URL.createObjectURL(selectedFiles[0]);
        } else {
            textureFile2 = null; // No file selected
        }
    });


    // Update camera position when the slider changes


    // uploadButton.addEventListener("click", function() {
    //     if (textureFile) {
    //         // You can now use the 'textureFile' variable for further processing.
    //         console.log("Selected file:", textureFile);
    //         // sampleTexture = initTextures(textureFile);
    //         initializeTexture();
    //     } else {
    //         console.log("No file selected.");
    //     }
    // });
});

function resetScene() {
    // Reset Image Mode to 'Background Only'
    document.getElementById("BackgroundOnly").checked = true;


    // Uncheck the GrayScale and Sepia checkboxes
    document.getElementById("GrayScale").checked = false;
    document.getElementById("Sepia").checked = false;

    // Reset Contrast and Brightness sliders to their default values
    document.getElementById("Contrast").value = 0.0;
    document.getElementById("Brightness").value = 0.0;

    // Uncheck the image processing checkboxes
    document.getElementById("Smooth").checked = false;
    document.getElementById("Sharpen").checked = false;
    document.getElementById("Gradient").checked = false;
    document.getElementById("Laplacian").checked = false;
    mode = 1.0;
    gl.uniform1f(modeLocation, mode);
    flag = 0.0;
    gl.uniform1f(flagLocation, flag);
    Contrast = 0.0;
    Brightness = 0.0;
    gl.uniform1f(contrastLocation, Contrast);
    gl.uniform1f(brightnessLocation, Brightness);
    drawScene();

    // Additional reset logic can be added here if needed
}


function initializeTexture() {
    if (textureFile1) {
        sampleTexture1 = initTextures(textureFile1);

    }
    if (textureFile2) {
        sampleTexture2 = initTextures(textureFile2);


    }
}

function initSquareBuffer() {
    // buffer for point locations
    const sqVertices = new Float32Array([-1.0, 1.0, // Top-left
        -1.0, -1.0, // Bottom-left
        1.0, 1.0, // Top-right
        1.0, -1.0 // Bottom-right
    ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4;

    // buffer for point indices
    const sqIndices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    sqVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
    sqVertexIndexBuffer.itemsize = 1;
    sqVertexIndexBuffer.numItems = 6;
    const sqTextureCoordinates = new Float32Array([
        0.0, 0.0, // Top-left
        0.0, 1.0, // Bottom-left
        1.0, 0.0, // Top-right
        1.0, 1.0 // Bottom-right
    ]);

    squareTexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareTexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqTextureCoordinates), gl.STATIC_DRAW);
    squareTexBuf.itemSize = 2;
    squareTexBuf.numItems = 2;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, squareTexBuf);
    gl.vertexAttribPointer(
        aTexCoordLocation,
        squareTexBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.uniform4fv(uColorLoc, color);
    gl.drawElements(
        gl.TRIANGLE_STRIP,
        sqVertexIndexBuffer.numItems,
        gl.UNSIGNED_SHORT,
        0
    );

}


////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    // stop the current loop of animation
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);
    //draw square
    pushMatrix(matrixStack, mMatrix);
    gl.activeTexture(gl.TEXTURE0); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture2); // bind the texture object

    // mMatrix = mat4.scale(mMatrix, [2.0, 2.0, 1.0]);
    color = [0.0, 0.0, 0.0, 1.0];
    drawSquare(color, mMatrix);

}



// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("HierarchicalTransformation");
    initGL(canvas);
    shaderProgram = initShaders();

    //get locations of attributes declared in the vertex shader
    const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
    uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
    uaTextureLocation = gl.getUniformLocation(shaderProgram, "alphaimageTexture");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    flagLocation = gl.getUniformLocation(shaderProgram, "flag");
    modeLocation = gl.getUniformLocation(shaderProgram, "mode");
    contrastLocation = gl.getUniformLocation(shaderProgram, "contrast");
    brightnessLocation = gl.getUniformLocation(shaderProgram, "brightness");
    textureSizeLocation = gl.getUniformLocation(shaderProgram, "textureSize");
    textureHeightLocation = gl.getUniformLocation(shaderProgram, "textureHeight");
    textureHeightLocation = gl.getUniformLocation(shaderProgram, "textureWidth");
    kernelLocation = gl.getUniformLocation(shaderProgram, "u_kernel[0]");
    kernelWeightLocation = gl.getUniformLocation(shaderProgram, "u_kernelWeight");
    uColorLoc = gl.getUniformLocation(shaderProgram, "color");
    gl.uniform2f(textureSizeLocation, textureWidth, textureHeight);
    gl.uniform1i(uTextureLocation, 0); // pass the texture unit
    gl.uniform1i(uaTextureLocation, 1);
    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aTexCoordLocation);



    initSquareBuffer();
    // initializeTexture();
    drawScene();
}