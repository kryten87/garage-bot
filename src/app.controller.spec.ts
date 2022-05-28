import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NlpService, Intent } from './nlp/services/nlp';
import { SlackService } from './slack/services/slack';
import { Test, TestingModule } from '@nestjs/testing';

describe('AppController', () => {
  let appController: AppController;

  const mockNlpService = {
    process: jest.fn(),
  };

  const mockSlackService = {
    onMessage: jest.fn(),
    sendText: jest.fn(),
  };

  beforeEach(async () => {
    mockNlpService.process.mockClear();
    mockSlackService.onMessage.mockClear();
    mockSlackService.sendText.mockClear();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: NlpService, useValue: mockNlpService },
        { provide: SlackService, useValue: mockSlackService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('messageHandler', () => {
    it('should correctly initialize the handler on instantiation', async () => {
      expect(mockSlackService.onMessage.mock.calls.length).toBe(1);
      expect(mockSlackService.onMessage.mock.calls[0][1]).toEqual(appController.messageHandler);
    });

    it('should correctly respond to a Greeting message', async () => {
      const channel = 'A123456';
      const ts = '123456.654321';

      const intent = Intent.Greeting;
      const score = 1;
      const answer = 'Hello there!';

      const event = {
        message: {
          channel,
          ts,
          text: 'Hello!',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        thread: ts,
        text: answer,
      });
    });

    it('should correctly respond to an OpenDoor message', async () => {
      const channel = 'A123456';
      const ts = '123456.654321';

      const intent = Intent.OpenDoor;
      const score = 1;
      const answer = 'Opening door now';

      const event = {
        message: {
          channel,
          ts,
          text: 'open the pod bay doors, Hal',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        thread: ts,
        text: answer,
      });

      // @TODO add test for GPIO
    });

    it('should correctly respond to a CloseDoor message', async () => {
      const channel = 'A123456';
      const ts = '123456.654321';

      const intent = Intent.CloseDoor;
      const score = 1;
      const answer = 'Closing door now';

      const event = {
        message: {
          channel,
          ts,
          text: 'close the damn door',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        thread: ts,
        text: answer,
      });

      // @TODO add test for GPIO
    });

    it('should correctly respond to a QueryState message', async () => {
      const channel = 'A123456';
      const ts = '123456.654321';

      const intent = Intent.QueryState;
      const score = 1;
      const answer = 'It is open';

      const event = {
        message: {
          channel,
          ts,
          text: 'is the door open?',
        },
      };

      mockNlpService.process.mockResolvedValue({ intent, score, answer });

      await appController.messageHandler(event);

      expect(mockNlpService.process.mock.calls.length).toBe(1);
      expect(mockNlpService.process.mock.calls[0][0]).toBe(event.message.text);

      expect(mockSlackService.sendText.mock.calls.length).toBe(1);
      expect(mockSlackService.sendText.mock.calls[0][0]).toEqual({
        channel,
        thread: ts,
        text: answer,
      });

      // @TODO add test for GPIO
    });
  });
});
