import { Test, TestingModule } from '@nestjs/testing';
import { Slack } from './slack';

describe('Slack', () => {
  let provider: Slack;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Slack],
    }).compile();

    provider = module.get<Slack>(Slack);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
