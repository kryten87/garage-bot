import { ConfigService } from '@nestjs/config';
import { SlackService } from './slack';
import { Test, TestingModule } from '@nestjs/testing';

describe('Slack', () => {
  let provider: SlackService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockBoltApp = {
    start: jest.fn().mockResolvedValue(undefined),
    message: jest.fn(),
    client: {
      users: {
        // bot -- users:read
        // user -- users:read
        list: jest.fn(),
      },
      conversations: {
        // bot -- channels:manage, groups:write, im:write, mpim:write
        // user -- channels:write, groups:write, im:write, mpim:write
        open: jest.fn(),
      },
      chat: {
        // bot -- chat:write
        // user -- chat:write, chat:write:user, chat:write:bot
        postMessage: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'BOLT_APP', useValue: mockBoltApp },
      ],
    }).compile();

    provider = module.get<SlackService>(SlackService);

    mockBoltApp.start.mockClear();
    mockBoltApp.message.mockClear();
    mockBoltApp.client.users.list.mockClear();
    mockBoltApp.client.conversations.open.mockClear();
    mockBoltApp.client.chat.postMessage.mockClear();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('onMessage', () => {
    // set up message listener: onMessage(pattern, handler)
    it('should set up the message handler', () => {
      const pattern = 'hello';
      const handler = jest.fn();
      provider.onMessage(pattern, handler);
      expect(mockBoltApp.message.mock.calls.length).toBe(1);
      expect(mockBoltApp.message.mock.calls[0][0]).toBe(pattern);
      expect(mockBoltApp.message.mock.calls[0][1]).toEqual(handler);
      expect(handler.mock.calls.length).toBe(0);
    });
  });

  describe('sendText', () => {
    const channelId = 'D069C7QFK';
    const thread = '123456.654321';

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore setting private property; ok for testing
      provider.userCache = {
        spengler: 'W012A3CDE',
        'Glinda the Fairly Good': 'W07QCRPA4',
        Thor: 'W012A3FFF',
        Starlord: 'W07QCRGGG',
      };

      mockBoltApp.client.conversations.open.mockResolvedValue({
        ok: true,
        channel: { id: channelId },
      });
    });

    describe('argument validation', () => {
      it('should throw an exception if no users & no channel+thread arguments', async () => {
        try {
          await provider.sendText({ text: 'hello' });
          throw new Error('this should not happen');
        } catch (err) {
          expect(err.message).toContain(
            'must provide user OR channel/thread arguments',
          );
        }
      });

      it('should throw an exception if users AND channel/thread arguments', async () => {
        try {
          await provider.sendText({
            users: '@Thor',
            channel: channelId,
            thread,
            text: 'hello',
          });
          throw new Error('this should not happen');
        } catch (err) {
          expect(err.message).toContain(
            'must provide user OR channel/thread arguments',
          );
        }
      });

      it('should throw an exception if users AND channel arguments', async () => {
        try {
          await provider.sendText({
            users: '@Thor',
            channel: channelId,
            text: 'hello',
          });
          throw new Error('this should not happen');
        } catch (err) {
          expect(err.message).toContain(
            'must provide user OR channel/thread arguments',
          );
        }
      });

      it('should throw an exception if thread with no channel', async () => {
        try {
          await provider.sendText({ thread, text: 'hello' });
          throw new Error('this should not happen');
        } catch (err) {
          expect(err.message).toContain(
            'must provide user OR channel/thread arguments',
          );
        }
      });
    });

    describe('users', () => {
      it('should open the conversation with the appropriate users (multiple)', async () => {
        await provider.sendText({ users: ['Thor', 'Starlord'], text: 'hello' });
        expect(mockBoltApp.client.conversations.open.mock.calls.length).toBe(1);
        expect(mockBoltApp.client.conversations.open.mock.calls[0][0]).toEqual({
          users: 'W012A3FFF,W07QCRGGG',
        });
      });

      it('should open the conversation with the appropriate users (single)', async () => {
        await provider.sendText({ users: 'Thor', text: 'hello' });
        expect(mockBoltApp.client.conversations.open.mock.calls.length).toBe(1);
        expect(mockBoltApp.client.conversations.open.mock.calls[0][0]).toEqual({
          users: 'W012A3FFF',
        });
      });

      it('should post the message to the new channel', async () => {
        const text = `hello from ${Date.now()}`;
        await provider.sendText({ users: ['Thor', 'Starlord'], text });
        expect(mockBoltApp.client.chat.postMessage.mock.calls.length).toBe(1);
        expect(mockBoltApp.client.chat.postMessage.mock.calls[0][0]).toEqual({
          channel: channelId,
          text,
        });
      });
    });

    describe('channel/thread', () => {
      it('should post the message to the channel/thread', async () => {
        const channel = 'A123456';
        const thread = '123456.789';
        const text = `hello from ${Date.now()}`;
        await provider.sendText({ channel, thread, text });
        expect(mockBoltApp.client.chat.postMessage.mock.calls.length).toBe(1);
        expect(mockBoltApp.client.chat.postMessage.mock.calls[0][0]).toEqual({
          channel,
          thread_ts: thread,
          text,
        });
      });
    });
  });

  describe('getUserID', () => {
    // get the user name from displayname: "@somebody" or "somebody"
    it('should call the user list method to get users', async () => {
      const userList = {
        ok: true,
        members: [
          { id: 'W012A3CDE', profile: { display_name: 'spengler' } },
          {
            id: 'W07QCRPA4',
            profile: { display_name: 'Glinda the Fairly Good' },
          },
        ],
        cache_ts: 1498777272,
      };
      mockBoltApp.client.users.list.mockResolvedValue(userList);
      await provider.getUserId('spengler');
      expect(mockBoltApp.client.users.list.mock.calls.length).toBe(1);
    });

    it('should return the expected value from the 1st page of results', async () => {
      const userList = {
        ok: true,
        members: [
          { id: 'W012A3CDE', profile: { display_name: 'spengler' } },
          {
            id: 'W07QCRPA4',
            profile: { display_name: 'Glinda the Fairly Good' },
          },
        ],
        cache_ts: 1498777272,
      };
      mockBoltApp.client.users.list.mockResolvedValue(userList);
      const result = await provider.getUserId('spengler');
      expect(result).toBe('W012A3CDE');
    });

    it('should return the expected value from the 2nd page of results', async () => {
      const userLists = [
        {
          ok: true,
          members: [
            { id: 'W012A3CDE', profile: { display_name: 'spengler' } },
            {
              id: 'W07QCRPA4',
              profile: { display_name: 'Glinda the Fairly Good' },
            },
          ],
          cache_ts: 1498777272,
          response_metadata: {
            next_cursor: 'dXNlcjpVMEc5V0ZYTlo=',
          },
        },
        {
          ok: true,
          members: [
            { id: 'W012A3FFF', profile: { display_name: 'Thor' } },
            { id: 'W07QCRGGG', profile: { display_name: 'Starlord' } },
          ],
          cache_ts: 1498777272,
        },
      ];
      userLists.forEach((userList) =>
        mockBoltApp.client.users.list.mockResolvedValueOnce(userList),
      );

      const result = await provider.getUserId('Starlord');
      expect(result).toBe('W07QCRGGG');
    });

    it('should throw an error if the display name is not found', async () => {
      const userLists = [
        {
          ok: true,
          members: [
            { id: 'W012A3CDE', profile: { display_name: 'spengler' } },
            {
              id: 'W07QCRPA4',
              profile: { display_name: 'Glinda the Fairly Good' },
            },
          ],
          cache_ts: 1498777272,
          response_metadata: {
            next_cursor: 'dXNlcjpVMEc5V0ZYTlo=',
          },
        },
        {
          ok: true,
          members: [
            { id: 'W012A3FFF', profile: { display_name: 'Thor' } },
            { id: 'W07QCRGGG', profile: { display_name: 'Starlord' } },
          ],
          cache_ts: 1498777272,
        },
      ];
      userLists.forEach((userList) =>
        mockBoltApp.client.users.list.mockResolvedValueOnce(userList),
      );

      try {
        await provider.getUserId('nobody');
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.message).toContain('no user found');
      }
    });

    it('should update the local cache with found user IDs', async () => {
      const userLists = [
        {
          ok: true,
          members: [
            { id: 'W012A3CDE', profile: { display_name: 'spengler' } },
            {
              id: 'W07QCRPA4',
              profile: { display_name: 'Glinda the Fairly Good' },
            },
          ],
          cache_ts: 1498777272,
          response_metadata: {
            next_cursor: 'dXNlcjpVMEc5V0ZYTlo=',
          },
        },
        {
          ok: true,
          members: [
            { id: 'W012A3FFF', profile: { display_name: 'Thor' } },
            { id: 'W07QCRGGG', profile: { display_name: 'Starlord' } },
          ],
          cache_ts: 1498777272,
        },
      ];
      userLists.forEach((userList) =>
        mockBoltApp.client.users.list.mockResolvedValueOnce(userList),
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore checking private property; ok for testing
      expect(provider.userCache).toEqual({});

      const result = await provider.getUserId('Starlord');
      expect(result).toBe('W07QCRGGG');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore checking private property; ok for testing
      expect(provider.userCache).toEqual({
        spengler: 'W012A3CDE',
        'Glinda the Fairly Good': 'W07QCRPA4',
        Thor: 'W012A3FFF',
        Starlord: 'W07QCRGGG',
      });
    });

    it('should use the cached value if available', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore setting private property; ok for testing
      provider.userCache = {
        spengler: 'W012A3CDE',
        'Glinda the Fairly Good': 'W07QCRPA4',
        Thor: 'W012A3FFF',
        Starlord: 'W07QCRGGG',
      };

      const result = await provider.getUserId('Thor');
      expect(result).toBe('W012A3FFF');
      expect(mockBoltApp.client.users.list.mock.calls.length).toBe(0);
    });

    it('should return the expected value for @display_name', async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore setting private property; ok for testing
      provider.userCache = {
        spengler: 'W012A3CDE',
        'Glinda the Fairly Good': 'W07QCRPA4',
        Thor: 'W012A3FFF',
        Starlord: 'W07QCRGGG',
      };

      const result = await provider.getUserId('@Thor');
      expect(result).toBe('W012A3FFF');
    });
  });
});