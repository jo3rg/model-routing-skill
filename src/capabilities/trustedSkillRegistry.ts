import type {
  CapabilityCandidate,
  CapabilitySelection,
  ClassificationResult,
  ExpectedArtifact,
  RouterConfig,
  RoutingTask,
  TrustedSkillMetadata,
} from '../types/index.js';

export const DEFAULT_TRUSTED_SKILLS: TrustedSkillMetadata[] = [
  {
    id: 'dfir-dashboard-designer',
    displayName: 'DFIR Dashboard Designer',
    description: 'Primary design and SPL-building skill for Splunk + Velociraptor DFIR dashboards.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/dfir-dashboard-designer/SKILL.md',
    version: 'phase1',
    domains: ['dfir_splunk', 'dfir_velociraptor'],
    triggerPhrases: ['splunk dashboard', 'dashboard xml', 'spl query', 'splunk panel', 'panel query plan', 'dashboard layout', 'velociraptor artifact mapping', 'widget layout'],
    artifactFocus: ['spl', 'yaml', 'plan'],
    reviewPreference: 'conditional',
    riskTags: ['dfir', 'splunk', 'velociraptor'],
    verificationFocus: ['requirement_coverage', 'domain_specific_quality', 'production_safety_review', 'skill_output_contract'],
    handoffRequirements: ['panel list', 'queries', 'field assumptions', 'drilldown notes'],
    examples: ['Design a Splunk dashboard for failed logins', 'Map Velociraptor artifacts to panels'],
    enabled: true,
  },
  {
    id: 'dfir-dashboard-strategist',
    displayName: 'DFIR Dashboard Strategist',
    description: 'Strategy skill for investigation workflow, fleet scale, and dashboard positioning decisions.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/dfir-dashboard-strategist/SKILL.md',
    version: 'phase1',
    domains: ['dfir_splunk', 'dfir_velociraptor', 'research'],
    triggerPhrases: ['triage workflow', 'investigation workflow', 'fleet scale', '100 hosts', '500 hosts', 'portfolio'],
    artifactFocus: ['plan', 'research', 'docs'],
    reviewPreference: 'always',
    riskTags: ['strategy', 'dfir'],
    verificationFocus: ['requirement_coverage', 'domain_specific_quality', 'internal_consistency', 'post_skill_handoff_quality'],
    handoffRequirements: ['decision criteria', 'trade-offs', 'scale assumptions', 'recommended workflow'],
    examples: ['Evaluate dashboard strategy for 500 hosts', 'Recommend triage workflow'],
    enabled: true,
  },
  {
    id: 'dfir-test-automation',
    displayName: 'DFIR Test Automation',
    description: 'Validation skill for dashboard XML, SPL, regression coverage, and test harness extension.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/dfir-test-automation/SKILL.md',
    version: 'phase1',
    domains: ['dfir_splunk', 'dfir_velociraptor'],
    triggerPhrases: ['regression test', 'dashboard validation', 'playwright', 'test dashboard', 'validate panels'],
    artifactFocus: ['plan', 'code', 'spl'],
    reviewPreference: 'conditional',
    riskTags: ['testing', 'dfir'],
    verificationFocus: ['requirement_coverage', 'domain_specific_quality', 'skill_output_contract', 'post_skill_handoff_quality'],
    handoffRequirements: ['test scope', 'fixtures', 'expected panels', 'pass fail criteria'],
    examples: ['Add regression coverage for dashboard XML', 'Validate panel queries'],
    enabled: true,
  },
  {
    id: 'e2e-splunk-validation',
    displayName: 'E2E Splunk Validation',
    description: 'Live data and panel-query validation skill for DFIR dashboards in Splunk.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/e2e-splunk-validation/SKILL.md',
    version: 'phase1',
    domains: ['dfir_splunk'],
    triggerPhrases: ['validate splunk', 'panel query', 'expected rows', 'dashboard contract', 'required fields'],
    artifactFocus: ['spl', 'plan'],
    reviewPreference: 'always',
    riskTags: ['validation', 'splunk'],
    verificationFocus: ['requirement_coverage', 'domain_specific_quality', 'skill_output_contract'],
    handoffRequirements: ['queries checked', 'missing fields', 'row counts', 'failures'],
    examples: ['Confirm each panel query returns rows', 'Check required fields exist'],
    enabled: true,
  },
  {
    id: 'codebase-documenter',
    displayName: 'Codebase Documenter',
    description: 'Documentation skill for README files, architecture docs, and getting-started guides.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/codebase-documenter/SKILL.md',
    version: 'phase1',
    domains: ['documentation'],
    triggerPhrases: ['readme', 'documentation', 'docs', 'guide', 'architecture document', 'explain project'],
    artifactFocus: ['docs', 'text', 'plan'],
    reviewPreference: 'conditional',
    riskTags: ['documentation'],
    verificationFocus: ['requirement_coverage', 'internal_consistency', 'post_skill_handoff_quality'],
    handoffRequirements: ['files changed', 'audience', 'sections added', 'examples'],
    examples: ['Write a README', 'Create architecture documentation'],
    enabled: true,
  },
  {
    id: 'frontend-design',
    displayName: 'Frontend Design',
    description: 'Trusted frontend UI skill for React, Next.js, Tailwind, and modern UX design tasks.',
    owner: 'OpenClaw allowlist',
    location: '~/.openclaw/workspace/skills/superdesign/SKILL.md',
    version: 'phase1',
    domains: ['frontend'],
    triggerPhrases: ['landing page', 'tailwind', 'react', 'next.js', 'responsive ui', 'beautiful ui', 'frontend'],
    artifactFocus: ['code', 'docs', 'plan'],
    reviewPreference: 'conditional',
    riskTags: ['frontend'],
    verificationFocus: ['requirement_coverage', 'domain_specific_quality', 'post_skill_handoff_quality'],
    handoffRequirements: ['components', 'states', 'responsive notes', 'accessibility notes'],
    examples: ['Build a landing page', 'Design a dashboard UI'],
    enabled: true,
  },
  {
    id: 'github',
    displayName: 'GitHub Operations',
    description: 'Trusted skill for GitHub issues, PRs, CI runs, and code review workflows.',
    owner: 'OpenClaw allowlist',
    location: '/usr/lib/node_modules/openclaw/skills/github/SKILL.md',
    version: 'phase1',
    domains: ['github'],
    triggerPhrases: ['pull request', 'pr review', 'github issue', 'ci run', 'gh cli', 'review comments'],
    artifactFocus: ['plan', 'text', 'docs'],
    reviewPreference: 'conditional',
    riskTags: ['github'],
    verificationFocus: ['requirement_coverage', 'internal_consistency', 'skill_output_contract'],
    handoffRequirements: ['repo', 'issue pr numbers', 'next actions', 'risk notes'],
    examples: ['Check PR status', 'Summarize CI failures'],
    enabled: true,
  },
  {
    id: 'healthcheck',
    displayName: 'Healthcheck',
    description: 'Trusted host security hardening and exposure-review skill.',
    owner: 'OpenClaw allowlist',
    location: '/usr/lib/node_modules/openclaw/skills/healthcheck/SKILL.md',
    version: 'phase1',
    domains: ['security_ops'],
    triggerPhrases: ['security audit', 'ssh hardening', 'firewall', 'risk posture', 'exposure review', 'host hardening'],
    artifactFocus: ['plan', 'docs', 'text'],
    reviewPreference: 'always',
    riskTags: ['security'],
    verificationFocus: ['production_safety_review', 'domain_specific_quality', 'post_skill_handoff_quality'],
    handoffRequirements: ['current state', 'recommended changes', 'rollback notes', 'risk summary'],
    examples: ['Audit SSH hardening', 'Review firewall posture'],
    enabled: true,
  },
];

