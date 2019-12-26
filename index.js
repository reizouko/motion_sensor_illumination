/**
 * Copyright 2019 Plus Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { Gpio } = require('pigpio');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const {
  LED1,
  LED2,
  open,
  Linear,
  LinearAndKeep,
  SineWave,
  Parabola1,
  Parabola2,
  Flash3,
  Half,
  SyncMusic,
  On,
  Off,
  close
} = require('./flashing_pattern.js');

open();

process.on('SIGINT', () => {
  illuminationStop();
  close();
  process.exit();
});

class Illumination {
  constructor() {
    this.illuminations = [
      {
        led1: new Off(LED1),
        led2: new Off(LED2)
      },
      {
        led1: new Parabola1(LED1, 4000, 0),
        led2: new Parabola1(LED2, 4000, 0)
      },
      {
        led1: new LinearAndKeep(LED1, 2000, 0),
        led2: new LinearAndKeep(LED2, 2000, 1000)
      },
      {
        led1: new Flash3(LED1, 1300, 0),
        led2: new Flash3(LED2, 1300, 650)
      },
      {
        led1: new Half(LED1, 100, 0),
        led2: new Half(LED2, 100, 50)
      }
    ];
    this.currentLed1 = null;
    this.currentLed2 = null;
  }
  
  start(level) {
    this.currentLed1 = this.illuminations[level].led1;
    this.currentLed2 = this.illuminations[level].led2;
    this.currentLed1.start();
    this.currentLed2.start();
  }
  
  stop() {
    if (this.currentLed1 != null) {
      this.currentLed1.stop();
    }
    if (this.currentLed2 != null) {
      this.currentLed2.stop();
    }
  }
}

const illumination = new Illumination();

function illuminationStart(level) {
  io.emit('music', level);
  illumination.start(level);
}
function illuminationStop() {
  io.emit('music', 0);
  illumination.stop();
}

const sensor = new Gpio(21, {mode: Gpio.INPUT});

let level = 0;
let readLock = false;
let timer = null;

setInterval(() => {
  if (!readLock) {
    const sensorValue = sensor.digitalRead();
    if (sensorValue == 1) {
      readLock = true;
      setTimeout(() => {
        readLock = false;
      }, 3000);
      if (timer != null) {
        clearTimeout(timer);
      }
      if (level / 10 < illumination.illuminations.length - 1) {
        level++;
        if (level % 10 == 0) {
          illuminationStop();
          illuminationStart(level / 10);
        }
      }
      timer = setTimeout(() => {
        illuminationStop();
        level = 0;
      }, 20000);
    }
  }
}, 15);

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/static/index.html`);
});

app.use('/music', express.static(`${__dirname}/static/music`));

io.on('connection', socket => {
  console.log('Socket connected');
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});
