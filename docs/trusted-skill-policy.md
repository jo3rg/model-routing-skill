# Trusted skill policy

## Purpose

Phase 1 introduces a **trusted-skill allowlist**.

The policy goal is straightforward:

> use specialized skills only when they are explicitly trusted, explicitly described, and explicitly reviewable.

This prevents the router from becoming a vague “maybe use some skill” system.

## Policy rules

### 1. Allowlist only

Only skills listed in `src/capabilities/trustedSkillRegistry.ts` may be selected by the router.

The router does **not**:
- scan the filesystem for arbitrary skills
- call external registries
- auto-install anything
- infer trust from skill names alone

### 2. Full metadata required

A trusted skill entry must include enough metadata to support policy review:
- `id`
- `displayName`
- `description`
- `location`
- `version`
- `domains`
- `triggerPhrases`
- `artifactFocus`
- `reviewPreference`
- `riskTags`
- `verificationFocus`
- `handoffRequirements`
- `examples`
- `enabled`

If a skill cannot be described clearly enough to fill these fields, it should not be routed automatically.

### 3. Deterministic scoring only

Trusted skill selection is rule-based.

Scoring currently considers:
- explicit allowlist in task metadata
- explicit skill mention in the prompt
- domain match
- trigger-phrase match
- artifact alignment
- small penalties where a skill is a weak fit for reasoning-heavy work

No embedding search. No LLM classifier. No learned ranker.

### 4. Review preference is part of trust policy

Each skill declares one of:
- `never`
- `conditional`
- `always`

Interpretation:
- `never`: the skill does not require a model review purely due to skill policy
- `conditional`: review depends on confidence and risk
- `always`: every routed use of the skill requires OpenAI review

Review preference is combined with task risk signals such as:
- production relevance
- security sensitivity
- explicit final review requests
- confidence below the configured threshold

### 5. Skill output is not accepted blindly

Selecting a trusted skill does not mean its output is auto-accepted.

Phase 1 requires post-skill verification via:
- `skill_output_contract`
- `post_skill_handoff_quality`
- normal requirement/domain/safety checks

This matters because skill routing is a capability decision, not a blanket trust waiver.

## Current allowlisted skill families

The current Phase 1 registry focuses on well-defined, high-value domains:

### Documentation
- `codebase-documenter`

### Frontend
- `frontend-design`

### GitHub workflow
- `github`

### Security / host hardening
- `healthcheck`

### DFIR / Splunk / Velociraptor
- `dfir-dashboard-designer`
- `dfir-dashboard-strategist`
- `dfir-test-automation`
- `e2e-splunk-validation`

These are examples of trusted, explainable capability routes.

## When a trusted skill should win

A trusted skill should win when:
- the task clearly falls in a covered domain
- the allowlist score clears the threshold
- the task is better handled by specialized workflow knowledge than by raw model choice alone

Examples:
- README and architecture docs -> `codebase-documenter`
- Splunk dashboard design -> `dfir-dashboard-designer`
- GitHub PR / CI inspection -> `github`
- firewall / SSH hardening review -> `healthcheck`

## When model routing should win instead

Model routing should stay primary when:
- no trusted skill clears the threshold
- the task is mainly reasoning/synthesis without a strong specialized skill match
- the work is broad or ambiguous and direct OpenAI reasoning is safer
- a trusted skill exists but is a weak fit for the actual artifact requested

Examples:
- broad research comparing routing strategies -> `openai_direct`
- generic JSON transform -> `minimax_direct`
- coding fix with test additions but no specialized skill match -> `minimax_then_openai_review`

## Operational constraints

Phase 1 intentionally keeps the trusted-skill policy tight:
- no chained auto-skill composition
- no arbitrary marketplace calls
- no silent registry growth
- no dynamic trust promotion based on anecdotal success

Any new skill must be added by code change and reviewed like policy.

## Why this matters

Without an explicit trusted-skill policy, “capability routing” tends to become opaque and hard to audit.

This repo avoids that by making trust a code-level policy decision, not an emergent side effect.
