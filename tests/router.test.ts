import { describe, expect, it } from 'vitest';
import { DeterministicRouter } from '../src/router/deterministicRouter.js';

describe('DeterministicRouter', () => {
  const router = new DeterministicRouter();

  it('routes documentation work to a trusted skill first', () => {
    const decision = router.route({
      prompt: 'Write a README and getting-started guide for this TypeScript project.',
      metadata: { expectedArtifact: 'docs' },
    });

    expect(decision.execution_mode).toBe('specialized_skill');
    expect(decision.selected_skill_id).toBe('codebase-documenter');
    expect(decision.selected_provider).toBe('trusted_skill');
    expect(decision.selected_model_tier).toBe('none');
  });

  it('routes bounded general work to minimax_direct', () => {
    const decision = router.route({
      prompt: 'Rename the output key and format the payload as JSON.',
      metadata: { expectedArtifact: 'json' },
    });

    expect(decision.execution_mode).toBe('minimax_direct');
    expect(decision.selected_model_tier).toBe('minimax_fast');
    expect(decision.selected_provider).toBe('minimax');
  });

  it('routes reasoning-critical research work to openai_direct', () => {
    const decision = router.route({
      prompt: 'Investigate root cause patterns, compare routing strategies, and benchmark trade-offs for model selection.',
    });

    expect(decision.task_class).toBe('reasoning_critical');
    expect(decision.execution_mode).toBe('openai_direct');
    expect(decision.selected_model_tier).toBe('openai_reasoning');
    expect(decision.selected_provider).toBe('openai');
  });

  it('routes risky DFIR dashboard work to specialized skill then openai review', () => {
    const decision = router.route({
      prompt: 'Audit this production Splunk dashboard deployment plan and improve the panel strategy before release.',
      metadata: { expectedArtifact: 'plan', productionRelevant: true },
    });

    expect(decision.execution_mode).toBe('specialized_skill_then_openai_review');
    expect(decision.selected_skill_id).toBe('dfir-dashboard-designer');
    expect(decision.review_model_tier).toBe('openai_review');
    expect(decision.review_required).toBe(true);
  });
});
