import { Module } from '@nestjs/common';
import { GpioService } from './services/gpio';
import { ConfigService } from '@nestjs/config';
import * as rpio from 'rpio';
import * as fs from 'fs';

@Module({
  providers: [
    ConfigService,
    GpioService,
    { provide: 'RPIO', useValue: rpio },
    { provide: 'FILESYSTEM', useValue: fs },
  ],
  exports: [GpioService],
})
export class RpiModule {}
