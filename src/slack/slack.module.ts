import { Module } from '@nestjs/common';
import { SlackService } from './services/slack';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    SlackService,
    ConfigService,
    { provide: 'BOLT_APP', useValue: null },
  ],
})
export class SlackModule {}
