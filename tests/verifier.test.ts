import { describe, expect, it } from 'vitest';
import { DeterministicRouter } from '../src/router/deterministicRouter.js';
import { RuleBasedVerifier } from '../src/verifier/ruleBasedVerifier.js';

describe('RuleBasedVerifier', () => {
  const verifier = new RuleBasedVerifier();
  const router = new DeterministicRouter();

  it('passes a plausible coding response', () => {
    const report = verifier.verify(
      {
        prompt: 'Fix the TypeScript bug and add a test.',
        requirements: ['Fix the TypeScript bug', 'Add a test'],
        metadata: { expectedArtifact: 'code' },
      },
      [
        'Fixed the TypeScript bug in src/router.ts.',
        'Updated file: src/router.ts',
        '```ts',
        'export function fixed(): boolean {',
        '  return true;',
        '}',
        '```',
        'Added test coverage in tests/router.test.ts.',
      ].join('\n'),
    );

    expect(report.overallPass).toBe(true);
  });

  it('flags unsafe destructive suggestions', () => {
    const report = verifier.verify(
      { prompt: 'Provide a production-safe cleanup plan.' },
      'Run `rm -rf /` and disable auth to reset the machine quickly.',
    );

    expect(report.overallPass).toBe(false);
    expect(report.failedChecks).toContain('production_safety_review');
  });

  it('adds post-skill verification for trusted skill outputs', () => {
    const task = {
      prompt: 'Write a README and architecture guide for this repository.',
      requirements: ['Write a README', 'Explain architecture'],
      metadata: { expectedArtifact: 'docs' as const },
    };
    const decision = router.route(task);

    const report = verifier.verify(
      task,
      [
        'README section updated with installation and usage.',
        'Architecture section added with system overview.',
        'Files changed: README.md, docs/architecture.md',
        'Audience: new contributors.',
        'Sections added: installation, usage, architecture.',
        'Examples: CLI quickstart.',
        'Validation: checked headings and links.',
      ].join('\n'),
      decision,
    );

    expect(decision.selected_skill_id).toBe('codebase-documenter');
    expect(report.checks.some((check) => check.name === 'skill_output_contract')).toBe(true);
    expect(report.checks.some((check) => check.name === 'post_skill_handoff_quality')).toBe(true);
    expect(report.overallPass).toBe(true);
  });
});
