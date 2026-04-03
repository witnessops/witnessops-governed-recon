import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ApproveScopeAndStartReconInput,
  DomainClaim,
  ExposureSummary,
  ReceiptDescriptor,
  ReconRun,
  ScopeDraft,
  StartDomainVerificationInput,
  StartDomainVerificationOutput,
  VPBExport,
} from "./contracts.js";
import { fixturesRoot } from "./paths.js";

type ClaimVerificationState = "pending" | "satisfiable" | "verified" | "failed";

interface ClaimRecord {
  claim: DomainClaim;
  verificationState: ClaimVerificationState;
}

interface ScopeRecord {
  scope: ScopeDraft;
  approvalDenied?: boolean;
  startFailure?: boolean;
}

interface RunRecord {
  run: ReconRun;
  seedDomain: string;
  summary: ExposureSummary | null;
  receiptSummary: ReceiptDescriptor[];
  bundle: VPBExport | null;
}

export class FixtureBackedStore {
  private readonly claims = new Map<string, ClaimRecord>();

  private readonly scopes = new Map<string, ScopeRecord>();

  private readonly runs = new Map<string, RunRecord>();

  private readonly idempotency = new Map<string, string>();

  private claimCounter = 0;

  private scopeCounter = 0;

  private runCounter = 0;

  private receiptCounter = 0;

  static create(): FixtureBackedStore {
    const store = new FixtureBackedStore();
    store.seed();
    return store;
  }

  private readFixture<T>(...parts: string[]): T {
    return JSON.parse(readFileSync(join(fixturesRoot, ...parts), "utf8")) as T;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }

  private nextToken(counterName: "claimCounter" | "scopeCounter" | "runCounter" | "receiptCounter"): string {
    this[counterName] += 1;
    return this[counterName].toString(36).toUpperCase().padStart(8, "0");
  }

