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
            : "I'm not sure what you mean. Are you just saying hi?";
        break;
      case Intent.OpenDoor:
        // @TODO open the door
        text =
          score > 0.8
            ? text
            : `I'm not sure what you mean. Are you asking me to open the door?`;
        break;
      case Intent.CloseDoor:
        // @TODO close the door
        text =
          score > 0.8
            ? text
            : "I'm not sure what you mean. Are you asking me to close the door?";
        break;
      case Intent.QueryState:
        const currentState = this.gpioService.getCurrentDoorState();
        text = `The door is ${currentState ? 'open' : 'closed'}.`;
        text =
          score > 0.8
            ? text
            : `I'm not sure what you mean. Are you asking if the garage door is open?`;
        break;
      default:
        text =
          "I'm afraid I didn't understand that. Can you repeat that please?";
        text = score > 0.8 ? text : `I'm not sure what you mean. ${intent}`;
        break;
    }
    await this.slackService.sendText({ channel, text });

    if (score <= 0.8) {
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
