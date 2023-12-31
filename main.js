"use strict";

const  vertexShaderSource = `
       attribute vec2 a_coords;
       attribute vec3 a_color;
       varying vec3 v_color;
       attribute float a_size;
       varying float v_size;
       uniform float u_width;
       uniform float u_height;
       void main() {
            float x = -1.0 + 2.0 * (a_coords.x / u_width);
            float y = 1.0 - 2.0 * (a_coords.y / u_height);
            gl_Position = vec4(x, y, 0.0, 1.0);
            v_color = a_color;
            v_size = a_size;
            gl_PointSize = a_size;
       }`;

const  fragmentShaderSource =`
       precision mediump float;
       varying vec3 v_color;
       varying float v_size;
       void main() {
          float distanceFromCenter = distance( gl_PointCoord, vec2(0.5,0.5) );
          if ( distanceFromCenter >= 0.5 ) {
              discard;  // don't draw this pixel!
          }
          gl_FragColor = vec4(v_color, 1.0);
       }`;

let  canvas;  // The canvas where WebGL draws.
let  gl;  // The WebGL graphics context.

let  uniformWidth;   // Location of uniform named "u_width"
let  uniformHeight;  // Location of uniform named "u_height"
let  uniformPointsize;   // Location of uniform named "u_pointsize" 
let  attributeSize;
let  bufferSize; 

let  attributeCoords;  // Location of the attribute named "a_coords".
let  bufferCoords;     // A vertex buffer object to hold the values for coords.

let  attributeColor;   // Location of the attribute named "a_color".
let  bufferColor;     // A vertex buffer object to hold the values for color.

let  animating = false;  // why are you running?

/* Data for the points, including their coordinates, velocities and colors.
   The values for the arrays are created during initialization.  The random
   colors are used when the user selects colored rather than red points.
   The positions of the points are updated for each frame of the animation. */

const  POINT_COUNT = 15;
const  pointCoords = new Float32Array( 2*POINT_COUNT );
const  pointVelocities = new Float32Array( 2*POINT_COUNT );
const  pointRandomColors = new Float32Array( 3*POINT_COUNT );
const  sizeArray = new Float32Array(POINT_COUNT);

function createPointData() { // called during initialization to fill the arrays with data.
    for (let i = 0; i < POINT_COUNT; i++) {
        // Each point has two coordinates and two velocities.  Velocity number k
        // tells how fast coordinate number k changes in pixels per frame.
        
        pointCoords[2*i] = canvas.width * Math.random();  // x-coordinate of point
        pointCoords[2*i+1] = canvas.height * Math.random();  // y-coordinate of point

        let  randomVelocity = 4 + 3*Math.random();
        let  randomAngle = 2*Math.PI * Math.random();

        pointVelocities[2*i] = randomVelocity * Math.cos(randomAngle);
        pointVelocities[2*i+1] = randomVelocity * Math.sin(randomAngle);

        sizeArray[i] = Math.random() * 64 + 16;
    }
    for (let i = 0; i < 3 * POINT_COUNT; i++) {
           // The array contains color components, with three numbers per vertex.
           // The color components are just random numbers in the range zero to 1.
        pointRandomColors[i] = Math.random();
    }
}

function updatePointCoordsForFrame() { // called during an animation, before each frame.

        let  size = Number(document.getElementById("sizeChoice").value) / 2; // radius
        let  sizeArr = new Float32Array(POINT_COUNT * 2);

        for (let i = 0; i < POINT_COUNT; i++) { // fyll en size Array med proper storlek
            if(size != 0){
                sizeArr[i] = size;
            } else {
                sizeArr[i] = sizeArray[i];
            }
        } 
        detectCollisions(sizeArr); //detect collisions
        helper(sizeArr); //Draw collisions
}

function detectCollisions(sizeArr) {
    for (let i = 0; i < POINT_COUNT; i++) {
        for (let j = i + 1; j < POINT_COUNT; j++) {
            let x1 = pointCoords[2 * i];
            let x2 = pointCoords[2 * j];
            let y1 = pointCoords[2 * i + 1];
            let y2 = pointCoords[2 * j + 1];

            let dx = x1 - x2;
            let dy = y1 - y2;

            let distance = Math.sqrt(dx * dx + dy * dy);
            let combinedSize = sizeArr[i] + sizeArr[j];

            if (distance < combinedSize) {
                bounce(sizeArr, i, j);
            }
        }
    }
}

