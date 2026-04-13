# OpenClaw integration

## Goal

Use `model-routing-skill` as a deterministic policy source for:
- capability selection
- model selection
- review gating
- verification planning

## Recommended Phase 1 workflow

1. Keep the default session model on MiniMax for general work.
2. Route non-trivial work through this repository.
3. If the decision returns a trusted skill, run that skill externally.
4. If the decision includes review, run the specified OpenAI review step externally.
5. Preserve the decision object and verification plan in task notes, PR notes, or session summaries.

## Important Phase 1 constraint

The executor in this repo is a **planner**, not a hidden automation engine.

It intentionally does **not**:
- execute skills inside the router/executor
- auto-discover new skills
- silently fall back across providers

This keeps the policy understandable and auditable.

## Suggested agent usage pattern

### For direct agent work
- call the router
- inspect `execution_mode`
- follow the returned `plan`
- keep the decision object for auditability

### For delegated work
- attach the chosen trusted skill only if `selected_skill_id` is present
- attach review context only if `review_required` is true
- preserve verification findings alongside the final result
