import { AppService } from './app.service';
import { Controller, Get } from '@nestjs/common';
import { NlpService, Intent } from './nlp/services/nlp';
import { SlackService } from './slack/services/slack';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly slackService: SlackService,
    private readonly nlpService: NlpService,
  ) {
    this.slackService.onMessage(/.*/, this.messageHandler);
  }

  @Get()
  async getHello(): Promise<string> {
    await this.slackService.sendText({
      users: '@Dave',
      text: 'this is a test',
    });
    return this.appService.getHello();
  }

  messageHandler = async ({ message }) => {
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
}
