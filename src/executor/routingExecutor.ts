import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import { DeterministicRouter } from '../router/deterministicRouter.js';
import type { ExecutionPlanStepResult, ExecutionResult, RouterConfig, RoutingTask } from '../types/index.js';

export class RoutingExecutor {
  private readonly router: DeterministicRouter;

  constructor(private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG) {
    this.router = new DeterministicRouter(config);
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

  async execute(task: RoutingTask): Promise<ExecutionResult> {
    return this.plan(task);
  }
}
