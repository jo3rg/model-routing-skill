import { DEFAULT_ROUTER_CONFIG } from './defaults.js';
import type { ProviderName, RouterConfig, RuntimeProviderName } from '../types/index.js';

export interface TelemetryConfig {
  enabled: boolean;
  logPath: string;
}

export function buildTelemetryConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TelemetryConfig {
  const enabled = (env.ROUTING_TELEMETRY_ENABLED ?? 'true').toLowerCase() === 'true';
  const logPath = env.ROUTING_TELEMETRY_LOG_PATH ?? './logs/router-decisions.jsonl';
  return { enabled, logPath };
}

export interface ProviderSecrets {
  openai?: { apiKey: string; baseUrl: string };
  minimax?: { apiKey: string; baseUrl: string };
}

function cloneConfig(config: RouterConfig): RouterConfig {
  return JSON.parse(JSON.stringify(config)) as RouterConfig;
}

export function buildRouterConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  baseConfig: RouterConfig = DEFAULT_ROUTER_CONFIG,
): RouterConfig {
  const config = cloneConfig(baseConfig);

  config.providers.openai.baseUrl = env.OPENAI_BASE_URL ?? config.providers.openai.baseUrl;
  config.providers.minimax.baseUrl = env.MINIMAX_BASE_URL ?? config.providers.minimax.baseUrl;

  config.tiers.minimax_fast.modelId = env.MODEL_TIER_MINIMAX_FAST ?? config.tiers.minimax_fast.modelId;
  config.tiers.minimax_general.modelId = env.MODEL_TIER_MINIMAX_GENERAL ?? config.tiers.minimax_general.modelId;
  config.tiers.openai_general.modelId = env.MODEL_TIER_OPENAI_GENERAL ?? config.tiers.openai_general.modelId;
  config.tiers.openai_reasoning.modelId = env.MODEL_TIER_OPENAI_REASONING ?? config.tiers.openai_reasoning.modelId;
  config.tiers.openai_review.modelId = env.MODEL_TIER_OPENAI_REVIEW ?? config.tiers.openai_review.modelId;

  return config;
}

export function resolveProviderSecrets(
  provider: RuntimeProviderName,
  env: NodeJS.ProcessEnv = process.env,
  config: RouterConfig = DEFAULT_ROUTER_CONFIG,
): { apiKey: string; baseUrl: string } {
  const providerConfig = config.providers[provider];
  const apiKey = env[providerConfig.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`Missing required environment variable: ${providerConfig.apiKeyEnv}`);
  }

  return {
    apiKey,
    baseUrl: provider === 'openai' ? env.OPENAI_BASE_URL ?? providerConfig.baseUrl : env.MINIMAX_BASE_URL ?? providerConfig.baseUrl,
  };
}

export function availableProviderSecrets(
  env: NodeJS.ProcessEnv = process.env,
  config: RouterConfig = DEFAULT_ROUTER_CONFIG,
): ProviderSecrets {
  const secrets: ProviderSecrets = {};

  for (const provider of ['openai', 'minimax'] as const) {
    const apiKey = env[config.providers[provider].apiKeyEnv];
    if (!apiKey) {
      continue;
    }

    secrets[provider] = {
      apiKey,
      baseUrl: provider === 'openai' ? env.OPENAI_BASE_URL ?? config.providers[provider].baseUrl : env.MINIMAX_BASE_URL ?? config.providers[provider].baseUrl,
    };
  }

  return secrets;
}
