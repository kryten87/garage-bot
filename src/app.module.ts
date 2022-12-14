import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { SlackModule } from './slack/slack.module';
import { NlpModule } from './nlp/nlp.module';
import { RpiModule } from './rpi/rpi.module';

@Module({
  imports: [SlackModule, ConfigModule.forRoot(), NlpModule, RpiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
