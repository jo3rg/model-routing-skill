import { createExecutor, MockProvider } from '../src/index.js';

const minimax = new MockProvider('minimax', (request) => {
  if (request.metadata?.selectedTier === 'minimax_fast') {
    return 'Converted the payload to JSON and renamed the key.';
  }

  return 'Maybe update the code later.';
});

const openai = new MockProvider('openai', () => {
  return [
    'Updated file: src/router/deterministicRouter.ts',
    '```ts',
    'export const patched = true;',
    '```',
    'Added regression test coverage in tests/router.test.ts.',
  ].join('\n');
});

const executor = createExecutor({ minimax, openai });

const result = await executor.execute({
  prompt: 'Fix the TypeScript routing bug and add a regression test.',
  requirements: ['Fix the bug', 'Add a regression test'],
  metadata: { expectedArtifact: 'code' },
});

console.dir(result, { depth: null });
