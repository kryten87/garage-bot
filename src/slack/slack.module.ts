import { Module } from '@nestjs/common';
import { Slack } from './services/slack';
import { SlackController } from './slack.controller';

@Module({
  providers: [Slack],
  controllers: [SlackController]
})
export class SlackModule {}
