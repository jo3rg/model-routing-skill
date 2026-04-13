# Design

## Goals

Build a production-ready OpenClaw skill repository that routes tasks deterministically between MiniMax and OpenAI model tiers, records why a decision was made, and adds verification and escalation logic for risky work.

Primary goals:
- correctness over cost
- deterministic, auditable policy
- explicit provider abstraction
- explicit review and escalation
- no secret material in source files

## Research summary

### 1. Multi-model routing is strongest when the router is explicit about task type, difficulty, and review thresholds

From the April 2025 AWS post on multi-LLM routing, the important production takeaway is that routing usually depends on one or more of:
- task type
- task complexity
- task domain
- tenant or quality tier

AWS distinguishes static routing from dynamic routing and describes three dynamic strategies:
- classifier/LLM-assisted routing
- semantic routing
- hybrid routing

This repository intentionally does **not** use opaque semantic or prompt-only routing for the final decision layer. Instead, it borrows the same dimensions but implements them as deterministic rules so the decision is inspectable.

### 2. Research literature treats routing and cascading as complementary, not competing

The arXiv survey *Dynamic Model Routing and Cascading for Efficient LLM Inference* frames routing as pre-generation selection and cascading as post-generation escalation. That matches production reality well:
- choose a likely-good model before generation
- inspect confidence and output quality after generation
- escalate if confidence or verification says the first answer is insufficient

This repo therefore has both:
- pre-generation routing in `src/router`
- post-generation escalation/review in `src/executor` + `src/verifier`

### 3. Explicit model selection beats hidden SDK defaults

OpenAI’s model/provider guidance recommends explicit model choice in production instead of relying on SDK defaults. That drove two concrete decisions here:
- every tier has an explicit model ID
- all provider/model choices are surfaced in the routing decision object

### 4. Provider abstraction should be thin and explicit

OpenAI guidance suggests keeping provider/transport setup straightforward and only introducing overrides when needed. This repo follows that:
- one shared OpenAI-compatible transport shape
- provider-specific classes for OpenAI and MiniMax
- model IDs and base URLs injected by config
- no provider-specific business logic mixed into the router

### 5. Ordered fallback is safer than implicit “try anything” behavior

OpenRouter’s fallback guidance highlights a useful operational pattern: ordered, explicit fallback lists and logging of the model that actually answered. This repo adapts that idea, but with stronger policy control:
- no automatic invisible fallback chain
- deterministic escalation target chosen by rules
- final decision object always states the actual selected tier and model ID

### 6. MiniMax supports OpenAI-compatible text APIs, which simplifies provider integration

MiniMax documentation shows:
- official text models such as `MiniMax-M2.7`, `MiniMax-M2.5`, `MiniMax-M2.1`, and their `-highspeed` variants
- an OpenAI-compatible API surface at `https://api.minimax.io/v1`

That makes MiniMax provider abstraction much cleaner here: the router can keep policy separate from transport details.

### 7. ClawHub findings

Researching ClawHub yielded two useful signals:
- `https://clawhub.ai/skills?q=model+routing` returned no matching public skills at the time of research
- `https://clawhub.ai/mrjootta/model-router-premium` exposed only a security-scan style summary, but it suggested a local JSON-configured heuristic router rather than a full routing + execution + verification stack

This repo therefore fills a gap: it is not just a selector script, but a full deterministic routing policy with verification and OpenClaw skill packaging.

## Architecture

```text
Task
  -> classifier (task class + domain signals + confidence)
  -> escalator (review / escalation recommendation)
  -> router (tier + provider + model selection)
  -> executor (primary generation)
  -> verifier (quality and safety checks)
  -> optional OpenAI review/escalation
  -> final response + audit trail
```

## Design choices

### Deterministic classifier

The classifier is intentionally rule-based.

Benefits:
- repeatable results
- easy debugging
- easy policy review
- simple tests

Trade-off:
- less adaptive than learned or semantic routers

That trade-off is acceptable here because the repo optimizes for auditable operational behavior.

### Separate task class from escalation policy

The task class says what kind of work the user asked for.
The escalation policy says whether confidence and risk require OpenAI review or reasoning.

This separation keeps policy legible.

### Final review as a first-class tier

A lot of routers only distinguish fast vs strong. That misses an operational reality: sometimes the best next step is not “think harder” but “review this as a final gate.”

That is why `openai_review` is separate from `openai_reasoning`.

### Verification is rule-based, not model-judged

Verifier checks include:
- requirement coverage
- internal consistency
- syntax plausibility
- ambiguity detection
- unresolved assumptions
- domain-specific quality
- production-safety review

These checks are conservative heuristics, not perfect semantic truth tests. The point is to catch obvious operational failure modes before a response is accepted.

## Default tier mapping

- `bounded_execution` -> `minimax_fast`
- `moderate_technical` -> `minimax_general`
- `reasoning_critical` -> `openai_reasoning`
- `final_review_required` -> `openai_review`

Then policy overrides apply:
- low confidence -> OpenAI escalation
- medium confidence + security-sensitive work -> OpenAI review
- medium confidence + production-relevant work -> OpenAI review
- research / Splunk / Velociraptor / coding-debugging with lower confidence -> reasoning-oriented OpenAI escalation

## Model defaults used here

### MiniMax defaults

Based on MiniMax docs and the OpenAI-compatible API documentation:
- `MiniMax-M2.1-highspeed` for `minimax_fast`
- `MiniMax-M2.5` for `minimax_general`

### OpenAI defaults

Based on OpenAI’s explicit-model-selection guidance:
- `gpt-5.4-mini` for `openai_general`
- `gpt-5.4` for `openai_reasoning`
- `gpt-5.4` for `openai_review`

These are defaults, not locked assumptions.

## Risks and limitations

1. Rule-based classification can underfit unusual prompts.
2. Verification checks are heuristic, not full formal validation.
3. MiniMax and OpenAI model catalogs change over time, so deployments should periodically review default model IDs.
4. The provider layer assumes OpenAI-compatible chat completions for both providers; if a provider changes its compatible surface, the adapter must be updated.

## Why this is still production-appropriate

Because the important operational properties are strong:
- explicit routing rules
- testable policy
- explicit escalation
- explicit review tier
- explicit provider/model IDs
- deterministic audit trail
