from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import select
import json
from os.path import exists
from http.server import BaseHTTPRequestHandler, HTTPServer

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

HOSTNAME = "localhost"
PORT = 8080

def log(message):
  print(f'[GPIO Driver] {message}')

class SimpleHttpServer(BaseHTTPRequestHandler):
  def querySwitch(self, number):
    result = not piface.switches[number].value if pifacedigitalio != False else False
    return 1 if result else 0

  def setRelay(self, number, state):
    print(f'setting relay {number} to {state}')
    if state:
      if pifacedigitalio:
        piface.relays[number].turn_on()
    else:
      if pifacedigitalio:
        piface.relays[number].turn_off()
    return True;

  def handleStatusRequest(self):
    return { "status": 200, "state": self.querySwitch(DOOR_SWITCH_INPUT) }

  def handleRemoteRequest(self, state):
    if state != "0" and state != "1":
      return { "status": 400, "error": "bad request" }
    self.setRelay(DOOR_REMOTE_RELAY, state)
    return { "status": 200, "newState": state }

  def do_GET(self):
    path = self.path
    arg = ""
    if "?" in path:
      (path, arg) = self.path.split("?")
    response = { "status": 200 }
    if path == '/status':
      response = self.handleStatusRequest()
    elif path == "/door":
      log(f"arg = '{arg}'")
      if arg != "":
        (key, val) = arg.split("=")
        if key != "state":
          response = { "status": 400, "error": "bad request" }
        else:
          response = self.handleRemoteRequest(val)
      else:
        response = { "status": 400, "error": "bad request" }
    else:
      response = { "status": 404, "error": "not found" }

    self.send_response(response["status"])
    self.send_header('Content-type', 'application/json')
    self.end_headers()
    self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
  webServer = HTTPServer((HOSTNAME, PORT), SimpleHttpServer)
  log("server started")
  try:
    webServer.serve_forever()
  except KeyboardInterrupt:
    pass
  webServer.server_close()
  log("server stopped")

