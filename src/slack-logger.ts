import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  LoggerService,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SlackService } from './slack/services/slack';

enum LogLevel {
  none = -1,
  error = 0,
  warn = 1,
  log = 2,
  debug = 3,
  verbose = 4,
}

@Injectable()
export class SlackLogger
  implements LoggerService, OnModuleInit, OnModuleDestroy
{
  private loggingChannelId: string;
  private logLevel: LogLevel = LogLevel.none;

  constructor(
    private readonly configService: ConfigService,
    private readonly slackService: SlackService,
  ) {
    const level = this.configService.get<string>('LOG_LEVEL');
    if (level && Object.values(LogLevel).includes(level.toLowerCase())) {
      this.logLevel = LogLevel[level.toLowerCase()];
    }
  }

  async onModuleInit() {
    const channelName = this.configService.get<string>('SLACK_LOGGING_CHANNEL');
    if (channelName) {
      try {
        this.loggingChannelId = await this.slackService.getChannelId(
          channelName,
        );
        this.debug(`Channel "${channelName}" available for logging`);
      } catch {
        this.warn(
          `Unable to find channel "${channelName}"; logging to Slack is disabled`,
        );
      }
    } else {
      this.warn(
        `No logging channel name provided; logging to Slack is disabled`,
      );
    }
  }

  async onModuleDestroy() {
    this.log('Application shutting down');
  }

  sendToSlack(text: string): void {
    if (this.loggingChannelId) {
      // this is async, but I don't want to block
      this.slackService.sendText({ channel: this.loggingChannelId, text });
    }
  }
  log(message: any, ...optionalParams: any[]) {
    if (this.logLevel >= LogLevel.log) {
      this.sendToSlack(`[log] [${optionalParams[0] || ''}] ${message}`);
      console.log(`[LOG] [${optionalParams[0] || ''}] ${message}`);
    }
  }

  error(message: any, ...optionalParams: any[]) {
    if (this.logLevel >= LogLevel.error) {
      this.sendToSlack(`[error] [${optionalParams[0] || ''}] ${message}`);
      console.error(`[ERROR] [${optionalParams[0] || ''}] ${message}`);
    }
  }

  warn(message: any, ...optionalParams: any[]) {
    if (this.logLevel >= LogLevel.warn) {
      this.sendToSlack(`[warn] [${optionalParams[0] || ''}] ${message}`);
      console.warn(`[WARN] [${optionalParams[0] || ''}] ${message}`);
    }
  }

  debug?(message: any, ...optionalParams: any[]) {
    if (this.logLevel >= LogLevel.debug) {
      this.sendToSlack(`[debug] [${optionalParams[0] || ''}] ${message}`);
      console.debug(`[DEBUG] [${optionalParams[0] || ''}] ${message}`);
    }
  }

  verbose?(message: any, ...optionalParams: any[]) {
    if (this.logLevel >= LogLevel.verbose) {
      this.sendToSlack(`[verbose] [${optionalParams[0] || ''}] ${message}`);
      console.log(`[VERBOSE] [${optionalParams[0] || ''}] ${message}`);
    }
  }
}
