import { App } from '@slack/bolt';
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

interface UserCache {
  [displayName: string]: string;
}

@Injectable()
export class Slack implements OnModuleInit, OnModuleDestroy {
  private userCache: UserCache = {};

  constructor(@Inject('BOLT_APP') private readonly boltApp: App) {}

  async onModuleInit() {
    // start the bolt app
    await this.boltApp.start();
  }

  async onModuleDestroy() {
    // shut down the bolt app
  }

  onMessage(pattern: string | RegExp, handler: any) {
    this.boltApp.message(pattern, handler);
  }

  sendText(destination: string, message: string): void {
    // @TODO
  }

  async getUserId(displayName: string): Promise<string> {
    const name = displayName.replace(/^@/, '');
    if (this.userCache[name]) {
      return this.userCache[name];
    }
    let userList = await this.boltApp.client.users.list({ limit: 50 });
    while (userList) {
      userList.members.forEach((user) => {
        if (user?.profile?.display_name && user?.id) {
          this.userCache[user.profile.display_name] = user.id;
        }
      });
      const userId = userList.members.find(
        (user) => user?.profile?.display_name === name,
      )?.id;
      if (userId) {
        return userId;
      }
      userList = userList.response_metadata?.next_cursor
        ? await this.boltApp.client.users.list({
            limit: 50,
            cursor: userList.response_metadata.next_cursor,
          })
        : null;
    }
    throw new Error(`no user found with display name "${name}"`);
  }
}
