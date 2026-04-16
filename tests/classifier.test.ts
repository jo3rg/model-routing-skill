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

  it('classifies investigation-style noun phrases as reasoning_critical', () => {
    const result = classifier.classify({
      prompt: 'Do a codebase analysis and multi-step diagnosis of the routing logic, including bypassed rules.',
    });

    expect(result.taskClass).toBe('reasoning_critical');
    expect(result.domain).toBe('research');
    expect(result.domainSignals.investigation).toBe(true);
    expect(result.scorecard.reasoning_critical).toBeGreaterThan(result.scorecard.moderate_technical);
  });

  it('does not treat generic issue wording as a GitHub task', () => {
    const result = classifier.classify({
      prompt: 'The issue: do a diagnosis and analysis of why routing picks the wrong provider.',
    });

    expect(result.domainSignals.github).toBe(false);
    expect(result.domain).toBe('research');
    expect(result.taskClass).toBe('reasoning_critical');
  });

  it('does not let script file paths outweigh investigation-style work', () => {
    const result = classifier.classify({
      prompt: 'Analyze scripts/route-task.js and perform a diagnosis of the routing behavior.',
    });

    expect(result.domainSignals.investigation).toBe(true);
    expect(result.taskClass).toBe('reasoning_critical');
    expect(result.scorecard.reasoning_critical).toBeGreaterThan(result.scorecard.moderate_technical);
  });
});