function bounce(sizeArr, i, j)
{
    let x1 = pointCoords[2 * i];
    let x2 = pointCoords[2 * j];

    let y1 = pointCoords[2 * i + 1];
    let y2 = pointCoords[2 * j + 1];
    
    let dx = x1 - x2;
    let dy = y1 - y2;

    let distance = Math.sqrt(dx * dx + dy * dy);
    let combinedSize = sizeArr[i] + sizeArr[j];

    // Calculate overlap amount
    let overlap = combinedSize - distance;

    // Calculate normalized collision vector
    let nx = dx / distance;
    let ny = dy / distance;

    // Move particles away from each other along the collision normal
    pointCoords[2 * i] += 0.5 * overlap * nx;
    pointCoords[2 * i + 1] += 0.5 * overlap * ny;

    pointCoords[2 * j] -= 0.5 * overlap * nx;
    pointCoords[2 * j + 1] -= 0.5 * overlap * ny;

    //ELASTIC BOUNCE

    let relativeVelocityX = pointVelocities[2 * i] - pointVelocities[2 * j];
    let relativeVelocityY = pointVelocities[2 * i + 1] - pointVelocities[2 * j + 1];

    let impulse = 2 * (nx * relativeVelocityX + ny * relativeVelocityY) / (1 / sizeArr[i] + 1 / sizeArr[j]);

    pointVelocities[2 * i] -= impulse * (1 / sizeArr[i]) * nx;
    pointVelocities[2 * i + 1] -= impulse * (1 / sizeArr[i]) * ny;

    pointVelocities[2 * j] += impulse * (1 / sizeArr[j]) * nx;
    pointVelocities[2 * j + 1] += impulse * (1 / sizeArr[j]) * ny;

}

function helper(size)
{
    for (let i = 0; i < 2*POINT_COUNT; i += 2) { // x-coords
        pointCoords[i] += pointVelocities[i];
        if (pointCoords[i]-size[i] < 0) {
            pointCoords[i] = size[i]-(pointCoords[i]-size[i]);// move coord back onto canvas
            pointVelocities[i] = Math.abs(pointVelocities[i]); // and make sure point is moving in positive direction
        }
        else if (pointCoords[i]+size[i] > canvas.width) {
            pointCoords[i] = canvas.width - (pointCoords[i]+size[i] - canvas.width) - size[i];// move coord back onto canvas
            pointVelocities[i] = -Math.abs(pointVelocities[i]); // and make sure point is moving in negative direction
        }
    }
    for (let i = 1; i < 2*POINT_COUNT; i += 2) { // y-coords
        pointCoords[i] += pointVelocities[i];
        if (pointCoords[i]-size[i] < 0) {
            pointCoords[i] = size[i]-(pointCoords[i]-size[i]);// move coord back onto canvas
            pointVelocities[i] = Math.abs(pointVelocities[i]); // and make sure point is moving in positive direction
        }
        else if (pointCoords[i]+size[i] > canvas.height) {
            pointCoords[i] = canvas.height - (pointCoords[i]+size[i] - canvas.height) - size[i];// move coord back onto canvas
            pointVelocities[i] = -Math.abs(pointVelocities[i]); // and make sure point is moving in negative direction
        }
    }     
}


/**
 *  Draws the content of the canvas, in this case, one primitive ot
 *  type gl.POINTS, which represents all of the disks in the image.
 */
function draw() {

    
    gl.clearColor(0.3, 0.3, 0.3, 1); // specify the color to be used for clearing <-- Task 1
    gl.clear(gl.COLOR_BUFFER_BIT);  // clear the canvas (to black)
    
    /* Get options from the user interface. */

    let  randomColors = document.getElementById("colorCheckbox").checked;
    let  pointsize = Number(document.getElementById("sizeChoice").value);
    
    /* Set up values for the "coords" attribute, giving point's positions */

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoords);
    gl.bufferData(gl.ARRAY_BUFFER, pointCoords, gl.STREAM_DRAW);
    gl.vertexAttribPointer(attributeCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeCoords); 
   
    /* Set up values for the "color" attribute */
    
    if ( randomColors ) { // use the attribute values from the color VBO, filled during initialization
        gl.enableVertexAttribArray(attributeColor); 
    }
    else { // turn off vertexAttribArray and set a constant attribute color
        gl.disableVertexAttribArray(attributeColor);
        var r = 255;
        var g = 215;
        var b = 0;
        gl.vertexAttrib3f(attributeColor, r/255, g/255, b/255); //Task 2
    }
    
    if(Number(document.getElementById("sizeChoice").value) == 0){
        gl.enableVertexAttribArray(attributeSize, 2.0);
    }else{
        gl.enableVertexAttribArray(attributeSize, 1.0);
        gl.disableVertexAttribArray(attributeSize);
        /* Set the pointsize uniform variable */
        gl.vertexAttrib1f(attributeSize, pointsize);
    }


    /* Set the pointsize uniform variable */
    
    //gl.uniform1f( uniformPointsize, pointsize );
    
    /* Draw all the points with one command. */
   
    gl.drawArrays(gl.POINTS, 0, POINT_COUNT);
    drawDots();
    
}

