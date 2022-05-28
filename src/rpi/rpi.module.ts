import { Module } from '@nestjs/common';
import { GpioService } from './services/gpio';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    ConfigService,
    GpioService,
  ],
  exports: [GpioService],
})
export class RpiModule {}
