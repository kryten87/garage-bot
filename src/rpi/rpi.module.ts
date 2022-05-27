import { Module } from '@nestjs/common';
import { GpioService } from './services/gpio';

@Module({
  providers: [GpioService],
  exports: [GpioService],
})
export class RpiModule {}
