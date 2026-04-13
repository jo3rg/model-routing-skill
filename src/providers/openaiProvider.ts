import { OpenAICompatibleProvider } from './base.js';

export class OpenAIProvider extends OpenAICompatibleProvider {
  readonly name = 'openai' as const;
}
