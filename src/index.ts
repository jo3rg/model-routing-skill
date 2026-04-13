import { buildRouterConfigFromEnv, DEFAULT_ROUTER_CONFIG, resolveProviderSecrets } from './config/index.js';
import { RoutingExecutor } from './executor/routingExecutor.js';
import { MiniMaxProvider } from './providers/minimaxProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { DeterministicRouter } from './router/deterministicRouter.js';
import type { ProviderRegistry, RouterConfig } from './types/index.js';

export * from './classifier/index.js';
export * from './config/index.js';
export * from './escalator/index.js';
export * from './executor/index.js';
export * from './providers/index.js';
export * from './router/index.js';
export * from './types/index.js';
export * from './verifier/index.js';

export function createRouter(config: RouterConfig = DEFAULT_ROUTER_CONFIG): DeterministicRouter {
  return new DeterministicRouter(config);
}

export function createExecutor(providers: ProviderRegistry, config: RouterConfig = DEFAULT_ROUTER_CONFIG): RoutingExecutor {
  return new RoutingExecutor(providers, config);
}

export function createLiveProvidersFromEnv(config: RouterConfig = buildRouterConfigFromEnv()): ProviderRegistry {
  const openaiSecrets = resolveProviderSecrets('openai', process.env, config);
  const minimaxSecrets = resolveProviderSecrets('minimax', process.env, config);

  return {
    openai: new OpenAIProvider(openaiSecrets.apiKey, openaiSecrets.baseUrl),
    minimax: new MiniMaxProvider(minimaxSecrets.apiKey, minimaxSecrets.baseUrl),
  };
}
