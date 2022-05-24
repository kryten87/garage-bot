import { Module } from '@nestjs/common';
import { Slack } from './services/slack';

@Module({
  providers: [Slack]
})
export class SlackModule {}
