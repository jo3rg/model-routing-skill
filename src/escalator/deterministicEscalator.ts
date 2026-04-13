import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import type {
  ClassificationResult,
  DomainSignalName,
  EscalationDecision,
  ModelTier,
  RouterConfig,
} from '../types/index.js';

export class DeterministicEscalator {
  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {}

  evaluate(classification: ClassificationResult): EscalationDecision {
    const reasons: string[] = [];
    let escalationNeeded = false;
    let reviewRequired = false;
    let recommendedTier: ModelTier | undefined;

    if (classification.taskClass === 'final_review_required') {
      reviewRequired = true;
      recommendedTier = 'openai_review';
      reasons.push('Task class explicitly requires final review.');
    }

    if (classification.confidence <= this.config.confidenceThresholds.low) {
      escalationNeeded = true;
      reasons.push('Low classifier confidence requires OpenAI escalation.');
      recommendedTier = chooseEscalationTier(classification, this.config.escalationPolicy.forceReasoningDomains);
    }

    if (
      classification.confidence <= this.config.escalationPolicy.securityReviewAtConfidenceOrBelow &&
      classification.domainSignals.securitySensitive
    ) {
      reviewRequired = true;
      recommendedTier = 'openai_review';
      reasons.push('Security-sensitive work at medium-or-lower confidence requires OpenAI review.');
    }

    if (
      classification.confidence <= this.config.escalationPolicy.productionReviewAtConfidenceOrBelow &&
      classification.domainSignals.productionRelevant
    ) {
      reviewRequired = true;
      recommendedTier = 'openai_review';
      reasons.push('Production-relevant work at medium-or-lower confidence requires OpenAI review.');
    }

    if (hasReviewDomain(classification, this.config.escalationPolicy.reviewDomains) && classification.confidence < this.config.confidenceThresholds.high) {
      reasons.push('Domain heuristics prefer OpenAI validation when confidence is below high.');
      recommendedTier ??= classification.taskClass === 'reasoning_critical' ? 'openai_reasoning' : 'openai_general';
    }

    return {
      escalationNeeded,
      reviewRequired,
      ...(recommendedTier ? { recommendedTier } : {}),
      reasons,
    };
  }
}

function hasReviewDomain(classification: ClassificationResult, reviewDomains: DomainSignalName[]): boolean {
  return reviewDomains.some((domain) => classification.domainSignals[domain]);
}

function chooseEscalationTier(
  classification: ClassificationResult,
  forceReasoningDomains: DomainSignalName[],
): ModelTier {
  if (classification.taskClass === 'final_review_required') {
    return 'openai_review';
  }

  const shouldUseReasoning =
    classification.taskClass === 'reasoning_critical' ||
    forceReasoningDomains.some((domain) => classification.domainSignals[domain]);

  return shouldUseReasoning ? 'openai_reasoning' : 'openai_general';
}
