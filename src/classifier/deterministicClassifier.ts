import type {
  ClassificationResult,
  DomainSignals,
  RoutingTask,
  TaskClass,
} from '../types/index.js';

const CLASS_PRIORITY: TaskClass[] = [
  'final_review_required',
  'reasoning_critical',
  'moderate_technical',
  'bounded_execution',
];

export class DeterministicTaskClassifier {
  classify(task: RoutingTask): ClassificationResult {
    const prompt = task.prompt.trim();
    const normalized = prompt.toLowerCase();
    const domainSignals = detectDomainSignals(normalized, task);
    const scorecard: Record<TaskClass, number> = {
      bounded_execution: 0,
      moderate_technical: 0,
      reasoning_critical: 0,
      final_review_required: 0,
    };
    const rationale: string[] = [];
    const matchedRules: string[] = [];

    const apply = (rule: string, taskClass: TaskClass, score: number, why: string) => {
      if (score <= 0) {
        return;
      }

      scorecard[taskClass] += score;
      matchedRules.push(rule);
      rationale.push(why);
    };

    if (matchesAny(normalized, ['review', 'audit', 'verify', 'approval', 'release-ready', 'final check'])) {
      apply('explicit-review-language', 'final_review_required', 6, 'Explicit review or audit language detected.');
    }

    if (domainSignals.finalReviewRequested) {
      apply('metadata-final-review', 'final_review_required', 6, 'Task metadata explicitly requires final review.');
    }

    if (domainSignals.securitySensitive) {
      apply('security-sensitive', 'final_review_required', 3, 'Security-sensitive work increases review requirements.');
      apply('security-sensitive-reasoning', 'reasoning_critical', 2, 'Security work benefits from higher reasoning depth.');
    }

    if (domainSignals.productionRelevant) {
      apply('production-relevance', 'final_review_required', 3, 'Production-relevant work should be reviewable.');
      apply('production-relevance-reasoning', 'reasoning_critical', 1, 'Production changes warrant stronger reasoning.');
    }

    if (domainSignals.research) {
      apply('research-domain', 'reasoning_critical', 5, 'Research tasks need synthesis and trade-off analysis.');
    }

    if (domainSignals.splunk || domainSignals.velociraptor) {
      apply('specialized-security-domain', 'moderate_technical', 4, 'Splunk/Velociraptor work is specialized and technical.');
      apply('specialized-domain-reasoning', 'reasoning_critical', 2, 'Specialized DFIR domains often need careful reasoning.');
    }

    if (domainSignals.coding || domainSignals.debugging) {
      apply('coding-debugging', 'moderate_technical', 4, 'Coding/debugging language detected.');
    }

    if (matchesAny(normalized, ['analyze', 'compare', 'trade-off', 'root cause', 'investigate', 'architecture', 'design', 'strategy', 'benchmark'])) {
      apply('deep-analysis-language', 'reasoning_critical', 4, 'Prompt asks for analysis, design, or investigation.');
    }

    if (matchesAny(normalized, ['implement', 'fix', 'refactor', 'write', 'configure', 'script', 'query', 'test'])) {
      apply('implementation-language', 'moderate_technical', 3, 'Prompt requests implementation or technical execution.');
    }

    if (matchesAny(normalized, ['summarize', 'extract', 'rewrite', 'convert', 'rename', 'format', 'list'])) {
      apply('bounded-action-language', 'bounded_execution', 4, 'Prompt is dominated by bounded transformation verbs.');
    }

    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 50 && scorecard.reasoning_critical === 0 && scorecard.final_review_required === 0) {
      apply('short-prompt-bias', 'bounded_execution', 1, 'Short prompt with no high-risk indicators.');
    }

    if (task.requirements?.length) {
      apply('requirements-present', 'moderate_technical', 1, 'Explicit requirements raise coordination complexity.');
    }

    const taskClass = chooseTaskClass(scorecard);
    const confidence = computeConfidence(scorecard, matchedRules.length, domainSignals);

    return {
      taskClass,
      confidence,
      rationale: unique(rationale),
      matchedRules: unique(matchedRules),
      domainSignals,
      scorecard,
    };
  }
}

function detectDomainSignals(normalized: string, task: RoutingTask): DomainSignals {
  const joinedHints = (task.metadata?.domainHints ?? []).join(' ').toLowerCase();
  const source = `${normalized} ${joinedHints}`;

  return {
    splunk: /\bsplunk\b|\bspl\b|index=|\|\s*(stats|tstats|table|eval|where)\b/.test(source),
    velociraptor: /\bvelociraptor\b|\bvql\b|\bartifact\b|client collection|hunt\b/.test(source),
    research: /\bresearch\b|\bsurvey\b|\bcite\b|\bpaper\b|\bliterature\b|\bcompare\b|\bbenchmark\b/.test(source),
    coding: /\btypescript\b|\bjavascript\b|\bpython\b|\bjava\b|\bgo\b|\brefactor\b|\bcompile\b|\bfunction\b|\bcode\b/.test(source),
    debugging: /\bdebug\b|\bbug\b|\berror\b|\bfailing\b|\bstack trace\b|\bfix\b|\bregression\b/.test(source),
    securitySensitive:
      task.metadata?.securitySensitive ?? /\bsecurity\b|\bsecret\b|\bcredential\b|\btoken\b|\bauth\b|\bpermission\b|\bssh\b|\bfirewall\b|\bencrypt/.test(source),
    productionRelevant:
      task.metadata?.productionRelevant ?? /\bproduction\b|\brelease\b|\bdeploy\b|\bcustomer\b|\bsla\b|\bincident\b|\blive system\b/.test(source),
    finalReviewRequested:
      task.metadata?.finalReviewRequested ?? /\bfinal review\b|\breview required\b|\bsign off\b|\bapprove\b|\baudit\b/.test(source),
  };
}

function chooseTaskClass(scorecard: Record<TaskClass, number>): TaskClass {
  const sorted = CLASS_PRIORITY.slice().sort((left, right) => {
    const diff = scorecard[right] - scorecard[left];
    if (diff !== 0) {
      return diff;
    }

    return CLASS_PRIORITY.indexOf(left) - CLASS_PRIORITY.indexOf(right);
  });

  return sorted[0] ?? 'bounded_execution';
}

function computeConfidence(
  scorecard: Record<TaskClass, number>,
  ruleCount: number,
  domainSignals: DomainSignals,
): number {
  const values = Object.values(scorecard).sort((a, b) => b - a);
  const strongest = values[0] ?? 0;
  const second = values[1] ?? 0;
  const margin = strongest - second;
  const signalBoost = Object.values(domainSignals).filter(Boolean).length * 0.02;
  const ruleBoost = Math.min(ruleCount * 0.03, 0.18);
  const base = 0.46 + ruleBoost + signalBoost + Math.min(margin * 0.035, 0.24);

  return Math.max(0.35, Math.min(0.97, Number(base.toFixed(2))));
}

function matchesAny(normalized: string, patterns: string[]): boolean {
  return patterns.some((pattern) => normalized.includes(pattern));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
