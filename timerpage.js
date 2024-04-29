let state = 0;
/*
0: timer 0:00, spacebar is not pressed -->spacebar press
1: spacebar pressed aka hands on stackmat, timer is not ready -->0.1s
2: spacebar still pressed, timer is ready (0.1s has passed) -->spacebar release
3: timer is timing --> any keypress
4: timer is waiting for key to be released --> key release
5: a time is shown on the timer --> pressing OK, X, +2, or DNF
*/

// divs for HTML control
const scramblediv = document.getElementById("scramblediv");
const timerdiv = document.getElementById("timerdiv");
const infodiv = document.getElementById("infodiv");
const canvas = document.getElementById("infocanvas");
const ctx = canvas.getContext("2d");
const averagesdiv = document.getElementById("averagesdiv");

const testdiv = document.getElementById("testdiv");

// timekeeping
let start = Date.now();
let elapsedTime = 0;
let timingInterval;

let spacePressed = false;

// store times.
// element properties:
// time: the actual time.
// meta: the metadata around the time. 'ok', 'plus', or 'dnf'
let times = [];
// let timesstate = []; // 'ok', 'plus', or 'dnf'
let currentAO5 = -1; //-1 = DNF

function toSolvingUI() {
  scramblediv.style.opacity = "0%";
  infodiv.style.opacity = "0%";
  timerdiv.style.fontSize = "22vmin";
}

function toNormalUI() {
  scramblediv.style.opacity = "100%";
  infodiv.style.opacity = "100%";
  timerdiv.style.fontSize = "20vmin";
}

function timerStyle(style) {
  switch (style) {
    case "normal":
      timerdiv.style.fontSize = "20vmin";
      timerdiv.style.color = "black";
      break;
    case "red":
      timerdiv.style.fontSize = "20vmin";
      timerdiv.style.color = "darkred";
      break;
    case "green":
      timerdiv.style.fontSize = "22vmin";
      timerdiv.style.color = "green";
      break;
    case "timing":
      timerdiv.style.fontSize = "22vmin";
      timerdiv.style.color = "black";
      break;
    default:
      timerStyle.style.color = "aqua";
      break;
  }
}

// returns an ao5 based on the values given
function calcAO5(values) {
  // cut off the best and worst solve, take the mean of the other 3
  // assume values are already sorted
  try {
    return (values[1].time + values[2].time + values[3].time) / 3; // JS is zero-indexed
  } catch (error) {
    return NaN; // one or more of the values was undefined
  }
}

function updateAO5() {
  testdiv.textContent = JSON.stringify(times);

  const last5time = times.slice(-5);
  // make a list of times that do not have DNFs
  let filteredLast5 = last5time.filter(element => !element.meta.includes('dnf'));
  // sort the ok times
  filteredLast5.sort((a, b) => a.time - b.time);
  currentAO5 = calcAO5(filteredLast5);

  // update the text
  averagesdiv.textContent = "ao5 " + (isNaN(currentAO5) ? "DNF" : formatTime(Math.round(currentAO5)));

  // update the canvas
  redrawCanvas();
}

document.addEventListener("keydown", function (event) {
  switch (state) {
    case 0:
      // hands on stackmat
      if (event.key === " ") {

        toSolvingUI();
        // color timer red to indicate space must keep being held
        timerStyle("red");

        state = 1;
        spacePressed = true;
        state1();
      }
      break;
    case 3:
      spacePressed = true;
      clearInterval(timingInterval);
      toNormalUI();
      timerStyle("normal");
      state = 4;
      break;
    case 4:
      break;
    default:
      break;
  }
});

document.addEventListener("keyup", function (event) {
  switch (state) {
    case 1:
      spacePressed = false;
      // going to state 0 handled by state1()
      break;
    case 2:
      spacePressed = false;
      timerStyle("timing");
      state = 3;
      state3();
      break;
    case 4:
      spacePressed = false;
      state = 5; // wait for user to press OK, +2, DNF, or Remove
      break;
    default:
      break;
  }
});

function state1() {
  // wait 0.6s for the timer to be ready
  let readyTimeout = setTimeout(function () {
    timerStyle("green");
    state = 2;
  }, 500);

  // cancel back to state 0 if the spacebar is released
  let readyCheckInterval = setInterval(function () {
    if (spacePressed === false && state === 1) {
      clearTimeout(readyTimeout);
      timerStyle("normal");
      toNormalUI();
      state = 0;
      clearInterval(readyCheckInterval);
    }
  }, 10);

}

