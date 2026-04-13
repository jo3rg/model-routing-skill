import { describe, expect, it } from 'vitest';
import { RoutingExecutor } from '../src/executor/routingExecutor.js';

describe('RoutingExecutor', () => {
  it('builds a trusted-skill plan without executing it', async () => {
    const executor = new RoutingExecutor();

    const result = await executor.execute({
      prompt: 'Write a README and onboarding guide for this codebase.',
      metadata: { expectedArtifact: 'docs' },
    });

    expect(result.decision.execution_mode).toMatch(/^specialized_skill/);
    expect(result.plan.some((step) => step.actor === 'trusted_skill')).toBe(true);
    expect(result.plan.every((step) => !('content' in step))).toBe(true);
  });

  it('builds a MiniMax plus review plan for coding tasks', async () => {
    const executor = new RoutingExecutor();

    const result = await executor.execute({
      prompt: 'Fix the TypeScript router bug and add a regression test.',
      requirements: ['Fix the router bug', 'Add a regression test'],
      metadata: { expectedArtifact: 'code' },
    });

    expect(result.decision.execution_mode).toBe('minimax_then_openai_review');
    expect(result.plan.some((step) => step.actor === 'minimax')).toBe(true);
    expect(result.plan.some((step) => step.phase === 'openai_review')).toBe(true);
  });
});