  private seed(): void {
    const pendingClaim = this.readFixture<DomainClaim>("objects", "domain-claim.pending.json");
    const verifiedClaim = this.readFixture<DomainClaim>("objects", "domain-claim.verified.json");
    const scopeDraft = this.readFixture<ScopeDraft>("objects", "scope-draft.passive-only.json");
    const queuedRun = this.readFixture<ReconRun>("objects", "recon-run.queued.json");
    const completedRun = this.readFixture<ReconRun>("objects", "recon-run.completed.json");
    const completedSummary = this.readFixture<ExposureSummary>("objects", "exposure-summary.complete.json");
    const readyExport = this.readFixture<VPBExport>("objects", "vpb-export.ready.json");
    const completedResponse = this.readFixture<{ receipt_summary: ReceiptDescriptor[] }>(
      "tools",
      "get_results_and_export_bundle.response.completed.json",
    );
    const exportNotReadyResponse = this.readFixture<{
      run_id: string;
      summary: ExposureSummary;
      receipt_summary: ReceiptDescriptor[];
    }>("tools", "get_results_and_export_bundle.response.export-not-ready.json");

    this.claims.set(pendingClaim.claim_id, {
      claim: this.clone(pendingClaim),
      verificationState: "satisfiable",
    });

    this.claims.set("dc_PENDINGWAIT1", {
      claim: {
        ...this.clone(pendingClaim),
        claim_id: "dc_PENDINGWAIT1",
        domain: "pending.example.com",
        requestor: {
          ...pendingClaim.requestor,
          business_email: "security@pending.example.com",
        },
      },
      verificationState: "pending",
    });

    this.claims.set("dc_FAILEDWAIT1", {
      claim: {
        ...this.clone(verifiedClaim),
        claim_id: "dc_FAILEDWAIT1",
        domain: "failed.example.com",
        requestor: {
          ...verifiedClaim.requestor,
          business_email: "security@failed.example.com",
        },
        status: "failed",
      },
      verificationState: "failed",
    });

    this.claims.set("dc_SCOPEPENDING1", {
      claim: {
        ...this.clone(pendingClaim),
        claim_id: "dc_SCOPEPENDING1",
      },
      verificationState: "pending",
    });

    this.claims.set("dc_SCOPEVALID1", {
      claim: {
        ...this.clone(verifiedClaim),
        claim_id: "dc_SCOPEVALID1",
        requestor: {
          ...verifiedClaim.requestor,
          business_email: "security+scope@example.com",
        },
      },
      verificationState: "verified",
    });

    this.scopes.set("sc_APPROVALREQ1", {
      scope: {
        ...this.clone(scopeDraft),
        scope_id: "sc_APPROVALREQ1",
        claim_id: "dc_SCOPEVALID1",
      },
      approvalDenied: true,
    });

    this.scopes.set("sc_STARTFAIL1", {
      scope: {
        ...this.clone(scopeDraft),
        scope_id: "sc_STARTFAIL1",
        claim_id: "dc_SCOPEVALID1",
      },
      startFailure: true,
    });

    this.runs.set(queuedRun.run_id, {
      run: this.clone(queuedRun),
      seedDomain: "example.com",
      summary: null,
      receiptSummary: [],
      bundle: null,
    });

    this.runs.set(completedRun.run_id, {
      run: this.clone(completedRun),
      seedDomain: completedSummary.seed_domain,
      summary: this.clone(completedSummary),
      receiptSummary: this.clone(completedResponse.receipt_summary),
      bundle: this.clone(readyExport),
    });

    this.runs.set(exportNotReadyResponse.run_id, {
      run: {
        run_id: exportNotReadyResponse.run_id,
        scope_id: "sc_EXPORTWAIT1",
        status: "completed",
        started_at: "2026-04-03T12:20:00Z",
        completed_at: "2026-04-03T12:32:00Z",
        delivery: {
          summary_ready: true,
          vpb_ready: false,
        },
      },
      seedDomain: exportNotReadyResponse.summary.seed_domain,
      summary: this.clone(exportNotReadyResponse.summary),
      receiptSummary: this.clone(exportNotReadyResponse.receipt_summary),
      bundle: null,
    });
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private now(): string {
    return new Date().toISOString();
  }

  private future(hours: number): string {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  private makeReceipt(receiptClass: ReceiptDescriptor["receipt_class"], status: ReceiptDescriptor["status"], createdAt = this.now()): ReceiptDescriptor {
    const token = this.nextToken("receiptCounter");
    const receiptId = `rcpt_${receiptClass}_${token.toLowerCase()}`;
    return {
      receipt_class: receiptClass,
      receipt_id: receiptId,
      status,
      created_at: createdAt,
      hash: this.hash(`${receiptClass}:${receiptId}:${createdAt}`),
      uri: `https://example.com/receipts/${receiptId}`,
    };
  }

  private nextClaimId(): string {
    return `dc_${this.nextToken("claimCounter")}`;
  }

  private nextScopeId(): string {
    return `sc_${this.nextToken("scopeCounter")}`;
  }

  private nextRunId(): string {
    return `rr_${this.nextToken("runCounter")}`;
  }

  createDomainVerification(input: StartDomainVerificationInput): StartDomainVerificationOutput {
    const createdAt = this.now();
    const claim: DomainClaim = {
      claim_id: this.nextClaimId(),
      domain: input.domain,
      requestor: {
        business_email: input.business_email,
        display_name: input.display_name ?? null,
        organization: input.organization ?? null,
      },
      verification_method: input.verification_method ?? "dns_txt",
      status: "pending",
      created_at: createdAt,
      expires_at: this.future(48),
    };

    this.claims.set(claim.claim_id, {
      claim: this.clone(claim),
      verificationState: "pending",
    });

    const instructions = claim.verification_method === "dns_txt"
      ? {
          method: "dns_txt" as const,
          record_name: `_witnessops-challenge.${claim.domain}`,
          value: `wo-${claim.claim_id.toLowerCase()}`,
          ttl_seconds: 300,
        }
      : {
          method: "email_link" as const,
          value: `mailto:${claim.requestor.business_email}?subject=${claim.claim_id}`,
        };

    return {
      claim,
      instructions,
      receipts: [this.makeReceipt("domain_control_claim", "recorded", createdAt)],
    };
  }

  verifyDomainControl(claimId: string, expectedDomain?: string): {
    claim: DomainClaim;
    verified: boolean;
    receipts: ReceiptDescriptor[];
  } {
    const record = this.claims.get(claimId);
    if (!record) {
      throw new Error(`Unknown claim id: ${claimId}`);
    }

    if (expectedDomain && expectedDomain !== record.claim.domain) {
      throw new Error("E_DOMAIN_VERIFICATION_FAILED: expected_domain did not match the claim domain.");
    }

    if (record.verificationState === "pending") {
      throw new Error("E_DOMAIN_VERIFICATION_PENDING: verification challenge has not been satisfied yet.");
    }

    if (record.verificationState === "failed") {
      throw new Error("E_DOMAIN_VERIFICATION_FAILED: verification challenge failed.");
    }

    record.verificationState = "verified";
    record.claim.status = "verified";

    return {
      claim: this.clone(record.claim),
      verified: true,
      receipts: [this.makeReceipt("domain_control_verified", "recorded")],
    };
  }

  draftScope(input: {
    claim_id: string;
    seed_domain: string;
    methods: ScopeDraft["methods"];
    exclusions: ScopeDraft["exclusions"];
    time_window: ScopeDraft["time_window"];
    jurisdiction: string;
  }): {
    scope_draft: ScopeDraft;
    receipts: ReceiptDescriptor[];
  } {
    const claim = this.claims.get(input.claim_id);
    if (!claim) {
      throw new Error(`Unknown claim id: ${input.claim_id}`);
    }

    if (claim.claim.status !== "verified") {
      throw new Error("E_SCOPE_NOT_VERIFIED: claim must be verified before drafting scope.");
    }

    if (input.seed_domain !== claim.claim.domain) {
      throw new Error("E_SCOPE_INVALID: seed_domain must match the verified claim domain.");
    }

    if (new Date(input.time_window.start).getTime() >= new Date(input.time_window.end).getTime()) {
      throw new Error("E_SCOPE_INVALID: time_window.start must be earlier than time_window.end.");
    }

    const scope: ScopeDraft = {
      scope_id: this.nextScopeId(),
      claim_id: input.claim_id,
      seed_domain: input.seed_domain,
      scope_mode: "passive_only",
      methods: this.clone(input.methods),
      exclusions: this.clone(input.exclusions),
      time_window: this.clone(input.time_window),
      jurisdiction: input.jurisdiction,
      status: "draft",
    };

    this.scopes.set(scope.scope_id, { scope: this.clone(scope) });

    return {
      scope_draft: scope,
      receipts: [this.makeReceipt("scope_draft", "recorded")],
    };
  }

  approveScopeAndStartRecon(input: ApproveScopeAndStartReconInput): {
    run: ReconRun;
    receipts: ReceiptDescriptor[];
  } {
    const scopeRecord = this.scopes.get(input.scope_id);
    if (!scopeRecord) {
      throw new Error(`Unknown scope id: ${input.scope_id}`);
    }

    if (scopeRecord.approvalDenied) {
      throw new Error("E_APPROVAL_REQUIRED: the scope is not in an approvable state.");
    }

    if (scopeRecord.startFailure) {
      throw new Error("E_RECON_START_FAILED: recon runner failed before the run could start.");
    }

    if (input.idempotency_key) {
      const existingRunId = this.idempotency.get(input.idempotency_key);
      if (existingRunId) {
        const existing = this.runs.get(existingRunId);
        if (!existing) {
          throw new Error(`Broken idempotency mapping for ${input.idempotency_key}`);
        }
        return {
          run: this.clone(existing.run),
          receipts: [
            this.makeReceipt("scope_authorized", "recorded"),
            this.makeReceipt("offsec_recon_snapshot", "recorded"),
          ],
        };
      }
    }

    scopeRecord.scope.status = "authorized";
    const run: ReconRun = {
      run_id: this.nextRunId(),
      scope_id: scopeRecord.scope.scope_id,
      status: "queued",
      started_at: null,
      completed_at: null,
      delivery: {
        summary_ready: false,
        vpb_ready: false,
      },
    };

    this.runs.set(run.run_id, {
      run: this.clone(run),
      seedDomain: scopeRecord.scope.seed_domain,
      summary: null,
      receiptSummary: [],
      bundle: null,
    });

    if (input.idempotency_key) {
      this.idempotency.set(input.idempotency_key, run.run_id);
    }

    return {
      run,
      receipts: [
        this.makeReceipt("scope_authorized", "recorded"),
        this.makeReceipt("offsec_recon_snapshot", "recorded"),
      ],
    };
  }

  getResults(input: {
    run_id: string;
    include_bundle?: boolean;
    include_receipt_summary?: boolean;
  }): {
    run_id: string;
    status: ReconRun["status"];
    summary: ExposureSummary | null;
    receipt_summary: ReceiptDescriptor[];
    bundle: VPBExport | null;
  } {
    const record = this.runs.get(input.run_id);
    if (!record) {
      throw new Error(`Unknown run id: ${input.run_id}`);
    }

    if (record.run.status !== "completed") {
      if (input.include_bundle || input.include_receipt_summary) {
        throw new Error("E_RECON_NOT_COMPLETE: completed-run material is not available yet.");
      }
      return {
        run_id: record.run.run_id,
        status: record.run.status,
        summary: null,
        receipt_summary: [],
        bundle: null,
      };
    }

    if (input.include_bundle && !record.bundle) {
      throw new Error("E_EXPORT_NOT_READY: VPB export metadata is not ready yet.");
    }

    return {
      run_id: record.run.run_id,
      status: record.run.status,
      summary: this.clone(record.summary),
      receipt_summary: input.include_receipt_summary ? this.clone(record.receiptSummary) : [],
      bundle: input.include_bundle ? this.clone(record.bundle) : null,
    };
  }

  getRun(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  advanceRun(runId: string, next: {
    status: ReconRun["status"];
    summary?: ExposureSummary | null;
    receiptSummary?: ReceiptDescriptor[];
    bundle?: VPBExport | null;
  }): void {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`Unknown run id: ${runId}`);
    }
    record.run.status = next.status;
    record.run.started_at ??= this.now();
    if (next.status === "completed" || next.status === "failed" || next.status === "aborted") {
      record.run.completed_at = this.now();
    }
    if (next.summary !== undefined) {
      record.summary = this.clone(next.summary);
      record.run.delivery.summary_ready = next.summary !== null;
    }
    if (next.receiptSummary !== undefined) {
      record.receiptSummary = this.clone(next.receiptSummary);
    }
    if (next.bundle !== undefined) {
      record.bundle = this.clone(next.bundle);
      record.run.delivery.vpb_ready = next.bundle !== null;
    }
  }
}
