# witnessops-governed-recon

`witnessops-governed-recon` is the authoritative v1 public contract repo for WitnessOps Governed Recon.

## What This Repo Owns

- canonical public contract shapes in [`schemas/objects/`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects)
- canonical public tool descriptors in [`tools/`](/Users/sovereign/github/witnessops-governed-recon/tools)
- explanatory contract documentation in [`docs/`](/Users/sovereign/github/witnessops-governed-recon/docs)
- a stub MCP server in [`mcp/`](/Users/sovereign/github/witnessops-governed-recon/mcp)
- golden-path and failure fixtures in [`fixtures/`](/Users/sovereign/github/witnessops-governed-recon/fixtures)
- parity and state-machine tests

## What This Repo Does Not Own

- backend runtime authority
- durable trust state
- a production reference backend
- a widget or `web/` scaffold in v1
- canonical authority for `public-surfaces` or `governed-exposure`

`public-surfaces` and `governed-exposure` may inform implementation or integration. They are not public contract authority for this repo.

## Authority Order

1. [`schemas/`](/Users/sovereign/github/witnessops-governed-recon/schemas)
2. [`tools/`](/Users/sovereign/github/witnessops-governed-recon/tools)
3. [`docs/MCP_CONTRACT_WITNESSOPS_GOVERNED_RECON.md`](/Users/sovereign/github/witnessops-governed-recon/docs/MCP_CONTRACT_WITNESSOPS_GOVERNED_RECON.md)
4. runtime implementation in [`mcp/`](/Users/sovereign/github/witnessops-governed-recon/mcp)
5. fixtures and tests

`schemas/` and `tools/` are canonical. Everything else is derived from them.

## V1 Boundaries

- passive-only recon surface
- fail-closed method enforcement
- no backend-native field leakage in public tool output
- no raw ProofPack exposure
- no widget surface
- optional adapter seam only after the stub surface is green

## Layout

- [`schemas/objects/`](/Users/sovereign/github/witnessops-governed-recon/schemas/objects): canonical public nouns
- [`schemas/tools/`](/Users/sovereign/github/witnessops-governed-recon/schemas/tools): canonical tool input/output schemas
- [`tools/`](/Users/sovereign/github/witnessops-governed-recon/tools): canonical public tool descriptors
- [`fixtures/`](/Users/sovereign/github/witnessops-governed-recon/fixtures): object, tool, and error fixtures
- [`docs/`](/Users/sovereign/github/witnessops-governed-recon/docs): explanatory contract docs
- [`mcp/`](/Users/sovereign/github/witnessops-governed-recon/mcp): TypeScript Streamable HTTP MCP server

## Health Command

```bash
npm test && npm run contract:check && npm --workspace mcp run build
```
