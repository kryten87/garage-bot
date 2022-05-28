import { Module } from '@nestjs/common';
import { GpioService } from './services/gpio';
import { ConfigService } from '@nestjs/config';
import * as rpio from 'rpio';

@Module({
  providers: [
    ConfigService,
    GpioService,
    { provide: 'RPIO', useValue: rpio },
  ],
  exports: [GpioService],
})
export class RpiModule {}
