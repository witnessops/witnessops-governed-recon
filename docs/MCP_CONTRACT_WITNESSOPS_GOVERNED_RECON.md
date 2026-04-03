# MCP Contract: WitnessOps Governed Recon

## Product Definition

WitnessOps Governed Recon is a passive-only public MCP/app surface for bounded reconnaissance that is proof-backed, reviewable, and deliberately narrow.

This document explains the v1 contract. It does not override the canonical files in:

- [`schemas/`](/Users/sovereign/github/witnessops-governed-recon/schemas)
- [`tools/`](/Users/sovereign/github/witnessops-governed-recon/tools)

## Tool List

The v1 public surface exposes exactly five tools:

| Tool | Purpose | `readOnlyHint` | Confirmation |
| --- | --- | --- | --- |
| `witnessops.start_domain_verification` | Start proof-of-control for a domain. | `true` | no |
| `witnessops.verify_domain_control` | Validate challenge proof and bind it to the claim. | `false` | yes |
| `witnessops.draft_scope` | Create a passive-only recon scope draft. | `false` | yes |
| `witnessops.approve_scope_and_start_recon` | Record explicit approval and start governed recon. | `false` | yes, required |
| `witnessops.get_results_and_export_bundle` | Fetch exposure status, summary, and VPB export metadata. | `true` | no |

## Object Model

Canonical object schemas:

- [`DomainClaim.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/DomainClaim.schema.json)
- [`ScopeDraft.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/ScopeDraft.schema.json)
- [`ReconRun.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/ReconRun.schema.json)
- [`ExposureSummary.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/ExposureSummary.schema.json)
- [`VPBExport.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/VPBExport.schema.json)
- [`ReceiptDescriptor.schema.json`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects/ReceiptDescriptor.schema.json)

Frozen v1 rules:

- `ScopeDraft.scope_mode` is always `passive_only`.
- `ReconRun.status` is status-first and does not imply bundle readiness.
- `VPBExport` is metadata-only. It never embeds raw bundle bytes.
- `ExposureSummary` reports observed exposure posture, not exploit confirmation.
- Only the surfaced receipt classes listed below may appear in public responses.

## Surfaced Receipt Classes

Allowed surfaced receipt classes:

- `domain_control_claim`
- `domain_control_verified`
- `scope_draft`
- `scope_authorized`
- `offsec_recon_snapshot`
- `offsec_execution_outcome`
- `evidence_manifest`
- `vpb_export_ready`

Not surfaced in v1:

- raw ProofPack
- internal operator traces
- internal queue or job metadata
- raw backend execution envelopes

## State Machine

Primary path:

```text
unverified
  -> domain_verification_pending
  -> domain_verified
  -> scope_drafted
  -> scope_authorized
  -> recon_queued
  -> recon_running
  -> recon_completed
  -> vpb_ready
```

Failure branches:

```text
domain_verification_pending -> verification_failed
scope_drafted -> approval_denied
recon_running -> recon_failed
recon_running -> recon_aborted
```

## Error Model

Public error categories:

- `E_DOMAIN_VERIFICATION_PENDING`
- `E_DOMAIN_VERIFICATION_FAILED`
- `E_SCOPE_INVALID`
- `E_SCOPE_NOT_VERIFIED`
- `E_APPROVAL_REQUIRED`
- `E_RECON_START_FAILED`
- `E_RECON_NOT_COMPLETE`
- `E_EXPORT_NOT_READY`

`get_results_and_export_bundle` is status-first:

- `summary` may be `null` before a run completes.
- `bundle` is `null` until the VPB export is ready.
- `E_RECON_NOT_COMPLETE` is reserved for requests that require completed-run material that does not exist yet.
- `E_EXPORT_NOT_READY` is reserved for completed runs whose VPB export metadata is still unavailable.

## Trust-Language Rules

- Domain verification proves challenge control only.
- Business email supports plausibility only, not blanket authority.
- Scope approval is the authorization event.
- Passive recon is not exploit confirmation.
- Receipts prove recorded state, not total absence of unobserved risk.

## UI Mapping

Suggested UI mapping for later clients:

- Scope tab:
  - `witnessops.start_domain_verification`
  - `witnessops.verify_domain_control`
  - `witnessops.draft_scope`
  - `witnessops.approve_scope_and_start_recon`
- Exposure tab:
  - `witnessops.get_results_and_export_bundle`
- Proof tab:
  - `witnessops.get_results_and_export_bundle`

## Explicit Non-Goals

- active scan methods
- exploit validation
- continuous monitoring claims
- freeform target expansion outside verified seed-domain scope
- raw ProofPack export by default
- widget or `web/` scaffold in v1
- backend-native field passthrough
