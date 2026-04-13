import type { ProviderRequest } from '../types/index.js';
import { OpenAICompatibleProvider } from './base.js';

export class MiniMaxProvider extends OpenAICompatibleProvider {
  readonly name = 'minimax' as const;

  protected override buildBody(request: ProviderRequest): Record<string, unknown> {
    return {
      ...super.buildBody(request),
      reasoning_split: true,
    };
  }
}
