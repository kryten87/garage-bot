import { ConfigService } from '@nestjs/config';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class GpioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('gpio.service');
  private pollingInterval: number;
  private timeHandle: NodeJS.Timeout;
  private doorSensorPin: number;
  private doorEventHandler: any[] = [];
  private currentState: { [pin: number]: number } = {};
  private inputState: { [pin: number]: number[] } = {};

  constructor(
    private readonly configService: ConfigService,
    @Inject('RPIO') private readonly rpio: any,
  ) {
    this.logger.debug('initializing GPIO library');
    this.rpio.init();

    // initialize the service state
    this.pollingInterval = +this.configService.get<number>(
      'SENSOR_POLLING_INTERVAL',
    );
    this.doorSensorPin = this.configService.get<number>('GPIO_DOOR_SENSOR');
    this.currentState[this.doorSensorPin] = 0;
    this.inputState[this.doorSensorPin] = [0, 0, 0];

    // start polling
    this.logger.debug('starting polling...');
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      this.pollingInterval,
    );
  }

  async onModuleInit() {
    // set the door switch for input
    this.logger.debug('initializing door sensor');
    this.rpio.open(this.doorSensorPin, this.rpio.INPUT, this.rpio.PULL_UP);
    // @TODO set up pins for output here
  }

  onModuleDestroy() {
    this.logger.debug('cleaning up poller');
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    }
  }

  getCurrentDoorState() {
    this.logger.debug('checking door sensor state');
    return this.rpio.read(this.doorSensorPin) ? 1 : 0;
  }

  onDoorEvent(handler: any) {
    this.logger.debug('setting up door event handler');
    this.doorEventHandler.push(handler);
  }

  private pollDoor() {
    // get the current state & add it to the list
    this.logger.verbose('poll -- checking door sensor');
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
    this.logger.verbose(`poll -- got current state ${current}`);
    if (current !== null && current !== this.currentState[this.doorSensorPin]) {
      this.logger.debug('poll -- state has changed; calling handler');
      this.currentState[this.doorSensorPin] = current;
      this.doorEventHandler.forEach((handler) => handler(current));
    }

    this.logger.verbose('poll -- setting timer for next check');
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      this.pollingInterval,
    );
  }
}
