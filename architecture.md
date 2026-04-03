# architecture.md

## Purpose

`witnessops-governed-recon` is the public contract repo for WitnessOps Governed Recon v1.

It defines the public tool surface, public object model, public documentation surface, and a non-authoritative stub MCP server that proves the contract can run end to end.

## Authority Boundary

Canonical public authority lives in:

1. [`schemas/`](/Users/sovereign/github/witnessops-governed-recon/schemas)
2. [`tools/`](/Users/sovereign/github/witnessops-governed-recon/tools)

Everything else is derived:

- markdown docs
- MCP registrations
- fixtures
- adapter mappings
- tests

## Non-Goals

- production runtime authority
- durable trust-state storage
- widget or `web/` surface in v1
- raw ProofPack exposure
- backend field passthrough

## Runtime Shape

The v1 runtime is a Streamable HTTP MCP server in [`mcp/`](/Users/sovereign/github/witnessops-governed-recon/mcp).

It exists to prove the contract surface, not to claim backend authority. The runtime:

- loads canonical tool descriptors
- validates inputs and outputs against canonical JSON Schemas
- uses an in-memory fixture-backed store
- enforces passive-only scope and fail-closed transitions

## Adapter Boundary

An adapter seam may translate from current backend responses into public objects.

That seam is:

- optional
- non-authoritative
- contract-preserving
- forbidden from leaking backend-native fields

The public schemas do not change when the adapter is enabled.

## V1 Delivery Rules

- exactly five public tools
- passive-only scope
- surfaced receipt descriptors only
- status-first recon runs
- VPB export metadata only

## Contract Naming

- object schemas: `<ObjectName>.schema.json`
- tool schemas: `<tool_name>.input.schema.json`
- tool schemas: `<tool_name>.output.schema.json`
- tool descriptors: `<tool_name>.tool.json`
