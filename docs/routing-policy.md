# Routing policy

## Core principles

1. Correctness beats cost.
2. Deterministic policy beats opaque prompt routing.
3. Low confidence always escalates to OpenAI.
4. Medium confidence plus production/security risk requires OpenAI review.
5. Routing decisions must be inspectable after the fact.

## Task class policy

| Task class | Default tier | Why |
| --- | --- | --- |
| `bounded_execution` | `minimax_fast` | bounded, low-risk transforms or routine execution |
| `moderate_technical` | `minimax_general` | coding, debugging, query writing, technical implementation |
| `reasoning_critical` | `openai_reasoning` | design, investigation, research, root-cause analysis |
| `final_review_required` | `openai_review` | release review, audit, approval, explicit sign-off |

## Confidence thresholds

Default thresholds:
- low: `<= 0.55`
- medium: `<= 0.74`
- high: `>= 0.86`

## Escalation rules

### Low confidence

If routing confidence is low:
- set `escalation_needed = true`
- route to OpenAI
- prefer `openai_reasoning` for research, Splunk, Velociraptor, coding, or debugging
- otherwise use `openai_general`

### Medium confidence + risky work

If confidence is medium-or-lower and the task is:
- security-sensitive, or
- production-relevant

Then:
- set `review_required = true`
- prefer `openai_review`

### Final review requested

If the prompt explicitly asks for review/audit/approval/sign-off:
- classify as `final_review_required`
- route to `openai_review`

## Domain heuristics

### Velociraptor

Velociraptor work is treated as specialized DFIR work.
Policy effect:
- push toward `moderate_technical` or `reasoning_critical`
- if confidence falls below high, prefer OpenAI validation

### Splunk

Splunk/SPL/dashboard work is treated as specialized analytical work.
Policy effect:
- never treat it as pure trivial text work
- if review is needed, prefer OpenAI review

### Research

Research triggers stronger reasoning assumptions.
Policy effect:
- usually `reasoning_critical`
- if confidence degrades, prefer `openai_reasoning`

### Coding / debugging

Coding and debugging are often moderate technical tasks.
Policy effect:
- route to `minimax_general` when confidence is strong and the task is not obviously risky
- escalate to OpenAI reasoning on low confidence or failed verification

## Verification gates

Every execution path is expected to support the following checks:
- requirement coverage
- internal consistency
- syntax plausibility
- ambiguity detection
- unresolved assumptions
- domain-specific quality
- production-safety review

## Review behavior

When review is required or verification fails:
- preserve the original task
- preserve the initial answer
- pass the verification summary into the reviewer
- produce a corrected final answer

## Audit requirements

Every final result should retain:
- selected provider
- selected model tier
- selected concrete model ID
- confidence score
- rationale list
- verification summary
