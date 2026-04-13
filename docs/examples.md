# Examples

## Example 1: documentation routed to a trusted skill

### Task

> Write a README and onboarding guide for this TypeScript project.

### Expected route

- domain: `documentation`
- execution mode: `specialized_skill`
- selected skill: `codebase-documenter`
- review required: `false`

## Example 2: bounded general transform

### Task

> Rename the output key and convert the payload to JSON.

### Expected route

- task class: `bounded_execution`
- execution mode: `minimax_direct`
- tier: `minimax_fast`

## Example 3: coding fix with review

### Task

> Fix the TypeScript router bug and add a regression test.

### Expected route

- domain: `engineering`
- execution mode: `minimax_then_openai_review`
- primary tier: `minimax_general`
- review tier: `openai_review`

## Example 4: research-heavy reasoning

### Task

> Research model-routing trade-offs for cost, latency, and quality. Compare static and dynamic routing and recommend a policy.

### Expected route

- task class: `reasoning_critical`
- execution mode: `openai_direct`
- tier: `openai_reasoning`

## Example 5: Splunk dashboard planning

### Task

> Audit this production Splunk dashboard deployment plan and improve the panel strategy before release.

### Expected route

- domain: `dfir_splunk`
- execution mode: `specialized_skill_then_openai_review`
- selected skill: `dfir-dashboard-designer`
- review tier: `openai_review`
- post-skill verification required: `true`