// actual timing
function state3() {
  start = Date.now()
  timingInterval = setInterval(function () {
    elapsedTime = Date.now() - start;
    timerdiv.textContent = formatTime(elapsedTime);
  }, 1);
}

function formatTime(milliseconds) {
  // convert milliseconds to minutes, seconds, and remaining milliseconds
  var minutes = Math.floor(milliseconds / 60000);
  var seconds = Math.floor((milliseconds % 60000) / 1000);
  var remainingMilliseconds = milliseconds % 1000;

  // if minutes, put minutes, colon, and seconds padding if required
  var formattedTime = "";
  if (minutes > 0) formattedTime += minutes + (seconds < 10 ? ":0" : ":");
  formattedTime += seconds + "." + remainingMilliseconds.toString().padStart(3, "0");

  return formattedTime;
}

function handleButtonPress(button) {
  if (state === 5) { // these buttons only work in state 5, where the time is displayed on the timer
    switch (button) {
      case "ok":
        times.push({ time: elapsedTime, meta: 'ok' });
        // reset timer text
        timerdiv.textContent = "0.000";
        updateAO5();
        state = 0;
        break;
      case "+2":
        times.push({ time: elapsedTime + 2000, meta: 'plus' });
        // reset timer text
        timerdiv.textContent = "0.000";
        updateAO5();
        state = 0;
        break;
      case "dnf":
        times.push({ time: elapsedTime, meta: 'dnf' });
        // reset timer text
        timerdiv.textContent = "0.000";
        updateAO5();
        state = 0;
        break;
      case "x":
        // we don't have to add anything to the list, as "remove" was selected
        timerdiv.textContent = "0.000";
        state = 0;
        break;
      default:
        alert("no id found for button " + button);
        break;
    }
  }
  redrawCanvas();
}

// draw the ao5 visualization
function redrawCanvas() {

  // resize canvas to make sure there is no pixel distortion
  canvas.width = 2 * canvas.offsetWidth;
  canvas.height = 2 * canvas.offsetHeight;

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const last5time = times.slice(-5);

  // make and sort a list of times that do not have DNFs
  const okLast5 = last5time.filter(element => !element.meta.includes('dnf')).sort((a, b) => b.time - a.time);

  // ditto for the DNF times
  const dnfLast5 = last5time.filter(element => element.meta.includes('dnf')).sort((a, b) => b.time - a.time);
  const sortedLast5 = dnfLast5.concat(okLast5);

  // loop through every time and keep track of the maximum one
  const maxTime = sortedLast5.reduce(
    (acc, cur) => cur.time > acc ? cur.time : acc
    , 0);
  const minTime = sortedLast5.reduce(
    (acc, cur) => cur.time < acc ? cur.time : acc
    , maxTime); // use the maximum time as the starting value

  let heights = [];
  if (sortedLast5.length <= 1) { heights.push(canvas.height * 0.5); }
  else {
    sortedLast5.forEach(element => { // https://www.desmos.com/calculator/a4zrt90osp
      heights.push(canvas.height * ((0.9 * (element.time - minTime)) / (maxTime - minTime) + 0.1));
    });
  }

  for (let i = 4; i >= 0; i--) {
    try {
      switch (sortedLast5[i].meta) {
        case "ok":
          ctx.fillStyle = "#0000ff80";
          break;
        case "plus":
          ctx.fillStyle = "#2000ff80";
          break;
        case "dnf":
          ctx.fillStyle = "#00000080";
          break;
        default:
          ctx.fillStyle = "#ff000080";
          break;
      }
      ctx.fillRect((i * canvas.width) / 5, 0, canvas.width / 5, heights[i]);
      ctx.strokeRect((i * canvas.width) / 5, 0, canvas.width / 5, heights[i]);

      ctx.font = "40px Noto Sans Mono";
      ctx.fillStyle = "black";
      ctx.textAlign = "center"; 
      //console.log(heights[i]);
      ctx.fillText(formatTime(sortedLast5[i].time)+(sortedLast5[i].meta === "plus" ? "+" : ""), 
      0.2 * i * canvas.width + 0.1 * canvas.width, 
      heights[i] <= 0.5 * canvas.height ? heights[i] + 50: 0.5* heights[i]);

    } catch (error) { // handle when lists are undefined
      ;
    }
  }


}