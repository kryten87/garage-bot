import { Test, TestingModule } from '@nestjs/testing';
import { GpioService } from './gpio';

describe('Gpio', () => {
  let provider: GpioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpioService],
    }).compile();

    provider = module.get<GpioService>(GpioService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
