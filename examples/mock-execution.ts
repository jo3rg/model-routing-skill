import { createExecutor } from '../src/index.js';

const executor = createExecutor();

const result = await executor.execute({
  prompt: 'Fix the TypeScript routing bug and add a regression test.',
  requirements: ['Fix the bug', 'Add a regression test'],
  metadata: { expectedArtifact: 'code' },
});

console.dir(result, { depth: null });
