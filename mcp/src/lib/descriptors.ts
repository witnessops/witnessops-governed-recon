import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { toolsRoot } from "./paths.js";

export interface ToolDescriptor {
  name: string;
  title: string;
  description: string;
  inputSchemaPath: string;
  outputSchemaPath: string;
  annotations: {
    readOnlyHint: boolean;
  };
  stateChanging: boolean;
  confirmationRequired: boolean;
}

let cachedDescriptors: ToolDescriptor[] | null = null;

export function loadToolDescriptors(): ToolDescriptor[] {
  if (cachedDescriptors) {
    return cachedDescriptors;
  }

  const descriptors = readdirSync(toolsRoot)
    .filter((file) => file.endsWith(".tool.json"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(toolsRoot, file), "utf8")) as ToolDescriptor);

  cachedDescriptors = descriptors;
  return descriptors;
}

export function getToolDescriptor(name: string): ToolDescriptor {
  const descriptor = loadToolDescriptors().find((item) => item.name === name);
  if (!descriptor) {
    throw new Error(`Unknown tool descriptor: ${name}`);
  }
  return descriptor;
}
