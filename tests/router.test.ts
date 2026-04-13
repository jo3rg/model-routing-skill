import { describe, expect, it } from 'vitest';
import { DeterministicRouter } from '../src/router/deterministicRouter.js';

describe('DeterministicRouter', () => {
  const router = new DeterministicRouter();

  it('routes simple bounded work to minimax_fast', () => {
    const decision = router.route({
      prompt: 'Rename the output key and format the payload as JSON.',
      metadata: { expectedArtifact: 'json' },
    });

    expect(decision.selected_model_tier).toBe('minimax_fast');
    expect(decision.selected_provider).toBe('minimax');
  });

  it('routes reasoning-critical research work to openai_reasoning', () => {
    const decision = router.route({
      prompt: 'Investigate root cause patterns, compare routing strategies, and benchmark trade-offs for model selection.',
    });

    expect(decision.task_class).toBe('reasoning_critical');
    expect(decision.selected_model_tier).toBe('openai_reasoning');
    expect(decision.selected_provider).toBe('openai');
  });

  it('routes review-centric production work to openai_review', () => {
    const decision = router.route({
      prompt: 'Audit this production Splunk dashboard deployment plan and provide a final review before release.',
    });

    expect(decision.selected_model_tier).toBe('openai_review');
    expect(decision.review_required).toBe(true);
  });
});
