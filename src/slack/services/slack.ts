import { App } from '@slack/bolt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';

/** The user ID/display name cache */
interface UserCache {
  [displayName: string]: string;
}

/** The options for the sendText method */
interface SendTextOptions {
  // must have either users OR channel + thread
  users?: string | string[];
  channel?: string;
  thread?: string;
  text: string;
}

@Injectable()
export class SlackService implements OnModuleInit {
  private userCache: UserCache = {};
  private channelCache: UserCache = {};

  constructor(
    private readonly configService: ConfigService,
    @Inject('BOLT_APP') private boltApp: App | null,
  ) {
    // instantiate the bolt APP if one is not provided
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

  /** Set up a listener for messages */
  async onMessage(pattern: string | RegExp, handler: any) {
    this.boltApp.message(pattern, handler);
    this.boltApp.event('app_mention', async ({ event }) =>
      handler({ message: event }),
    );
  }

  /** Send a message */
  async sendText(options: SendTextOptions): Promise<void> {
    const { thread, channel, text } = options;

    let { users } = options;
    users = (Array.isArray(users) ? users : [users]).filter(Boolean);
    const haveUsers = users && users.length > 0;
    if (haveUsers) {
      if (channel || thread) {
        throw new Error(
          'cannot send message; must provide user OR channel/thread arguments',
        );
      }
    } else {
      if ((!channel && !thread) || (thread && !channel)) {
        throw new Error(
          'cannot send message; must provide user OR channel/thread arguments',
        );
      }
    }

    users = (await Promise.all(await users.map((user) => this.getUserId(user))))
      .filter(Boolean)
      .join(',');

    let channelId = /^#/.test(channel)
      ? await this.getChannelId(channel)
      : channel;
    if (users) {
      const response = await this.boltApp.client.conversations.open({ users });
      channelId = response?.channel?.id;
    }
    const postOptions: { text: string; channel: string; thread_ts?: string } = {
      channel: channelId,
      text,
    };
    if (thread) {
      postOptions.thread_ts = thread;
    }
    await this.boltApp.client.chat.postMessage(postOptions);
  }

  async getUserId(displayName: string): Promise<string> {
    if (!/^@/.test(displayName)) {
      throw new Error('the slack name must start with @');
    }
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

  async getChannelId(channel: string): Promise<string> {
    if (!/^#/.test(channel)) {
      throw new Error('the channel name must start with #');
    }
    const channelName = `${channel}`.replace(/^#/, '');
    if (this.channelCache[channelName]) {
      return this.channelCache[channelName];
    }
    const channelList = await this.boltApp.client.conversations.list({
      limit: 50,
    });
    let { channels } = channelList;
    while (channels && channels.length > 0) {
      channels.forEach((item) => {
        this.channelCache[item.name] = item.id;
      });
      const id = this.channelCache[channelName];
      if (id) {
        return id;
      }
      const cursor = channelList.response_metadata?.next_cursor;
      const list = cursor
        ? await this.boltApp.client.conversations.list({ limit: 50, cursor })
        : null;
      channels = list?.channels;
    }
    throw new Error(`no channel found with name "${channelName}"`);
  }
}
