import type {
  ExposureSummary,
  ReceiptDescriptor,
  ReconRun,
  ScopeDraft,
  VPBExport,
} from "./contracts.js";

export interface BackendTriggerResponse {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface BackendFindingSummary {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  category: string;
  asset?: string;
  asset_type?: "hostname" | "domain" | "ip_address" | "url" | "service";
  source_type?: ExposureSummary["assets"][number]["findings"][number]["source_type"];
  evidence_ref?: string;
  confidence?: ExposureSummary["assets"][number]["findings"][number]["confidence"];
}

export interface BackendStatusResponse {
  run_id: string;
  status: "pending" | "running" | "completed" | "failed";
  domain?: string;
  findings_summary?: BackendFindingSummary[];
  completed_at?: string;
}

export interface PublicResultEnvelope {
  run_id: string;
  status: ReconRun["status"];
  summary: ExposureSummary | null;
  receipt_summary: ReceiptDescriptor[];
  bundle: VPBExport | null;
}

export interface ReconAdapter {
  startApprovedScope(scope: ScopeDraft): Promise<ReconRun | null>;
  getRunResults(run: ReconRun, options: {
    includeBundle?: boolean;
    includeReceiptSummary?: boolean;
  }): Promise<PublicResultEnvelope | null>;
}

function mapStatus(status: BackendTriggerResponse["status"]): ReconRun["status"] {
  switch (status) {
    case "pending":
      return "queued";
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
  }
}

function makeFindingId(index: number): string {
  return `f_ADAPTER${index.toString().padStart(4, "0")}`;
}

function makeEvidenceId(index: number): string {
  return `ev_ADAPTER${index.toString().padStart(4, "0")}`;
}

export function mapBackendTriggerToReconRun(scope: ScopeDraft, response: BackendTriggerResponse): ReconRun {
  const mappedStatus = mapStatus(response.status);
  return {
    run_id: response.run_id,
    scope_id: scope.scope_id,
    status: mappedStatus,
    started_at: mappedStatus === "queued" ? null : new Date().toISOString(),
    completed_at: mappedStatus === "completed" ? new Date().toISOString() : null,
    delivery: {
      summary_ready: mappedStatus === "completed",
      vpb_ready: false,
    },
  };
}

export function mapBackendStatusToPublicResult(args: {
  run: ReconRun;
  seedDomain: string;
  response: BackendStatusResponse;
  includeBundle?: boolean;
  includeReceiptSummary?: boolean;
  bundle?: VPBExport | null;
  receiptSummary?: ReceiptDescriptor[];
}): PublicResultEnvelope {
  const status = mapStatus(args.response.status);
  const findings = (args.response.findings_summary ?? []).map((finding, index) => ({
    finding_id: makeFindingId(index + 1),
    title: finding.title,
    severity: finding.severity,
    confidence: finding.confidence ?? "medium",
    source_type: finding.source_type ?? "http_fingerprint",
    evidence_ref: finding.evidence_ref ?? makeEvidenceId(index + 1),
  }));

  const summary = status === "completed"
    ? {
        run_id: args.run.run_id,
        seed_domain: args.response.domain ?? args.seedDomain,
        generated_at: args.response.completed_at ?? new Date().toISOString(),
        assets: findings.length === 0
          ? []
          : [
              {
                asset: args.response.findings_summary?.[0]?.asset ?? `${args.seedDomain}`,
                asset_type: args.response.findings_summary?.[0]?.asset_type ?? "hostname",
                findings,
              },
            ],
      }
    : null;

  return {
    run_id: args.run.run_id,
    status,
    summary,
    receipt_summary: args.includeReceiptSummary ? (args.receiptSummary ?? []) : [],
    bundle: args.includeBundle ? (args.bundle ?? null) : null,
  };
}

export function createOptionalAdapter(): ReconAdapter | null {
  return null;
}
