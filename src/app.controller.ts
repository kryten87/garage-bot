import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SlackService } from './slack/services/slack';
import { NlpService } from './nlp/services/nlp';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly slackService: SlackService,
    private readonly nlpService: NlpService
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
    console.log('.......................');
    console.log(message);
    console.log('..........................');
    const { channel, ts } = message;
    const { intent, score, answer } = await this.nlpService.process(message.text);
    let text = answer;
    if (!text || score < 0.75) {
      text = 'I\'m not sure what you\'re saying. Can you try again?';
    }
    await this.slackService.sendText({
      channel,
      thread: ts,
      text,
    });
  };
}
