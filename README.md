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

#### Bot

The brains of the bot. Processes input from Slack and outputs the resulting actions to take. Uses the [@nlpjs/npl](https://www.npmjs.com/package/@nlpjs/nlp) package.

### Milestones

0.1.0 - initial setup, should be able to send/receive Slack messages (user or channel)
  - Slack done ✅
0.2.0 - implement replying to Slack messages
  - Replying done ✅
0.3.0 - initial setup of NLP functionality
  - Done ✅
0.4.0 - initial setup of RPi GPIO - sense door open/closed
0.5.0 - add garage door open/close functionality

### Future

- history -- report when garage door opened/closed last

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
