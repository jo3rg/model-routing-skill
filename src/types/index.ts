export type ProviderName = 'minimax' | 'openai' | 'trusted_skill';
export type RuntimeProviderName = Exclude<ProviderName, 'trusted_skill'>;

export type ModelTier =
  | 'none'
  | 'minimax_fast'
  | 'minimax_general'
  | 'openai_general'
  | 'openai_reasoning'
  | 'openai_review';

export type ConfiguredModelTier = Exclude<ModelTier, 'none'>;

export type TaskClass =
  | 'bounded_execution'
  | 'moderate_technical'
  | 'reasoning_critical'
  | 'final_review_required';

export type TaskDomain =
  | 'general'
  | 'engineering'
  | 'documentation'
  | 'frontend'
  | 'github'
  | 'research'
  | 'security_ops'
  | 'dfir_splunk'
  | 'dfir_velociraptor';

export type ExecutionMode =
  | 'specialized_skill'
  | 'specialized_skill_then_openai_review'
  | 'minimax_direct'
  | 'minimax_then_openai_review'
  | 'openai_direct';

export type ExpectedArtifact = 'text' | 'code' | 'json' | 'yaml' | 'spl' | 'vql' | 'research' | 'docs' | 'plan';

export interface TaskMetadata {
  securitySensitive?: boolean;
  productionRelevant?: boolean;
  finalReviewRequested?: boolean;
  domainHints?: string[];
  expectedArtifact?: ExpectedArtifact;
  allowedSkillIds?: string[];
  disallowedSkillIds?: string[];
}

export interface RoutingTask {
  prompt: string;
  requirements?: string[];
  metadata?: TaskMetadata;
}

export interface NormalizedTask {
  original_prompt: string;
  normalized_prompt: string;
  compact_prompt: string;
  verb_hints: string[];
  noun_hints: string[];
  requested_artifacts: ExpectedArtifact[];
  explicit_review_requested: boolean;
}

export interface DomainSignals {
  splunk: boolean;
  velociraptor: boolean;
  research: boolean;
  investigation: boolean;
  coding: boolean;
  debugging: boolean;
  documentation: boolean;
  frontend: boolean;
  github: boolean;
  securitySensitive: boolean;
  productionRelevant: boolean;
  finalReviewRequested: boolean;
}

export type DomainSignalName = keyof DomainSignals;

export interface ClassificationResult {
  taskClass: TaskClass;
  domain: TaskDomain;
  confidence: number;
  rationale: string[];
  matchedRules: string[];
  domainSignals: DomainSignals;
  normalizedTask: NormalizedTask;
  scorecard: Record<TaskClass, number>;
}

export interface TierConfig {
  provider: RuntimeProviderName;
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

export type VerificationCheckName =
  | 'requirement_coverage'
  | 'internal_consistency'
  | 'syntax_plausibility'
  | 'ambiguity_detection'
  | 'unresolved_assumptions'
  | 'domain_specific_quality'
  | 'production_safety_review'
  | 'skill_output_contract'
  | 'post_skill_handoff_quality';

export interface TrustedSkillMetadata {
  id: string;
  displayName: string;
  description: string;
  owner: string;
  location: string;
  version: string;
  domains: TaskDomain[];
  triggerPhrases: string[];
  artifactFocus: ExpectedArtifact[];
  reviewPreference: 'never' | 'conditional' | 'always';
  riskTags: string[];
  verificationFocus: VerificationCheckName[];
  handoffRequirements: string[];
  examples: string[];
  enabled: boolean;
}

export interface CapabilityCandidate {
  kind: 'trusted_skill' | 'model';
  skill_id?: string;
  score: number;
  reasons: string[];
}

export interface CapabilitySelection {
  kind: 'trusted_skill' | 'model';
  score: number;
  reasons: string[];
  selected_skill?: TrustedSkillMetadata;
  candidates: CapabilityCandidate[];
}

export interface VerificationPlanStep {
  phase: 'preflight' | 'post_skill' | 'post_model' | 'openai_review' | 'acceptance';
  name: string;
  description: string;
  required: boolean;
  checks: VerificationCheckName[];
}

export interface RouterConfig {
  confidenceThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  tiers: Record<ConfiguredModelTier, TierConfig>;
  providers: Record<RuntimeProviderName, ProviderConfig>;
  trustedSkills: TrustedSkillMetadata[];
  capabilityPolicy: {
    minimumSkillScore: number;
    reviewSkillAtConfidenceOrBelow: number;
    preferOpenAIForReasoningAtConfidenceOrBelow: number;
  };
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
    skillHandoffPhrases: string[];
  };
}

