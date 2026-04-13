import { DEFAULT_ROUTER_CONFIG } from '../config/defaults.js';
import { buildMessages } from '../providers/base.js';
import { DeterministicRouter } from '../router/deterministicRouter.js';
import type {
  DomainSignals,
  ExecutionResult,
  FinalOutcome,
  ModelTier,
  ProviderRegistry,
  RouterConfig,
  RoutingTask,
  TaskDomain,
  TaskComplexity,
  TelemetryEvent,
  TokenUsage,
  VerificationReport,
} from '../types/index.js';
import { RuleBasedVerifier } from '../verifier/ruleBasedVerifier.js';
import type { TelemetrySink } from '../telemetry/telemetrySink.js';

const SYSTEM_PROMPT = [
  'You are an execution model in a deterministic routing pipeline.',
  'Follow the task exactly, cover requirements explicitly, avoid vague language, and surface assumptions.',
  'Prefer precise, auditable answers over marketing language.',
].join(' ');

export class RoutingExecutor {
  private readonly router: DeterministicRouter;
  private readonly verifier: RuleBasedVerifier;
  private readonly sink: TelemetrySink | undefined;

  constructor(
    private readonly providers: ProviderRegistry,
    private readonly config: RouterConfig = DEFAULT_ROUTER_CONFIG,
    sink?: TelemetrySink,
  ) {
    this.router = new DeterministicRouter(config);
    this.verifier = new RuleBasedVerifier(config);
    this.sink = sink;
  }

  async execute(task: RoutingTask): Promise<ExecutionResult> {
    const decision = this.router.route(task);
    const auditTrail: string[] = [`Routed to ${decision.selected_provider}/${decision.selected_model_id}.`];
    const primaryTierConfig = this.config.tiers[decision.selected_model_tier];
    const primaryProvider = this.providers[primaryTierConfig.provider];

    if (!primaryProvider) {
      throw new Error(`Provider not configured: ${primaryTierConfig.provider}`);
    }

    const initialResponse = await primaryProvider.generate({
      modelId: primaryTierConfig.modelId,
      temperature: primaryTierConfig.temperature,
      maxTokens: primaryTierConfig.maxTokens,
      messages: buildMessages(SYSTEM_PROMPT, buildTaskPrompt(task)),
      metadata: {
        selectedTier: decision.selected_model_tier,
      },
      ...(primaryTierConfig.reasoningEffort ? { reasoningEffort: primaryTierConfig.reasoningEffort } : {}),
    });

    let verification = this.verifier.verify(task, initialResponse.content, decision);
    let finalResponse = initialResponse;
    let reviewResponse = undefined;
    let escalated = decision.escalation_needed;

    if (decision.review_required || decision.escalation_needed || !verification.overallPass) {
      const reviewTier = this.pickReviewTier(decision.selected_model_tier, !verification.overallPass);
      const reviewTierConfig = this.config.tiers[reviewTier];
      const reviewProvider = this.providers[reviewTierConfig.provider];

      if (!reviewProvider) {
        throw new Error(`Review provider not configured: ${reviewTierConfig.provider}`);
      }

      auditTrail.push(`Escalated to ${reviewTierConfig.provider}/${reviewTierConfig.modelId} for review.`);
      reviewResponse = await reviewProvider.generate({
        modelId: reviewTierConfig.modelId,
        temperature: reviewTierConfig.temperature,
        maxTokens: reviewTierConfig.maxTokens,
        messages: buildMessages(
          SYSTEM_PROMPT,
          [
            'Review and improve the prior answer.',
            `Original task:\n${buildTaskPrompt(task)}`,
            `Initial answer:\n${initialResponse.content}`,
            `Verification report:\n${summarizeVerification(verification)}`,
            'Return a corrected final answer only.',
          ].join('\n\n'),
        ),
        metadata: {
          selectedTier: reviewTier,
        },
        ...(reviewTierConfig.reasoningEffort ? { reasoningEffort: reviewTierConfig.reasoningEffort } : {}),
      });

      verification = this.verifier.verify(task, reviewResponse.content, decision);
      finalResponse = reviewResponse;
      escalated = true;
    }

    if (verification.overallPass) {
      auditTrail.push('Verification passed.');
    } else {
      auditTrail.push(`Verification still flagged: ${verification.summary}`);
    }

    const result: ExecutionResult = {
      decision,
      initialResponse,
      finalResponse,
      verification,
      escalated,
      auditTrail,
    };

    if (reviewResponse) {
      result.reviewResponse = reviewResponse;
    }

    // Emit telemetry event once per execute() call using final outcome state
    if (this.sink) {
      const finalOutcome = this.computeFinalOutcome(decision, escalated, verification.overallPass);
      const tokenUsage = this.computeTokenUsage(finalResponse?.usage);

      const event: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        task_class: decision.task_class,
        selected_provider: decision.selected_provider,
        selected_model_tier: decision.selected_model_tier,
        selected_model_id: decision.selected_model_id,
        confidence: decision.confidence,
        review_required: decision.review_required,
        escalation_needed: escalated,
        verification_pass: verification.overallPass,
        verification_summary: verification.summary,
        final_outcome: finalOutcome,
        task_domain: this.deriveTaskDomain(decision.domain_signals),
        task_complexity: this.deriveTaskComplexity(decision.confidence),
      };

      if (tokenUsage) {
        event.token_usage = tokenUsage;
      }

      this.sink.append(event);
    }

    return result;
  }

  private pickReviewTier(selectedTier: ModelTier, verificationFailed: boolean): ModelTier {
    if (selectedTier === 'openai_review') {
      return 'openai_review';
    }

    if (verificationFailed || selectedTier === 'openai_reasoning') {
      return 'openai_review';
    }

    return 'openai_review';
  }

  private computeFinalOutcome(
    decision: { review_required: boolean },
    escalated: boolean,
    verificationPassed: boolean,
  ): FinalOutcome {
    if (escalated) {
      return 'escalated';
    }
    if (decision.review_required || !verificationPassed) {
      return 'review_required';
    }
    return 'accepted';
  }

  private computeTokenUsage(usage?: TokenUsage): TokenUsage | undefined {
    if (!usage || (usage.promptTokens === undefined && usage.completionTokens === undefined && usage.totalTokens === undefined)) {
      return undefined;
    }
    return usage;
  }

  private deriveTaskDomain(signals: DomainSignals): TaskDomain {
    if (signals.velociraptor) return 'velo';
    if (signals.splunk) return 'splunk';
    if (signals.coding) return 'coding';
    if (signals.research) return 'research';
    return 'general';
  }

  private deriveTaskComplexity(confidence: number): TaskComplexity {
    const { low, medium } = this.config.confidenceThresholds;
    if (confidence <= low) return 'high';
    if (confidence <= medium) return 'medium';
    return 'low';
  }
}

function buildTaskPrompt(task: RoutingTask): string {
  const lines = [task.prompt.trim()];

  if (task.requirements?.length) {
    lines.push('Requirements:');
    for (const requirement of task.requirements) {
      lines.push(`- ${requirement}`);
    }
  }

  if (task.metadata?.expectedArtifact) {
    lines.push(`Expected artifact: ${task.metadata.expectedArtifact}`);
  }

  if (task.metadata?.domainHints?.length) {
    lines.push(`Domain hints: ${task.metadata.domainHints.join(', ')}`);
  }

  return lines.join('\n');
}

function summarizeVerification(report: VerificationReport): string {
  return [
    report.summary,
    ...report.checks.map((check) => `${check.name}: ${check.passed ? 'pass' : 'flag'} (${check.details})`),
  ].join('\n');
}
