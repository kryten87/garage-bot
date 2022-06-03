import { ConfigService } from '@nestjs/config';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

// INPUT to Python driver -- so we send commands on the input pipe; listen for
// responses on the output pipe
export const INPUT_PIPE = 'gpio_driver_input';
export const OUTPUT_PIPE = 'gpio_driver_output';

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
  private inputStream: any;
  private outputStream: any;

  constructor(
    private readonly configService: ConfigService,
    @Inject('RPIO') private readonly rpio: any,
  ) {
    // initialize the RPIO package
    this.rpio.init();

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
    // set the door switch for input
    this.rpio.open(this.doorSensorPin, this.rpio.INPUT, this.rpio.PULL_UP);
    // @TODO set up pins for output here
  }

  onModuleDestroy() {
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    }
  }

  getCurrentDoorState() {
    return this.rpio.read(this.doorSensorPin) ? 1 : 0;
  }

  onDoorEvent(handler: any) {
    this.doorEventHandler.push(handler);
  }

  private pollDoor() {
    // get the current state & add it to the list
    this.inputState[this.doorSensorPin].push(this.getCurrentDoorState());

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

  async readFromOutputStream(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error('request timed out'));
      }, TIMEOUT);

      this.outputStream.addEventListener(
        'data',
        (data) => {
          clearTimeout(timeoutHandle);
          resolve(data);
        },
        { once: true },
      );
    });
  }

  async request(query: PythonDriverQuery): Promise<boolean> {
    // send the request to the INPUT pipe
    await this.inputStream.write(JSON.stringify(query));
    // wait for a response on the OUTPUT pipe
    return this.readFromOutputStream();
  }
}
