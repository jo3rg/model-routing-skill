import type { ExpectedArtifact, NormalizedTask, RoutingTask } from '../types/index.js';

const KNOWN_VERBS = [
  'analyze',
  'audit',
  'benchmark',
  'build',
  'compare',
  'convert',
  'create',
  'design',
  'document',
  'explain',
  'fix',
  'implement',
  'investigate',
  'optimize',
  'plan',
  'refactor',
  'review',
  'rewrite',
  'route',
  'summarize',
  'test',
  'validate',
  'verify',
  'write',
];

const ARTIFACT_KEYWORDS: Array<[ExpectedArtifact, RegExp]> = [
  ['json', /\bjson\b/i],
  ['yaml', /\byaml\b|\byml\b/i],
  ['spl', /\bsplunk\b|\bspl\b|index=|\|\s*(stats|tstats|table|eval|search|where)\b/i],
  ['vql', /\bvelociraptor\b|\bvql\b|\bartifact\b/i],
  ['docs', /\breadme\b|\bdocument\b|\bguide\b|\bdocs\b/i],
  ['plan', /\bplan\b|\bplaybook\b|\bworkflow\b/i],
  ['research', /\bresearch\b|\bbenchmark\b|\btrade-off\b|\bcitation\b/i],
  ['code', /\bcode\b|\btypescript\b|\bjavascript\b|\bpython\b|\bfunction\b|\btest\b|\bfix\b/i],
  ['text', /\bsummary\b|\bbullet\b|\brewrite\b/i],
];

export class TaskNormalizer {
  normalize(task: RoutingTask): NormalizedTask {
    const originalPrompt = task.prompt.trim();
    const normalizedPrompt = originalPrompt.replace(/\s+/g, ' ').trim().toLowerCase();
    const compactPrompt = [normalizedPrompt, ...(task.metadata?.domainHints ?? []).map((hint) => hint.toLowerCase())]
      .filter(Boolean)
      .join(' ');

    const verbHints = KNOWN_VERBS.filter((verb) => compactPrompt.includes(verb));
    const nounHints = extractNouns(compactPrompt);
    const requestedArtifacts = detectArtifacts(task, compactPrompt);
    const explicitReviewRequested = /\b(final review|review required|review this|audit|sign off|approval|approve)\b/i.test(compactPrompt)
      || task.metadata?.finalReviewRequested === true;

    return {
      original_prompt: originalPrompt,
      normalized_prompt: normalizedPrompt,
      compact_prompt: compactPrompt,
      verb_hints: verbHints,
      noun_hints: nounHints,
      requested_artifacts: requestedArtifacts,
      explicit_review_requested: explicitReviewRequested,
    };
  }
}

function detectArtifacts(task: RoutingTask, compactPrompt: string): ExpectedArtifact[] {
  const artifacts = new Set<ExpectedArtifact>();
  if (task.metadata?.expectedArtifact) {
    artifacts.add(task.metadata.expectedArtifact);
  }

  for (const [artifact, pattern] of ARTIFACT_KEYWORDS) {
    if (pattern.test(compactPrompt)) {
      artifacts.add(artifact);
    }
  }

  return Array.from(artifacts);
}

function extractNouns(input: string): string[] {
  const stopwords = new Set(['this', 'that', 'with', 'from', 'into', 'about', 'before', 'after', 'their', 'there', 'should', 'would']);
  return Array.from(new Set(
    input
      .replace(/[^a-z0-9_\s-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 5 && !stopwords.has(token)),
  )).slice(0, 12);
}
