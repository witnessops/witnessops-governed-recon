# Security Policy

We take security issues in this repository seriously. This document describes what is in scope, how to report a suspected vulnerability, and what to expect from us in return.

## Scope

This repository contains the public v1 contract for WitnessOps Governed Recon:

- public object schemas under `schemas/objects/`
- public tool input/output schemas under `schemas/tools/`
- public tool descriptors under `tools/`
- explanatory contract documentation under `docs/`
- fixtures and tests
- a stub MCP server under `mcp/`

This repository does **not** contain a production reference backend, durable trust state, customer evidence custody, live scanner execution authority, proof signing, verifier implementation, or production credentials.

Reports against systems outside this repository are out of scope here and should be directed to the appropriate project or vendor.

## Supported surface

Only the current `main` branch of this repository is supported and receives security fixes. Older branches, tags, and historical releases are not patched.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through one of the following channels:

- **Preferred:** GitHub Private Vulnerability Reporting —
  <https://github.com/witnessops/witnessops-governed-recon/security/advisories/new>
- **Alternative:** email <security@witnessops.com>

When reporting, please include:

- a description of the issue and its potential impact
- steps to reproduce, or a proof of concept
- the affected schema, tool descriptor, fixture, test, MCP handler, or workflow if known
- any relevant commit SHA or environment details

> **Do not use public GitHub issues, discussions, or pull requests to report suspected vulnerabilities.** Public reports can put users at risk before a fix is available.

## Acknowledgment window

We will acknowledge receipt of your report within **5 business days**. That acknowledgment confirms the report reached us; a full triage and impact assessment will follow.

## Disclosure handling

We prefer coordinated disclosure:

- We will work with you to validate the issue, assess impact, and prepare a fix.
- We ask for a reasonable embargo period while a fix is being prepared and rolled out. The exact length depends on severity and complexity, and we will agree it with you.
- Once a fix is available, we will publish an advisory describing the issue and its resolution.
- Reporters will be credited in the advisory unless they ask to remain anonymous.

## Examples of in-scope issues

The following are examples of issues that may be security-relevant in this repository:

- schema or runtime behavior that permits undeclared public output fields
- passive-only bypass or silent fallback into active behavior
- command template drift from `record_only` toward live execution
- target approval bypass in governed command plans
- lockout-policy bypass for authentication-adjacent or SMB-style commands
- accidental credential, token, private evidence, or customer-data fixture exposure
- MCP handler behavior that accepts invalid input but returns public success output
- mismatch between tool descriptors and schema-enforced input/output contracts

## Generally out of scope

The following are generally not considered reportable vulnerabilities for this repository unless a concrete security impact is demonstrated:

- missing generic web-app security headers, because this repo does not own a web scaffold in v1
- social-engineering attacks targeting maintainers or operators
- denial-of-service via volumetric traffic flooding
- third-party dependency advisories already tracked by an automated advisory feed
- issues requiring live scanning of third-party targets without authorization

If you believe one of the above has a concrete, demonstrable security impact in this repository, please still report it through the private channels above and explain the impact.
