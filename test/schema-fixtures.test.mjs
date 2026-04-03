import test from "node:test";

import {
  loadJson,
  objectFixtureMatrix,
  toolFixtureMatrix,
  validateAgainstSchema,
} from "../scripts/contract-lib.mjs";

for (const [schemaPath, fixturePath] of objectFixtureMatrix()) {
  test(`${fixturePath} validates against ${schemaPath}`, () => {
    validateAgainstSchema(schemaPath, loadJson(fixturePath));
  });
}

for (const [schemaPath, fixturePath] of toolFixtureMatrix()) {
  test(`${fixturePath} validates against ${schemaPath}`, () => {
    validateAgainstSchema(schemaPath, loadJson(fixturePath));
  });
}
