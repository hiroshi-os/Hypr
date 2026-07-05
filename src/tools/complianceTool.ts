/**
 * src/tools/complianceTool.ts
 *
 * scan_compliance_rules: Scans project directories for exposed secrets,
 * unencrypted credentials, or security vulnerabilities before the LLM
 * context pool is initialized.
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createTool } from "./index.ts";
import { scrubPayload } from "../privacy/scrubber.ts";

const RISKY_FILENAMES = new Set([
  ".env", ".env.local", ".env.production", ".env.development",
  "id_rsa", "id_ed25519", "credentials", "secrets.json",
  "service-account.json", "terraform.tfvars",
]);

const RISKY_EXTENSIONS = new Set([".pem", ".key", ".p12", ".pfx", ".cer"]);

interface Finding {
  file: string;
  severity: "high" | "medium" | "low";
  reason: string;
}

function scanDir(dirPath: string, maxDepth = 4, depth = 0): Finding[] {
  if (depth > maxDepth) return [];
  const findings: Finding[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".git")) continue;
    if (entry.name === "node_modules") continue;

    const fullPath = path.join(dirPath, entry.name);
    const ext = path.extname(entry.name).toLowerCase();

    if (RISKY_FILENAMES.has(entry.name)) {
      findings.push({ file: fullPath, severity: "high", reason: `Risky filename: ${entry.name}` });
    } else if (RISKY_EXTENSIONS.has(ext)) {
      findings.push({ file: fullPath, severity: "high", reason: `Risky extension: ${ext}` });
    }

    if (entry.isDirectory()) {
      findings.push(...scanDir(fullPath, maxDepth, depth + 1));
      continue;
    }

    // Scan file contents for secrets (files under 256KB only)
    if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size < 256 * 1024) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const report = scrubPayload(content);
          if (report.hits.length > 0) {
            findings.push({
              file: fullPath,
              severity: "high",
              reason: `Contains ${report.hits.map(h => `${h.count}x ${h.rule}`).join(", ")}`,
            });
          }
        }
      } catch {
        // Binary or unreadable file — skip
      }
    }
  }

  return findings;
}

export const scanComplianceTool = createTool({
  name: "scan_compliance_rules",
  description: "Scans a project directory for exposed secrets, private keys, unencrypted credentials, and known vulnerability patterns. Returns a structured finding report.",
  isReadOnly: true,
  schema: z.object({
    directory: z.string().describe("Absolute or relative path to the project directory to scan"),
    maxDepth: z.number().optional().describe("Maximum directory depth to scan (default: 4)"),
  }),
  execute: async ({ directory, maxDepth = 4 }) => {
    const resolved = path.resolve(directory);
    if (!fs.existsSync(resolved)) {
      return { isError: true, content: `Directory not found: ${resolved}` };
    }

    const findings = scanDir(resolved, maxDepth);
    if (findings.length === 0) {
      return { isError: false, content: `✓ No compliance issues found in ${resolved}` };
    }

    const high = findings.filter(f => f.severity === "high");
    const lines = [
      `Compliance scan of ${resolved}`,
      `Found ${findings.length} issue(s) — ${high.length} high severity\n`,
      ...findings.map(f => `[${f.severity.toUpperCase()}] ${f.file}\n  → ${f.reason}`),
    ];
    return { isError: false, content: lines.join("\n") };
  },
});
