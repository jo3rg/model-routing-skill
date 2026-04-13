import { createRequire } from 'module';
import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import { DeterministicRouter } from '../router/deterministicRouter.js';
import type { ExecutionPlanStepResult, ExecutionResult, RouterConfig, RoutingTask } from '../types/index.js';

/** Paths that should trigger Phase 2 cheap-model optimization */
const CHEAP_PATHS = new Set(['minimax_general', 'minimax_fast', 'openai_general']);

export class RoutingExecutor {
  private readonly router: DeterministicRouter;

  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {
    this.router = new DeterministicRouter(config);
  }

  /**
   * Phase 2 integration: if a cheap model path was selected, run the
   * cheap-model-optimizer-skill to produce a structured execution brief.
   * optimizeForCheapModel is synchronous.
   */
  private phase2Optimize(task: RoutingTask, decision: import('../types/index.js').RouteDecision): ExecutionResult['phase2_optimization'] | undefined {
    if (!CHEAP_PATHS.has(decision.selected_model_tier)) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let optimizer: { optimizeForCheapModel: (input: { prompt: string; requirements?: string[]; metadata?: Record<string, unknown> }) => { optimized_prompt: string; domain: string; task_complexity: string; decomposition_used: boolean; output_schema: Record<string, unknown>; validation_rules: string[]; confidence_expectation: string; risk_level: string; escalation_signals: string[] } } | undefined;

    try {
      // Use createRequire for ESM compatibility (sync)
      const require_ = createRequire(import.meta.url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optimizer = require_('/root/.openclaw/workspace/notes/projects/cheap-model-optimizer-skill/dist/index.js') as typeof optimizer;
    } catch {
      // Phase 2 optimizer not available — skip optimization silently
      return undefined;
    }

    if (!optimizer?.optimizeForCheapModel) return undefined;

    try {
      const result = optimizer.optimizeForCheapModel({
        prompt: task.prompt,
        requirements: task.requirements ?? [],
        metadata: {
          productionRelevant: task.metadata?.productionRelevant,
          securitySensitive: task.metadata?.securitySensitive,
          constraints: task.metadata?.domainHints ?? [],
          phase1: {
            execution_mode: decision.execution_mode,
            selected_provider: decision.selected_provider,
            selected_model_id: decision.selected_model_id,
            domain: decision.domain,
            rationale: decision.rationale,
          },
        },
      });

      return {
        optimized_prompt: result.optimized_prompt,
        domain: result.domain,
        task_complexity: result.task_complexity,
        decomposition_used: result.decomposition_used,
        output_schema: result.output_schema,
        validation_rules: result.validation_rules,
        confidence_expectation: result.confidence_expectation,
        risk_level: result.risk_level,
        escalation_signals: result.escalation_signals,
      };
    } catch {
      return undefined;
    }
  }

  plan(task: RoutingTask): ExecutionResult {
    const decision = this.router.route(task);
    const auditTrail: string[] = [
      `Capability-first routing selected mode ${decision.execution_mode}.`,
      `Primary selection: ${decision.selected_provider}/${decision.selected_model_tier}${decision.selected_skill_id ? ` with skill ${decision.selected_skill_id}` : ''}.`,
    ];

    const plan: ExecutionPlanStepResult[] = [];
    let step = 1;

    plan.push({
      step: step++,
      actor: 'system',
      phase: 'preflight',
      title: 'Normalize and preflight',
      objective: 'Lock the normalized task and explicit requirements before execution.',
      instructions: [
        `Normalized prompt: ${decision.normalized_task.normalized_prompt}`,
        `Task class: ${decision.task_class}`,
        `Domain: ${decision.domain}`,
        'Preserve the decision object for later audit and review steps.',
      ],
    });

    if (decision.selected_skill_id) {
      plan.push({
        step: step++,
        actor: 'trusted_skill',
        phase: 'primary',
        title: `Run trusted skill ${decision.selected_skill_id}`,
        objective: 'Use the allowlisted skill as the primary capability instead of routing directly to a model.',
        skill_id: decision.selected_skill_id,
        instructions: [
          'Pass the original prompt, requirements, and metadata to the trusted skill.',
          'Do not auto-discover other skills or mutate the allowlist.',
          'Collect a structured handoff with changed files, assumptions, and verification notes.',
        ],
      });
      auditTrail.push(`Plan includes trusted skill ${decision.selected_skill_id}.`);
    } else if (decision.selected_provider !== 'trusted_skill') {
      plan.push({
        step: step++,
        actor: decision.selected_provider,
        phase: 'primary',
        title: `Primary ${decision.selected_provider} execution`,
        objective: 'Run the selected model tier exactly once for the primary answer.',
        tier: decision.selected_model_tier,
        instructions: [
          `Use model tier ${decision.selected_model_tier}${decision.selected_model_id ? ` (${decision.selected_model_id})` : ''}.`,
          'Preserve raw output for verification and possible review.',
          'Do not silently change tiers during execution.',
        ],
      });
      auditTrail.push(`Plan includes primary provider ${decision.selected_provider}/${decision.selected_model_tier}.`);
    }

    for (const verification of decision.verification_plan) {
      if (verification.phase === 'preflight' || verification.phase === 'acceptance') {
        // represented separately
      }

      if (verification.phase === 'post_skill' || verification.phase === 'post_model' || verification.phase === 'openai_review') {
        plan.push({
          step: step++,
          actor: verification.phase === 'openai_review' ? 'openai' : 'system',
          phase: verification.phase,
          title: verification.name,
          objective: verification.description,
          ...(verification.phase === 'openai_review' && decision.review_model_tier ? { tier: decision.review_model_tier } : {}),
          instructions: [
            `Run checks: ${verification.checks.join(', ')}.`,
            verification.phase === 'openai_review'
              ? `Use review tier ${decision.review_model_tier}${decision.review_model_id ? ` (${decision.review_model_id})` : ''}.`
              : 'Record failures explicitly; do not paper over ambiguous or unsafe output.',
          ],
        });
      }
    }

    plan.push({
      step: step++,
      actor: 'system',
      phase: 'acceptance',
      title: 'Final acceptance gate',
      objective: 'Accept or reject the outcome based on verification results only.',
      instructions: [
        'Accept only if all required verification stages pass.',
        decision.review_required ? 'Do not accept the primary output without the mandated review step.' : 'No mandatory review step remains.',
        'Escalate manually outside Phase 1 if verification still fails after the planned path.',
      ],
    });

    return {
      decision,
      plan,
      auditTrail,
    };
  }

  /**
   * Build plan + run Phase 2 optimization (cheap-model-optimizer-skill).
   * Returns the plan with Phase 2 optimization results embedded.
   */
  planAndOptimize(task: RoutingTask): ExecutionResult {
    const result = this.plan(task);
    const phase2 = this.phase2Optimize(task, result.decision);
    if (phase2) {
      result.phase2_optimization = phase2;
      // Inject optimized prompt into the primary model execution step
      const primaryStep = result.plan.find(
        (s) => s.phase === 'primary' && CHEAP_PATHS.has(s.tier ?? '')
      );
      if (primaryStep) {
        primaryStep.instructions = [
          `## Phase 2 Optimized Brief`,
          `Domain: ${phase2.domain} | Complexity: ${phase2.task_complexity} | Risk: ${phase2.risk_level}`,
          `Confidence expectation: ${phase2.confidence_expectation}`,
          phase2.decomposition_used
            ? `Decomposition: ${(phase2 as unknown as { decomposition_steps?: string[] }).decomposition_steps?.join(' → ') ?? 'used'}`
            : '',
          ``,
          phase2.optimized_prompt,
          ``,
          `--- Validation Rules (must be satisfied before acceptance) ---`,
          ...phase2.validation_rules.map((r) => `- ${r}`),
          ``,
          `--- Escalation Signals (trigger OpenAI review if present) ---`,
          ...(phase2.escalation_signals.length > 0
            ? phase2.escalation_signals.map((s) => `  ⚠️  ${s}`)
            : ['  (none)']),
        ].filter(Boolean);
      }
    }
    return result;
  }

  async execute(task: RoutingTask): Promise<ExecutionResult> {
    return this.planAndOptimize(task);
  }
}
