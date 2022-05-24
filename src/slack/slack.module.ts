import { Module } from '@nestjs/common';
import { SlackService } from './services/slack';

@Module({
  providers: [SlackService],
})
export class SlackModule {}
