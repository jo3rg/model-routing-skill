import { TaskNormalizer } from '../normalizer/taskNormalizer.js';
import type {
  ClassificationResult,
  DomainSignals,
  RoutingTask,
  TaskClass,
  TaskDomain,
} from '../types/index.js';

const CLASS_PRIORITY: TaskClass[] = [
  'final_review_required',
  'reasoning_critical',
  'moderate_technical',
  'bounded_execution',
];

export class DeterministicTaskClassifier {
  private readonly normalizer = new TaskNormalizer();

  classify(task: RoutingTask): ClassificationResult {
    const normalizedTask = this.normalizer.normalize(task);
    const domainSignals = detectDomainSignals(normalizedTask.compact_prompt, task);
    const domain = deriveDomain(domainSignals);
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

    if (normalizedTask.explicit_review_requested) {
      apply('explicit-review-language', 'final_review_required', 6, 'Explicit review, audit, or sign-off language detected.');
    }

    if (domainSignals.securitySensitive) {
      apply('security-sensitive', 'final_review_required', 3, 'Security-sensitive work increases review requirements.');
      apply('security-sensitive-reasoning', 'reasoning_critical', 2, 'Security work benefits from stronger reasoning depth.');
    }

    if (domainSignals.productionRelevant) {
      apply('production-relevance', 'final_review_required', 3, 'Production-relevant work should stay reviewable and auditable.');
      apply('production-relevance-reasoning', 'reasoning_critical', 1, 'Production work warrants stronger reasoning.');
    }

    if (domainSignals.research) {
      apply('research-domain', 'reasoning_critical', 5, 'Research tasks require synthesis and trade-off analysis.');
    }

    if (domainSignals.investigation) {
      apply('investigation-domain', 'reasoning_critical', 6, 'Investigation and diagnosis tasks require careful reasoning, synthesis, and root-cause analysis.');
    }

    if (domainSignals.splunk || domainSignals.velociraptor) {
      apply('specialized-dfir-domain', 'moderate_technical', 4, 'Splunk/Velociraptor work is specialized and technical.');
      apply('specialized-dfir-reasoning', 'reasoning_critical', 2, 'DFIR work usually needs careful reasoning and verification.');
    }

    if (domainSignals.github || domainSignals.frontend || domainSignals.coding || domainSignals.debugging) {
      apply('technical-implementation-domain', 'moderate_technical', 4, 'Technical implementation signals were detected.');
    }

    if (domainSignals.documentation) {
      apply('documentation-domain', 'bounded_execution', 2, 'Documentation work is often structured and bounded.');
    }

    if (matchesAny(normalizedTask.compact_prompt, [
      'analyze',
      'analysis',
      'codebase analysis',
      'compare',
      'trade-off',
      'root cause',
      'investigate',
      'investigation',
      'diagnose',
      'diagnosis',
      'bypassed rules',
      'architecture',
      'design',
      'strategy',
      'benchmark',
      'multi-step diagnosis',
    ])) {
      apply('deep-analysis-language', 'reasoning_critical', 5, 'Prompt asks for analysis, diagnosis, or investigation.');
    }

    if (matchesAny(normalizedTask.compact_prompt, ['implement', 'fix', 'refactor', 'write', 'configure', 'query', 'test', 'validate'])) {
      apply('implementation-language', 'moderate_technical', 3, 'Prompt requests implementation or technical execution.');
    }

    if (matchesAny(normalizedTask.compact_prompt, ['summarize', 'extract', 'rewrite', 'convert', 'rename', 'format', 'list'])) {
      apply('bounded-action-language', 'bounded_execution', 4, 'Prompt is dominated by bounded transformation verbs.');
    }

    const wordCount = normalizedTask.normalized_prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 50 && scorecard.reasoning_critical === 0 && scorecard.final_review_required === 0) {
      apply('short-prompt-bias', 'bounded_execution', 1, 'Short prompt with no high-risk indicators.');
    }

    if (task.requirements?.length) {
      apply('requirements-present', 'moderate_technical', 1, 'Explicit requirements increase coordination complexity.');
    }

    const taskClass = chooseTaskClass(scorecard);
    const confidence = computeConfidence(scorecard, matchedRules.length, domainSignals, normalizedTask.verb_hints.length);

