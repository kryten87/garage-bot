import pifacedigitalio
import time
import os
import select

# the number of seconds to press the button the garage remote
# @TODO figure out how long to delay to trigger the remote
#
GARAGE_REMOTE_PRESS_LENGTH = 1

# INPUT to Python driver -- so we send commands on the input pipe; listen for
# responses on the output pipe
INPUT_PIPE = 'gpio_driver_input'
OUTPUT_PIPE = 'gpio_driver_output'

DOOR_SWITCH_INPUT = 0

DOOR_REMOTE_RELAY = 0
LIGHT_RELAY = 1

piface = pifacedigitalio.PiFaceDigital()

def querySwitch(number):
  return False
  # return piface.switches[number].value

def setOutput(number, state):
  if state:
    print("setting output on", number)
    # piface.output_pins[number].turn_on()
  else
    print("setting output off", number)
    # piface.output_pins[number].turn_off()

def setRelay(number, state):
  if state:
    print("setting relay on", number)
    # piface.relays[number].turn_on()
  else
    print("setting relay off", number)
    # piface.relays[number].turn_off()

def handleIncomingMessage(message):
  return message

def createPipe(pipeName, flags):
  os.mkfifo(pipeName)
  return os.open(pipeName,flags)

def getMessage(pipe):
  return os.read(pipe, 20 * 1024);

if __name__ == "__main__":
  # create the pipes
  #
  print("creating pipe")
  inputPipe = createPipe(INPUT_PIPE, os.O_RDONLY | os.O_NONBLOCK)

  try:
    print("waiting for output pipe to open")
    while True:
      try:
        outputPipe = os.open(OUTPUT_PIPE, os.O_WRONLY)
        print("output pipe ready")
        break
      except:
        # wait for output pipe to get initialized
        pass

    print("output pipe open; waiting for input")
    try:
      poll = select.poll()
      poll.register(inputPipe, select.POLLIN)

      try:
        while True:
          # check the INPUT_PIPE for a request
          #
          if (inputPipe, select.POLLIN) in poll.poll(100):
            msg = getMessage(inputPipe)
            msg = handleIncomingMessage(msg)
            print("received", msg)
            os.write(outputPipe, msg)
      finally:
        poll.unregister(inputPipe)
    finally:
      os.close(inputPipe)
  finally:
    os.remove(INPUT_PIPE)
    os.remove(OUTPUT_PIPE)
