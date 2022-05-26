import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NlpManager } from 'node-nlp';

const locale = 'en';

export enum Intent {
  Greeting = 'GREETING',
  OpenDoor = 'OPEN_DOOR',
  CloseDoor = 'CLOSE_DOOR',
  QueryState = 'QUERY_STATE',
}

const documents = [
  ['hello', Intent.Greeting],
  ['howdy', Intent.Greeting],
  ['can you hear me', Intent.Greeting],
  ['are you running', Intent.Greeting],
  ['are you up', Intent.Greeting],

  ['open the garage door', Intent.OpenDoor],
  ['open the door', Intent.OpenDoor],
  ['open', Intent.OpenDoor],
  ['open up', Intent.OpenDoor],
  ['open it', Intent.OpenDoor],

  ['close the garage door', Intent.CloseDoor],
  ['close the door', Intent.CloseDoor],
  ['close', Intent.CloseDoor],
  ['close it', Intent.CloseDoor],
  ['shut the garage door', Intent.CloseDoor],
  ['shut the door', Intent.CloseDoor],
  ['shut', Intent.CloseDoor],
  ['shut it', Intent.CloseDoor],

  ['is it open', Intent.QueryState],
  ['garage door', Intent.QueryState],
  ['are you open', Intent.QueryState],
  ['state', Intent.QueryState],
  ['door state', Intent.QueryState],
  ["what's the door state", Intent.QueryState],
];

const answers = [
  [Intent.Greeting, 'Hello!'],
  [Intent.Greeting, 'Hey there!'],
  [Intent.Greeting, 'Greetings!'],
  [Intent.Greeting, "I'm up & running."],
  [Intent.Greeting, "I'm waiting for your commands."],

  [Intent.OpenDoor, 'Ok, opening the garage door.'],
  [Intent.OpenDoor, 'Got it. Garage door opening.'],
  [Intent.OpenDoor, 'Opening garage door now.'],
  [Intent.OpenDoor, "I'm on it. Opening the door now."],

  [Intent.CloseDoor, 'Ok, closing the garage door.'],
  [Intent.CloseDoor, 'Got it. Garage door closing.'],
  [Intent.CloseDoor, 'Closing garage door now.'],
  [Intent.CloseDoor, "I'm on it. Closing the door now."],

  [Intent.QueryState, 'One second... checking.'],
  [Intent.QueryState, 'Hold on a moment while I check.'],
];

@Injectable()
export class NlpService implements OnModuleInit {
  private nlp;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    return this.initialize();
  }

  private async initialize() {
    const env = this.configService.get<string>('NODE_ENV');
    this.nlp = new NlpManager({
      autoSave: false,
      languages: [locale],
      forceNER: false,
      nlu: {
        useNoneFeature: false,
        log: env !== 'production' && env !== 'test',
        spellCheck: true,
      },
      ner: { threshold: 0.9 },
    });
    await this.train();
  }

  private async train() {
    documents.forEach(([utterance, intent]) =>
      this.nlp.addDocument(locale, utterance, intent),
    );
    answers.forEach(([intent, response]) =>
      this.nlp.addAnswer(locale, intent, response),
    );
    await this.nlp.train();
  }

  async process(utterance: string): Promise<any> {
    const result = await this.nlp.process(locale, utterance);
    return {
      intent: result.intent,
      score: result.score,
      answer: result.answer,
    };
  }
}
