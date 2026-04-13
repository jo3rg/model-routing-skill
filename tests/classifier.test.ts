import { describe, expect, it } from 'vitest';
import { DeterministicTaskClassifier } from '../src/classifier/deterministicClassifier.js';

describe('DeterministicTaskClassifier', () => {
  const classifier = new DeterministicTaskClassifier();

  it('classifies explicit review work as final_review_required', () => {
    const result = classifier.classify({
      prompt: 'Perform a final review and security audit of this production deployment checklist before release.',
    });

    expect(result.taskClass).toBe('final_review_required');
    expect(result.domainSignals.securitySensitive).toBe(true);
    expect(result.domainSignals.productionRelevant).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('classifies bounded transformation work as bounded_execution', () => {
    const result = classifier.classify({
      prompt: 'Summarize these meeting notes into five bullets and convert the action list to JSON.',
      metadata: { expectedArtifact: 'json' },
    });

    expect(result.taskClass).toBe('bounded_execution');
  });

  it('classifies research-heavy prompts as reasoning_critical', () => {
    const result = classifier.classify({
      prompt: 'Research and compare model-routing trade-offs for cost, latency, and quality. Include benchmarks and explain why.',
    });

    expect(result.taskClass).toBe('reasoning_critical');
    expect(result.domainSignals.research).toBe(true);
  });
});
