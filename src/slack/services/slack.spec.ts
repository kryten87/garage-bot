import { Test, TestingModule } from '@nestjs/testing';
import { Slack } from './slack';
import { ConfigService } from '@nestjs/config';

describe('Slack', () => {
  let provider: Slack;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockBoltApp = {
    start: jest.fn().mockResolvedValue(undefined),
    message: jest.fn(),
    client: {
      users: {
        list: jest.fn(),
      },
      conversations: {
        open: jest.fn(),
      },
      chat: {
        postMessage: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Slack,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'BOLT_APP', useValue: mockBoltApp },
      ],
    }).compile();

    provider = module.get<Slack>(Slack);

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

    it('should open the conversation with the appropriate users (multiple)', async () => {
      await provider.sendText(['Thor', 'Starlord'], 'hello');
      expect(mockBoltApp.client.conversations.open.mock.calls.length).toBe(1);
      expect(mockBoltApp.client.conversations.open.mock.calls[0][0]).toEqual({
        users: 'W012A3FFF,W07QCRGGG',
      });
    });

    it('should open the conversation with the appropriate users (single)', async () => {
      await provider.sendText('Thor', 'hello');
      expect(mockBoltApp.client.conversations.open.mock.calls.length).toBe(1);
      expect(mockBoltApp.client.conversations.open.mock.calls[0][0]).toEqual({
        users: 'W012A3FFF',
      });
    });

    it('should post the message to the channel', async () => {
      const text = `hello from ${Date.now()}`;
      await provider.sendText(['Thor', 'Starlord'], text);
      expect(mockBoltApp.client.chat.postMessage.mock.calls.length).toBe(1);
      expect(mockBoltApp.client.chat.postMessage.mock.calls[0][0]).toEqual({
        channel: channelId,
        text,
      });
    });

    it('should throw an exception if no users provided', async () => {
      try {
        await provider.sendText([], 'hello');
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.message).toContain('no user names provided');
      }
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
