import { DEFAULT_TRUSTED_SKILLS } from '../capabilities/trustedSkillRegistry.js';
import type { RouterConfig } from '../types/index.js';

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  confidenceThresholds: {
    low: 0.55,
    medium: 0.74,
    high: 0.86,
  },
  tiers: {
    minimax_fast: {
      provider: 'minimax',
      modelId: 'MiniMax-M2.1-highspeed',
      temperature: 0.1,
      maxTokens: 2200,
    },
    minimax_general: {
      provider: 'minimax',
      modelId: 'MiniMax-M2.5',
      temperature: 0.1,
      maxTokens: 3200,
    },
    openai_general: {
      provider: 'openai',
      modelId: 'gpt-5.4-mini',
      temperature: 0.1,
      maxTokens: 3200,
      reasoningEffort: 'medium',
    },
    openai_reasoning: {
      provider: 'openai',
      modelId: 'gpt-5.4',
      temperature: 0.1,
      maxTokens: 4800,
      reasoningEffort: 'high',
    },
    openai_review: {
      provider: 'openai',
      modelId: 'gpt-5.4',
      temperature: 0.1,
      maxTokens: 4200,
      reasoningEffort: 'high',
    },
  },
  providers: {
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKeyEnv: 'OPENAI_API_KEY',
    },
    minimax: {
      baseUrl: 'https://api.minimax.io/v1',
      apiKeyEnv: 'MINIMAX_API_KEY',
    },
  },
  trustedSkills: DEFAULT_TRUSTED_SKILLS,
  capabilityPolicy: {
    minimumSkillScore: 0.55,
    reviewSkillAtConfidenceOrBelow: 0.82,
    preferOpenAIForReasoningAtConfidenceOrBelow: 0.7,
  },
  escalationPolicy: {
    securityReviewAtConfidenceOrBelow: 0.74,
    productionReviewAtConfidenceOrBelow: 0.74,
    forceReasoningDomains: ['velociraptor', 'splunk', 'research', 'coding', 'debugging'],
    reviewDomains: ['velociraptor', 'splunk', 'research', 'github'],
  },
  verification: {
    ambiguityPhrases: ['maybe', 'probably', 'might', 'could be', 'tbd', 'to be determined', 'etc.', 'and so on', 'something like', 'roughly'],
    weakAssumptionPhrases: ['assuming', 'if available', 'placeholder', 'left as an exercise', 'todo', 'fill in later', 'not sure', 'guess'],
    unsafeShellPatterns: ['rm -rf /', 'chmod 777', 'curl | sh', 'sudo rm', 'iptables -f', 'ufw disable', 'setenforce 0', 'disable auth', 'skip verification', 'trust all certificates'],
    skillHandoffPhrases: ['files changed', 'tests run', 'artifact', 'queries', 'assumptions', 'next steps', 'validation', 'rollback'],
  },
};
