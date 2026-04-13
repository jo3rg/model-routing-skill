# Examples

## Example 1: bounded execution

### Task

> Rename the output key and convert the payload to JSON.

### Expected route

- task class: `bounded_execution`
- tier: `minimax_fast`
- review required: `false`

## Example 2: moderate technical coding task

### Task

> Fix the TypeScript bug in the router and add a regression test.

### Expected route

- task class: `moderate_technical`
- tier: `minimax_general`
- if verification flags ambiguity or missing test coverage, escalate to `openai_review`

## Example 3: reasoning-critical research

### Task

> Research model-routing trade-offs for cost, latency, and quality. Compare static and dynamic routing and recommend a policy.

### Expected route

- task class: `reasoning_critical`
- tier: `openai_reasoning`
- review required: depends on confidence and production relevance

## Example 4: explicit production review

### Task

> Audit this production Splunk dashboard deployment plan and provide final sign-off guidance.

### Expected route

- task class: `final_review_required`
- tier: `openai_review`
- review required: `true`

## Example 5: Velociraptor task with low confidence

### Task

> Write a Velociraptor artifact for scheduled task persistence detection, but I only have rough notes.

### Expected route

- initial class: usually `moderate_technical` or `reasoning_critical`
- because confidence is likely not high and the domain is specialized, prefer OpenAI escalation
- verification must check for VQL/artifact structure

## Example 6: research + code + production risk

### Task

> Investigate why the model router misclassified production tasks, patch it, and propose a safer release policy.

### Expected route

- task class: `reasoning_critical`
- tier: `openai_reasoning`
- review required: likely `true`
- verification focus: requirement coverage, unresolved assumptions, production-safety review
