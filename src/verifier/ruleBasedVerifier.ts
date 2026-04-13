import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import type {
  RouteDecision,
  RouterConfig,
  RoutingTask,
  VerificationCheckResult,
  VerificationReport,
} from '../types/index.js';

export class RuleBasedVerifier {
  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {}

  verify(task: RoutingTask, responseText: string, decision?: RouteDecision): VerificationReport {
    const checks: VerificationCheckResult[] = [];
    checks.push(this.requirementCoverage(task, responseText));
    checks.push(this.internalConsistency(responseText));
    checks.push(this.syntaxPlausibility(task, responseText));
    checks.push(this.ambiguityDetection(responseText, decision));
    checks.push(this.unresolvedAssumptions(responseText));
    checks.push(this.domainSpecificQuality(task, responseText, decision));
    checks.push(this.productionSafetyReview(responseText));

    const score = Number((checks.reduce((sum, check) => sum + check.score, 0) / checks.length).toFixed(2));
    const failedChecks = checks.filter((check) => !check.passed && check.severity === 'error').map((check) => check.name);
    const warnings = checks.filter((check) => !check.passed && check.severity !== 'error').map((check) => check.name);
    const overallPass = failedChecks.length === 0 && score >= 0.68;
    const summary = overallPass
      ? `Verification passed at ${score}. Strongest checks: ${checks.filter((check) => check.passed).map((check) => check.name).join(', ')}.`
      : `Verification flagged issues at ${score}. Failed checks: ${[...failedChecks, ...warnings].join(', ')}.`;

    return {
      overallPass,
      score,
      summary,
      failedChecks,
      warnings,
      checks,
    };
  }

  private requirementCoverage(task: RoutingTask, responseText: string): VerificationCheckResult {
    const requirements = extractRequirements(task);
    if (requirements.length === 0) {
      return {
        name: 'requirement_coverage',
        passed: responseText.trim().length > 0,
        score: responseText.trim().length > 0 ? 0.8 : 0.2,
        details: 'No explicit requirements list detected; used non-empty response heuristic.',
        severity: 'warning',
      };
    }

    const normalizedResponse = responseText.toLowerCase();
    const uncovered = requirements.filter((requirement) => {
      const keywords = keywordize(requirement);
      const hits = keywords.filter((keyword) => normalizedResponse.includes(keyword)).length;
      return keywords.length > 0 && hits / keywords.length < 0.5;
    });

    const coverage = Number(((requirements.length - uncovered.length) / requirements.length).toFixed(2));

    return {
      name: 'requirement_coverage',
      passed: coverage >= 0.65,
      score: coverage,
      details:
        uncovered.length === 0
          ? 'Response appears to cover the explicit requirements.'
          : `Potentially uncovered requirements: ${uncovered.join('; ')}`,
      severity: 'error',
    };
  }

  private internalConsistency(responseText: string): VerificationCheckResult {
    const contradictions = detectContradictions(responseText);
    const score = contradictions.length === 0 ? 0.88 : Math.max(0.2, 0.88 - contradictions.length * 0.25);

    return {
      name: 'internal_consistency',
      passed: contradictions.length === 0,
      score: Number(score.toFixed(2)),
      details: contradictions.length === 0 ? 'No obvious contradiction markers detected.' : contradictions.join('; '),
      severity: 'error',
    };
  }

  private syntaxPlausibility(task: RoutingTask, responseText: string): VerificationCheckResult {
    let score = 0.85;
    const details: string[] = [];

    if (countOccurrences(responseText, '```') % 2 !== 0) {
      score -= 0.35;
      details.push('Unbalanced fenced code block markers.');
    }

    if (!balanced(responseText, '{', '}') || !balanced(responseText, '[', ']')) {
      score -= 0.2;
      details.push('Likely unbalanced braces or brackets.');
    }

    if (task.metadata?.expectedArtifact === 'json') {
      const jsonSnippet = extractFence(responseText, 'json');
      if (jsonSnippet) {
        try {
          JSON.parse(jsonSnippet);
        } catch {
          score -= 0.35;
          details.push('JSON fence did not parse cleanly.');
        }
      }
    }

    if (task.metadata?.expectedArtifact === 'yaml') {
      const yamlSnippet = extractFence(responseText, 'yaml');
      if (yamlSnippet && !/^\s*[\w-]+\s*:/m.test(yamlSnippet)) {
        score -= 0.2;
        details.push('YAML fence missing obvious key/value structure.');
      }
    }

    return {
      name: 'syntax_plausibility',
      passed: score >= 0.65,
      score: Number(Math.max(0.1, score).toFixed(2)),
      details: details.length === 0 ? 'No obvious syntax plausibility issues detected.' : details.join(' '),
      severity: 'error',
    };
  }

  private ambiguityDetection(responseText: string, decision?: RouteDecision): VerificationCheckResult {
    const lowered = responseText.toLowerCase();
    const matches = this.config.verification.ambiguityPhrases.filter((phrase) => lowered.includes(phrase));
    const strict = decision?.domain_signals.productionRelevant || decision?.domain_signals.securitySensitive;
    const allowed = strict ? 1 : 3;
    const score = Math.max(0.2, 0.9 - matches.length * 0.12);

    return {
      name: 'ambiguity_detection',
      passed: matches.length <= allowed,
      score: Number(score.toFixed(2)),
      details: matches.length === 0 ? 'Low ambiguity language detected.' : `Ambiguity markers: ${matches.join(', ')}`,
      severity: strict ? 'error' : 'warning',
    };
  }

