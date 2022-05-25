import { dockStart } from '@nlpjs/basic';
import { Injectable, OnModuleInit } from '@nestjs/common';

const documents = [
  ['hello', 'action.greeting'],
  ['howdy', 'action.greeting'],
  ['can you hear me', 'action.greeting'],
  ['are you running', 'action.greeting'],
  ['are you up', 'action.greeting'],

  ['open the garage door', 'action.garage.open'],
  ['open the door', 'action.garage.open'],
  ['open', 'action.garage.open'],
  ['open up', 'action.garage.open'],
  ['open it', 'action.garage.open'],

  ['close the garage door', 'action.garage.close'],
  ['close the door', 'action.garage.close'],
  ['close', 'action.garage.close'],
  ['close it', 'action.garage.close'],
  ['shut the garage door', 'action.garage.close'],
  ['shut the door', 'action.garage.close'],
  ['shut', 'action.garage.close'],
  ['shut it', 'action.garage.close'],

  ['is it open', 'query.garage.state'],
  ['garage door', 'query.garage.state'],
  ['are you open', 'query.garage.state'],
  ['state', 'query.garage.state'],
  ['door state', 'query.garage.state'],
  ["what's the door state", 'query.garage.state'],
];

const answers = [
  ['action.greeting', 'Hello!'],
  ['action.greeting', 'Hey there!'],
  ['action.greeting', 'Greetings!'],
  ['action.greeting', "I'm up & running."],
  ['action.greeting', "I'm waiting for your commands."],

  ['action.garage.open', 'Ok, opening the garage door.'],
  ['action.garage.open', 'Got it. Garage door opening.'],
  ['action.garage.open', 'Opening garage door now.'],
  ['action.garage.open', "I'm on it. Opening the door now."],

  ['action.garage.close', 'Ok, closing the garage door.'],
  ['action.garage.close', 'Got it. Garage door closing.'],
  ['action.garage.close', 'Closing garage door now.'],
  ['action.garage.close', "I'm on it. Closing the door now."],
];

@Injectable()
export class NlpService implements OnModuleInit {
  private nlp;

  async onModuleInit() {
    return this.initialize();
  }

  private async initialize() {
    const dock = await dockStart({ use: ['Basic'] });
    this.nlp = dock.get('nlp');
    this.nlp.addLanguage('en');
    await this.train();
  }

  private async train() {
    documents.forEach(([utterance, intent]) =>
      this.nlp.addDocument('en', utterance, intent),
    );
    answers.forEach(([intent, response]) =>
      this.nlp.addAnswer('en', intent, response),
    );
    await this.nlp.train();
  }

  async process(utterance: string): Promise<any> {
    const result = await this.nlp.process('en', utterance);
    return {
      intent: result.intent,
      score: result.score,
      answer: result.answer,
    };
  }
}
