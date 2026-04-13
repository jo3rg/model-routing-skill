---
name: model-routing-skill
description: Deterministic capability-first routing for OpenClaw tasks with trusted-skill selection, explicit MiniMax/OpenAI model planning, auditable rationale, confidence-based escalation, and structured verification plans. Use when an agent needs a predictable router instead of an opaque classifier, especially for coding, debugging, research, documentation, GitHub, Splunk, Velociraptor, production, or security-sensitive work.
---

# Model Routing Skill

Use the repository router instead of inventing ad-hoc routing rules.

## Quick workflow

1. Read `../../docs/phase1-capability-routing.md` for the Phase 1 flow.
2. Read `../../docs/trusted-skill-policy.md` for allowlist policy.
3. Route tasks through `../../src/router/deterministicRouter.ts`.
4. If you need the ordered plan, use `../../src/executor/routingExecutor.ts`.
5. Use `../../src/verifier/ruleBasedVerifier.ts` for output verification, including post-skill verification.

## Operational rules

- Keep routing deterministic.
- Preserve the returned decision object in your audit trail.
- Capability selection must happen before model selection.
- Do not auto-discover arbitrary skills.
- Do not hide provider/model selection behind SDK defaults.
- Use the returned `verification_plan` instead of hand-wavy review language.
- In Phase 1, treat the executor as a planner, not a hidden skill runner.

## Expected outputs

Return or log the routing decision fields:
- `task_class`
- `domain`
- `execution_mode`
- `selected_provider`
- `selected_model_tier`
- `selected_skill_id`
- `confidence`
- `review_required`
- `escalation_needed`
- `rationale`
- `verification_plan`
