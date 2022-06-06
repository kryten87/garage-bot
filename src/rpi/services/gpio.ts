import { ConfigService } from '@nestjs/config';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ReadStream, WriteStream } from 'fs';

const pause = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

// INPUT to Python driver -- so we send commands on the input pipe; listen for
// responses on the output pipe
export const INPUT_PIPE = '/tmp/gpio_driver_input';
export const OUTPUT_PIPE = '/tmp/gpio_driver_output';

// @TODO rename this & make it an env variable
export const TIMEOUT = 1000;

interface PythonDriverQuery {
  input?: number;
  output?: { [pin: number]: boolean };
  relay?: { [pin: number]: boolean };
}

@Injectable()
export class GpioService implements OnModuleInit, OnModuleDestroy {
  private pollingInterval: number;
  private timeHandle: NodeJS.Timeout;
  private doorSensorPin: number;
  private doorEventHandler: any[] = [];
  private remoteRelay: number;
  private remoteButtonPressLength: number;
  private currentState: { [pin: number]: number } = {};
  private inputState: { [pin: number]: number[] } = {};
  private inputStream: WriteStream;
  private outputStream: ReadStream;

  constructor(
    private readonly configService: ConfigService,
    @Inject('FILESYSTEM') private readonly fileSystem: any,
  ) {
    // initialize the service state
    this.pollingInterval = +this.configService.get<number>(
      'SENSOR_POLLING_INTERVAL',
    );
    this.doorSensorPin = this.configService.get<number>('GPIO_DOOR_SENSOR');
    this.remoteRelay = this.configService.get<number>('GPIO_REMOTE_RELAY');
    this.remoteButtonPressLength = this.configService.get<number>(
      'REMOTE_BUTTON_PRESS_LENGTH',
    );
    this.currentState[this.doorSensorPin] = 0;
    this.inputState[this.doorSensorPin] = [0, 0, 0];
  }

  async onModuleInit() {
    // initialize the pipes for communication
    await this.initializePipes();

    this.startPolling();
  }

  onModuleDestroy() {
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    }
  }

  // @TODO make this private
  startPolling() {
    // start polling
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      this.pollingInterval,
    );
  }

  async getCurrentDoorState() {
    const result = await this.request({ input: this.doorSensorPin });
    return result ? 1 : 0;
  }

  async pressRemoteButton() {
    // relay 0 on
    this.request({ relay: { [this.remoteRelay]: true } });
    // pause long enough for the button press to register
    await pause(this.remoteButtonPressLength);
    // relay 0 off
    this.request({ relay: { [this.remoteRelay]: false } });
  }

  onDoorEvent(handler: any) {
    this.doorEventHandler.push(handler);
  }

  private async pollDoor() {
    // get the current state & add it to the list
    this.inputState[this.doorSensorPin].push(await this.getCurrentDoorState());

    if (this.inputState[this.doorSensorPin].length > 3) {
      this.inputState[this.doorSensorPin].shift();
    }

    let current: number | null = null;
    if (this.inputState[this.doorSensorPin].join('') === '111') {
      current = 1;
    } else if (this.inputState[this.doorSensorPin].join('') === '000') {
      current = 0;
    }
    if (current !== null && current !== this.currentState[this.doorSensorPin]) {
      this.currentState[this.doorSensorPin] = current;
      this.doorEventHandler.forEach((handler) => handler(current));
    }

    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      this.pollingInterval,
    );
  }

  async openReadPipe(name: string): Promise<ReadStream> {
    const fd = this.fileSystem.openSync(name, 'r+');
    return this.fileSystem.createReadStream(null, { fd });
  }

  async openWritePipe(name: string): Promise<WriteStream> {
    return this.fileSystem.createWriteStream(name);
  }

  // @TODO make this private
  async initializePipes(): Promise<void> {
    this.outputStream = await this.openReadPipe(OUTPUT_PIPE);
    this.inputStream = await this.openWritePipe(INPUT_PIPE);
  }

  // @TODO make this private
  async readFromOutputStream(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error('request timed out'));
      }, TIMEOUT);

      this.outputStream.once('data', (data) => {
        clearTimeout(timeoutHandle);
        const result = JSON.parse(data.toString());
        resolve(result);
      });
    });
  }

  async request(query: PythonDriverQuery): Promise<boolean> {
    // send the request to the INPUT pipe
    await this.inputStream.write(JSON.stringify(query));
    // wait for a response on the OUTPUT pipe
    return this.readFromOutputStream();
  }
}
