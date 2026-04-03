import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(currentDir, "..");
export const schemasRoot = join(repoRoot, "schemas");
export const toolsRoot = join(repoRoot, "tools");
export const fixturesRoot = join(repoRoot, "fixtures");
export const docsRoot = join(repoRoot, "docs");

export const receiptClasses = [
  "domain_control_claim",
  "domain_control_verified",
  "scope_draft",
  "scope_authorized",
  "offsec_recon_snapshot",
  "offsec_execution_outcome",
  "evidence_manifest",
  "vpb_export_ready",
];

export function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

function listJsonFiles(dirPath) {
  const results = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

export function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const filePath of listJsonFiles(schemasRoot)) {
    ajv.addSchema(JSON.parse(readFileSync(filePath, "utf8")));
  }
  return ajv;
}

export function validateAgainstSchema(schemaPath, value) {
  const ajv = buildAjv();
  const schema = loadJson(schemaPath);
  const validate = schema.$id ? ajv.getSchema(schema.$id) : ajv.compile(schema);
  if (!validate) {
    throw new Error(`No validator resolved for ${schemaPath}.`);
  }
  if (!validate(value)) {
    throw new Error(`Schema validation failed for ${schemaPath}: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
  }
}

export function loadToolDescriptors() {
  return readdirSync(toolsRoot)
    .filter((file) => file.endsWith(".tool.json"))
    .sort()
    .map((file) => loadJson(relative(repoRoot, join(toolsRoot, file)).replaceAll("\\", "/")));
}

export function objectFixtureMatrix() {
  return [
    ["schemas/objects/DomainClaim.schema.json", "fixtures/objects/domain-claim.pending.json"],
    ["schemas/objects/DomainClaim.schema.json", "fixtures/objects/domain-claim.verified.json"],
    ["schemas/objects/ScopeDraft.schema.json", "fixtures/objects/scope-draft.passive-only.json"],
    ["schemas/objects/ReconRun.schema.json", "fixtures/objects/recon-run.queued.json"],
    ["schemas/objects/ReconRun.schema.json", "fixtures/objects/recon-run.completed.json"],
    ["schemas/objects/ExposureSummary.schema.json", "fixtures/objects/exposure-summary.complete.json"],
    ["schemas/objects/VPBExport.schema.json", "fixtures/objects/vpb-export.ready.json"],
    ["schemas/objects/ReceiptDescriptor.schema.json", "fixtures/objects/receipt-descriptor.scope-authorized.json"],
  ];
}

export function toolFixtureMatrix() {
  return [
    ["schemas/tools/start_domain_verification.input.schema.json", "fixtures/tools/start_domain_verification.request.json"],
    ["schemas/tools/start_domain_verification.output.schema.json", "fixtures/tools/start_domain_verification.response.json"],
    ["schemas/tools/verify_domain_control.input.schema.json", "fixtures/tools/verify_domain_control.request.json"],
    ["schemas/tools/verify_domain_control.output.schema.json", "fixtures/tools/verify_domain_control.response.json"],
    ["schemas/tools/draft_scope.input.schema.json", "fixtures/tools/draft_scope.request.json"],
    ["schemas/tools/draft_scope.output.schema.json", "fixtures/tools/draft_scope.response.json"],
    ["schemas/tools/approve_scope_and_start_recon.input.schema.json", "fixtures/tools/approve_scope_and_start_recon.request.json"],
    ["schemas/tools/approve_scope_and_start_recon.output.schema.json", "fixtures/tools/approve_scope_and_start_recon.response.json"],
    ["schemas/tools/get_results_and_export_bundle.input.schema.json", "fixtures/tools/get_results_and_export_bundle.request.completed.json"],
    ["schemas/tools/get_results_and_export_bundle.output.schema.json", "fixtures/tools/get_results_and_export_bundle.response.completed.json"],
    ["schemas/tools/get_results_and_export_bundle.output.schema.json", "fixtures/tools/get_results_and_export_bundle.response.incomplete.json"],
    ["schemas/tools/get_results_and_export_bundle.output.schema.json", "fixtures/tools/get_results_and_export_bundle.response.export-not-ready.json"],
  ];
}

export function loadErrorFixtures() {
  return readdirSync(join(fixturesRoot, "errors"))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      value: loadJson(`fixtures/errors/${file}`),
    }));
}

export function assertDescriptorIntegrity() {
  const descriptorFiles = readdirSync(toolsRoot).filter((file) => file.endsWith(".tool.json")).sort();
  const descriptors = loadToolDescriptors();
  if (descriptors.length !== 5) {
    throw new Error(`Expected exactly five tool descriptors, found ${descriptors.length}.`);
  }

  const allowedReadOnly = new Set([
    "witnessops.start_domain_verification",
    "witnessops.get_results_and_export_bundle",
  ]);

  for (const [index, descriptor] of descriptors.entries()) {
    if (descriptorFiles[index] !== `${descriptor.name}.tool.json`) {
      throw new Error(`Descriptor filename drift for ${descriptor.name}.`);
    }
    if (!descriptor.inputSchemaPath.endsWith(".input.schema.json")) {
      throw new Error(`Input schema naming drift for ${descriptor.name}.`);
    }
    if (!descriptor.outputSchemaPath.endsWith(".output.schema.json")) {
      throw new Error(`Output schema naming drift for ${descriptor.name}.`);
    }
    if (!existsSync(join(repoRoot, descriptor.inputSchemaPath))) {
      throw new Error(`Missing input schema for ${descriptor.name}: ${descriptor.inputSchemaPath}`);
    }
    if (!existsSync(join(repoRoot, descriptor.outputSchemaPath))) {
      throw new Error(`Missing output schema for ${descriptor.name}: ${descriptor.outputSchemaPath}`);
    }

    const shouldBeReadOnly = allowedReadOnly.has(descriptor.name);
    if (descriptor.annotations.readOnlyHint !== shouldBeReadOnly) {
      throw new Error(`Descriptor readOnlyHint drift for ${descriptor.name}.`);
    }
  }
}

export function assertMarkdownParity() {
  const doc = readFileSync(join(docsRoot, "MCP_CONTRACT_WITNESSOPS_GOVERNED_RECON.md"), "utf8");
  const descriptors = loadToolDescriptors();

  for (const descriptor of descriptors) {
    if (!doc.includes(descriptor.name)) {
      throw new Error(`Contract doc is missing tool ${descriptor.name}.`);
    }
  }

  for (const fileName of [
    "DomainClaim.schema.json",
    "ScopeDraft.schema.json",
    "ReconRun.schema.json",
    "ExposureSummary.schema.json",
    "VPBExport.schema.json",
    "ReceiptDescriptor.schema.json",
  ]) {
    if (!doc.includes(fileName)) {
      throw new Error(`Contract doc is missing object schema reference ${fileName}.`);
    }
  }

  for (const receiptClass of receiptClasses) {
    if (!doc.includes(receiptClass)) {
      throw new Error(`Contract doc is missing receipt class ${receiptClass}.`);
    }
  }
}
