import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { Controller, Get } from '@nestjs/common';
import { GpioService } from './rpi/services/gpio';
import { NlpService, Intent } from './nlp/services/nlp';
import { SlackService } from './slack/services/slack';

@Controller()
export class AppController {
  private messageRecipients: string[];

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly gpioService: GpioService,
    private readonly nlpService: NlpService,
    private readonly slackService: SlackService,
  ) {
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
    const { channel, ts } = message;
    const { intent, score, answer } = await this.nlpService.process(
      message.text,
    );
    let text = answer;
    if (!text || score < 0.75) {
      text = "I'm not sure what you're saying. Can you try again?";
    } else {
      switch (intent) {
        case Intent.Greeting:
          break;
        case Intent.OpenDoor:
          // @TODO open the door
          break;
        case Intent.CloseDoor:
          // @TODO close the door
          break;
        case Intent.QueryState:
          // @TODO get the current state
          break;
        default:
          text =
            "I'm afraid I didn't understand that. Can you repeat that please?";
          break;
      }
    }
    await this.slackService.sendText({
      channel,
      thread: ts,
      text,
    });
  };

  doorEventHandler = async (newState: number): Promise<void> => {
    await this.slackService.sendText({
      users: this.messageRecipients,
      text: newState === 0 ? 'Closing' : 'Opening',
    });
  };
}
