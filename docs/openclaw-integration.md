# OpenClaw Integration

## Goal

Use `model-routing-skill` as the policy source for model selection, while keeping OpenClaw configuration explicit and auditable.

## Current recommendation

- Set the global default model to `minimax/MiniMax-M2.7`
- Use the routing skill to decide when work must escalate to OpenAI
- Keep OpenAI available as a configured higher-assurance path for review, reasoning-critical work, and final production checks

## Practical workflow

1. Default session model starts on MiniMax.
2. For substantial work, read `skill/model-routing-skill/SKILL.md`.
3. Route the task using the deterministic router policy in this repository.
4. If the router/verifier/escalator indicates OpenAI review or escalation, run the task with the configured OpenAI tier.
5. Preserve the returned routing decision and verification summary in task notes, PR notes, or session summaries.

## Suggested OpenClaw usage pattern

### For direct agent work
- Treat `model-routing-skill` as the decision authority for whether MiniMax is acceptable.
- If the task is bounded, non-production-critical, and high confidence, stay on MiniMax.
- If confidence is low, or medium with production/security relevance, switch to OpenAI for review or primary execution.

### For delegated work
- Spawn a subagent with the skill context included.
- Start on MiniMax only when the routing policy allows it.
- Use OpenAI for review when the skill says review is required.

## Usage data and optimization

### What the current repo already captures
- structured routing decision objects
- verification summaries
- executor audit trails
- provider response token usage when the provider returns usage metadata

### Persistent telemetry sink

The executor can write one JSONL record per execution to a local file, giving you a durable dataset for analyzing routing patterns over time.

#### Enabling telemetry

Set environment variables (or copy from `.env.example`):

```bash
# Enable/disable telemetry (defaults to true if not set)
ROUTING_TELEMETRY_ENABLED=true

# Output path for the JSONL log file
ROUTING_TELEMETRY_LOG_PATH=./logs/router-decisions.jsonl
```

#### Telemetry event schema

Each line in the log file is a JSON object with:

| Field | Type | Description |
|---|---|---|
| `timestamp` | string | ISO 8601 UTC timestamp |
| `task_class` | string | One of: `bounded_execution`, `moderate_technical`, `reasoning_critical`, `final_review_required` |
| `selected_provider` | string | `minimax` or `openai` |
| `selected_model_tier` | string | e.g. `minimax_fast`, `openai_review` |
| `selected_model_id` | string | Resolved model ID |
| `confidence` | number | Raw confidence score (0–1) |
| `review_required` | boolean | Whether the router flagged review |
| `escalation_needed` | boolean | Whether the execution escalated |
| `verification_pass` | boolean | Whether the verifier passed |
| `verification_summary` | string | Human-readable verification summary |
| `token_usage` | object? | `promptTokens`, `completionTokens`, `totalTokens` (only if provider returned them) |
| `final_outcome` | string | `accepted`, `escalated`, or `review_required` |
| `task_domain` | string | Coarse domain label: `velo`, `splunk`, `coding`, `research`, or `general` |
| `task_complexity` | string | `high`, `medium`, or `low` (derived from confidence band) |

#### Using telemetry in code

```ts
import { TelemetrySink, buildTelemetryConfigFromEnv, createExecutor, createLiveProvidersFromEnv } from './src/index.js';

const telemetryConfig = buildTelemetryConfigFromEnv();
const sink = new TelemetrySink(telemetryConfig.logPath, telemetryConfig.enabled);

const config = buildRouterConfigFromEnv();
const providers = createLiveProvidersFromEnv(config);
const executor = createExecutor(providers, config, sink); // sink is optional

const result = await executor.execute({ prompt: '...' });
// Telemetry event is automatically appended after each execute() call
```

#### Safety notes

- **Never log raw prompts or secrets.** The telemetry event uses only coarse-grained `task_domain` labels and task class, not raw prompt content.
- The sink is resilient: if the file write fails (permissions, disk full), it logs to stderr and continues without crashing.
- Directory is created automatically if it does not exist.
- The sink is a no-op when `ROUTING_TELEMETRY_ENABLED=false`.

## Safety notes

- Never log raw secrets, prompts containing secrets, or provider API keys.
- Prefer redacted task metadata or coarse categories over full raw prompts when telemetry is stored.
- Keep model IDs configurable; do not bake provider assumptions into business logic.
