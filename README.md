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
0.7.0 - add help text
0.8.0 - logging (to slack?)
1.0.0 - initial release
1.1.0 - Python PiFace Digital 2? To interface with relays & IO
1.1.0 - add garage door open/close functionality
1.2.0 - end-to-end tests
1.3.0 - deployment (automated?)

#### Notes

**PiFace Digital 2**

The PiFace is old and not particularly up to date. There is a NodeJS package, but it's obsolete. The [Python package](https://github.com/piface/pifacedigitalio) might still work. In that case, I need a way for the Python package to handle the IO, and communicate with the NodeJS application.

- HTTP/Socket -- doable, but seems complicated
- [Named Pipes](https://levelup.gitconnected.com/inter-process-communication-between-node-js-and-python-2e9c4fda928d)


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
