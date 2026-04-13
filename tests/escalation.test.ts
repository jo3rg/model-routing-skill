import { describe, expect, it } from 'vitest';
import { DeterministicTaskClassifier } from '../src/classifier/deterministicClassifier.js';
import { DEFAULT_ROUTER_CONFIG } from '../src/config/defaults.js';
import { DeterministicEscalator } from '../src/escalator/deterministicEscalator.js';
import { selectCapability } from '../src/capabilities/trustedSkillRegistry.js';

describe('DeterministicEscalator', () => {
  const classifier = new DeterministicTaskClassifier();

  it('routes low-confidence work directly to OpenAI', () => {
    const escalator = new DeterministicEscalator({
      ...DEFAULT_ROUTER_CONFIG,
      confidenceThresholds: {
        ...DEFAULT_ROUTER_CONFIG.confidenceThresholds,
        low: 0.95,
      },
    });

    const task = { prompt: 'Fix bug.' };
    const classification = classifier.classify(task);
    const capability = selectCapability(task, classification, DEFAULT_ROUTER_CONFIG);

    const decision = escalator.evaluate(classification, capability);
    expect(decision.executionMode).toBe('openai_direct');
    expect(decision.selectedTier).toBe('openai_reasoning');
  });

  it('keeps trusted-skill routing ahead of model review for matched DFIR work', () => {
    const task = {
      prompt: 'Design a Splunk dashboard layout and panel query plan for failed logins.',
      metadata: { expectedArtifact: 'plan' as const },
    };

    const classification = classifier.classify(task);
    const capability = selectCapability(task, classification, DEFAULT_ROUTER_CONFIG);
    const escalator = new DeterministicEscalator();
    const decision = escalator.evaluate(classification, capability);

    expect(capability.kind).toBe('trusted_skill');
    expect(decision.executionMode).toBe('specialized_skill_then_openai_review');
    expect(decision.reviewTier).toBe('openai_review');
  });
});