function drawDots(){
    
    if (!document.getElementById("dotsCheckbox").checked)
    {
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoords);
    gl.bufferData(gl.ARRAY_BUFFER, pointCoords, gl.STREAM_DRAW);

    gl.disableVertexAttribArray(attributeColor);
    gl.vertexAttrib3f(attributeColor, 0, 0, 0); //BLACK

    gl.disableVertexAttribArray(attributeSize);
    gl.vertexAttrib1f(attributeSize, 6);

    
    gl.drawArrays(gl.POINTS, 0, POINT_COUNT);
}

/**
 * Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 */
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
   let  vsh = gl.createShader( gl.VERTEX_SHADER );
   gl.shaderSource( vsh, vertexShaderSource );
   gl.compileShader( vsh );
   if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
      throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
   }
   let  fsh = gl.createShader( gl.FRAGMENT_SHADER );
   gl.shaderSource( fsh, fragmentShaderSource );
   gl.compileShader( fsh );
   if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
      throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
   }
   let  prog = gl.createProgram();
   gl.attachShader( prog, vsh );
   gl.attachShader( prog, fsh );
   gl.linkProgram( prog );
   if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
      throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
   }
   return prog;
}

/**
 * Initialize the WebGL graphics context
 */
function initGL() {
    let  prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );
    gl.useProgram(prog);

    attributeCoords = gl.getAttribLocation(prog, "a_coords");
    bufferCoords = gl.createBuffer();

    attributeColor = gl.getAttribLocation(prog, "a_color");
    attributeSize = gl.getAttribLocation(prog, "a_size");

    bufferColor = gl.createBuffer();
    bufferSize = gl.createBuffer();

    uniformHeight = gl.getUniformLocation(prog, "u_height");
    uniformWidth = gl.getUniformLocation(prog, "u_width");

    gl.uniform1f(uniformHeight, canvas.height);
    gl.uniform1f(uniformWidth, canvas.width);

    //uniformPointsize = gl.getUniformLocation(prog, "u_pointsize");
    createPointData();

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferColor);
    gl.bufferData(gl.ARRAY_BUFFER, pointRandomColors, gl.STREAM_DRAW);
    gl.vertexAttribPointer(attributeColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferSize);
    gl.bufferData(gl.ARRAY_BUFFER, sizeArray, gl.STREAM_DRAW);
    gl.vertexAttribPointer(attributeSize, 1, gl.FLOAT, false, 0, 0);
}

/*------------ Animation support ------------*/

function doFrame() {
    if (animating) {
        updatePointCoordsForFrame();
        draw();
        requestAnimationFrame(doFrame);
    }
}

function doAnimationCheckbox() {
    let  anim = document.getElementById("animateCheckbox").checked;
    if (anim !== animating) {
        animating = anim;
        if (animating) {
            doFrame();
        }
    }
}


/*-------------------------------------------*/

/**
 * Initialize the program.  This function is called after the page has been loaded.
 */
function init() {
    try {
        canvas = document.getElementById("webglcanvas");
        let  options = {  // no need for alpha channel or depth buffer in this program
            alpha: false,
            depth: false
        };
        gl = canvas.getContext("webgl", options);
              // (Note: this page would work with "webgl2", with no further modification.)
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }
    document.getElementById("animateCheckbox").checked = true;
    document.getElementById("colorCheckbox").checked = true;
    document.getElementById("dotsCheckbox").checked = true;
    document.getElementById("sizeChoice").value = "32";
    document.getElementById("animateCheckbox").onchange = doAnimationCheckbox;
    document.getElementById("colorCheckbox").onchange = function() {
        if (!animating) {
            draw();
        }
    };
    document.getElementById("sizeChoice").onchange = function() {
        if (!animating) {
            draw();
        }
    };
    doAnimationCheckbox();
}


window.onload = init;  // Arrange for init() to be called after page has loaded.