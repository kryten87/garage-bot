import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class Slack implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // start the bolt app
  }

  async onModuleDestroy() {
    // shut down the bolt app
  }
}
