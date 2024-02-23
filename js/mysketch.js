
var frequency = 0;
var amplitude = 0;

var x = -100;
var y = -100;
var scaledX;
var scaledY;

var lowerFreqBound = 100;
var upperFreqBound = 600;

var lowerAmpBound = 0.0;
var upperAmpBound = 1.0;

var easing = 0.03;

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

// -----------------------p5--------------------------


function setup() {
    createCanvas(800, 800);
    createButtons();
}


function createButtons() {
  var yoffset = 20;

  let button1 = createButton('Record');
  button1.position(0, height + yoffset);

  let button2 = createButton('Stop Mic');
  button2.position(200, height + yoffset);

  let button3 = createButton('Play');
  button3.position(400, height + yoffset);

  let gainSlider = createSlider(0, 300);
  gainSlider.position(600, height+yoffset);
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

async function recordIntoBuffer()
{
  if(isRecording)
  {
    return;
  }

  console.log("Recording started");

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

  console.log("Recording stopped");
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


function draw() {
    background(255, 0 , 0);
    display();
}


function mousePressed()
{
    startAudio();
}


function display()
{
  scaledX = map(frequency, lowerFreqBound, upperFreqBound, 0, width, true);
  scaledY = map(amplitude, lowerAmpBound, upperAmpBound, 0, height, true);

  let targetX = scaledX;
  let dx = targetX - x;
  x += dx * easing;

  let targetY = scaledY;
  let dy = targetY - y;
  y += dy * easing;

  fill(0,0,255);
  circle(x, y, 20);
 // console.log(x, +"       "+y);
}








