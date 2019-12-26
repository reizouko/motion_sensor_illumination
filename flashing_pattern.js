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

const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;

const LED1 = 18;
const LED2 = 13;
module.exports.LED1 = LED1;
module.exports.LED2 = LED2;
const PWM_FREQUENCY = 64;
const PWM_MAX = 1000000;
const INTERVAL = 15;

const pins = {};

function open() {
  pins[LED1] = new Gpio(LED1, {mode: Gpio.OUTPUT});
  pins[LED2] = new Gpio(LED2, {mode: Gpio.OUTPUT});
}

class FlashingPattern {
  constructor(pin, period, offset) {
    this.pin = pin;
    this.period = period;
    this.offset = offset % period;
  }

  start() {
    let time = this.offset;
    this.timer = setInterval(() => {
      const value = this.calc(time);
      pins[this.pin].hardwarePwmWrite(PWM_FREQUENCY, Math.round(value));
      time = (time + INTERVAL) % this.period;
    }, INTERVAL);
  }

  stop() {
    clearInterval(this.timer);
    pins[this.pin].hardwarePwmWrite(PWM_FREQUENCY, 0);
  }
}

class Linear extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    this.slope = PWM_MAX * 2 / period;
  }

  calc(time) {
    return (time < this.period / 2) ?
      this.slope * time :
      PWM_MAX * 2 - this.slope * time;
  }
}

class LinearAndKeep extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    this.changingPeriod = period / 4;
    this.slope = PWM_MAX / this.changingPeriod;
  }
  
  calc(time) {
    if (time < this.changingPeriod) {
      return this.slope * time;
    } else if (time < this.changingPeriod * 2) {
      return PWM_MAX;
    } else if (time < this.changingPeriod * 3) {
      return PWM_MAX * 3 - this.slope * time;
    } else {
      return 0;
    }
  }
}

class SineWave extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
  }

  calc(time) {
    return PWM_MAX * (Math.sin(2 * Math.PI * time / this.period) + 1) / 2;
  }
}

class Parabola1 extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    this.half = period / 2;
  }

  calc(time) {
    return -PWM_MAX * time * (time - this.period) / Math.pow(this.half, 2);
  }
}

class Parabola2 extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    this.half = period / 2;
  }

  calc(time) {
    return PWM_MAX * Math.pow(time / this.half - 1, 2);
  }
}

class Flash3 extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    const flashingDuration = period / 15;
    this.period1Start = 0;
    this.period1End = this.period1Start + flashingDuration;
    this.period2Start = period / 8;
    this.period2End = this.period2Start + flashingDuration;
    this.period3Start = period / 4;
    this.period3End = this.period3Start + flashingDuration;
  }

  calc(time) {
    return (this.period1Start <= time && time < this.period1End) ||
          (this.period2Start <= time && time < this.period2End) ||
          (this.period3Start <= time && time < this.period3End) ?
        PWM_MAX : 0;
  }
}

class Half extends FlashingPattern {
  constructor(pin, period, offset) {
    super(pin, period, offset);
    this.half = period / 2;
  }

  calc(time) {
    return time < this.half ? PWM_MAX : 0;
  }
}

class SyncMusic extends FlashingPattern {
  constructor(pin) {
    super(pin, 163000, 0);
    this.linear1 = new Linear(-1, 4000, 0);
    this.half = new Half(-1, 200, 0);
    this.linearAndKeep = new LinearAndKeep(-1, 12000, 0);
    this.linear2 = new Linear(-1, 5400, 0);
  }
  
  calc(time) {
    if (time < 3600) {
      return 0;
    } else if (time < 11600) {
      return this.linear1.calc((time - 3600) % 4000);
    } else if (time < 14000) {
      return 0;
    } else if (time < 16000) {
      return this.linear1.calc((time - 14000) % 4000);
    } else if (time < 18500) {
      return this.half.calc((time - 16000) % 200);
    } else if (time < 20500) {
      return PWM_MAX;
    } else if (time < 23200) {
      return this.linear2.calc((time - 17800) % 5400);
    } else {
      return PWM_MAX;
    }
  }
}

class On {
  constructor(pin) {
    this.pin = pin;
  }

  start() {
    pins[this.pin].hardwarePwmWrite(PWM_FREQUENCY, PWM_MAX);
  }

  stop() {
    pins[this.pin].hardwarePwmWrite(PWM_FREQUENCY, 0);
  }
}

class Off {
  constructor(pin) {
    this.pin = pin;
  }

  start() {
    pins[this.pin].hardwarePwmWrite(PWM_FREQUENCY, 0);
  }

  stop() {}
}
module.exports.Off = Off;

function close() {
  pigpio.terminate();
}

module.exports.open = open;
module.exports.Linear = Linear;
module.exports.LinearAndKeep = LinearAndKeep;
module.exports.SineWave = SineWave;
module.exports.Parabola1 = Parabola1;
module.exports.Parabola2 = Parabola2;
module.exports.Flash3 = Flash3;
module.exports.Half = Half;
module.exports.SyncMusic = SyncMusic;
module.exports.On = On;
module.exports.close = close;