export function listTrustedSkills(config?: RouterConfig): TrustedSkillMetadata[] {
  return (config?.trustedSkills ?? DEFAULT_TRUSTED_SKILLS).slice();
}

export function findTrustedSkillById(
  skillId: string,
  config?: RouterConfig,
): TrustedSkillMetadata | undefined {
  return (config?.trustedSkills ?? DEFAULT_TRUSTED_SKILLS).find((skill) => skill.id === skillId);
}

export function selectCapability(
  task: RoutingTask,
  classification: ClassificationResult,
  config: RouterConfig,
): CapabilitySelection {
  const prompt = classification.normalizedTask.compact_prompt;
  const allowed = new Set(task.metadata?.allowedSkillIds ?? []);
  const disallowed = new Set(task.metadata?.disallowedSkillIds ?? []);

  const candidates = config.trustedSkills
    .filter((skill) => skill.enabled)
    .filter((skill) => !disallowed.has(skill.id))
    .filter((skill) => allowed.size === 0 || allowed.has(skill.id) || prompt.includes(skill.id.toLowerCase()))
    .map((skill) => scoreSkill(skill, classification, task, prompt, allowed))
    .sort((left, right) => {
      const diff = right.score - left.score;
      if (diff !== 0) {
        return diff;
      }
      return (left.skill_id ?? '').localeCompare(right.skill_id ?? '');
    });

  const best = candidates[0];
  if (best && best.score >= config.capabilityPolicy.minimumSkillScore) {
    const selectedSkill = findTrustedSkillById(best.skill_id ?? '', config);
    return {
      kind: 'trusted_skill',
      score: best.score,
      reasons: best.reasons,
      ...(selectedSkill ? { selected_skill: selectedSkill } : {}),
      candidates,
    };
  }

  return {
    kind: 'model',
    score: Number((best?.score ?? 0).toFixed(2)),
    reasons: best?.reasons ?? ['No trusted skill reached the allowlist score threshold.'],
    candidates: candidates.length > 0 ? candidates : [{ kind: 'model', score: 0, reasons: ['No trusted skill candidates matched the task.'] }],
  };
}

