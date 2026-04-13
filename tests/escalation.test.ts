import { describe, expect, it } from 'vitest';
import { DeterministicTaskClassifier } from '../src/classifier/deterministicClassifier.js';
import { DEFAULT_ROUTER_CONFIG } from '../src/config/defaults.js';
import { DeterministicEscalator } from '../src/escalator/deterministicEscalator.js';

describe('DeterministicEscalator', () => {
  const classifier = new DeterministicTaskClassifier();

  it('forces OpenAI escalation when confidence is below the configured low threshold', () => {
    const escalator = new DeterministicEscalator({
      ...DEFAULT_ROUTER_CONFIG,
      confidenceThresholds: {
        ...DEFAULT_ROUTER_CONFIG.confidenceThresholds,
        low: 0.95,
      },
    });

    const classification = classifier.classify({
      prompt: 'Fix bug.',
    });

    const decision = escalator.evaluate(classification);
    expect(decision.escalationNeeded).toBe(true);
    expect(decision.recommendedTier).toBe('openai_reasoning');
  });

  it('requires review for medium-confidence production-relevant work', () => {
    const classification = classifier.classify({
      prompt: 'Implement release notes for the production deployment checklist.',
      metadata: { productionRelevant: true },
    });

    const escalator = new DeterministicEscalator();
    const decision = escalator.evaluate(classification);
    expect(decision.reviewRequired).toBe(true);
    expect(decision.recommendedTier).toBe('openai_review');
  });
});
