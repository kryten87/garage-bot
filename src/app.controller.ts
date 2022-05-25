import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SlackService } from './slack/services/slack';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly slackService: SlackService,
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

  async messageHandler({ message, say }) {
    console.log('.......................');
    console.log(message);
    console.log('..........................');
    await say("what's going on?");
  }
}
