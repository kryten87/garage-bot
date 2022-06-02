The Thomas Family Home Bot Project
==================================

## Description

The Thomas Family home bot -- performs various home tasks via Slack.

## Architecture

### Modules

#### Slack

Controls communication with Slack via Bolt package. Includes a service which provides the functionality and a controller which handles the in/out.

#### RPi

Controls interface with the Raspberry Pi hardware.
Use [rpi-gpio](https://github.com/JamesBarwell/rpi-gpio.js)?
Or [rpio](https://github.com/jperkin/node-rpio)?

#### Bot

The brains of the bot. Processes input from Slack and outputs the resulting actions to take. Uses the [@nlpjs/npl](https://www.npmjs.com/package/@nlpjs/nlp) package.

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
1.0.0 - initial release
1.1.0 - Python PiFace Digital 2? To interface with relays & IO
1.1.0 - add garage door open/close functionality
1.2.0 - end-to-end tests
1.3.0 - deployment (automated?)

#### Notes

**Switch to Raspberry Pi A+**

This is an older model. Need to see if we can get it running on that hardware using the Piface Digital 2.

**PiFace Digital 2**

The PiFace is old and not particularly up to date. There is a NodeJS package, but it's obsolete. The [Python package](https://github.com/piface/pifacedigitalio) might still work. In that case, I need a way for the Python package to handle the IO, and communicate with the NodeJS application.

- HTTP/Socket -- doable, but seems complicated
- [Named Pipes](https://levelup.gitconnected.com/inter-process-communication-between-node-js-and-python-2e9c4fda928d)

*PiFace Digital 2 works with Pi A+!*

[Documentation](https://pifacedigitalio.readthedocs.io/pifacedigital.html)

Plan: need new Python service that
- listens for changes on GPIO input
- listens for input from NodeJS app on named pipe to
  - trigger relay to open/close
  - trigger relay to turn on/off light for camera

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

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
