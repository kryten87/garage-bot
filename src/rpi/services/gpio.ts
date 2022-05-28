import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

export const POLLING_INTERVAL = 100;

export const DOOR_SWITCH = 15; // @TODO figure out which pin to use

@Injectable()
export class GpioService implements OnModuleInit, OnModuleDestroy {
  private timeHandle: NodeJS.Timeout;
  private doorEventHandler: any[] = [];
  private currentState: { [DOOR_SWITCH]: number } = { [DOOR_SWITCH]: 0 };
  private inputState: { [DOOR_SWITCH]: number[] } = {
    [DOOR_SWITCH]: [0, 0, 0],
  };

  constructor(@Inject('RPIO') private readonly rpio: any) {
    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      POLLING_INTERVAL,
    );
  }

  async onModuleInit() {
    this.rpio.open(DOOR_SWITCH, rpio.INPUT);
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
    this.inputState[DOOR_SWITCH].push(this.rpio.read(DOOR_SWITCH));
    if (this.inputState[DOOR_SWITCH].length > 3) {
      this.inputState[DOOR_SWITCH].shift();
    }

    let current: number | null = null;
    if (this.inputState[DOOR_SWITCH].join('') === '111') {
      current = 1;
    } else if (this.inputState[DOOR_SWITCH].join('') === '000') {
      current = 0;
    }
    if (current !== null && current !== this.currentState[DOOR_SWITCH]) {
      this.currentState[DOOR_SWITCH] = current;
      this.doorEventHandler.forEach((handler) => handler(current));
    }

    this.timeHandle = setTimeout(
      () => this.pollDoor.call(this),
      POLLING_INTERVAL,
    );
  }
}
