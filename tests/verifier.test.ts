import { describe, expect, it } from 'vitest';
import { RuleBasedVerifier } from '../src/verifier/ruleBasedVerifier.js';

describe('RuleBasedVerifier', () => {
  const verifier = new RuleBasedVerifier();

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

  it('checks Splunk-specific output quality', () => {
    const report = verifier.verify(
      { prompt: 'Write a Splunk SPL query for failed logins.' },
      'Use `index=auth sourcetype=linux_secure | stats count by user` to summarize failed logins.',
    );

    const domainCheck = report.checks.find((check) => check.name === 'domain_specific_quality');
    expect(domainCheck?.passed).toBe(true);
  });
});
