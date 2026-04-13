---
name: model-routing-skill
description: Deterministic provider/model routing for OpenClaw tasks with explicit MiniMax and OpenAI tier selection, auditable rationale, confidence-based escalation, and verification/review gating. Use when an agent needs a predictable router instead of an opaque prompt-based classifier, especially for coding, debugging, research, Splunk, Velociraptor, production, or security-sensitive work.
---

# Model Routing Skill

Use the repository router instead of inventing ad-hoc routing rules.

## Quick workflow

1. Read `../../docs/routing-policy.md` for the exact tier and escalation policy.
2. If you need architecture or rationale, read `../../docs/design.md`.
3. Route tasks through the TypeScript router in `../../src/router/deterministicRouter.ts`.
4. If you need full execution with verification/review, use `../../src/executor/routingExecutor.ts`.
5. For verifier behavior, inspect `../../src/verifier/ruleBasedVerifier.ts`.

## Operational rules

- Keep routing deterministic.
- Preserve the returned decision object in your audit trail.
- Do not hide provider/model selection behind SDK defaults.
- Escalate low-confidence work to OpenAI.
- Require OpenAI review for medium-confidence production or security work.
- Run the verifier before accepting a final answer.

## Good entry points

- `../../examples/basic-routing.ts`
- `../../examples/mock-execution.ts`

## Expected outputs

Return or log the routing decision fields:
- `task_class`
- `selected_provider`
- `selected_model_tier`
- `selected_model_id`
- `confidence`
- `review_required`
- `escalation_needed`
- `rationale`
- `verification_summary`