  private unresolvedAssumptions(responseText: string): VerificationCheckResult {
    const lowered = responseText.toLowerCase();
    const matches = this.config.verification.weakAssumptionPhrases.filter((phrase) => lowered.includes(phrase));
    const score = Math.max(0.2, 0.9 - matches.length * 0.14);

    return {
      name: 'unresolved_assumptions',
      passed: matches.length <= 1,
      score: Number(score.toFixed(2)),
      details: matches.length === 0 ? 'No unresolved-assumption markers detected.' : `Assumption markers: ${matches.join(', ')}`,
      severity: 'warning',
    };
  }

  private domainSpecificQuality(task: RoutingTask, responseText: string, decision?: RouteDecision): VerificationCheckResult {
    const source = `${task.prompt}\n${responseText}`.toLowerCase();
    const domains = decision?.domain_signals;
    const issues: string[] = [];
    let score = 0.85;

    if (domains?.splunk || /\bsplunk\b|\bspl\b/.test(source)) {
      if (!/(index=|\|\s*(stats|tstats|table|eval|search|where))/i.test(responseText)) {
        issues.push('Splunk-oriented output lacks obvious SPL structure.');
        score -= 0.3;
      }
    }

    if (domains?.velociraptor || /\bvelociraptor\b|\bvql\b|\bartifact\b/.test(source)) {
      if (!/(select\s+.+from|artifact|sources:|parameters:|vql)/i.test(responseText)) {
        issues.push('Velociraptor-oriented output lacks VQL or artifact structure.');
        score -= 0.3;
      }
    }

    if (domains?.research || /\bresearch\b|\bcite\b|\bpaper\b|\bbenchmark\b/.test(source)) {
      if (!/(source|citation|trade-off|benchmark|evidence|finding)/i.test(responseText)) {
        issues.push('Research-oriented output lacks sources, evidence, or trade-off discussion.');
        score -= 0.25;
      }
    }

    if ((domains?.coding || domains?.debugging) || /\bcode\b|\bdebug\b|\bfix\b/.test(source)) {
      if (!(/```/.test(responseText) || /\btest\b|\bfile\b|\bfunction\b|\bline\b/i.test(responseText))) {
        issues.push('Coding/debugging output lacks code, file references, or testing cues.');
        score -= 0.25;
      }
    }

    return {
      name: 'domain_specific_quality',
      passed: score >= 0.6,
      score: Number(Math.max(0.1, score).toFixed(2)),
      details: issues.length === 0 ? 'Domain-specific quality markers look plausible.' : issues.join(' '),
      severity: 'error',
    };
  }

  private productionSafetyReview(responseText: string): VerificationCheckResult {
    const lowered = responseText.toLowerCase();
    const matches = this.config.verification.unsafeShellPatterns.filter((pattern) => lowered.includes(pattern));
    const additionalRisk = /(disable (auth|authentication)|trust all|allow all|everyone full access)/i.test(responseText);
    const score = matches.length === 0 && !additionalRisk ? 0.92 : Math.max(0.1, 0.92 - (matches.length + Number(additionalRisk)) * 0.28);

    return {
      name: 'production_safety_review',
      passed: matches.length === 0 && !additionalRisk,
      score: Number(score.toFixed(2)),
      details:
        matches.length === 0 && !additionalRisk
          ? 'No high-risk production safety markers detected.'
          : `Unsafe patterns detected: ${[...matches, ...(additionalRisk ? ['broad insecure recommendation'] : [])].join(', ')}`,
      severity: 'error',
    };
  }
}

function extractRequirements(task: RoutingTask): string[] {
  const explicit = task.requirements ?? [];
  const bulletLines = task.prompt
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*\d.]+\s+/.test(line))
    .map((line) => line.replace(/^[-*\d.]+\s+/, ''));

  const mustClauses = Array.from(task.prompt.matchAll(/(?:must|should|need to|ensure)\s+([^.;\n]+)/gi))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set([...explicit, ...bulletLines, ...mustClauses])).filter(Boolean);
}

function keywordize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function detectContradictions(text: string): string[] {
  const lowered = text.toLowerCase();
  const hits: string[] = [];
  const pairs: Array<[RegExp, RegExp, string]> = [
    [/\balways\b/, /\bnever\b/, 'Contains both “always” and “never”.'],
    [/\brequired\b/, /\boptional\b/, 'Contains both “required” and “optional”.'],
    [/\benable\b/, /\bdisable\b/, 'Contains both “enable” and “disable”.'],
    [/\bsafe\b/, /\bunsafe\b/, 'Contains both “safe” and “unsafe”.'],
  ];

  for (const [left, right, detail] of pairs) {
    if (left.test(lowered) && right.test(lowered)) {
      hits.push(detail);
    }
  }

  return hits;
}

function balanced(text: string, open: string, close: string): boolean {
  let depth = 0;
  for (const char of text) {
    if (char === open) {
      depth += 1;
    }
    if (char === close) {
      depth -= 1;
    }
    if (depth < 0) {
      return false;
    }
  }

  return depth === 0;
}

function countOccurrences(text: string, token: string): number {
  return text.split(token).length - 1;
}

function extractFence(text: string, language: string): string | undefined {
  const escapedLanguage = language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dynamic = new RegExp('```' + escapedLanguage + '\\n([\\s\\S]*?)\\n```', 'i');
  return text.match(dynamic)?.[1]?.trim();
}

const STOPWORDS = new Set([
  'this',
  'that',
  'with',
  'from',
  'have',
  'must',
  'should',
  'need',
  'ensure',
  'into',
  'when',
  'than',
  'your',
  'their',
  'will',
  'would',
]);
