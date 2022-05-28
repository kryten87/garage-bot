import { ConfigService } from '@nestjs/config';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

export const POLLING_INTERVAL = 100;

@Injectable()
export class GpioService implements OnModuleInit, OnModuleDestroy {
  private timeHandle: NodeJS.Timeout;
  private doorSensorPin: number;
  private doorEventHandler: any[] = [];
  private currentState: { [pin: number]: number } = {};
  private inputState: { [pin: number]: number[] } = {};

  constructor(
    private readonly configService: ConfigService,
    @Inject('RPIO') private readonly rpio: any,
  ) {
    // initialize the service state
    this.doorSensorPin = this.configService.get<number>('GPIO_DOOR_SENSOR');
    this.currentState[this.doorSensorPin] = 0;
    this.inputState[this.doorSensorPin] = [0, 0, 0];

    // start polling
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      POLLING_INTERVAL,
    );
  }

  async onModuleInit() {
    // set the door switch for input
    this.rpio.open(this.doorSensorPin, rpio.INPUT);
    // @TODO set up pins for output here
  }

  onModuleDestroy() {
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    }
  }

  onDoorEvent(handler: any) {
    this.doorEventHandler.push(handler);
  }

  private pollDoor() {
    // get the current state & add it to the list
    this.inputState[this.doorSensorPin].push(
      this.rpio.read(this.doorSensorPin),
    );
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
      POLLING_INTERVAL,
    );
  }
}
