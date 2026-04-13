# model-routing-skill

Deterministic, auditable model routing for OpenClaw workloads that need to choose between MiniMax and OpenAI tiers without hand-wavy heuristics.

This repository provides:
- a rule-based task classifier
- a deterministic router with explicit escalation rules
- a response verifier with production-safety checks
- a provider abstraction for MiniMax and OpenAI
- a mockable execution pipeline for tests and offline development
- an installable OpenClaw skill folder that teaches another agent how to use the router

## Why this exists

Most model routers drift toward opaque prompt-based classification. That is flexible, but it is not very auditable. This project deliberately optimizes for:
- correctness over cost
- deterministic decisions over hidden classifier behavior
- explicit escalation over implicit “best effort” fallback
- verification and review before final delivery for risky work

## Supported tiers

| Tier | Provider | Default model ID | Intended use |
| --- | --- | --- | --- |
| `minimax_fast` | MiniMax | `MiniMax-M2.1-highspeed` | bounded, low-risk execution |
| `minimax_general` | MiniMax | `MiniMax-M2.5` | moderate technical work |
| `openai_general` | OpenAI | `gpt-5.4-mini` | higher-confidence escalation or production-sensitive general work |
| `openai_reasoning` | OpenAI | `gpt-5.4` | reasoning-critical analysis, debugging, research |
| `openai_review` | OpenAI | `gpt-5.4` | final review, medium-confidence production/security work |

All model IDs are configurable.

## Task classes

- `bounded_execution`
- `moderate_technical`
- `reasoning_critical`
- `final_review_required`

## Decision object

Every routing decision is explicit and auditable:

```ts
{
  task_class,
  selected_provider,
  selected_model_tier,
  selected_model_id,
  confidence,
  review_required,
  escalation_needed,
  rationale,
  verification_summary
}
```

## Repository layout

```text
model-routing-skill/
├── docs/
├── examples/
├── skill/model-routing-skill/
├── src/
│   ├── classifier/
│   ├── config/
│   ├── escalator/
│   ├── executor/
│   ├── providers/
│   ├── router/
│   ├── types/
│   └── verifier/
└── tests/
```

## Install

```bash
npm install
```

## Configuration

Copy the example file and set secrets locally:

```bash
cp .env.example .env
```

Secrets must come from environment variables only:
- `OPENAI_API_KEY`
- `MINIMAX_API_KEY`

Optional configuration:
- `OPENAI_BASE_URL`
- `MINIMAX_BASE_URL`
- `MODEL_TIER_MINIMAX_FAST`
- `MODEL_TIER_MINIMAX_GENERAL`
- `MODEL_TIER_OPENAI_GENERAL`
- `MODEL_TIER_OPENAI_REASONING`
- `MODEL_TIER_OPENAI_REVIEW`

## Usage

### Route only

```ts
import { createRouter } from './src/index.js';

const router = createRouter();
const decision = router.route({
  prompt: 'Research trade-offs for Splunk dashboard routing and explain the safest policy.',
});

console.log(decision);
```

### Execute with live providers

```ts
import { buildRouterConfigFromEnv, createExecutor, createLiveProvidersFromEnv } from './src/index.js';

const config = buildRouterConfigFromEnv();
const providers = createLiveProvidersFromEnv(config);
const executor = createExecutor(providers, config);

const result = await executor.execute({
  prompt: 'Fix the TypeScript routing bug and add a regression test.',
  requirements: ['Fix the bug', 'Add a regression test'],
  metadata: { expectedArtifact: 'code' },
});

console.log(result.decision);
console.log(result.verification.summary);
console.log(result.finalResponse?.content);
```

### Execute with mocks

```bash
npm run example:execute
```

### Telemetry

Every `executor.execute()` call can optionally write one structured JSONL record to a local file for post-hoc analysis.

Enable via environment variables:

```bash
ROUTING_TELEMETRY_ENABLED=true
ROUTING_TELEMETRY_LOG_PATH=./logs/router-decisions.jsonl
```

```ts
import { TelemetrySink, buildTelemetryConfigFromEnv, createExecutor, createLiveProvidersFromEnv } from './src/index.js';

const { enabled, logPath } = buildTelemetryConfigFromEnv();
const sink = new TelemetrySink(logPath, enabled);
const executor = createExecutor(providers, config, sink); // sink is optional

const result = await executor.execute({ prompt: '...' });
// One JSON line is appended to logPath after each execute() call
```

Each event records: timestamp, task class, selected provider/tier/model, confidence, review/escalation flags, verification outcome, token usage (if available), final outcome, task domain, and task complexity. Raw prompts are never logged.

## Verification checks

The verifier runs deterministic checks for:
- requirement coverage
- internal consistency
- syntax plausibility
- ambiguity detection
- unresolved assumptions
- domain-specific quality
- production-safety review

## Tests and quality gates

```bash
npm run build
npm run test
npm run verify
```

## Docs

- `docs/design.md` — research summary, design choices, architecture
- `docs/routing-policy.md` — exact routing and escalation rules
- `docs/examples.md` — scenario walkthroughs

## OpenClaw skill

The reusable skill lives in `skill/model-routing-skill/SKILL.md`.

Use it when another OpenClaw agent needs deterministic provider/model selection, review gating, or verifiable routing policy instead of an opaque prompt-based router.
