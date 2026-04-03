import { z } from "zod";

export const receiptClassValues = [
  "domain_control_claim",
  "domain_control_verified",
  "scope_draft",
  "scope_authorized",
  "offsec_recon_snapshot",
  "offsec_execution_outcome",
  "evidence_manifest",
  "vpb_export_ready",
] as const;

export const passiveMethodValues = [
  "dns_resolution",
  "certificate_observation",
  "subdomain_discovery",
  "http_fingerprint",
  "email_posture",
  "service_banner_observation",
] as const;

export const reconStatusValues = [
  "queued",
  "running",
  "completed",
  "failed",
  "aborted",
] as const;

export const isoDateTime = () => z.string().datetime({ offset: true });
const domain = () => z.string().regex(/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/);
const claimId = () => z.string().regex(/^dc_[A-Za-z0-9]+$/);
const scopeId = () => z.string().regex(/^sc_[A-Za-z0-9]+$/);
const runId = () => z.string().regex(/^rr_[A-Za-z0-9]+$/);
const exportId = () => z.string().regex(/^vpb_[A-Za-z0-9]+$/);
const findingId = () => z.string().regex(/^f_[A-Za-z0-9]+$/);
const evidenceId = () => z.string().regex(/^ev_[A-Za-z0-9]+$/);
const hex64 = () => z.string().regex(/^[A-Fa-f0-9]{64}$/);

export const receiptDescriptorShape = {
  receipt_class: z.enum(receiptClassValues),
  receipt_id: z.string().min(1),
  status: z.enum(["recorded", "ready", "failed", "blocked"]),
  created_at: isoDateTime(),
  hash: hex64().optional(),
  uri: z.string().url().optional(),
} satisfies z.ZodRawShape;

export const receiptDescriptorSchema = z.object(receiptDescriptorShape);

export const domainClaimShape = {
  claim_id: claimId(),
  domain: domain(),
  requestor: z.object({
    business_email: z.string().email(),
    display_name: z.string().min(1).max(120).nullable(),
    organization: z.string().min(1).max(200).nullable(),
  }),
  verification_method: z.enum(["dns_txt", "email_link"]),
  status: z.enum(["pending", "verified", "failed", "expired"]),
  created_at: isoDateTime(),
  expires_at: isoDateTime(),
} satisfies z.ZodRawShape;

export const domainClaimSchema = z.object(domainClaimShape);

export const scopeDraftShape = {
  scope_id: scopeId(),
  claim_id: claimId(),
  seed_domain: domain(),
  scope_mode: z.literal("passive_only"),
  methods: z.array(z.enum(passiveMethodValues)).min(1),
  exclusions: z.array(z.string().min(1).max(253)),
  time_window: z.object({
    start: isoDateTime(),
    end: isoDateTime(),
  }),
  jurisdiction: z.string().min(2).max(32),
  status: z.enum(["draft", "authorized", "approval_denied"]),
} satisfies z.ZodRawShape;

export const scopeDraftSchema = z.object(scopeDraftShape);

export const reconRunShape = {
  run_id: runId(),
  scope_id: scopeId(),
  status: z.enum(reconStatusValues),
  started_at: isoDateTime().nullable(),
  completed_at: isoDateTime().nullable(),
  delivery: z.object({
    summary_ready: z.boolean(),
    vpb_ready: z.boolean(),
  }),
} satisfies z.ZodRawShape;

export const reconRunSchema = z.object(reconRunShape);

export const findingShape = {
  finding_id: findingId(),
  title: z.string().min(1).max(240),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z.enum(["high", "medium", "low", "inconclusive"]),
  source_type: z.enum(passiveMethodValues),
  evidence_ref: evidenceId(),
} satisfies z.ZodRawShape;

export const exposureSummaryShape = {
  run_id: runId(),
  seed_domain: domain(),
  generated_at: isoDateTime(),
  assets: z.array(
    z.object({
      asset: z.string().min(1).max(253),
      asset_type: z.enum(["hostname", "domain", "ip_address", "url", "service"]),
      findings: z.array(z.object(findingShape)),
    }),
  ),
} satisfies z.ZodRawShape;

export const exposureSummarySchema = z.object(exposureSummaryShape);

export const vpbExportShape = {
  export_id: exportId(),
  run_id: runId(),
  status: z.enum(["ready", "generating", "failed"]),
  bundle_format: z.literal("vaultmesh-proof-bundle/v1"),
  download_url: z.string().url(),
  sha256: hex64(),
  generated_at: isoDateTime(),
} satisfies z.ZodRawShape;

export const vpbExportSchema = z.object(vpbExportShape);

