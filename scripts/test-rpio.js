const rpio = require('rpio');

const pause = (duration) => new Promise(resolve => setTimeout(resolve, duration));

const button = () => {
  rpio.open(16, rpio.INPUT, rpio.PULL_UP);
  for (var i = 0; i < 100; i++) {
    const val = rpio.read(16);
    console.log(`${i} Pin is ${val ? 'High' : 'Low'}`);
    rpio.msleep(250);
  }
};

const blink = async () => {
  /*
  * Set the initial state to low.  The state is set prior to the pin
  * being actived, so is safe for devices which require a stable setup.
  */
  rpio.open(16, rpio.OUTPUT, rpio.LOW);

  /*
  * The sleep functions block, but rarely in these simple programs does
  * one care about that.  Use a setInterval()/setTimeout() loop instead
  * if it matters.
  */
  for (var i = 0; i < 5; i++) {
    /* On for 1 second */
    rpio.write(16, rpio.HIGH);
    rpio.sleep(1);

    /* Off for half a second (500ms) */
    rpio.write(16, rpio.LOW);
    rpio.msleep(500);
  }
};

// blink();
button();
