
var frequency = 0;
var amplitude = 0;

var lowerFreqBound = 90;
var upperFreqBound = 300;

var lowerAmpBound = 0.05;
var upperAmpBound = 0.15;

var easing = 0.008;


var target = null;
var targetSize = 150;
var score = 0;
var aim;
var loadTime = 1000;
let playAreaHeight;
let textBarHeight = 30;
let ypadding = 10;


//-------------------------rnbo-----------------------------

let context;
let device;
let gainNode;
let started = false;
let stream;
let mediarecorder;
let chunks;
let audioRecording;
let isRecording = false;


async function loadRnbo( ){

  context = new AudioContext();

  let rawPatcher = await fetch("export/mypatch.export.json");
  let patcher = await rawPatcher.json();
  device = await RNBO.createDevice({ context, patcher });
  
  gainNode = context.createGain();
  gainNode.connect(device.node);
  //print all rnbo param Parameters
  device.parameters.forEach(parameter => {
  console.log(parameter.id);
  console.log(parameter.name);
  });


  device.messageEvent.subscribe((ev) => {

    if (ev.tag === "out3") 
    {
      frequency = ev.payload[0];
      amplitude = ev.payload[1];
    }
});

};

loadRnbo();

async function startAudio()
{
  if (started) return;

  started = true;
  context.resume();
  console.log("Audio started. Samplerate: "+context.sampleRate);
}

//----------------------Web Audio API------------------------
async function recordIntoBuffer()
{
  if(isRecording)
  {
    return;
  }

  console.log("Game started");

  isRecording = true;
  await startMicrophone();

  mediaRecorder = new MediaRecorder(stream);
  chunks = [];

  mediaRecorder.start();

  mediaRecorder.ondataavailable = (event) => {
    chunks.push(event.data);
  }
}

async function startMicrophone()
{

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    //mic input as an audionode
    const mic = context.createMediaStreamSource(stream);

    let audioDest = context.createMediaStreamDestination();
    mic.connect(gainNode);
    gainNode.connect(audioDest);
    stream = audioDest.stream;

  } catch (err) {
    console.log(err);
  }
}

async function stopMicrophone()
{
  
  if(!isRecording)
  {
    return;
  }

  console.log("Game stopped");
  isRecording = false;
  mediaRecorder.stop();

  mediaRecorder.onstop = (event) => {
    $("#sound-clip").empty();

    audioRecording = new Audio();
    audioRecording.setAttribute("controls", "");

    // Combine the audio chunks into a blob, then point the empty audio clip to that blob.
    const blob = new Blob(chunks, {"type": "audio/ogg; codecs=opus"});
    audioRecording.src = window.URL.createObjectURL(blob);

    $("#sound-clip").append(audioRecording);
    $("#sound-clip").append("<br />");

    chunks = [];

  };
}


// -----------------------p5--------------------------


function setup() {
    createCanvas(800, 800);
    createButtons();

    playAreaHeight = height-textBarHeight;

    spawnNewTarget();
    aim = new Aim(-100, -100);
}

function displayTextBar()
{
  strokeWeight(1);
  stroke(0);
  fill(255);
  rect(0, height-textBarHeight, width, textBarHeight);

  fill(0);
  textSize(20);
  text("Score: "+score, 100, height-ypadding);
}


function createButtons() {
  var yoffset = 18;

  let button1 = createButton('Play');
  button1.position(300, height - yoffset);

  let button2 = createButton('Stop');
  button2.position(400, height - yoffset);

  let button3 = createButton('Play Recording');
  button3.position(500, height- yoffset );

  let gainSlider = createSlider(0, 300);
  gainSlider.position(600, height- yoffset);
  gainSlider.size(100);
 // gainSlider.value = 100;

  button1.mousePressed(() => {
    recordIntoBuffer();
  });

  button2.mousePressed(() => {
    stopMicrophone();
  });

  button3.mousePressed(() => {
    audioRecording.play();
  });

  gainSlider.input(() => {
    var val = map(gainSlider.value(), 0, 300, 0.0, 3.0, true)
    gainNode.gain.value = val;
  });
}


function draw() {
    background(220);
    displayTextBar();
    target.display();
    aim.updatePosition();
    aim.display();
    aim.checkIfTargetHit();
  }

function spawnNewTarget()
{
    target = new Target(random(targetSize, width-targetSize), random(targetSize, playAreaHeight-targetSize), targetSize);
}

function mousePressed()
{
    startAudio();
}



function mouseInBounds()
{
  return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < playAreaHeight;
}

  
class Aim{

  constructor(x, y)
  {
    this.x = x;
    this.y = y;
    this.rad = 20;
    this.timeSinceLastHit = 0;

  }

  updatePosition()
  {
    if(mouseIsPressed && mouseInBounds())
    {
      this.x = mouseX;
      this.y = mouseY;
    }
    else
    {
      let scaledX = map(frequency, lowerFreqBound, upperFreqBound, 0, width, true);
      //console.log(amplitude);
      let scaledY = map(amplitude, lowerAmpBound, upperAmpBound, 0, playAreaHeight, true);

      let targetX = scaledX;
      let dx = targetX - this.x;
      this.x += dx * easing;
    
      let targetY = scaledY;
      let dy = targetY - this.y;
      this.y += dy * easing;

      //console.log(this.x+"        "+this.y);

    }
  }
  
  display()
  {
    fill(0);
    circle(this.x, this.y, this.rad);
  }
  
  checkIfTargetHit()
  {
    var d = dist(this.x, this.y, target.x, target.y);
    if(d < target.rad/2)
    {
      this.timeSinceLastHit += deltaTime;
      target.loading(this.timeSinceLastHit);
      
      if(this.timeSinceLastHit >= loadTime)
      {
        this.timeSinceLastHit = 0;
        score++;
        console.log("Hit Target; score: "+score);
        spawnNewTarget();
      }
      
    }
    else
    {
        this.timeSinceLastHit = 0;
        target.loadingCircles = [];
    }   
  }
}



class Target{
  
  constructor(x, y, r){
    this.x = x;
    this.y = y;
    this.rad = r
    this.loadingCircles = [];
    this.c = color(random(255), random(255), random(255));
  }
  
  
  display()
  {
    noStroke();
    fill(this.c);
    circle(this.x, this.y, this.rad);
    
    for(let lc of this.loadingCircles)
      {
        lc.display();
      }
  }
  
  loading(timePassed)
  {
    var lc = new LoadingCircle(this.x, this.y, timePassed, this.rad);
    this.loadingCircles.push(lc); 
  }
}


class LoadingCircle
{
    constructor(x, y, timePassed, targetRad){
    this.x = x;
    this.y = y;
    this.rad = 10
    this.c = color(255, 0, 0);
    this.offset = this.calculateOffset(timePassed);
    this.targetRad = targetRad;
  }
    
    display()
    {
      fill(this.c);
      let pos = createVector(this.x, this.y);
      this.offset.setMag(this.targetRad/2);
      pos.add(this.offset);
      circle(pos.x, pos.y, this.rad);
    }
  
    calculateOffset(timePassed)
  {
    var progress = timePassed/loadTime;
    var vec = this.calculateClockwiseVector(progress);
    return vec;
  }
  
  calculateClockwiseVector(t) 
  {
    let radians = t * TWO_PI -HALF_PI;
    let x = cos(radians);
    let y = sin(radians); 
    return createVector(x, y);
  }
  
}





