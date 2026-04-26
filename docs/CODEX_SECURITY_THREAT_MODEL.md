# Codex Security Threat Model — witnessops-governed-recon

Status: `repo_prep_seed_for_codex_security`

This document is a repository-specific seed for Codex Security review and GitHub PR review. It is not a vulnerability report, not a scan result, and not authorization to run recon tooling against any target.

## Scope

This repository owns the public v1 contract for WitnessOps Governed Recon:

- canonical public object schemas in `schemas/objects/`
- canonical public tool input/output schemas in `schemas/tools/`
- canonical public tool descriptors in `tools/`
- explanatory contract documentation in `docs/`
- the stub MCP server in `mcp/`
- fixtures and tests that prove the contract stays bounded
- governed command-template and command-plan contracts for record-only command planning

## Out of scope

This repository does not own:

- backend runtime authority
- durable trust state
- a production reference backend
- customer evidence custody
- live scanner execution
- credential use
- proof-engine packaging
- signing implementation
- verifier implementation
- website copy
- private client evidence

Do not infer that a passing Codex Security review verifies any out-of-scope system.

## Authority order

For this repo, treat authority in this order:

1. `schemas/`
2. `tools/`
3. `docs/MCP_CONTRACT_WITNESSOPS_GOVERNED_RECON.md`
4. runtime implementation in `mcp/`
5. fixtures and tests

Schemas and tool descriptors are canonical. Runtime implementation and docs must not widen the contract.

## Authority boundaries

- `main` in `witnessops/witnessops-governed-recon` is the code authority for this public contract repo.
- The full health command is `npm test && npm run contract:check && npm --workspace mcp run build`.
- Codex Security may identify findings and suggest patches.
- Codex Security findings do not authorize merge, release, production recon, active scanning, credentialed scanning, proof packaging, signing, or public verification claims.
- Human maintainer review remains required for changes that affect schemas, tool descriptors, fail-closed behavior, command templates, command-plan semantics, security posture, or public contract language.

## Primary review surfaces

Treat the following as first-class review surfaces:

1. `schemas/objects/`
   - public nouns and contract shapes
   - `additionalProperties` behavior
   - enum and const boundaries
   - command-template and command-plan semantics

2. `schemas/tools/`
   - public tool inputs and outputs
   - passive-only and fail-closed requirements
   - absence of backend-native fields

3. `tools/`
   - public MCP tool descriptors
   - descriptor/schema consistency
   - no undeclared tool surface

4. `mcp/`
   - stub MCP server behavior
   - input validation before output
   - public output shape enforcement
   - no durable trust-state claims

5. `fixtures/` and `test/`
   - golden-path fixtures
   - failure fixtures
   - record-only command-plan tests
   - negative tests that prove drift fails closed

6. `.github/workflows/validate.yml`
   - deterministic validation only
   - no secrets or external target contact
   - no live scanner execution

## Untrusted inputs

Review all handling of:

- MCP tool inputs
- schema-bound object fields
- recon target identifiers
- command-plan targets
- template IDs
- output paths declared in command plans
- proof/run IDs supplied as strings
- fixture values that look like customer evidence, credentials, private IPs, or live production targets
- public tool output fields that may be consumed by downstream systems

## Security invariants

The following must remain true unless an explicit design change is reviewed and approved:

- Passive-only scope must fail closed.
- The public tool surface must not add tools beyond the frozen v1 set without schema, descriptor, test, and maintainer approval.
- If a field is not defined in `schemas/objects/` or `schemas/tools/`, it must not appear in public tool output.
- Backend-native fields such as `assessmentRunId`, `/assess`, internal queue IDs, internal status enums, and internal finding buckets must not leak through the public contract.
- The in-memory store is demo/test state only; it must not be described as durable trust state or a reference backend.
- `public-surfaces` and `governed-exposure` may inform integration, but must not override the public contract owned here.
- Governed command templates must remain record-only unless a separate live-execution authority lane exists.
- Command plans must require approved targets before any command is represented as allowed.
- Active scan templates must require active-scan approval.
- Lockout-relevant templates must require lockout-policy review.
- No fixture, example, prompt, or test should contain real credentials, customer data, private client evidence, signing keys, tokens, or production target data.

## High-priority finding classes

Treat the following as P1 for review purposes:

- schema or runtime behavior that permits undeclared public output fields
- passive-only bypass or silent fallback into active behavior
- command template drift from `record_only` toward live execution
- target approval bypass in governed command plans
- lockout-policy bypass for authentication-adjacent or SMB-style commands
- accidental credential, token, private evidence, or customer-data fixture exposure
- MCP handler behavior that accepts invalid input but returns public success output
- mismatch between tool descriptors and schema-enforced input/output contracts
- runtime implementation that becomes more authoritative than `schemas/` and `tools/`
- public contract language that implies production backend, durable trust state, proof signing, or live scanner authority

## Lower-priority but relevant finding classes

Review but do not automatically treat as P1 without demonstrated impact:

- generic dependency advisories not reachable through this contract surface
- cosmetic docs edits that do not change authority, scope, or public contract claims
- missing web-app security headers, since this repo does not own a web scaffold in v1
- volumetric denial-of-service without a specific parser or contract-amplification path

## Review instructions for Codex

When reviewing this repository:

- prefer small, surgical findings over broad refactors
- name the affected schema, descriptor, fixture, test, MCP handler, or workflow
- include a concrete exploit path, bypass path, or contract-drift path where possible
- do not propose live scanner execution as a test
- do not use production credentials, signing keys, customer evidence, or cloud credentials as fixtures
- do not weaken schemas or negative tests to make runtime shortcuts pass
- do not add tools outside the frozen v1 public surface without a separate design lane
- keep public schemas and tool descriptors boring, explicit, and fail-closed
- preserve the full health command as the validation baseline

## Suggested Codex Security scan configuration

Initial scan seed:

- repository: `witnessops/witnessops-governed-recon`
- branch: `main`
- history window: `180 days`
- environment family: `Node / npm / MCP`
- setup command: `npm ci`
- validation command for proposed patches: `npm test && npm run contract:check && npm --workspace mcp run build`
- agent secrets: none
- production credentials: prohibited
- customer data fixtures: prohibited
- live scanner execution: prohibited
- external target contact: prohibited

## Closure condition for this prep artifact

This prep artifact is sufficient when:

- Codex Security scan context can be seeded from this file.
- `AGENTS.md` points reviewers to this file.
- A private-reporting `SECURITY.md` exists for the repo.
- No runtime code, schema semantics, tool descriptors, workflow behavior, secrets, production settings, or live recon behavior were changed by this prep pass.
