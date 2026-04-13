# model-routing-skill

Deterministic, auditable capability routing for OpenClaw workloads.

Phase 1 upgrades this repository from a model-only router into a **capability-first planner**:

1. normalize the task lightly
2. classify task class + domain
3. choose a trusted specialized skill when it is a better fit than raw model work
4. choose the model path only after capability selection
5. return a structured decision object and execution plan
6. require stronger verification, including post-skill verification when a specialized skill is selected

This repo deliberately favors **correctness, auditability, and deterministic policy** over opaque prompt heuristics.

## Phase 1 scope

Included in Phase 1:
- capability selection before model selection
- trusted-skill allowlist / registry with explicit metadata
- light task normalization
- deterministic execution modes
- structured routing decision objects
- verification plans with post-skill verification steps
- domain-aware routing heuristics
- tests and docs

Explicitly **not** included in Phase 1:
- no optimizer or learned policy system
- no auto-discovery of arbitrary skills
- no hidden fallback chain
- no skill execution inside the router/executor
- no self-tuning cost/latency feedback loop

## Execution modes

The router now chooses one of five explicit modes:

| Execution mode | Meaning |
| --- | --- |
| `specialized_skill` | use a trusted allowlisted skill only |
| `specialized_skill_then_openai_review` | use a trusted skill first, then require OpenAI review |
| `minimax_direct` | send directly to MiniMax with no mandatory review |
| `minimax_then_openai_review` | let MiniMax draft, then require OpenAI review |
| `openai_direct` | send directly to OpenAI |

## Supported model tiers

| Tier | Provider | Default model ID | Intended use |
| --- | --- | --- | --- |
| `none` | trusted skill | n/a | skill-only path |
| `minimax_fast` | MiniMax | `MiniMax-M2.1-highspeed` | bounded, low-risk execution |
| `minimax_general` | MiniMax | `MiniMax-M2.5` | moderate technical work |
| `openai_general` | OpenAI | `gpt-5.4-mini` | direct OpenAI for non-reasoning escalation |
| `openai_reasoning` | OpenAI | `gpt-5.4` | reasoning-critical analysis and ambiguous work |
| `openai_review` | OpenAI | `gpt-5.4` | final review gate after skill/MiniMax output |

## Trusted skill registry

Phase 1 uses an explicit allowlist in `src/capabilities/trustedSkillRegistry.ts`.

There is **no** arbitrary skill discovery.

Current allowlisted examples include:
- `codebase-documenter`
- `frontend-design`
- `github`
- `healthcheck`
- `dfir-dashboard-designer`
- `dfir-dashboard-strategist`
- `dfir-test-automation`
- `e2e-splunk-validation`

Each entry includes:
- skill id and location
- domain coverage
- trigger phrases
- artifact focus
- review preference
- verification focus
- handoff requirements
- examples

## Decision object

Every routing decision is explicit and auditable.

```ts
{
  task_class,
  domain,
  execution_mode,
  selected_provider,
  selected_model_tier,
  selected_model_id,
  selected_skill_id,
  confidence,
  review_required,
  escalation_needed,
  rationale,
  verification_plan
}
```

Additional review fields are included when a review step is planned:

```ts
{
  review_provider,
  review_model_tier,
  review_model_id
}
```

## Repository layout

```text
model-routing-skill/
├── docs/
├── examples/
├── skill/model-routing-skill/
├── src/
│   ├── capabilities/
│   ├── classifier/
│   ├── config/
│   ├── escalator/
│   ├── executor/
│   ├── normalizer/
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
  prompt: 'Write a README and onboarding guide for this TypeScript project.',
  metadata: { expectedArtifact: 'docs' },
});

console.dir(decision, { depth: null });
```

### Build an execution plan

```ts
import { createExecutor } from './src/index.js';

const executor = createExecutor();
const result = await executor.execute({
  prompt: 'Fix the TypeScript routing bug and add a regression test.',
  requirements: ['Fix the bug', 'Add a regression test'],
  metadata: { expectedArtifact: 'code' },
});

console.dir(result.decision, { depth: null });
console.dir(result.plan, { depth: null });
```

**Important:** in Phase 1, `execute()` builds the deterministic plan. It does **not** run skills inside the router/executor.

### Examples

```bash
npm run example:basic
npm run example:execute
```

## Verification

Verification is stronger than the original model-only router.

Core checks:
- requirement coverage
- internal consistency
- syntax plausibility
- ambiguity detection
- unresolved assumptions
- domain-specific quality
- production-safety review

Additional Phase 1 skill checks:
- `skill_output_contract`
- `post_skill_handoff_quality`

The router also returns a structured `verification_plan` so downstream executors know which stages must run.

## Tests and quality gates

```bash
npm run build
npm test
npm run verify
```

## Key docs

- `docs/phase1-capability-routing.md` — Phase 1 architecture and flow
- `docs/trusted-skill-policy.md` — allowlist rules and review policy
- `docs/routing-policy.md` — routing and execution-mode policy
- `docs/examples.md` — scenario walkthroughs

## OpenClaw skill

The reusable skill lives in `skill/model-routing-skill/SKILL.md`.

Use it when another OpenClaw agent needs deterministic capability/model selection, review gating, and explicit verification planning instead of an opaque router.
