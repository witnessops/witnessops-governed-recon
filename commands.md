# commands.md

## Install

```bash
npm install
```

## Run Tests

```bash
npm test
```

## Run Contract Checks

```bash
npm run contract:check
```

## Start The MCP Server

```bash
npm --workspace mcp run dev
```

## Build The MCP Server

```bash
npm --workspace mcp run build
```

## Full Health

```bash
npm test && npm run contract:check && npm --workspace mcp run build
```

This command is the repo health gate. It must prove:

- schemas validate
- descriptors remain canonical and consistent
- markdown parity passes
- state-machine and failure-path tests pass
- the MCP server builds cleanly
