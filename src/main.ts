import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { SlackLogger } from './slack-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(SlackLogger));
  await app.listen(3000);
}
bootstrap();
