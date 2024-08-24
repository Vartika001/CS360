var gl;
var canvas;
var color;
var matrixStack = [];

var mMatrix = mat4.create();
var vMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uEyePositionLocation;
var canvWidthLocation;
var canvHeightLocation;
var bounceLocation;
var bounce = 1;
var uColorLoc;
var flagLocation;
var flag = 0.0;

var sqVertexPositionBuffer;
var sqVertexIndexBuffer;
var lightPosition = [0.0, -0.3, 0.8];
var eyePos = [0.0, 0.0, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];
var Contrast = 0.0;
var Brightness = 0.0;

var contrastLocation;
var brightnessLocation;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = vec4(aPosition,0.0,1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec3 eyePos;
uniform float canvWidth;
uniform float flag;
uniform int bounce;
uniform float canvHeight;
uniform vec4 color;
uniform vec3 lightPos;

struct Sphere {
    vec3 center;
    float radius;
    vec3 color1;
    vec3 acolor;
};

struct Ray {
    vec3 origin;
    vec3 direction;
};
vec3 specularColor = vec3(1.0, 1.0, 1.0); // Specular color
float shininess = 100.0;
Sphere spheres[4];
// Compute ray-sphere intersection
bool intersectSphere(Ray ray, Sphere sphere, out float t) {
    vec3 oc = ray.origin - sphere.center;
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(ray.direction,oc);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;
    float discriminant = b * b - 4.0 * a * c;
    // fragColor = vec4(a,a,a,1.0);
    if (discriminant > 0.0) {
        // fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
        float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
        t = min(t1, t2);
        return true;
    }
    else if (discriminant == 0.0) {
        t = -b / (2.0*a);
        return true;
    }
    // fragColor=vec4(a,a,a,1.0);
    return false;
}

// Generate a ray from the camera to the pixel
Ray generateRay(float x, float y) {
    Ray ray;
    ray.origin = vec3(0.0, 0.0,1.0);
    // Calculate ray direction
    ray.direction = normalize(vec3(x-0.5, 0.5-y, -1.0));    

    return ray;
}



vec3 calculatePhongShading(vec3 normal, vec3 hitPoint, vec3 lightPos, vec3 eyePosition, vec3 ambientColor, vec3 diffuseColor, vec3 specularColor, float shininess) {
    // Light direction should be from the hit point to the light source
    vec3 lightDir = normalize(lightPos - hitPoint);
    
    // View direction should be from the eye (camera) to the hit point
    vec3 viewDir = normalize(eyePos - hitPoint);
    
    // Reflect direction for the light
    vec3 reflectDir = reflect(-lightDir, normal);

    // Ambient component
    vec3 ambient = ambientColor * 0.25;

    // Diffuse component
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diffuseColor * diff;

    // Specular component
    float spec = pow(max(dot(reflectDir, viewDir), 0.0), shininess);
    vec3 specular = specularColor * spec;

    // Combine components
    vec3 phongColor = ambient + diffuse + specular;

    return phongColor;
}
bool inShadow(int originatingSphereIndex, vec3 normal, vec3 intersectionPoint, vec3 lightPosition, Sphere spheres[4], int numSpheres) {
    vec3 shadowRayOrigin = intersectionPoint + normal * 0.001; // A small offset to avoid self-intersection
    vec3 shadowRayDirection = normalize(lightPosition - intersectionPoint);
    Ray shadowRay = Ray(shadowRayOrigin, shadowRayDirection);
    float lightDistance = length(lightPosition - intersectionPoint);
    float t;

    for (int i = 0; i < 4; ++i) {
        if (i != originatingSphereIndex) {
            if (intersectSphere(shadowRay, spheres[i], t) && t < lightDistance) {
                return true; // The point is in shadow
            }
        }
    }
    return false; // The point is not in shadow
}

vec3 calculateReflection(Ray ray, int sphereIndex, vec3 normal, vec3 hitPoint, int maxDepth) {
    vec3 cumulativeColor = vec3(0.0);
    vec3 reflectionColor;
    int currentSphereIndex = sphereIndex;
    
    // Iterative recursion simulation
    for (int depth = 0; depth < maxDepth; depth++) {
        // Calculate reflection direction
        vec3 reflectDir = reflect(ray.direction, normal);

        // Create the reflection ray
        Ray reflectRay;
        reflectRay.origin = hitPoint + normal * 0.001; // Offset to avoid self-intersection
        reflectRay.direction = reflectDir;

        // Reset closest intersection
        float closestT = 10000.0;
        int closestSphereIndex = -1;
        float t;

        // Check for intersection with any sphere except the one we're coming from
        for (int i = 0; i < 4; ++i) {
            if (i != currentSphereIndex && intersectSphere(reflectRay, spheres[i], t)) {
                if (t < closestT && t > 0.0) {
                    closestT = t;
                    closestSphereIndex = i;
                }
            }
        }

        // If there's an intersection, calculate the Phong shading for the reflected color
        if (closestSphereIndex != -1) {
            vec3 newHitPoint = reflectRay.origin + closestT * reflectRay.direction;
            vec3 newNormal = normalize(newHitPoint - spheres[closestSphereIndex].center);
            
            vec3 ambientColor = spheres[closestSphereIndex].acolor * 0.1;
            vec3 diffuseColor = spheres[closestSphereIndex].color1;
            vec3 specularColor = vec3(1.0, 1.0, 1.0);
            float shininess = 100.0;

            // Calculate the Phong shading for the new hit point
            reflectionColor = calculatePhongShading(newNormal, newHitPoint, lightPos, eyePos, ambientColor, diffuseColor, specularColor, shininess);

            // Add to the cumulative color
            cumulativeColor += reflectionColor;

            // Update the ray, normal, and hitPoint for the next iteration (bounce)
            ray = reflectRay;
            normal = newNormal;
            hitPoint = newHitPoint;
            currentSphereIndex = closestSphereIndex;
        } else {
            // If no intersection is found, break from the loop
            break;
        }
    }

    // Clamp cumulative color to avoid exceeding color bounds
    cumulativeColor = clamp(cumulativeColor, 0.0, 1.0);
    return cumulativeColor;
}






void main() {
    float closestT = 10000.0; // Use a large number to initialize
    int closestSphereIndex = -1; // -1 will signify no intersection
    // vec3 lightPos = vec3(0.0, -0.3, 0.8);
    vec3 ambientColor ; // Ambient color
    vec3 diffuseColor ; // Diffuse color
    vec3 aColor;
    // vec3 specularColor = vec3(1.0, 1.0, 1.0); // Specular color
    // float shininess = 100.0; // Shininess factor
    
    // Sphere sphere,sphere1,sphere2,sphere3;

    spheres[0].center = vec3(0.0,-0.05,0.52);
    spheres[0].radius = 0.07;
    spheres[0].color1 = vec3(1.0, 0.0, 0.0); 
    spheres[0].acolor = vec3(1.0, 0.0, 0.0);// Red sphere
    
    spheres[1].center = vec3(0.15,0.0,0.6);
    spheres[1].radius = 0.09;
    spheres[1].color1 = vec3(0.0, 0.0,1.0);
    spheres[1].acolor = vec3(0.0, 0.0,1.0);


    spheres[2].center = vec3(-0.15,0.0,0.6);
    spheres[2].radius = 0.09;
    spheres[2].color1 = vec3(0.0, 1.0,0.0);
    spheres[2].acolor = vec3(0.0, 1.0,0.0);


    spheres[3].center = vec3(0.0,0.4,0.48);
    spheres[3].radius = 0.35;
    spheres[3].color1 = vec3(0.4, 0.4,0.4);
    spheres[3].acolor =vec3(0.4, 0.4,0.4);

    
    vec2 normalizedCoords = gl_FragCoord.xy / vec2(canvWidth, canvWidth);
    Ray ray = generateRay(normalizedCoords.x, normalizedCoords.y);
    // fragColor=vec4(normalizedCoords,0.0,1.0);
    float t;
    for (int i = 0; i < 4; ++i) {
        float t;
        if (intersectSphere(ray, spheres[i], t)) {
            // Only consider intersections that are closer than all previous ones
            // and in front of the camera (t > 0)
            if (t > 0.0 && t < closestT) {
                closestT = t;
                closestSphereIndex = i;
            }
        }
    }

    if (closestSphereIndex!=-1) {
        // Calculate intersection point and normal for the closest sphere
        vec3 hitPoint = ray.origin + closestT * ray.direction;
        vec3 normal = normalize(hitPoint - spheres[closestSphereIndex].center);

        ambientColor = vec3(0.2, 0.2, 0.2); // Ambient color for the closest sphere
        bool shadow;
        // Determine if the point is in shadow
       
        if(closestSphereIndex==3)
         shadow = inShadow(closestSphereIndex, normal, hitPoint, lightPos, spheres, 4);
            else 
        shadow=false;
        vec3 normalColor = 0.5 + 0.5 * normal; // This maps the normal from [-1,1] to [0,1]
        
        if(flag==0.0)
        {
            aColor=spheres[closestSphereIndex].acolor;
            diffuseColor = spheres[closestSphereIndex].color1;
            vec3 phongColor = calculatePhongShading(normal, hitPoint, lightPos, eyePos, aColor, diffuseColor, specularColor, shininess);
            fragColor = vec4(phongColor, 1.0);
        }
        else if(flag==1.0){
            if (!shadow) {
                // If not shadowed, calculate Phong shading
                aColor=spheres[closestSphereIndex].acolor;
                diffuseColor = spheres[closestSphereIndex].color1;
                vec3 phongColor = calculatePhongShading(normal, hitPoint, lightPos, eyePos, aColor, diffuseColor, specularColor, shininess);
                fragColor = vec4(phongColor, 1.0);
                // fragColor = vec4(normalColor, 1.0);
            } else {
                // If shadowed, darken the color or use ambient color
                
                fragColor = vec4(ambientColor , 1.0);
                
                
               
            }

        }
        else if(flag==2.0)
        {
            vec3 reflectionColor = calculateReflection(ray, closestSphereIndex, normal, hitPoint, bounce); // 1 is the depth of recursion
            aColor=spheres[closestSphereIndex].acolor;
                diffuseColor = spheres[closestSphereIndex].color1;
                vec3 phongColor = calculatePhongShading(normal, hitPoint, lightPos, eyePos, aColor, diffuseColor, specularColor, shininess);
                if (reflectionColor != vec3(0.0, 0.0, 0.0)) {
                    // Mix Phong and reflection colors
                    fragColor = vec4(mix(phongColor, reflectionColor, 0.6), 1.0);
                } else {
                    // Use Phong color if reflection color is the default (no reflection)
                    fragColor = vec4(phongColor, 1.0);
                }
        }
        else if(flag==3.0){
            if (!shadow) {
                // If not shadowed, calculate Phong shading
                vec3 reflectionColor = calculateReflection(ray, closestSphereIndex, normal, hitPoint, bounce); // 1 is the depth of recursion
                aColor=spheres[closestSphereIndex].acolor;
                diffuseColor = spheres[closestSphereIndex].color1;
                vec3 phongColor = calculatePhongShading(normal, hitPoint, lightPos, eyePos, aColor, diffuseColor, specularColor, shininess);
                if (reflectionColor != vec3(0.0, 0.0, 0.0)) {
                    // Mix Phong and reflection colors
                    fragColor = vec4(mix(phongColor, reflectionColor, 0.6), 1.0);
                } else {
                    // Use Phong color if reflection color is the default (no reflection)
                    fragColor = vec4(phongColor, 1.0);
                }
                // fragColor = vec4(normalColor, 1.0);
            } else {
                // If shadowed, darken the color or use ambient color
                vec3 reflectionColor = calculateReflection(ray, closestSphereIndex, normal, hitPoint, bounce); // 1 is the depth of recursion
                fragColor =vec4(mix(ambientColor, reflectionColor, 0.6), 1.0);
                
                
               
            }
        }
        
    } 
     else {
        // If no intersection with any sphere, set background color
        fragColor = color;
    }

}

`;

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
    // Define the vertices of the square as two triangles
    const sqVertices = new Float32Array([-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1, ]);
    sqVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
    sqVertexPositionBuffer.itemSize = 2;
    sqVertexPositionBuffer.numItems = 4; // Four vertices in the square
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

    gl.uniform4fv(uColorLoc, color);

    // Use gl.drawArrays with TRIANGLES and 6 vertices
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    var animate = function() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.identity(vMatrix);
        vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
        gl.uniform3fv(uEyePositionLocation, eyePos);
        gl.uniform1f(canvHeightLocation, canvas.height);
        gl.uniform1f(canvWidthLocation, canvas.width);
        gl.uniform1i(bounceLocation, bounce);
        gl.uniform3fv(uLightPositionLocation, lightPosition);
        // console.log(canvas.width, canvas.height);
        mat4.identity(mMatrix);
        color = [0.0, 0.0, 0.0, 1.0];
        drawSquare(color, mMatrix);
        // drawTriangle(color, mMatrix);
    };

    animate();
}

// This is the entry point from the html
function webGLStart() {
    canvas = document.getElementById("HierarchicalTransformation");
    initGL(canvas);
    gl.enable(gl.DEPTH_TEST);
    shaderProgram = initShaders();
    const lightSlider = document.getElementById("Light");

    // Initialize light position
    let lightX = parseFloat(lightSlider.value);

    // Update light position when the slider changes
    lightSlider.addEventListener("input", (event) => {
        lightX = parseFloat(event.target.value);
        lightPosition = [lightX, -0.3, 0.8];

        drawScene();
    });
    const bounceSlider = document.getElementById("Bounce");

    // Initialize light position
    let limit = parseFloat(bounceSlider.value);

    // Update light position when the slider changes
    bounceSlider.addEventListener("input", (event) => {
        limit = parseFloat(event.target.value);
        bounce = limit;
        drawScene();
    });
    var phongButton = document.getElementById("Phong");
    var phongShadowButton = document.getElementById("Phong+Shadow");
    var phongReflectionButton = document.getElementById("Phong+Reflection");
    var phongShadowReflectionButton = document.getElementById(
        "Phong+Shadow+Reflection"
    );
    phongButton.addEventListener("click", function() {
        flag = 0;
        gl.uniform1f(flagLocation, flag);
        drawScene();
        // You can perform additional actions if needed
    });

    phongShadowButton.addEventListener("click", function() {
        flag = 1;
        gl.uniform1f(flagLocation, flag);
        drawScene();
        // You can perform additional actions if needed
    });

    phongReflectionButton.addEventListener("click", function() {
        flag = 2;
        gl.uniform1f(flagLocation, flag);
        drawScene();
        // You can perform additional actions if needed
    });

    phongShadowReflectionButton.addEventListener("click", function() {
        flag = 3;
        gl.uniform1f(flagLocation, flag);
        drawScene();
        // You can perform additional actions if needed
    });

    //get locations of attributes declared in the vertex shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    contrastLocation = gl.getUniformLocation(shaderProgram, "contrast");
    brightnessLocation = gl.getUniformLocation(shaderProgram, "brightness");
    uEyePositionLocation = gl.getUniformLocation(shaderProgram, "eyePos");
    canvWidthLocation = gl.getUniformLocation(shaderProgram, "canvWidth");
    canvHeightLocation = gl.getUniformLocation(shaderProgram, "canvHeight");
    uColorLoc = gl.getUniformLocation(shaderProgram, "color");
    flagLocation = gl.getUniformLocation(shaderProgram, "flag");
    uLightPositionLocation = gl.getUniformLocation(shaderProgram, "lightPos");
    bounceLocation = gl.getUniformLocation(shaderProgram, "bounce");
    gl.enableVertexAttribArray(aPositionLocation);

    initSquareBuffer();
    drawScene();
}