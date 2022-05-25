import { App } from '@slack/bolt';
import { ConfigService } from '@nestjs/config';
import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

interface UserCache {
  [displayName: string]: string;
}

interface SendOptions {
  // must have either users OR channel + thread
  users?: string | string[];
  channel?: string;
  thread?: string;
  text: string;
}

@Injectable()
export class SlackService implements OnModuleInit, OnModuleDestroy {
  private userCache: UserCache = {};

  constructor(
    private readonly configService: ConfigService,
    @Inject('BOLT_APP') private boltApp: App | null,
  ) {
    this.boltApp =
      this.boltApp ||
      new App({
        token: this.configService.get('SLACK_BOT_TOKEN'),
        appToken: this.configService.get('SLACK_APP_TOKEN'),
        signingSecret: this.configService.get('SLACK_SIGNING_SECRET'),
        socketMode: true,
        developerMode: this.configService.get('NODE_ENV') !== 'production',
        port: +this.configService.get('PORT') || 3000,
      });
  }

  async onModuleInit() {
    await this.boltApp.start();
  }

  async onModuleDestroy() {
    // shut down the bolt app
  }

  async onMessage(pattern: string | RegExp, handler: any) {
    this.boltApp.message(pattern, handler);
  }

  async sendText(options: SendOptions): Promise<void> {
    // async sendText(destination: string | string[], text: string): Promise<void> {
    const { thread, channel, text } = options;
    let { users } = options;
    users = (Array.isArray(users) ? users : [users]).filter(Boolean);

    if (!thread && (!users || users.length === 0)) {
      throw new Error(
        'cannot send message; no user and no channel/thread provided',
      );
    }

    users = (await Promise.all(await users.map((user) => this.getUserId(user))))
      .filter(Boolean)
      .join(',');

    let channelId = channel;
    if (users) {
      const response = await this.boltApp.client.conversations.open({ users });
      channelId = response?.channel?.id;
    }
    const postOptions: { text: string; channel: string; thread_id?: string } = {
      channel: channelId,
      text,
    };
    if (thread) {
      postOptions.thread_id = thread;
    }
    await this.boltApp.client.chat.postMessage(postOptions);
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
