import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { Controller, Get } from '@nestjs/common';
import { GpioService } from './rpi/services/gpio';
import { NlpService, Intent } from './nlp/services/nlp';
import { SlackService } from './slack/services/slack';

@Controller()
export class AppController {
  private slackLoggingChannel: string;
  private messageRecipients: string[];

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly gpioService: GpioService,
    private readonly nlpService: NlpService,
    private readonly slackService: SlackService,
  ) {
    this.slackLoggingChannel = this.configService.get<string>(
      'SLACK_LOGGING_CHANNEL',
    );
    this.messageRecipients = this.configService
      .get<string>('SLACK_DOOR_EVENT_RECIPIENTS')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    this.slackService.onMessage(/.*/, this.messageHandler);
    this.gpioService.onDoorEvent(this.doorEventHandler);
  }

  @Get()
  async getHello(): Promise<string> {
    await this.slackService.sendText({
      users: '@Dave',
      text: `:smile: A test message (normally this would go to ${JSON.stringify(
        this.messageRecipients,
      )})`,
    });
    return this.appService.getHello();
  }

  @Get('gpio')
  async testGpio(): Promise<string> {
    const results = [
      await this.gpioService.request({ input: 1 }),
      await this.gpioService.request({ output: { 1: true } }),
      await this.gpioService.request({ relay: { 1: false } }),
    ];
    return `<pre>${JSON.stringify(results, null, 2)}</pre>`;
  }

  messageHandler = async ({ message }): Promise<void> => {
    const { channel } = message;
    const { intent, score, answer } = await this.nlpService.process(
      message.text,
    );
    let text = answer;

    switch (intent) {
      case Intent.Greeting:
        text =
          score > 0.8
            ? text
            : "I'm not sure what you mean. Are you just saying hi? Try asking for help if you need more info.";
        break;
      case Intent.OpenDoor:
        // @TODO open the door
        text =
          score > 0.8
            ? text
            : `I'm not sure what you mean. Are you asking me to open the door? Try asking for help if you need more info.`;
        break;
      case Intent.CloseDoor:
        // @TODO close the door
        text =
          score > 0.8
            ? text
            : "I'm not sure what you mean. Are you asking me to close the door? Try asking for help if you need more info.";
        break;
      case Intent.QueryState:
        const currentState = this.gpioService.getCurrentDoorState();
        text =
          score > 0.8
            ? `The door is ${currentState ? 'open' : 'closed'}.`
            : `I'm not sure what you mean. Are you asking if the garage door is open? Try asking for help if you need more info.`;
        break;
      case Intent.Help:
        text = [
          "Hi there! I understand you're looking for some help...",
          'I can do a bunch of things, like check to see if the door is open or closed. Try asking "Is it open?" or "Are you open?" to see where the door is now.',
          'In the future, you might be able to open or close the door by saying "Open up!" or "Shut it!".',
          'I am able to understand a whole bunch of simple phrases, so try different variations.',
        ]
          .map((line) => line.trim())
          .join(' ');
        break;
      default:
        text = `I'm afraid I didn't understand that. Can you repeat that please? Try asking for help if you need more info.`;
        break;
    }
    await this.slackService.sendText({ channel, text });

    if (score <= 0.8 || intent === Intent.None) {
      await this.slackService.sendText({
        channel: this.slackLoggingChannel,
        text: JSON.stringify({ message, intent, score }),
      });
    }
  };

  doorEventHandler = async (newState: number): Promise<void> => {
    await this.slackService.sendText({
      users: this.messageRecipients,
      text: `Garage ${newState === 0 ? 'closed' : 'opened'}`,
    });
  };
}
