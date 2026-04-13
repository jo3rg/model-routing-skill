export type ProviderName = 'minimax' | 'openai';

export type ModelTier =
  | 'minimax_fast'
  | 'minimax_general'
  | 'openai_general'
  | 'openai_reasoning'
  | 'openai_review';

export type TaskClass =
  | 'bounded_execution'
  | 'moderate_technical'
  | 'reasoning_critical'
  | 'final_review_required';

export interface TaskMetadata {
  securitySensitive?: boolean;
  productionRelevant?: boolean;
  finalReviewRequested?: boolean;
  domainHints?: string[];
  expectedArtifact?: 'text' | 'code' | 'json' | 'yaml' | 'spl' | 'vql' | 'research';
}

export interface RoutingTask {
  prompt: string;
  requirements?: string[];
  metadata?: TaskMetadata;
}

export interface DomainSignals {
  splunk: boolean;
  velociraptor: boolean;
  research: boolean;
  coding: boolean;
  debugging: boolean;
  securitySensitive: boolean;
  productionRelevant: boolean;
  finalReviewRequested: boolean;
}

export type DomainSignalName = keyof DomainSignals;

export interface ClassificationResult {
  taskClass: TaskClass;
  confidence: number;
  rationale: string[];
  matchedRules: string[];
  domainSignals: DomainSignals;
  scorecard: Record<TaskClass, number>;
}

export interface TierConfig {
  provider: ProviderName;
  modelId: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface ProviderConfig {
  baseUrl: string;
  apiKeyEnv: string;
  defaultHeaders?: Record<string, string>;
}

export interface RouterConfig {
  confidenceThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  tiers: Record<ModelTier, TierConfig>;
  providers: Record<ProviderName, ProviderConfig>;
  escalationPolicy: {
    securityReviewAtConfidenceOrBelow: number;
    productionReviewAtConfidenceOrBelow: number;
    forceReasoningDomains: DomainSignalName[];
    reviewDomains: DomainSignalName[];
  };
  verification: {
    ambiguityPhrases: string[];
    weakAssumptionPhrases: string[];
    unsafeShellPatterns: string[];
  };
}

export interface RouteDecision {
  task_class: TaskClass;
  selected_provider: ProviderName;
  selected_model_tier: ModelTier;
  selected_model_id: string;
  confidence: number;
  review_required: boolean;
  escalation_needed: boolean;
  rationale: string[];
  verification_summary: string;
  matched_rules: string[];
  domain_signals: DomainSignals;
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ProviderRequest {
  modelId: string;
  messages: ProviderMessage[];
  temperature: number;
  maxTokens: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  metadata?: Record<string, string>;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ProviderResponse {
  provider: ProviderName;
  modelId: string;
  content: string;
  usage?: TokenUsage;
  raw?: unknown;
}

export interface VerificationCheckResult {
  name:
    | 'requirement_coverage'
    | 'internal_consistency'
    | 'syntax_plausibility'
    | 'ambiguity_detection'
    | 'unresolved_assumptions'
    | 'domain_specific_quality'
    | 'production_safety_review';
  passed: boolean;
  score: number;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

export interface VerificationReport {
  overallPass: boolean;
  score: number;
  summary: string;
  failedChecks: string[];
  warnings: string[];
  checks: VerificationCheckResult[];
}

export interface EscalationDecision {
  escalationNeeded: boolean;
  reviewRequired: boolean;
  recommendedTier?: ModelTier;
  reasons: string[];
}

export interface ExecutionResult {
  decision: RouteDecision;
  initialResponse?: ProviderResponse;
  reviewResponse?: ProviderResponse;
  finalResponse?: ProviderResponse;
  verification: VerificationReport;
  escalated: boolean;
  auditTrail: string[];
}

export interface ModelProvider {
  name: ProviderName;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface ProviderRegistry {
  openai?: ModelProvider;
  minimax?: ModelProvider;
}
