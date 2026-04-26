# AGENTS.md

## Scope

This file is the canonical agent contract for `witnessops-governed-recon`.

## Non-Negotiable Rules

- `schemas/` is canonical for public contract shapes.
- `tools/` is canonical for public tool descriptors.
- `docs/MCP_CONTRACT_WITNESSOPS_GOVERNED_RECON.md` is explanatory only.
- No widget or `web/` scaffold exists in v1.
- Passive-only scope must fail closed.
- If a field is not defined in `schemas/objects/` or `schemas/tools/`, it must not appear in public tool output.
- Do not leak backend-native fields such as `assessmentRunId`, `/assess`, internal queue IDs, internal status enums, or internal finding buckets.
- The in-memory store is demo/test state only. Do not describe it as durable trust state or a reference backend.
- `public-surfaces` and `governed-exposure` may inform integration but never override the public contract owned here.

## Codex Security review

Use [`docs/CODEX_SECURITY_THREAT_MODEL.md`](./docs/CODEX_SECURITY_THREAT_MODEL.md) as the seed context for Codex Security review.

Codex Security may identify findings and propose patches, but it does not authorize merge, release, live scanner execution, active scanning, credentialed scanning, proof packaging, signing, or public verification claims.

For security-sensitive changes, preserve these boundaries:

- Public schemas and tool descriptors are the authority; runtime implementation must not widen them.
- Passive-only scope must fail closed.
- Governed command templates must remain `record_only` unless a separate live-execution authority lane exists.
- Command plans must require approved targets before any command is represented as allowed.
- Active scan templates must require active-scan approval.
- Lockout-relevant templates must require lockout-policy review.
- Do not add production secrets, customer data, signing keys, cloud credentials, private evidence bundles, or real production targets to tests, examples, prompts, or fixtures.

## Filename Conventions

- Object schemas: `<ObjectName>.schema.json`
- Tool schemas: `<tool_name>.input.schema.json`
- Tool schemas: `<tool_name>.output.schema.json`
- Tool descriptors: `<tool_name>.tool.json`

## Validation Commands

- install: `npm install`
- test: `npm test`
- contract check: `npm run contract:check`
- server build: `npm --workspace mcp run build`
- full health: `npm test && npm run contract:check && npm --workspace mcp run build`

## Implementation Rules

- Keep public schemas and tool descriptors boring and explicit.
- Do not add extra tools beyond the frozen five-tool surface.
- Do not weaken output validation to make runtime shortcuts pass.
- Do not add adapter-dependent behavior to the canonical contract.
- Prefer explicit blockers and fail-closed behavior over silent fallback.