export interface RouteDecision {
  task_class: TaskClass;
  domain: TaskDomain;
  execution_mode: ExecutionMode;
  selected_provider: ProviderName;
  selected_model_tier: ModelTier;
  selected_model_id?: string;
  selected_skill_id?: string;
  review_provider?: RuntimeProviderName;
  review_model_tier?: ConfiguredModelTier;
  review_model_id?: string;
  confidence: number;
  review_required: boolean;
  escalation_needed: boolean;
  rationale: string[];
  verification_plan: VerificationPlanStep[];
  matched_rules: string[];
  domain_signals: DomainSignals;
  normalized_task: NormalizedTask;
  capability_selection: {
    kind: 'trusted_skill' | 'model';
    score: number;
    skill_id?: string;
    candidates: CapabilityCandidate[];
  };
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

export type FinalOutcome = 'accepted' | 'escalated' | 'review_required';

export interface TelemetryEvent {
  timestamp: string;
  task_class: TaskClass;
  selected_provider: ProviderName;
  selected_model_tier: ModelTier;
  selected_model_id?: string;
  confidence: number;
  review_required: boolean;
  escalation_needed: boolean;
  verification_pass: boolean;
  verification_summary: string;
  token_usage?: TokenUsage;
  final_outcome: FinalOutcome;
  task_domain: TaskDomain;
  task_complexity: 'high' | 'medium' | 'low';
  execution_mode: ExecutionMode;
  selected_skill_id?: string;
}

export interface ProviderResponse {
  provider: RuntimeProviderName;
  modelId: string;
  content: string;
  usage?: TokenUsage;
  raw?: unknown;
}

export interface VerificationCheckResult {
  name: VerificationCheckName;
  passed: boolean;
  score: number;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

export interface VerificationReport {
  overallPass: boolean;
  score: number;
  summary: string;
  failedChecks: VerificationCheckName[];
  warnings: VerificationCheckName[];
  checks: VerificationCheckResult[];
}

export interface EscalationDecision {
  executionMode: ExecutionMode;
  reviewRequired: boolean;
  escalationNeeded: boolean;
  selectedTier: ModelTier;
  selectedProvider: ProviderName;
  reviewTier?: ConfiguredModelTier;
  reviewProvider?: RuntimeProviderName;
  reasons: string[];
}

export interface ExecutionPlanStepResult {
  step: number;
  actor: ProviderName | 'system';
  phase: VerificationPlanStep['phase'] | 'primary';
  title: string;
  objective: string;
  tier?: ModelTier;
  skill_id?: string;
  instructions: string[];
}

export interface ExecutionResult {
  decision: RouteDecision;
  plan: ExecutionPlanStepResult[];
  auditTrail: string[];
  /** Phase 2 optimization result — present when a cheap model path was selected */
  phase2_optimization?: {
    optimized_prompt: string;
    domain: string;
    task_complexity: string;
    decomposition_used: boolean;
    output_schema: Record<string, unknown>;
    validation_rules: string[];
    confidence_expectation: string;
    risk_level: string;
    escalation_signals: string[];
  };
}

export interface ModelProvider {
  name: RuntimeProviderName;
  generate(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface ProviderRegistry {
  openai?: ModelProvider;
  minimax?: ModelProvider;
}
