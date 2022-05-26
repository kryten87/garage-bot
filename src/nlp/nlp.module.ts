import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { NlpService } from './services/nlp';

@Module({
  providers: [NlpService, ConfigService],
  exports: [NlpService],
})
export class NlpModule {}
