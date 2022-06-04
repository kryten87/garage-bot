import os
import select
import json

try:
  import pifacedigitalio
except ImportError:
  pifacedigitalio = False

# the number of seconds to press the button the garage remote
# @TODO figure out how long to delay to trigger the remote
#
GARAGE_REMOTE_PRESS_LENGTH = 1

# INPUT to Python driver -- so we send commands on the input pipe; listen for
# responses on the output pipe
INPUT_PIPE = '/tmp/gpio_driver_input'
OUTPUT_PIPE = '/tmp/gpio_driver_output'

DOOR_SWITCH_INPUT = 0

DOOR_REMOTE_RELAY = 0
LIGHT_RELAY = 1

piface = pifacedigitalio.PiFaceDigital() if pifacedigitalio != False else False

def log(message):
  print(f'[GPIO Driver] {message}')

def querySwitch(number):
  result = piface.switches[number].value if pifacedigitalio != False else False
  log(f'querying input {number} - result = {result}')
  return result

def setOutput(number, state):
  log(f'setting output {number} to {state}')
  if state:
    if pifacedigitalio:
      piface.output_pins[number].turn_on()
  else:
    if pifacedigitalio:
      piface.output_pins[number].turn_off()
  return True;

def setRelay(number, state):
  log(f'setting relay {number} to {state}')
  if state:
    if pifacedigitalio:
      piface.relays[number].turn_on()
  else:
    if pifacedigitalio:
      piface.relays[number].turn_off()
  return True;

def createPipe(pipeName, flags):
  log(f'creating pipe {pipeName}')
  os.mkfifo(pipeName)
  return os.open(pipeName,flags)

def getMessage(pipe):
  log("getting message from pipe")
  return os.read(pipe, 20 * 1024);

if __name__ == "__main__":
  log("creating input pipe")
  inputPipe = createPipe(INPUT_PIPE, os.O_RDONLY | os.O_NONBLOCK)

  try:
    log("waiting for output pipe to open")
    # loop until the output pipe shows up
    #
    while True:
      try:
        outputPipe = os.open(OUTPUT_PIPE, os.O_WRONLY)
        break
      except:
        # wait for output pipe to get initialized
        pass

    log("output pipe open; waiting for input")
    try:
      # intialize the poller
      #
      poll = select.poll()
      poll.register(inputPipe, select.POLLIN)

      try:
        # loop forever...
        #
        while True:
          # check the INPUT_PIPE for a request
          #
          if (inputPipe, select.POLLIN) in poll.poll(100):
            # get the input from the pipe
            #
            msg = getMessage(inputPipe)

            # JSON parse the message
            #
            value = json.loads(msg)

            # get the result from the appropriate function
            #
            result = False
            if "input" in value:
              result = querySwitch(value["input"])
            elif "output" in value:
              pin = list(value["output"].keys())[0]
              state = value["output"][pin]
              result = setOutput(pin, state)
            elif "relay" in value:
              relay = list(value["relay"].keys())[0]
              state = value["relay"][relay]
              result = setRelay(relay, state)

            # write the response to the pipe
            #
            os.write(outputPipe, json.dumps(result).encode())
      finally:
        # shut down the poller
        #
        poll.unregister(inputPipe)
    finally:
      # close the input pipe
      #
      os.close(inputPipe)
  finally:
    # remove both pipes
    #
    os.remove(INPUT_PIPE)
    os.remove(OUTPUT_PIPE)
