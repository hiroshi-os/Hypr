import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as React from "react";
import { createTool } from "./index.ts";

export interface OutlineItem {
  type: "class" | "interface" | "method" | "function" | "struct" | "type";
  name: string;
  signature: string;
}

export function parseCodeOutline(content: string, filePath: string): OutlineItem[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split(/\r?\n/);
  const items: OutlineItem[] = [];

  // TypeScript / JavaScript
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Class matching
      const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        items.push({ type: "class", name: classMatch[1], signature: trimmed });
      }

      // Interface matching
      const interfaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        items.push({ type: "interface", name: interfaceMatch[1], signature: trimmed });
      }

      // Type matching
      const typeMatch = trimmed.match(/(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        items.push({ type: "type", name: typeMatch[1], signature: trimmed });
      }

      // Function matching
      const funcMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        items.push({ type: "function", name: funcMatch[1], signature: trimmed });
      }

      // Arrow function or export const / let function definitions
      const arrowMatch = trimmed.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:\(.*\)|async\s*\(.*\))\s*=>/);
      if (arrowMatch) {
        items.push({ type: "function", name: arrowMatch[1], signature: trimmed });
      }
    });
  }
  // Python
  else if (ext === ".py") {
    lines.forEach(line => {
      const trimmed = line.trim();
      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        items.push({ type: "class", name: classMatch[1], signature: trimmed });
      }
      const funcMatch = trimmed.match(/^def\s+(\w+)/);
      if (funcMatch) {
        items.push({ type: "function", name: funcMatch[1], signature: trimmed });
      }
    });
  }
  // Rust
  else if (ext === ".rs") {
    lines.forEach(line => {
      const trimmed = line.trim();
      const structMatch = trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/);
      if (structMatch) {
        items.push({ type: "struct", name: structMatch[1], signature: trimmed });
      }
      const enumMatch = trimmed.match(/^(?:pub\s+)?enum\s+(\w+)/);
      if (enumMatch) {
        items.push({ type: "struct", name: enumMatch[1], signature: trimmed });
      }
      const traitMatch = trimmed.match(/^(?:pub\s+)?trait\s+(\w+)/);
      if (traitMatch) {
        items.push({ type: "interface", name: traitMatch[1], signature: trimmed });
      }
      const fnMatch = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
      if (fnMatch) {
        items.push({ type: "function", name: fnMatch[1], signature: trimmed });
      }
    });
  }
  // Go
  else if (ext === ".go") {
    lines.forEach(line => {
      const trimmed = line.trim();
      const typeStructMatch = trimmed.match(/^type\s+(\w+)\s+struct/);
      if (typeStructMatch) {
        items.push({ type: "struct", name: typeStructMatch[1], signature: trimmed });
      }
      const typeInterfaceMatch = trimmed.match(/^type\s+(\w+)\s+interface/);
      if (typeInterfaceMatch) {
        items.push({ type: "interface", name: typeInterfaceMatch[1], signature: trimmed });
      }
      const funcMatch = trimmed.match(/^func\s+(\w+)/);
      if (funcMatch) {
        items.push({ type: "function", name: funcMatch[1], signature: trimmed });
      }
      const methodMatch = trimmed.match(/^func\s+\((?:\w+\s+\*?\w+)\)\s+(\w+)/);
      if (methodMatch) {
        items.push({ type: "method", name: methodMatch[1], signature: trimmed });
      }
    });
  }

  return items;
}

export const viewCodeOutlineTool = createTool({
  name: "view_code_outline",
  description: "Extract the symbols (classes, methods, functions, interfaces) from a target source file without raw implementations.",
  schema: z.object({
    path: z.string().describe("Path to the source code file")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    try {
      const filePath = path.resolve(args.path);
      if (!fs.existsSync(filePath)) {
        return { isError: true, content: `Error: File not found: ${args.path}` };
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const items = parseCodeOutline(content, filePath);

      if (items.length === 0) {
        return { isError: false, content: "(No classes, interfaces, or functions detected)" };
      }

      const formatted = items.map(item => `[${item.type.toUpperCase()}] ${item.name} -> ${item.signature}`).join("\n");
      return { isError: false, content: formatted };
    } catch (e: any) {
      return { isError: true, content: `Error parsing file outline: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `🔍 Parsing outline of ${args.path}...`);
  }
});
