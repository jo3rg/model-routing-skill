import { DeterministicTaskClassifier } from '../classifier/deterministicClassifier.js';
import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import { DeterministicEscalator } from '../escalator/deterministicEscalator.js';
import type { ClassificationResult, ModelTier, RouteDecision, RouterConfig, RoutingTask } from '../types/index.js';

export class DeterministicRouter {
  private readonly classifier: DeterministicTaskClassifier;
  private readonly escalator: DeterministicEscalator;

  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {
    this.classifier = new DeterministicTaskClassifier();
    this.escalator = new DeterministicEscalator(config);
  }

  route(task: RoutingTask): RouteDecision {
    const classification = this.classifier.classify(task);
    const escalation = this.escalator.evaluate(classification);
    const selectedTier = this.selectTier(classification, escalation.recommendedTier);
    const tierConfig = this.config.tiers[selectedTier];

    const rationale = [
      ...classification.rationale,
      ...escalation.reasons,
      `Selected tier ${selectedTier} (${tierConfig.provider}/${tierConfig.modelId}) using deterministic policy.`,
    ];

    return {
      task_class: classification.taskClass,
      selected_provider: tierConfig.provider,
      selected_model_tier: selectedTier,
      selected_model_id: tierConfig.modelId,
      confidence: classification.confidence,
      review_required: escalation.reviewRequired,
      escalation_needed: escalation.escalationNeeded,
      rationale,
      verification_summary: this.buildVerificationSummary(classification, escalation.reviewRequired),
      matched_rules: classification.matchedRules,
      domain_signals: classification.domainSignals,
    };
  }

  private selectTier(classification: ClassificationResult, recommendedTier?: ModelTier): ModelTier {
    if (recommendedTier === 'openai_review') {
      return 'openai_review';
    }

    if (classification.taskClass === 'final_review_required') {
      return 'openai_review';
    }

    if (classification.taskClass === 'reasoning_critical') {
      return recommendedTier ?? 'openai_reasoning';
    }

    if (recommendedTier) {
      return recommendedTier;
    }

    if (classification.taskClass === 'moderate_technical') {
      if (classification.domainSignals.securitySensitive || classification.domainSignals.productionRelevant) {
        return 'openai_general';
      }

      return classification.domainSignals.coding || classification.domainSignals.debugging
        ? 'minimax_general'
        : 'minimax_fast';
    }

    if (classification.taskClass === 'bounded_execution') {
      return 'minimax_fast';
    }

    return 'openai_general';
  }

  private buildVerificationSummary(classification: ClassificationResult, reviewRequired: boolean): string {
    const checks = [
      'requirement coverage',
      'internal consistency',
      'syntax plausibility',
      'ambiguity detection',
      'unresolved assumptions',
      'domain-specific quality',
      'production-safety review',
    ];

    const domains = Object.entries(classification.domainSignals)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(', ') || 'generic';

    return `${reviewRequired ? 'OpenAI review required. ' : ''}Run ${checks.join(', ')} checks with domain focus: ${domains}.`;
  }
}
