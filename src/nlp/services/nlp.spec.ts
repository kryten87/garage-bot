import { ConfigService } from '@nestjs/config';
import { NlpService, Intent } from './nlp';
import { Test, TestingModule } from '@nestjs/testing';

describe('Nlp', () => {
  let provider: NlpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NlpService, ConfigService],
    }).compile();

    provider = module.get<NlpService>(NlpService);
    await provider.onModuleInit();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('process', () => {
    it('should remap the results to the expected values', async () => {
      const response = await provider.process('close the door');
      expect(response.intent).toBe(Intent.CloseDoor);
      expect(response.score).toBe(1);
      expect(response.answer).not.toBeUndefined();
    });
  });
});
