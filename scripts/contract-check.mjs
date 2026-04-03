import {
  assertDescriptorIntegrity,
  assertMarkdownParity,
  loadJson,
  loadErrorFixtures,
  objectFixtureMatrix,
  toolFixtureMatrix,
  validateAgainstSchema,
} from "./contract-lib.mjs";

for (const [schemaPath, fixturePath] of objectFixtureMatrix()) {
  validateAgainstSchema(schemaPath, loadJson(fixturePath));
}

for (const [schemaPath, fixturePath] of toolFixtureMatrix()) {
  validateAgainstSchema(schemaPath, loadJson(fixturePath));
}

assertDescriptorIntegrity();
assertMarkdownParity();

for (const { file, value } of loadErrorFixtures()) {
  if (file !== `${value.expected_code}.json`) {
    throw new Error(`Error fixture filename mismatch: ${file}`);
  }
}

console.log("contract:check passed");
