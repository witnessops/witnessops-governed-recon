import assert from "node:assert/strict";
import test from "node:test";

import { loadJson, validateAgainstSchema } from "../scripts/contract-lib.mjs";

const templateFixturePaths = [
  "fixtures/objects/governed-command-template.amass-passive.json",
  "fixtures/objects/governed-command-template.feroxbuster-bounded.json",
  "fixtures/objects/governed-command-template.cme-shares.json",
];

function loadTemplates() {
  return new Map(
    templateFixturePaths.map((path) => {
      const template = loadJson(path);
      validateAgainstSchema("schemas/objects/GovernedCommandTemplate.schema.json", template);
      return [template.template_id, template];
    }),
  );
}

function validateGovernedCommandPlan(plan, templates = loadTemplates()) {
  validateAgainstSchema("schemas/objects/GovernedCommandPlan.schema.json", plan);

  for (const command of plan.commands) {
    const template = templates.get(command.template_id);
    assert.ok(template, `unknown command template: ${command.template_id}`);
    assert.equal(template.execution_mode, "record_only", `${command.template_id} must remain record_only`);
    assert.ok(plan.approved_targets.includes(command.target), `${command.command_id} target is not approved`);

    if (template.requires_active_scan_approval) {
      assert.equal(plan.active_scanning_allowed, true, `${command.command_id} requires active scan approval`);
    }

    if (template.requires_lockout_policy) {
      assert.equal(plan.lockout_policy_reviewed, true, `${command.command_id} requires lockout policy review`);
    }
  }

  assert.ok(plan.not_performed_statement_path, "not-performed statement is required");
}

test("governed command plan validates against record-only templates", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  assert.doesNotThrow(() => validateGovernedCommandPlan(plan));
});

test("governed command plan rejects unapproved targets", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  plan.commands[1].target = "https://unapproved.example.net";

  assert.throws(
    () => validateGovernedCommandPlan(plan),
    /target is not approved/,
  );
});

test("governed command plan rejects unknown templates", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  plan.commands[1].template_id = "unapproved_command_template";

  assert.throws(
    () => validateGovernedCommandPlan(plan),
    /unknown command template/,
  );
});

test("governed command plan rejects active commands without explicit approval", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  plan.active_scanning_allowed = false;

  assert.throws(
    () => validateGovernedCommandPlan(plan),
    /requires active scan approval/,
  );
});

test("governed command plan rejects SMB mapping without lockout review", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  plan.lockout_policy_reviewed = false;

  assert.throws(
    () => validateGovernedCommandPlan(plan),
    /requires lockout policy review/,
  );
});

test("governed command plan rejects non-record-only template registry drift", () => {
  const plan = loadJson("fixtures/objects/governed-command-plan.valid.json");
  const templates = loadTemplates();
  const template = { ...templates.get("feroxbuster_bounded_web_discovery"), execution_mode: "live" };
  templates.set("feroxbuster_bounded_web_discovery", template);

  assert.throws(
    () => validateGovernedCommandPlan(plan, templates),
    /must remain record_only/,
  );
});
