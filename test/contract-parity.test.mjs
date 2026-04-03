import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDescriptorIntegrity,
  assertMarkdownParity,
  loadErrorFixtures,
} from "../scripts/contract-lib.mjs";

test("tool descriptors stay bounded and canonical", () => {
  assert.doesNotThrow(() => assertDescriptorIntegrity());
});

test("markdown contract stays aligned with canonical files", () => {
  assert.doesNotThrow(() => assertMarkdownParity());
});

test("error fixtures are named after their expected error code", () => {
  for (const { file, value } of loadErrorFixtures()) {
    assert.equal(file, `${value.expected_code}.json`);
  }
});
