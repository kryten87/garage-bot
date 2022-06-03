/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ConfigService } from '@nestjs/config';
import { GpioService, INPUT_PIPE, OUTPUT_PIPE } from './gpio';
import { Test, TestingModule } from '@nestjs/testing';

const pause = (duration: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, duration));

describe('Gpio', () => {
  let provider: GpioService;

  const doorPin = 17;
  const pollingInterval = 100;

  const mockConfig = {
    get: (key: string): string | number =>
      key === 'GPIO_DOOR_SENSOR' ? doorPin : pollingInterval,
  };

  const mockRpio = {
    init: jest.fn(),
    open: jest.fn(),
    read: jest.fn(),
  };

  const mockFs = {
    openSync: jest.fn(),
    createReadStream: jest.fn(),
    createWriteStream: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpioService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: 'RPIO', useValue: mockRpio },
        { provide: 'FILESYSTEM', useValue: mockFs },
      ],
    }).compile();

    provider = module.get<GpioService>(GpioService);

    provider.mkfifo = jest.fn();

    mockRpio.open.mockClear();
    mockRpio.init.mockClear();
    mockRpio.read.mockClear();

    mockFs.openSync.mockClear();
    mockFs.createReadStream.mockClear();
    mockFs.createWriteStream.mockClear();
  });

  afterEach(() => {
    // @ts-ignore tear down timer on private property; ok for testing
    if (provider.timeHandle) {
      // @ts-ignore tear down timer on private property; ok for testing
      clearTimeout(provider.timeHandle);
    }
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('onDoorEvent', () => {
    it('should set up the event handler', () => {
      // @ts-ignore access private property; ok for testing
      expect(provider.doorEventHandler).toEqual([]);
      const handler = jest.fn();
      provider.onDoorEvent(handler);
      // @ts-ignore access private property; ok for testing
      expect(provider.doorEventHandler).toEqual([handler]);
    });
  });

  describe('polling', () => {
    it('should trigger the event handler correctly', async () => {
      const handler = jest.fn();
      provider.onDoorEvent(handler);

      // array is empty to start
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([0, 0, 0]);

      // read = 0
      mockRpio.read.mockReturnValue(0);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([0, 0, 0]);
      expect(handler.mock.calls.length).toBe(0);

      // read = 1
      mockRpio.read.mockReturnValue(1);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([0, 0, 1]);
      expect(handler.mock.calls.length).toBe(0);

      // read = 1
      mockRpio.read.mockReturnValue(1);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([0, 1, 1]);
      expect(handler.mock.calls.length).toBe(0);

      // read = 1
      mockRpio.read.mockReturnValue(1);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([1, 1, 1]);
      expect(handler.mock.calls.length).toBe(1);
      expect(handler.mock.calls[0][0]).toBe(1);

      // read = 1
      mockRpio.read.mockReturnValue(1);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([1, 1, 1]);
      expect(handler.mock.calls.length).toBe(1);

      // read = 0
      mockRpio.read.mockReturnValue(0);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([1, 1, 0]);
      expect(handler.mock.calls.length).toBe(1);

      // read = 0
      mockRpio.read.mockReturnValue(0);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([1, 0, 0]);
      expect(handler.mock.calls.length).toBe(1);

      // read = 0
      mockRpio.read.mockReturnValue(0);
      // wait for the polling interval + 5 ms
      await pause(pollingInterval + 5);
      // @ts-ignore checking private property; ok for testing
      expect(provider.inputState[doorPin]).toEqual([0, 0, 0]);
      expect(handler.mock.calls.length).toBe(2);
      expect(handler.mock.calls[1][0]).toBe(0);
    });
  });

  describe('readFromOutputStream', () => {
    let listener;

    beforeEach(() => {
      // @ts-ignore private property; ok for testing
      provider.outputStream = {
        // @ts-ignore mock event registration function; ok for testing
        once: jest.fn((event, handler) => {
          listener = handler;
        }),
      };
    });

    it('should add an event listener', async () => {
      const resultPromise = provider.readFromOutputStream();
      // @ts-ignore private property; ok for testing
      expect(provider.outputStream.once.mock.calls.length).toBe(1);
      listener(true);
      await resultPromise;
    });

    it('should return the expected value when the callback is called', async () => {
      const data = true;
      const resultPromise = provider.readFromOutputStream();
      listener(data);
      const result = await resultPromise;
      expect(result).toBe(data);
    });

    it('should throw an error if the timeout expires without the callback being called', async () => {
      try {
        await provider.readFromOutputStream();
        throw new Error('this should not happen');
      } catch (err) {
        expect(err.message).toContain('timed out');
      }
    });
  });

  describe('request', () => {
    beforeEach(() => {
      // @ts-ignore private property; ok for testing
      provider.pipesAreInitialized = true;
      // @ts-ignore private property; ok for testing
      provider.inputStream = { write: jest.fn() };
      provider.readFromOutputStream = jest.fn();
    });

    it('should send the request to the INPUT pipe', async () => {
      const query = { input: 0 };
      await provider.request(query);
      // @ts-ignore private property; ok for testing
      expect(provider.inputStream.write.mock.calls.length).toBe(1);
      // @ts-ignore private property; ok for testing
      expect(provider.inputStream.write.mock.calls[0][0]).toBe(
        JSON.stringify(query),
      );
      expect(true).toBe(true);
    });

    it('should retrieve the reponse from the OUTPUT pipe', async () => {
      const query = { input: 0 };
      await provider.request(query);
      // @ts-ignore method overwritten by mock; ok for testing
      expect(provider.readFromOutputStream.mock.calls.length).toBe(1);
    });
  });

  describe('initializePipes', () => {
    it('should correctly initialize OUTPUT stream', async () => {
      await provider.initializePipes();

      expect(mockFs.openSync.mock.calls.length).toBe(1);
      expect(mockFs.openSync.mock.calls[0][0]).toBe(OUTPUT_PIPE);
      expect(mockFs.openSync.mock.calls[0][1]).toBe('r+');
      expect(mockFs.createReadStream.mock.calls.length).toBe(1);
    });

    it('should correctly initialize INPUT stream', async () => {
      await provider.initializePipes();

      expect(mockFs.createWriteStream.mock.calls.length).toBe(1);
      expect(mockFs.createWriteStream.mock.calls[0][0]).toBe(INPUT_PIPE);
    });
  });
});
