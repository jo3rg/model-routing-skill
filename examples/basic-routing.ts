import { createRouter } from '../src/index.js';

const router = createRouter();

const tasks = [
  { prompt: 'Write a README and onboarding guide for this repository.', metadata: { expectedArtifact: 'docs' as const } },
  { prompt: 'Rename the output key and convert the payload to JSON.', metadata: { expectedArtifact: 'json' as const } },
  { prompt: 'Fix the TypeScript routing bug and add a regression test.', requirements: ['Fix the bug', 'Add a regression test'], metadata: { expectedArtifact: 'code' as const } },
  { prompt: 'Research routing trade-offs for Splunk and Velociraptor workflows and recommend the safest production policy.' },
];

for (const task of tasks) {
  const decision = router.route(task);
  console.log('---');
  console.log(task.prompt);
  console.dir(decision, { depth: null });
}
