# Phase 1 capability routing

## Goal

Phase 1 upgrades the repository from a model-tier selector into a **capability router**.

The key architectural change is simple:

> choose the best execution capability first, then choose the model path only if a model is still needed.

That means the router can now say:
- this should go to a trusted specialized skill
- this should go to a trusted skill and then OpenAI review
- this should stay on MiniMax
- this should go MiniMax first and OpenAI second
- this should go straight to OpenAI

## Why this change exists

The original model-only router handled cost/risk tradeoffs, but it missed an important reality in OpenClaw:

- some tasks are not “which model?” problems
- some tasks are “which trusted capability?” problems

Examples:
- README writing should often use the documentation skill
- Splunk/Velociraptor dashboard design should often use a DFIR skill
- GitHub workflow tasks should often use the GitHub skill
- security hardening should often use the healthcheck skill

Phase 1 adds that capability choice while keeping the system deterministic and auditable.

## Core flow

```text
Task
  -> light normalization
  -> task classification (task class + domain + confidence)
  -> trusted capability selection
  -> model selection only if needed
  -> execution mode selection
  -> verification plan generation
  -> return decision + plan
```

## Phase 1 components

### 1. Light task normalization

Implemented in `src/normalizer/taskNormalizer.ts`.

Normalization is intentionally light-weight and deterministic:
- trim and lowercase the prompt
- collapse whitespace
- detect common verb hints
- extract noun hints
- infer requested artifact types
- detect explicit review language

This is not a learned parser and not a semantic embedding system.
It is just enough normalization to make the later rules more reliable.

### 2. Deterministic classification

Implemented in `src/classifier/deterministicClassifier.ts`.

The classifier returns:
- `task_class`
- `domain`
- `confidence`
- `domain_signals`
- `matched_rules`
- `normalized_task`

Task classes remain:
- `bounded_execution`
- `moderate_technical`
- `reasoning_critical`
- `final_review_required`

Domains are more explicit in Phase 1:
- `general`
- `engineering`
- `documentation`
- `frontend`
- `github`
- `research`
- `security_ops`
- `dfir_splunk`
- `dfir_velociraptor`

### 3. Trusted skill registry

Implemented in `src/capabilities/trustedSkillRegistry.ts`.

This registry is an allowlist, not a discovery system.

Each trusted skill entry includes:
- identifier
- location
- description
- covered domains
- trigger phrases
- artifact focus
- review preference
- risk tags
- verification focus
- required handoff details
- examples

This makes skill routing auditable and reviewable in code.

### 4. Capability selection before model selection

Implemented by `selectCapability()` and used by `DeterministicRouter`.

The router now:
1. scores trusted skills deterministically
2. picks a trusted skill if it clears the threshold
3. only chooses model tiers after the capability decision is made

This avoids the old failure mode of asking “MiniMax or OpenAI?” before asking whether a trusted skill is the better primary path.

### 5. Execution mode selection

Implemented in `src/escalator/deterministicEscalator.ts`.

Phase 1 execution modes:
- `specialized_skill`
- `specialized_skill_then_openai_review`
- `minimax_direct`
- `minimax_then_openai_review`
- `openai_direct`

Examples:
- docs work with a strong skill match -> `specialized_skill`
- Splunk dashboard planning with production risk -> `specialized_skill_then_openai_review`
- bounded JSON rename -> `minimax_direct`
- coding fix with regression test -> `minimax_then_openai_review`
- research-heavy ambiguous analysis -> `openai_direct`

### 6. Verification planning

The router now returns `verification_plan`, not just a free-form summary string.

Verification plan stages may include:
- `preflight`
- `post_skill`
- `post_model`
- `openai_review`
- `acceptance`

This gives downstream executors an explicit contract for what must be checked.

## Phase 1 executor behavior

`src/executor/routingExecutor.ts` now builds a plan.

It does **not**:
- auto-run arbitrary skills
- auto-discover additional capabilities
- silently switch tiers mid-flight

Instead it returns:
- the routing decision
- a deterministic ordered plan
- an audit trail

That keeps Phase 1 bounded and auditable.

## Post-skill verification

This is one of the important Phase 1 upgrades.

When a trusted skill is selected, the system now expects post-skill checks such as:
- requirement coverage
- domain-specific quality
- skill output contract
- handoff quality
- production-safety review

The verifier supports this via:
- `skill_output_contract`
- `post_skill_handoff_quality`

So the system is not just saying “use a skill.”
It is also saying “verify that the skill output is good enough to trust.”

## Deterministic auditability

Phase 1 preserves the existing philosophy:
- no opaque routing prompts
- no hidden optimizer loop
- no auto-discovery of random skills
- no silent provider fallback
- all thresholds and heuristics live in code

That means reviewers can inspect:
- why the task was normalized a certain way
- why a domain was inferred
- why a skill was chosen or rejected
- why review was or was not required
- which verification stages are mandatory

## Phase 2 intentionally deferred

Phase 1 does **not** implement:
- learned routing
- telemetry-driven optimizer policy
- cost/latency adaptive scoring
- arbitrary skill marketplace discovery
- autonomous multi-hop capability chains
- automatic retries across providers until one “works” 

Those are possible future directions, but keeping them out of Phase 1 is a feature, not a bug.
