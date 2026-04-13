# Routing policy

## Core principles

1. Correctness beats cost.
2. Capability selection happens before model selection.
3. Deterministic policy beats opaque prompt routing.
4. Only allowlisted trusted skills may be selected.
5. Low confidence or high-risk work gets stronger review.
6. Routing decisions must be inspectable after the fact.

## Execution-mode policy

| Execution mode | Typical use |
| --- | --- |
| `specialized_skill` | strong trusted-skill fit, low-risk bounded work |
| `specialized_skill_then_openai_review` | trusted skill fit, but policy requires review |
| `minimax_direct` | bounded general work with no trusted-skill win |
| `minimax_then_openai_review` | moderate technical work where MiniMax drafts and OpenAI reviews |
| `openai_direct` | reasoning-critical, low-confidence, or explicit review-heavy work |

## Capability-first policy

The router asks two questions in order:

### 1. Is there a trusted specialized skill that should own this task?

If yes:
- choose the skill first
- only add OpenAI review if policy requires it

If no:
- continue to model-tier selection

### 2. If a model path is needed, which one is safest?

Default model path rules:
- `bounded_execution` -> `minimax_fast`
- `moderate_technical` -> `minimax_general`
- `reasoning_critical` -> `openai_reasoning`
- `final_review_required` -> `openai_review`

Then execution-mode overrides apply.

## Confidence thresholds

Default thresholds:
- low: `<= 0.55`
- medium: `<= 0.74`
- high: `>= 0.86`

## Trusted skill threshold

Default trusted-skill selection threshold:
- `minimumSkillScore = 0.55`

This is intentionally explicit and code-reviewable.

## Review rules

### Trusted skill review

A trusted skill goes to `specialized_skill_then_openai_review` when any of the following is true:
- the skill policy says `always`
- the task class is `final_review_required`
- the work is security-sensitive
- the work is production-relevant
- confidence is below the configured skill-review threshold for non-bounded, non-documentation work

### MiniMax review

General model work goes to `minimax_then_openai_review` when:
- the work is moderate technical rather than trivial
- or the domain is one that policy prefers to review
- or coding/debugging review is prudent
- or production/security policy requires it

### Direct OpenAI

Direct OpenAI is used when:
- the task is reasoning-critical
- confidence is low
- explicit review language dominates the task
- or deterministic policy says the safest path is to skip MiniMax drafting

## Domain heuristics

### Documentation
- prefer `codebase-documenter` when the documentation signal is strong
- do not force review by confidence alone for bounded docs work

### Frontend
- prefer `frontend-design`
- add review when the task is risky or clearly production-facing

### GitHub
- prefer `github` when the task is clearly about PRs, issues, or CI runs
- add review when the task is high-impact or ambiguous

### DFIR / Splunk / Velociraptor
- prefer allowlisted DFIR skills when the task is clearly dashboard/validation/strategy work
- treat production Splunk work as review-sensitive
- keep post-skill verification mandatory

### Research
- usually skip trusted skills unless a research-capable trusted skill is a very strong fit
- otherwise route directly to OpenAI reasoning

## Verification plan policy

Every route returns structured verification stages.

Potential stages:
- `preflight`
- `post_skill`
- `post_model`
- `openai_review`
- `acceptance`

Phase 1 expects the downstream system to execute these checks explicitly instead of relying on vague “looks good” acceptance.
