import { describe, expect, it } from 'vitest';
import { RoutingExecutor } from '../src/executor/routingExecutor.js';
import { MockProvider } from '../src/providers/mockProvider.js';

describe('RoutingExecutor', () => {
  it('uses minimax for a simple bounded task without review', async () => {
    const minimax = new MockProvider('minimax', () => 'Converted payload to JSON with key rename completed.');
    const openai = new MockProvider('openai', () => 'Reviewed answer.');
    const executor = new RoutingExecutor({ minimax, openai });

    const result = await executor.execute({
      prompt: 'Rename the output key and convert the payload to JSON.',
      metadata: { expectedArtifact: 'json' },
    });

    expect(result.initialResponse?.provider).toBe('minimax');
    expect(result.reviewResponse).toBeUndefined();
    expect(minimax.calls).toHaveLength(1);
    expect(openai.calls).toHaveLength(0);
  });

  it('escalates to openai review when verification flags the first answer', async () => {
    const minimax = new MockProvider('minimax', () => 'Maybe do something later.');
    const openai = new MockProvider('openai', () => 'Fixed the TypeScript bug in src/app.ts.\nFile: src/app.ts\n```ts\nexport const done = true;\n```\nAdded a test in tests/app.test.ts.');
    const executor = new RoutingExecutor({ minimax, openai });

    const result = await executor.execute({
      prompt: 'Fix the TypeScript bug and add a test.',
      requirements: ['Fix the TypeScript bug', 'Add a test'],
      metadata: { expectedArtifact: 'code' },
    });

    expect(result.escalated).toBe(true);
    expect(result.reviewResponse?.provider).toBe('openai');
    expect(result.finalResponse?.content).toContain('src/app.ts');
    expect(openai.calls).toHaveLength(1);
  });
});
