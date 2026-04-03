import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type {
  ApproveScopeAndStartReconInput,
  DraftScopeInput,
  GetResultsAndExportBundleInput,
  StartDomainVerificationInput,
  VerifyDomainControlInput,
} from "./contracts.js";
import { getToolDescriptor } from "./descriptors.js";
import { FixtureBackedStore } from "./store.js";
import { SchemaRegistry } from "./validators.js";

export interface ToolContext {
  store: FixtureBackedStore;
  validators: SchemaRegistry;
}

function toolText(toolName: string, message: string): CallToolResult["content"] {
  return [{ type: "text", text: `${toolName}: ${message}` }];
}

function validateInput<T>(validators: SchemaRegistry, toolName: string, input: unknown): T {
  const descriptor = getToolDescriptor(toolName);
  return validators.validate<T>(descriptor.inputSchemaPath, input);
}

function validateOutput<T>(validators: SchemaRegistry, toolName: string, output: unknown): T {
  const descriptor = getToolDescriptor(toolName);
  return validators.validate<T>(descriptor.outputSchemaPath, output);
}

export async function handleStartDomainVerification(context: ToolContext, input: unknown): Promise<CallToolResult> {
  const args = validateInput<StartDomainVerificationInput>(context.validators, "witnessops.start_domain_verification", input);
  const output = context.store.createDomainVerification(args);
  validateOutput(context.validators, "witnessops.start_domain_verification", output);
  return {
    structuredContent: output,
    content: toolText("witnessops.start_domain_verification", `Verification instructions created for ${output.claim.domain}.`),
  };
}

export async function handleVerifyDomainControl(context: ToolContext, input: unknown): Promise<CallToolResult> {
  const args = validateInput<VerifyDomainControlInput>(context.validators, "witnessops.verify_domain_control", input);
  const output = context.store.verifyDomainControl(args.claim_id, args.expected_domain);
  validateOutput(context.validators, "witnessops.verify_domain_control", output);
  return {
    structuredContent: output,
    content: toolText("witnessops.verify_domain_control", `${output.claim.domain} is now verified.`),
  };
}

export async function handleDraftScope(context: ToolContext, input: unknown): Promise<CallToolResult> {
  const args = validateInput<DraftScopeInput>(context.validators, "witnessops.draft_scope", input);
  const output = context.store.draftScope(args);
  validateOutput(context.validators, "witnessops.draft_scope", output);
  return {
    structuredContent: output,
    content: toolText("witnessops.draft_scope", `Passive-only scope draft created for ${output.scope_draft.seed_domain}.`),
  };
}

export async function handleApproveScopeAndStartRecon(context: ToolContext, input: unknown): Promise<CallToolResult> {
  const args = validateInput<ApproveScopeAndStartReconInput>(context.validators, "witnessops.approve_scope_and_start_recon", input);
  const output = context.store.approveScopeAndStartRecon(args);
  validateOutput(context.validators, "witnessops.approve_scope_and_start_recon", output);
  return {
    structuredContent: output,
    content: toolText("witnessops.approve_scope_and_start_recon", `Governed recon run ${output.run.run_id} started in ${output.run.status} state.`),
  };
}

export async function handleGetResultsAndExportBundle(context: ToolContext, input: unknown): Promise<CallToolResult> {
  const args = validateInput<GetResultsAndExportBundleInput>(context.validators, "witnessops.get_results_and_export_bundle", input);
  const output = context.store.getResults(args);
  validateOutput(context.validators, "witnessops.get_results_and_export_bundle", output);
  return {
    structuredContent: output,
    content: toolText("witnessops.get_results_and_export_bundle", `Run ${output.run_id} is ${output.status}.`),
  };
}
