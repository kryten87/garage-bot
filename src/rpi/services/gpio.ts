import { ConfigService } from '@nestjs/config';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ReadStream, WriteStream } from 'fs';
import { spawn } from 'child_process';

// INPUT to Python driver -- so we send commands on the input pipe; listen for
// responses on the output pipe
export const INPUT_PIPE = '/tmp/gpio_driver_input';
export const OUTPUT_PIPE = '/tmp/gpio_driver_output';

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
    this.currentState[this.doorSensorPin] = 0;
    this.inputState[this.doorSensorPin] = [0, 0, 0];

    // start polling
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      this.pollingInterval,
    );
  }

  async onModuleInit() {
    // initialize the pipes for communication
    await this.initializePipes();
  }

  onModuleDestroy() {
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    }
  }

  async getCurrentDoorState() {
    const result = await this.request({ input: this.doorSensorPin });
    return result ? 1 : 0;
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

  // @TODO make this private
  async mkfifo(name: string): Promise<void> {
    return new Promise((resolve) => {
      const pipe = spawn('mkfifo', [name]);
      pipe.on('exit', () => {
        resolve();
      });
    });
  }

  // @TODO make this private
  async initializePipes(): Promise<void> {
    // open the OUTPUT read stream
    await this.mkfifo(OUTPUT_PIPE);
    const outputFd = this.fileSystem.openSync(OUTPUT_PIPE, 'r+');
    this.outputStream = this.fileSystem.createReadStream(null, {
      fd: outputFd,
    });

    // open the INPUT write stream
    this.inputStream = this.fileSystem.createWriteStream(INPUT_PIPE);
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
