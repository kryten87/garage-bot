The Garage Bot Project
==================================

## Description

Provides services to manage a garage door via Slack on a Raspberry Pi:
notifications when the door opens or closes, plus commands to
open/close the door.

## Architecture

A [NestJS](https://nestjs.com/) server to manage communications with Slack (as a
bot) and a "driver" written in Python to interface with the Raspberry Pi hardware.

#### Slack

Controls communication with Slack via Bolt package. Includes a service which
provides the functionality and a controller which handles the in/out.

#### RPi

Controls interface with the Raspberry Pi hardware. I have an old PiFace board
which is no longer supported, but for which Python code is available. A simple
Python application serves as a driver, communicating with the NestJS
application over Unix pipes.

#### Bot

The brains of the bot. Processes input from Slack and outputs the resulting
actions to take. Uses the [@nlpjs/npl](https://www.npmjs.com/package/@nlpjs/nlp)
package.

### Milestones

✅ 0.1.0 - initial setup, should be able to send/receive Slack messages (user or channel)
✅ 0.2.0 - implement replying to Slack messages
✅ 0.3.0 - initial setup of NLP functionality
✅ 0.4.0 - controller tests
✅ 0.5.0 - initial setup of RPi GPIO - sense door open/closed
✅ 0.6.0 - manual deployment
✅ 0.6.1 - correct pull down on switch config
✅ 0.6.2 - correct messages
✅ 0.6.3 - correct door open/closed query
✅ 0.7.0 - logging (to slack?)
✅ 0.7.1 - review logging
✅ 0.8.0 - add help text
✅ 1.0.0 - initial release
✅ 1.1.0 - Python PiFace Digital 2 to interface with relays & IO + garage open/close
  - ✅ change open/close/status commands
  - ✅ add trigger remote command to gpio service
  - ✅ configuration: remote button press length, remote button relay
  - ✅ update open & close commands to use remote
  - ✅ clean up logging
  - ✅ test script
  - ✅ update deploy script
✅ 1.2.0 - add DISABLE_SLACK flag to env
✅ 1.2.1 - correct DISABLE_SLACK flag cast to boolean
✅ 1.3.0 - clean up pipe initialization
  - ✅ Python driver has the responsibility for creating the two pipes if they don't exist
  - ✅ NodeJS code will simply open the pipes as needed
1.4.0 - improve python driver tests
1.5.0 - add two-step open/close
1.6.0 - light? camera?
1.7.0 - end-to-end tests
1.8.0 - deployment (automated?)

#### Notes

Service files go in `/usr/lib/systemd/system`

**Switch to Raspberry Pi A+**

This is an older model. Need to see if we can get it running on that hardware
using the Piface Digital 2.

*Nope. A+ is simply not capable of running Node.JS applications. Switching to a Pi 3.*

**PiFace Digital 2**

The PiFace is old and not particularly up to date. There is a NodeJS package,
but it's obsolete. The
[Python package](https://github.com/piface/pifacedigitalio) might still work.
In that case, I need a way for the Python package to handle the IO, and
communicate with the NodeJS application.

- HTTP/Socket -- doable, but seems complicated
- [Named Pipes](https://levelup.gitconnected.com/inter-process-communication-between-node-js-and-python-2e9c4fda928d)

*PiFace Digital 2 works with Pi A+!*

[Documentation](https://pifacedigitalio.readthedocs.io/pifacedigital.html)

Plan: need new Python service that
- provides a "dumb" wrapper over the PiFace digital API
- send a query to the INPUT pipe and receive values from the OUTPUT pipe:
  - to get an input value:  `{ input: <input #> }`; returns `true` (high) or `false` (low)
  - to set an output value: `{ output: { <output #>: true | false } }` to set the output high/low; return `true` if no problems
  - to turn on/off a relay: `{ relay: { <relay #>: true | false } }` to set the relay to `true` (open) or `false` (closed); return `true` if no problems

Pseudocode:

decide on data structures
  - GPIO input: `{ sensor: true }`
  - Triggering relay: `{ light: true, door: true }`
  - both input/output use the same data structure

1. create named pipes for input/output
  - want to check first, then create (*add this to NodeJS app as well*)
2. set up interrupt listener for button input
  - on change, forward to NodeJS app
3. add code to trigger relays based on input
  - on incoming request, set relay to new state

TODO
1. rewrite NodeJS gpio service to use this model
2. write Python service

**Deployment**

Consider [ngrok](https://ngrok.com/) or [localtunnel](https://www.npmjs.com/package/localtunnel) for exposing a webhook for gitlab.

1. get webhook
2. if it's a change to `main`,
  a. clone the repository
  b. `yarn install`
  c. build
  d. copy files to destination
  e. restart the server

### Future

- get version # from package.json
- history -- report when garage door opened/closed last
- camera -- get a snapshot with the query results
- add tests for slack logging

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
