import { selectCapability } from '../capabilities/trustedSkillRegistry.js';
import { DeterministicTaskClassifier } from '../classifier/deterministicClassifier.js';
import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import { DeterministicEscalator } from '../escalator/deterministicEscalator.js';
import type { ClassificationResult, RouteDecision, RouterConfig, RoutingTask, VerificationPlanStep } from '../types/index.js';

export class DeterministicRouter {
  private readonly classifier: DeterministicTaskClassifier;
  private readonly escalator: DeterministicEscalator;

  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {
    this.classifier = new DeterministicTaskClassifier();
    this.escalator = new DeterministicEscalator(config);
  }

  route(task: RoutingTask): RouteDecision {
    const classification = this.classifier.classify(task);
    const capability = selectCapability(task, classification, this.config);
    const escalation = this.escalator.evaluate(classification, capability);

    const selectedModelId = escalation.selectedTier === 'none' ? undefined : this.config.tiers[escalation.selectedTier].modelId;
    const reviewModelId = escalation.reviewTier ? this.config.tiers[escalation.reviewTier].modelId : undefined;

    const rationale = [
      `Normalized task for deterministic routing: ${classification.normalizedTask.normalized_prompt}.`,
      `Capability selection ran before model selection and chose ${capability.kind}${capability.selected_skill ? ` (${capability.selected_skill.id})` : ''}.`,
      ...classification.rationale,
      ...escalation.reasons,
      `Execution mode ${escalation.executionMode} selected for domain ${classification.domain}.`,
    ];

    return {
      task_class: classification.taskClass,
      domain: classification.domain,
      execution_mode: escalation.executionMode,
      selected_provider: escalation.selectedProvider,
      selected_model_tier: escalation.selectedTier,
      ...(selectedModelId ? { selected_model_id: selectedModelId } : {}),
      ...(capability.selected_skill ? { selected_skill_id: capability.selected_skill.id } : {}),
      ...(escalation.reviewProvider ? { review_provider: escalation.reviewProvider } : {}),
      ...(escalation.reviewTier ? { review_model_tier: escalation.reviewTier } : {}),
      ...(reviewModelId ? { review_model_id: reviewModelId } : {}),
      confidence: classification.confidence,
      review_required: escalation.reviewRequired,
      escalation_needed: escalation.escalationNeeded,
      rationale,
      verification_plan: this.buildVerificationPlan(task, classification, capability.selected_skill?.id, escalation.reviewRequired),
      matched_rules: classification.matchedRules,
      domain_signals: classification.domainSignals,
      normalized_task: classification.normalizedTask,
      capability_selection: {
        kind: capability.kind,
        score: capability.score,
        ...(capability.selected_skill ? { skill_id: capability.selected_skill.id } : {}),
        candidates: capability.candidates,
      },
    };
  }

  private buildVerificationPlan(
    task: RoutingTask,
    classification: ClassificationResult,
    selectedSkillId: string | undefined,
    reviewRequired: boolean,
  ): VerificationPlanStep[] {
    const plan: VerificationPlanStep[] = [
      {
        phase: 'preflight',
        name: 'policy-preflight',
        description: 'Confirm the normalized task, allowlist status, and explicit requirements before execution.',
        required: true,
        checks: ['requirement_coverage', 'internal_consistency'],
      },
    ];

    if (selectedSkillId) {
      plan.push({
        phase: 'post_skill',
        name: 'trusted-skill-output-verification',
        description: `After ${selectedSkillId} runs, verify the skill output contract and the handoff details before accepting it.`,
        required: true,
        checks: ['requirement_coverage', 'domain_specific_quality', 'skill_output_contract', 'post_skill_handoff_quality', 'production_safety_review'],
      });
    } else {
      plan.push({
        phase: 'post_model',
        name: 'primary-model-verification',
        description: 'Verify the primary model output for requirement coverage, ambiguity, and domain quality.',
        required: true,
        checks: ['requirement_coverage', 'syntax_plausibility', 'ambiguity_detection', 'unresolved_assumptions', 'domain_specific_quality', 'production_safety_review'],
      });
    }

    if (reviewRequired) {
      plan.push({
        phase: 'openai_review',
        name: 'openai-review-gate',
        description: 'Run an OpenAI review pass using the verification findings and require a corrected final answer.',
        required: true,
        checks: ['requirement_coverage', 'internal_consistency', 'ambiguity_detection', 'unresolved_assumptions', 'domain_specific_quality', 'production_safety_review'],
      });
    }

    plan.push({
      phase: 'acceptance',
      name: 'final-acceptance',
      description: `Accept only if the output satisfies the domain contract (${classification.domain}) and all required verification stages pass${task.metadata?.expectedArtifact ? ` for ${task.metadata.expectedArtifact}` : ''}.`,
      required: true,
      checks: ['requirement_coverage', 'internal_consistency', 'domain_specific_quality', 'production_safety_review'],
    });

    return plan;
  }
}
