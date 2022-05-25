import { NlpService, Intent } from './nlp';
import { Test, TestingModule } from '@nestjs/testing';

describe('Nlp', () => {
  let provider: NlpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NlpService],
    }).compile();

    provider = module.get<NlpService>(NlpService);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore calling private method; ok for testing
    await provider.initialize();
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
