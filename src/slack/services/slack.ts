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

  async sendText(destination: string | string[], text: string): Promise<void> {
    const users = (
      await Promise.all(
        await (Array.isArray(destination) ? destination : [destination]).map(
          (user) => this.getUserId(user),
        ),
      )
    )
      .filter(Boolean)
      .join(',');
    if (!users || users.length === 0) {
      throw new Error('cannot send message; no user names provided');
    }
    const response = await this.boltApp.client.conversations.open({ users });
    const channelId = response?.channel?.id;
    await this.boltApp.client.chat.postMessage({
      channel: channelId,
      text,
    });
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