export const toolInputShapes = {
  "witnessops.start_domain_verification": {
    domain: domain(),
    business_email: z.string().email(),
    display_name: z.string().min(1).max(120).optional(),
    organization: z.string().min(1).max(200).optional(),
    verification_method: z.enum(["dns_txt", "email_link"]).optional(),
  },
  "witnessops.verify_domain_control": {
    claim_id: claimId(),
    expected_domain: domain().optional(),
  },
  "witnessops.draft_scope": {
    claim_id: claimId(),
    seed_domain: domain(),
    methods: z.array(z.enum(passiveMethodValues)).min(1),
    exclusions: z.array(z.string()),
    time_window: z.object({
      start: isoDateTime(),
      end: isoDateTime(),
    }),
    jurisdiction: z.string().min(2).max(32),
  },
  "witnessops.approve_scope_and_start_recon": {
    scope_id: scopeId(),
    approval: z.object({
      confirmed: z.literal(true),
      approver_email: z.string().email(),
      approver_name: z.string().min(1).max(120).optional(),
      approval_note: z.string().max(1000).optional(),
    }),
    idempotency_key: z.string().min(8).max(120).optional(),
  },
  "witnessops.get_results_and_export_bundle": {
    run_id: runId(),
    include_bundle: z.boolean().optional(),
    include_receipt_summary: z.boolean().optional(),
  },
} satisfies Record<string, z.ZodRawShape>;

export const toolOutputShapes = {
  "witnessops.start_domain_verification": {
    claim: domainClaimSchema,
    instructions: z.object({
      method: z.enum(["dns_txt", "email_link"]),
      record_name: z.string().min(1).optional(),
      value: z.string().min(1),
      ttl_seconds: z.number().int().min(1).optional(),
    }),
    receipts: z.array(receiptDescriptorSchema),
  },
  "witnessops.verify_domain_control": {
    claim: domainClaimSchema,
    verified: z.boolean(),
    receipts: z.array(receiptDescriptorSchema),
  },
  "witnessops.draft_scope": {
    scope_draft: scopeDraftSchema,
    receipts: z.array(receiptDescriptorSchema),
  },
  "witnessops.approve_scope_and_start_recon": {
    run: reconRunSchema,
    receipts: z.array(receiptDescriptorSchema),
  },
  "witnessops.get_results_and_export_bundle": {
    run_id: runId(),
    status: z.enum(reconStatusValues),
    summary: exposureSummarySchema.nullable(),
    receipt_summary: z.array(receiptDescriptorSchema),
    bundle: vpbExportSchema.nullable(),
  },
} satisfies Record<string, z.ZodRawShape>;

export type ReceiptDescriptor = z.infer<typeof receiptDescriptorSchema>;
export type DomainClaim = z.infer<typeof domainClaimSchema>;
export type ScopeDraft = z.infer<typeof scopeDraftSchema>;
export type ReconRun = z.infer<typeof reconRunSchema>;
export type ExposureSummary = z.infer<typeof exposureSummarySchema>;
export type VPBExport = z.infer<typeof vpbExportSchema>;

export type StartDomainVerificationInput = z.infer<z.ZodObject<typeof toolInputShapes["witnessops.start_domain_verification"]>>;
export type StartDomainVerificationOutput = z.infer<z.ZodObject<typeof toolOutputShapes["witnessops.start_domain_verification"]>>;
export type VerifyDomainControlInput = z.infer<z.ZodObject<typeof toolInputShapes["witnessops.verify_domain_control"]>>;
export type VerifyDomainControlOutput = z.infer<z.ZodObject<typeof toolOutputShapes["witnessops.verify_domain_control"]>>;
export type DraftScopeInput = z.infer<z.ZodObject<typeof toolInputShapes["witnessops.draft_scope"]>>;
export type DraftScopeOutput = z.infer<z.ZodObject<typeof toolOutputShapes["witnessops.draft_scope"]>>;
export type ApproveScopeAndStartReconInput = z.infer<z.ZodObject<typeof toolInputShapes["witnessops.approve_scope_and_start_recon"]>>;
export type ApproveScopeAndStartReconOutput = z.infer<z.ZodObject<typeof toolOutputShapes["witnessops.approve_scope_and_start_recon"]>>;
export type GetResultsAndExportBundleInput = z.infer<z.ZodObject<typeof toolInputShapes["witnessops.get_results_and_export_bundle"]>>;
export type GetResultsAndExportBundleOutput = z.infer<z.ZodObject<typeof toolOutputShapes["witnessops.get_results_and_export_bundle"]>>;
