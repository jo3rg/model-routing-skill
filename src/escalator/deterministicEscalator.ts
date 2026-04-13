import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import type {
  CapabilitySelection,
  ClassificationResult,
  ConfiguredModelTier,
  EscalationDecision,
  ProviderName,
  RouterConfig,
} from '../types/index.js';

export class DeterministicEscalator {
  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {}

  evaluate(classification: ClassificationResult, capability: CapabilitySelection): EscalationDecision {
    if (capability.kind === 'trusted_skill' && capability.selected_skill) {
      return this.evaluateSkillPath(classification, capability);
    }

    return this.evaluateModelPath(classification);
  }

  private evaluateSkillPath(classification: ClassificationResult, capability: CapabilitySelection): EscalationDecision {
    const skill = capability.selected_skill!;
    const reasons = [...capability.reasons];

    const reviewRequired =
      skill.reviewPreference === 'always'
      || classification.taskClass === 'final_review_required'
      || classification.domainSignals.securitySensitive
      || classification.domainSignals.productionRelevant
      || (classification.domain !== 'documentation'
        && classification.taskClass !== 'bounded_execution'
        && classification.confidence <= this.config.capabilityPolicy.reviewSkillAtConfidenceOrBelow);

    if (reviewRequired) {
      reasons.push('Trusted skill selected first, then OpenAI review is required by policy.');
      return {
        executionMode: 'specialized_skill_then_openai_review',
        reviewRequired: true,
        escalationNeeded: true,
        selectedTier: 'none',
        selectedProvider: 'trusted_skill',
        reviewTier: 'openai_review',
        reviewProvider: 'openai',
        reasons,
      };
    }

    reasons.push('Trusted skill selected with no mandatory model review.');
    return {
      executionMode: 'specialized_skill',
      reviewRequired: false,
      escalationNeeded: false,
      selectedTier: 'none',
      selectedProvider: 'trusted_skill',
      reasons,
    };
  }

  private evaluateModelPath(classification: ClassificationResult): EscalationDecision {
    const reasons: string[] = [];
    const lowConfidence = classification.confidence <= this.config.confidenceThresholds.low;
    const mediumOrLowerSecurity = classification.confidence <= this.config.escalationPolicy.securityReviewAtConfidenceOrBelow && classification.domainSignals.securitySensitive;
    const mediumOrLowerProduction = classification.confidence <= this.config.escalationPolicy.productionReviewAtConfidenceOrBelow && classification.domainSignals.productionRelevant;
    const reviewDomain = hasReviewDomain(classification, this.config.escalationPolicy.reviewDomains);

    if (classification.taskClass === 'final_review_required') {
      reasons.push('Task class explicitly requires final review.');
      return this.openAIDirect(reasons, 'openai_review', true, true);
    }

    if (classification.taskClass === 'reasoning_critical' && classification.confidence <= this.config.capabilityPolicy.preferOpenAIForReasoningAtConfidenceOrBelow) {
      reasons.push('Reasoning-critical work below the OpenAI confidence threshold routes directly to OpenAI.');
      return this.openAIDirect(reasons, 'openai_reasoning', false, true);
    }

    if (lowConfidence) {
      reasons.push('Low classifier confidence requires direct OpenAI handling.');
      return this.openAIDirect(reasons, chooseReasoningTier(classification, this.config), false, true);
    }

    if (classification.taskClass === 'reasoning_critical') {
      reasons.push('Reasoning-critical work routes directly to OpenAI.');
      return this.openAIDirect(reasons, 'openai_reasoning', false, true);
    }

    if (mediumOrLowerSecurity || mediumOrLowerProduction || reviewDomain || classification.domainSignals.coding || classification.domainSignals.debugging) {
      reasons.push('MiniMax can draft, but policy requires a deterministic OpenAI review pass.');
      return {
        executionMode: 'minimax_then_openai_review',
        reviewRequired: true,
        escalationNeeded: true,
        selectedTier: classification.taskClass === 'bounded_execution' ? 'minimax_fast' : 'minimax_general',
        selectedProvider: 'minimax',
        reviewTier: 'openai_review',
        reviewProvider: 'openai',
        reasons,
      };
    }

    reasons.push('No review triggers fired; stay on MiniMax direct.');
    return {
      executionMode: 'minimax_direct',
      reviewRequired: false,
      escalationNeeded: false,
      selectedTier: classification.taskClass === 'bounded_execution' ? 'minimax_fast' : 'minimax_general',
      selectedProvider: 'minimax',
      reasons,
    };
  }

  private openAIDirect(
    reasons: string[],
    selectedTier: ConfiguredModelTier,
    reviewRequired: boolean,
    escalationNeeded: boolean,
  ): EscalationDecision {
    return {
      executionMode: 'openai_direct',
      reviewRequired,
      escalationNeeded,
      selectedTier,
      selectedProvider: 'openai',
      reasons,
    };
  }
}

function hasReviewDomain(classification: ClassificationResult, reviewDomains: Array<keyof ClassificationResult['domainSignals']>): boolean {
  return reviewDomains.some((domain) => classification.domainSignals[domain]);
}

function chooseReasoningTier(classification: ClassificationResult, config: RouterConfig): ConfiguredModelTier {
  const shouldUseReasoning =
    classification.taskClass === 'reasoning_critical'
    || config.escalationPolicy.forceReasoningDomains.some((domain) => classification.domainSignals[domain]);

  return shouldUseReasoning ? 'openai_reasoning' : 'openai_general';
}
