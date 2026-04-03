import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(currentDir, "../../../");
export const schemasRoot = resolve(repoRoot, "schemas");
export const toolsRoot = resolve(repoRoot, "tools");
export const fixturesRoot = resolve(repoRoot, "fixtures");
