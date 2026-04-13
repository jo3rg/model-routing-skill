import { describe, expect, it } from 'vitest';
import { DeterministicTaskClassifier } from '../src/classifier/deterministicClassifier.js';

describe('DeterministicTaskClassifier', () => {
  const classifier = new DeterministicTaskClassifier();

  it('classifies explicit production review work as final_review_required', () => {
    const result = classifier.classify({
      prompt: 'Perform a final review and security audit of this production deployment checklist before release.',
    });

    expect(result.taskClass).toBe('final_review_required');
    expect(result.domain).toBe('security_ops');
    expect(result.domainSignals.securitySensitive).toBe(true);
    expect(result.domainSignals.productionRelevant).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('classifies bounded documentation transforms as bounded_execution', () => {
    const result = classifier.classify({
      prompt: 'Summarize these notes into a short README section and convert the checklist to JSON.',
      metadata: { expectedArtifact: 'docs' },
    });

    expect(result.taskClass).toBe('bounded_execution');
    expect(result.domain).toBe('documentation');
  });

  it('classifies research-heavy prompts as reasoning_critical', () => {
    const result = classifier.classify({
      prompt: 'Research and compare model-routing trade-offs for cost, latency, and quality. Include benchmarks and explain why.',
    });

    expect(result.taskClass).toBe('reasoning_critical');
    expect(result.domain).toBe('research');
    expect(result.domainSignals.research).toBe(true);
  });
});
