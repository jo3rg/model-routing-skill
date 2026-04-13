import { describe, expect, it } from 'vitest';
import { buildRouterConfigFromEnv, resolveProviderSecrets } from '../src/config/env.js';

describe('config', () => {
  it('applies model tier overrides from environment variables', () => {
    const config = buildRouterConfigFromEnv({
      MODEL_TIER_MINIMAX_FAST: 'MiniMax-M2.7-highspeed',
      MODEL_TIER_OPENAI_REASONING: 'gpt-5.4',
    } as NodeJS.ProcessEnv);

    expect(config.tiers.minimax_fast.modelId).toBe('MiniMax-M2.7-highspeed');
    expect(config.tiers.openai_reasoning.modelId).toBe('gpt-5.4');
  });

  it('resolves provider secrets and throws when missing', () => {
    expect(() => resolveProviderSecrets('openai', {} as NodeJS.ProcessEnv)).toThrow(/OPENAI_API_KEY/);

    const secrets = resolveProviderSecrets(
      'minimax',
      { MINIMAX_API_KEY: 'secret', MINIMAX_BASE_URL: 'https://example.com/v1' } as NodeJS.ProcessEnv,
    );

    expect(secrets.apiKey).toBe('secret');
    expect(secrets.baseUrl).toBe('https://example.com/v1');
  });
});
