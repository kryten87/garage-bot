import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { GpioService } from './rpi/services/gpio';
import { NlpService, Intent } from './nlp/services/nlp';
import { SlackService } from './slack/services/slack';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppController', () => {
  let appController: AppController;

  const loggingChannel = 'garagebot-logs';
  const messageRecipients = 'Alpha,Bravo,Charlie';

  const mockGpioService = {
    onDoorEvent: jest.fn(),
    getCurrentDoorState: jest.fn().mockReturnValue(0),
    pressRemoteButton: jest.fn(),
  };

  const mockNlpService = {
    process: jest.fn(),
  };

  const mockSlackService = {
    onMessage: jest.fn(),
    sendText: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest
        .fn()
        .mockReturnValueOnce(loggingChannel)
        .mockReturnValueOnce(messageRecipients),
    };

    mockGpioService.onDoorEvent.mockClear();
    mockGpioService.getCurrentDoorState.mockClear();
    mockGpioService.pressRemoteButton.mockClear();
    mockNlpService.process.mockClear();
    mockSlackService.onMessage.mockClear();
    mockSlackService.sendText.mockClear();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GpioService, useValue: mockGpioService },
        { provide: NlpService, useValue: mockNlpService },
        { provide: SlackService, useValue: mockSlackService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('messageHandler', () => {
    it('should initialize the handler on instantiation', async () => {
      expect(mockSlackService.onMessage.mock.calls.length).toBe(1);
      expect(mockSlackService.onMessage.mock.calls[0][1]).toEqual(
        appController.messageHandler,
      );
    });

    it('should correctly respond to a Greeting message', async () => {
      const channel = 'A123456';

      const intent = Intent.Greeting;
      const score = 1;
      const answer = 'Hello there!';

      const event = {
        message: {
          channel,
          text: 'Hello!',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(0);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        text: answer,
      });
    });

    it('should correctly respond to an OpenDoor message', async () => {
      const channel = 'A123456';

      const intent = Intent.OpenDoor;
      const score = 1;
      const answer = 'Opening door now';

      const event = {
        message: {
          channel,
          text: 'open the pod bay doors, Hal',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(1);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        text: answer,
      });
    });

    it('should correctly respond to a CloseDoor message', async () => {
      const channel = 'A123456';

      const intent = Intent.CloseDoor;
      const score = 1;
      const answer = 'Closing door now';

      const event = {
        message: {
          channel,
          text: 'close the damn door',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(1);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        text: answer,
      });
    });

    it('should correctly respond to a QueryState message', async () => {
      const channel = 'A123456';

      const intent = Intent.QueryState;
      const score = 1;
      const answer = 'The door is closed.';

      const event = {
        message: {
          channel,
          text: 'is the door open?',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(0);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        text: answer,
      });
    });

    it('should correctly handle a low-confidence query message', async () => {
      const messageChannel = 'A123456';
      const intent = Intent.QueryState;
      const score = 0.1;

      const event = {
        message: {
          channel: messageChannel,
          text: 'is the door open?',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(0);

      expect(mockSlackService.sendText.mock.calls.length).toBe(2);

      expect(mockSlackService.sendText.mock.calls[0][0].channel).toBe(
        messageChannel,
      );
      expect(mockSlackService.sendText.mock.calls[0][0].text).toContain(
        'not sure',
      );
      expect(mockSlackService.sendText.mock.calls[0][0].text).toContain(
        'garage door is open',
      );

      expect(mockSlackService.sendText.mock.calls[1][0].channel).toBe(
        loggingChannel,
      );
      expect(mockSlackService.sendText.mock.calls[1][0].text).toBe(
        JSON.stringify({
          message: event.message,
          intent,
          score,
        }),
      );
    });

    it('should NOT open the door on a low-confidence open message', async () => {
      const messageChannel = 'A123456';
      const intent = Intent.OpenDoor;
      const score = 0.1;

      const event = {
        message: {
          channel: messageChannel,
          text: 'open',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(0);
    });

    it('should NOT open the door on a low-confidence close message', async () => {
      const messageChannel = 'A123456';
      const intent = Intent.CloseDoor;
      const score = 0.1;

      const event = {
        message: {
          channel: messageChannel,
          text: 'open',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score });

      await appController.messageHandler(event);

      expect(mockGpioService.pressRemoteButton.mock.calls.length).toBe(0);
    });
  });

  describe('doorSensorHandler', () => {
    it('should initialize the handler on startup', async () => {
      expect(mockGpioService.onDoorEvent.mock.calls.length).toBe(1);
      expect(mockGpioService.onDoorEvent.mock.calls[0][0]).toEqual(
        appController.doorEventHandler,
      );
    });

    it('should correctly send a message on door state change', async () => {
      await appController.doorEventHandler(1);
      await appController.doorEventHandler(0);
      expect(mockSlackService.sendText.mock.calls.length).toBe(2);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        users: messageRecipients.split(','),
        text: 'Garage opened',
      });
      expect(mockSlackService.sendText.mock.calls[1][0]).toEqual({
        users: messageRecipients.split(','),
        text: 'Garage closed',
      });
    });
  });
});
