import assert from "node:assert/strict";
import test from "node:test";

import { mapBackendStatusToPublicResult, mapBackendTriggerToReconRun } from "../src/lib/adapter.js";
import type { ScopeDraft } from "../src/lib/contracts.js";

const scope: ScopeDraft = {
  scope_id: "sc_ADAPTER01",
  claim_id: "dc_ADAPTER01",
  seed_domain: "example.com",
  scope_mode: "passive_only",
  methods: ["dns_resolution"],
  exclusions: [],
  time_window: {
    start: "2026-04-03T12:00:00Z",
    end: "2026-04-04T12:00:00Z",
  },
  jurisdiction: "IE",
  status: "draft",
};

test("adapter trigger mapping preserves the public ReconRun shape", () => {
  const run = mapBackendTriggerToReconRun(scope, {
    run_id: "rr_ADAPTER01",
    status: "pending",
  });

  assert.equal(run.run_id, "rr_ADAPTER01");
  assert.equal(run.scope_id, scope.scope_id);
  assert.equal(run.status, "queued");
  assert.equal(run.delivery.summary_ready, false);
  assert.equal(run.delivery.vpb_ready, false);
});

test("adapter status mapping returns public-only fields", () => {
  const run = mapBackendTriggerToReconRun(scope, {
    run_id: "rr_ADAPTER02",
    status: "completed",
  });

  const mapped = mapBackendStatusToPublicResult({
    run,
    seedDomain: scope.seed_domain,
    response: {
      run_id: run.run_id,
      status: "completed",
      domain: "example.com",
      findings_summary: [
        {
          severity: "medium",
          title: "Server banner is exposed",
          category: "banner",
          asset: "app.example.com",
          asset_type: "hostname",
          source_type: "service_banner_observation",
          confidence: "high",
        },
      ],
      completed_at: "2026-04-03T12:30:00Z",
    },
    includeBundle: false,
    includeReceiptSummary: false,
  });

  assert.deepEqual(Object.keys(mapped).sort(), ["bundle", "receipt_summary", "run_id", "status", "summary"]);
  assert.equal(mapped.run_id, run.run_id);
  assert.equal(mapped.status, "completed");
  assert.ok(mapped.summary);
  assert.equal(mapped.bundle, null);
  assert.deepEqual(mapped.receipt_summary, []);
});