function scoreSkill(
  skill: TrustedSkillMetadata,
  classification: ClassificationResult,
  task: RoutingTask,
  prompt: string,
  allowed: Set<string>,
): CapabilityCandidate {
  let score = 0;
  const reasons: string[] = [];

  if (allowed.has(skill.id)) {
    score += 0.55;
    reasons.push('Task metadata explicitly allowlists this trusted skill.');
  }

  if (prompt.includes(skill.id.toLowerCase())) {
    score += 0.35;
    reasons.push('Prompt explicitly names the trusted skill.');
  }

  if (skill.domains.includes(classification.domain)) {
    score += 0.32;
    reasons.push(`Skill covers the classified domain ${classification.domain}.`);
  }

  const triggerMatches = skill.triggerPhrases.filter((phrase) => prompt.includes(phrase.toLowerCase()));
  if (triggerMatches.length > 0) {
    const triggerScore = Math.min(triggerMatches.length * 0.12, 0.36);
    score += triggerScore;
    reasons.push(`Matched trusted trigger phrases: ${triggerMatches.join(', ')}.`);
  }

  if (matchesArtifact(skill.artifactFocus, task.metadata?.expectedArtifact, classification.normalizedTask.requested_artifacts)) {
    score += 0.12;
    reasons.push('Skill artifact focus aligns with the requested output.');
  }

  if (classification.taskClass === 'reasoning_critical' && !skill.domains.includes('research')) {
    score -= 0.08;
    reasons.push('Reasoning-critical work slightly penalizes non-research skill matches.');
  }

  if (classification.domainSignals.productionRelevant && skill.reviewPreference === 'always') {
    score += 0.05;
    reasons.push('Skill policy already assumes mandatory review for risky work.');
  }

  return {
    kind: 'trusted_skill',
    skill_id: skill.id,
    score: Number(Math.max(0, Math.min(0.99, score)).toFixed(2)),
    reasons,
  };
}

function matchesArtifact(
  artifactFocus: ExpectedArtifact[],
  expectedArtifact: ExpectedArtifact | undefined,
  requestedArtifacts: ExpectedArtifact[],
): boolean {
  if (expectedArtifact && artifactFocus.includes(expectedArtifact)) {
    return true;
  }

  return requestedArtifacts.some((artifact) => artifactFocus.includes(artifact));
}
