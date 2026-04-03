import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import type { ValidateFunction } from "ajv";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

import { repoRoot, schemasRoot } from "./paths.js";

export class SchemaRegistry {
  private readonly ajv: any;

  private readonly schemas = new Map<string, unknown>();

  private readonly validators = new Map<string, ValidateFunction>();

  constructor() {
    const Ajv2020 = Ajv2020Import as unknown as new (options?: Record<string, unknown>) => any;
    const addFormats = addFormatsImport as unknown as (ajv: any) => void;

    this.ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(this.ajv);

    for (const filePath of this.listJsonFiles(schemasRoot)) {
      const schema = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
      const relPath = relative(repoRoot, filePath).replaceAll("\\", "/");
      this.schemas.set(relPath, schema);
      this.ajv.addSchema(schema);
    }
  }

  private listJsonFiles(dirPath: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.listJsonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  getSchema(pathFromRepoRoot: string): unknown {
    const schema = this.schemas.get(pathFromRepoRoot);
    if (!schema) {
      throw new Error(`Unknown schema path: ${pathFromRepoRoot}`);
    }
    return schema;
  }

  validate<T>(pathFromRepoRoot: string, value: unknown): T {
    let validator = this.validators.get(pathFromRepoRoot);
    if (!validator) {
      const schema = this.getSchema(pathFromRepoRoot) as { $id?: string };
      validator = schema.$id ? this.ajv.getSchema(schema.$id) : this.ajv.compile(schema);
      if (!validator) {
        throw new Error(`No validator resolved for ${pathFromRepoRoot}`);
      }
      this.validators.set(pathFromRepoRoot, validator);
    }

    if (!validator(value)) {
      const message = this.ajv.errorsText(validator.errors, { separator: "; " });
      throw new Error(`Schema validation failed for ${pathFromRepoRoot}: ${message}`);
    }

    return value as T;
  }
}
