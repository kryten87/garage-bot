import { Module } from '@nestjs/common';
import { NlpService } from './services/nlp';

@Module({
  providers: [NlpService],
})
export class NlpModule {}
