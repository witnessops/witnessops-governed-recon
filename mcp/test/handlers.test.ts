import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  handleApproveScopeAndStartRecon,
  handleDraftScope,
  handleGetResultsAndExportBundle,
  handleStartDomainVerification,
  handleVerifyDomainControl,
  type ToolContext,
} from "../src/lib/handlers.js";
import { fixturesRoot } from "../src/lib/paths.js";
import { FixtureBackedStore } from "../src/lib/store.js";
import { SchemaRegistry } from "../src/lib/validators.js";

function createContext(): ToolContext {
  return {
    store: FixtureBackedStore.create(),
    validators: new SchemaRegistry(),
  };
}

function readJsonFixture<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(fixturesRoot, ...parts), "utf8")) as T;
}

async function assertRejectsCode(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof Error && error.message.includes(code),
  );
}

test("start_domain_verification returns schema-valid structured content", async () => {
  const context = createContext();
  const input = readJsonFixture("tools", "start_domain_verification.request.json");
  const result = await handleStartDomainVerification(context, input);
  assert.equal(result.isError, undefined);
  assert.ok(result.structuredContent);
});

test("verify -> draft -> approve -> complete -> fetch results works end to end", async () => {
  const context = createContext();

  const verified = await handleVerifyDomainControl(context, {
    claim_id: "dc_9K1X3P7Q",
    expected_domain: "example.com",
  });
  assert.equal((verified.structuredContent as { verified: boolean }).verified, true);

  const drafted = await handleDraftScope(context, {
    claim_id: "dc_9K1X3P7Q",
    seed_domain: "example.com",
    methods: ["dns_resolution", "certificate_observation"],
    exclusions: [],
    time_window: {
      start: "2026-04-03T12:00:00Z",
      end: "2026-04-04T12:00:00Z",
    },
    jurisdiction: "IE",
  });

  const scopeId = (drafted.structuredContent as { scope_draft: { scope_id: string } }).scope_draft.scope_id;

  const approved = await handleApproveScopeAndStartRecon(context, {
    scope_id: scopeId,
    approval: {
      confirmed: true,
      approver_email: "ciso@example.com",
    },
    idempotency_key: "idem-handler-test-0001",
  });

  const runId = (approved.structuredContent as { run: { run_id: string } }).run.run_id;

  const completeSummary = readJsonFixture("objects", "exposure-summary.complete.json");
  const completeBundle = readJsonFixture("objects", "vpb-export.ready.json");
  const completeReceipts = readJsonFixture<{ receipt_summary: unknown[] }>("tools", "get_results_and_export_bundle.response.completed.json").receipt_summary;

  context.store.advanceRun(runId, {
    status: "completed",
    summary: {
      ...completeSummary,
      run_id: runId,
    },
    receiptSummary: completeReceipts as never,
    bundle: {
      ...completeBundle,
      run_id: runId,
    },
  });

  const results = await handleGetResultsAndExportBundle(context, {
    run_id: runId,
    include_bundle: true,
    include_receipt_summary: true,
  });

  const payload = results.structuredContent as {
    run_id: string;
    status: string;
    summary: object | null;
    bundle: object | null;
    receipt_summary: unknown[];
  };

  assert.equal(payload.run_id, runId);
  assert.equal(payload.status, "completed");
  assert.ok(payload.summary);
  assert.ok(payload.bundle);
  assert.ok(payload.receipt_summary.length > 0);
});

test("approve_scope_and_start_recon is idempotent on idempotency_key", async () => {
  const context = createContext();

  await handleVerifyDomainControl(context, {
    claim_id: "dc_9K1X3P7Q",
    expected_domain: "example.com",
  });

  const drafted = await handleDraftScope(context, {
    claim_id: "dc_9K1X3P7Q",
    seed_domain: "example.com",
    methods: ["dns_resolution"],
    exclusions: [],
    time_window: {
      start: "2026-04-03T12:00:00Z",
      end: "2026-04-04T12:00:00Z",
    },
    jurisdiction: "IE",
  });

  const scopeId = (drafted.structuredContent as { scope_draft: { scope_id: string } }).scope_draft.scope_id;
  const input = {
    scope_id: scopeId,
    approval: {
      confirmed: true,
      approver_email: "ciso@example.com",
    },
    idempotency_key: "idem-same-run-0001",
  };

  const first = await handleApproveScopeAndStartRecon(context, input);
  const second = await handleApproveScopeAndStartRecon(context, input);

  assert.equal(
    (first.structuredContent as { run: { run_id: string } }).run.run_id,
    (second.structuredContent as { run: { run_id: string } }).run.run_id,
  );
});

test("negative fixtures fail closed with the expected public error code", async () => {
  const fixtures = [
    "E_DOMAIN_VERIFICATION_PENDING.json",
    "E_DOMAIN_VERIFICATION_FAILED.json",
    "E_SCOPE_INVALID.json",
    "E_SCOPE_NOT_VERIFIED.json",
    "E_APPROVAL_REQUIRED.json",
    "E_RECON_START_FAILED.json",
    "E_RECON_NOT_COMPLETE.json",
    "E_EXPORT_NOT_READY.json",
  ] as const;

  for (const file of fixtures) {
    const context = createContext();
    const scenario = readJsonFixture<{ tool: string; input: unknown; expected_code: string }>("errors", file);
    switch (scenario.tool) {
      case "witnessops.verify_domain_control":
        await assertRejectsCode(handleVerifyDomainControl(context, scenario.input), scenario.expected_code);
        break;
      case "witnessops.draft_scope":
        await assertRejectsCode(handleDraftScope(context, scenario.input), scenario.expected_code);
        break;
      case "witnessops.approve_scope_and_start_recon":
        await assertRejectsCode(handleApproveScopeAndStartRecon(context, scenario.input), scenario.expected_code);
        break;
      case "witnessops.get_results_and_export_bundle":
        await assertRejectsCode(handleGetResultsAndExportBundle(context, scenario.input), scenario.expected_code);
        break;
      default:
        throw new Error(`Unhandled fixture tool ${scenario.tool}`);
    }
  }
});