    return {
      taskClass,
      domain,
      confidence,
      rationale: unique(rationale),
      matchedRules: unique(matchedRules),
      domainSignals,
      normalizedTask,
      scorecard,
    };
  }
}

function detectDomainSignals(compactPrompt: string, task: RoutingTask): DomainSignals {
  return {
    splunk: /\bsplunk\b|\bspl\b|index=|\|\s*(stats|tstats|table|eval|where|search)\b/.test(compactPrompt),
    velociraptor: /\bvelociraptor\b|\bvql\b|\bartifact\b|client collection|hunt\b/.test(compactPrompt),
    research: /\bresearch\b|\bsurvey\b|\bcite\b|\bpaper\b|\bliterature\b|\bcompare\b|\bbenchmark\b/.test(compactPrompt),
    investigation: /\binvestigate\b|\binvestigation\b|\banalyze\b|\banalysis\b|\bdiagnose\b|\bdiagnosis\b|\broot cause\b|\bcodebase analysis\b|\bmulti-step diagnosis\b|\bbypassed rules\b/.test(compactPrompt),
    coding: /\btypescript\b|\bjavascript\b|\bpython\b|\bjava\b|\bgo\b|\brefactor\b|\bcompile\b|\bfunction\b|\bcode\b/.test(compactPrompt),
    debugging: /\bdebug\b|\bbug\b|\berror\b|\bfailing\b|\bstack trace\b|\bfix\b|\bregression\b/.test(compactPrompt),
    documentation: /\breadme\b|\bdocument\b|\bguide\b|\bdocs\b|\bcomment\b/.test(compactPrompt),
    frontend: /\breact\b|\bnext\.js\b|\btailwind\b|\bfrontend\b|\bui\b|\blanding page\b|\bcomponent\b/.test(compactPrompt),
    github: /\bgithub\b|\bpull request\b|\bpr\b|\bissues?\s+#?\d+\b|\bgithub issue\b|\bgh cli\b|\bci run\b/.test(compactPrompt),
    securitySensitive:
      task.metadata?.securitySensitive ?? /\bsecurity\b|\bsecret\b|\bcredential\b|\btoken\b|\bauth\b|\bpermission\b|\bssh\b|\bfirewall\b|\bencrypt\b|\bhardening\b/.test(compactPrompt),
    productionRelevant:
      task.metadata?.productionRelevant ?? /\bproduction\b|\brelease\b|\bdeploy\b|\bcustomer\b|\bsla\b|\bincident\b|\blive system\b/.test(compactPrompt),
    finalReviewRequested:
      task.metadata?.finalReviewRequested ?? /\bfinal review\b|\breview required\b|\bsign off\b|\bapprove\b|\baudit\b/.test(compactPrompt),
  };
}

function deriveDomain(domainSignals: DomainSignals): TaskDomain {
  if (domainSignals.splunk) return 'dfir_splunk';
  if (domainSignals.velociraptor) return 'dfir_velociraptor';
  if (domainSignals.securitySensitive) return 'security_ops';
  if (domainSignals.investigation || domainSignals.research) return 'research';
  if (domainSignals.github) return 'github';
  if (domainSignals.frontend) return 'frontend';
  if (domainSignals.documentation) return 'documentation';
  if (domainSignals.coding || domainSignals.debugging) return 'engineering';
  return 'general';
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
  verbCount: number,
): number {
  const values = Object.values(scorecard).sort((a, b) => b - a);
  const strongest = values[0] ?? 0;
  const second = values[1] ?? 0;
  const margin = strongest - second;
  const signalBoost = Object.values(domainSignals).filter(Boolean).length * 0.02;
  const ruleBoost = Math.min(ruleCount * 0.025, 0.18);
  const verbBoost = Math.min(verbCount * 0.015, 0.09);
  const base = 0.44 + ruleBoost + signalBoost + verbBoost + Math.min(margin * 0.035, 0.24);

  return Math.max(0.35, Math.min(0.97, Number(base.toFixed(2))));
}

function matchesAny(normalized: string, patterns: string[]): boolean {
  return patterns.some((pattern) => normalized.includes(pattern));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
