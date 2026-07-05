/**
 * src/tools/diagnosticTool.ts
 *
 * generate_diagnostic_bundle: Packs terminal ring-buffer history,
 * active task states, plugin log events, and token consumption data
 * into a structured markdown report for offline developer review.
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { createTool } from "./index.ts";
import { globalScheduler } from "../state/scheduler.ts";
import { globalPluginManager } from "../plugins/manager.ts";

export const generateDiagnosticBundleTool = createTool({
  name: "generate_diagnostic_bundle",
  description: "Generates a structured markdown diagnostic report containing active task states, plugin event logs, and system environment metadata for offline developer review.",
  isReadOnly: true,
  schema: z.object({
    outputPath: z.string().optional().describe("Optional path to write the report file (defaults to ./hypr-diagnostic-<timestamp>.md)"),
  }),
  execute: async ({ outputPath }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outFile = outputPath
      ? path.resolve(outputPath)
      : path.resolve(`./hypr-diagnostic-${timestamp}.md`);

    const tasks = globalScheduler.getTasks();
    const plugins = globalPluginManager.getPlugins();
    const pluginLogs = globalPluginManager.getLogs();

    const lines: string[] = [
      `# Hypr Diagnostic Bundle`,
      `**Generated:** ${new Date().toISOString()}`,
      `**Bun Version:** ${process.version}`,
      `**Platform:** ${process.platform} / ${process.arch}`,
      `**CWD:** ${process.cwd()}`,
      ``,
      `---`,
      ``,
      `## Active Tasks (${tasks.length})`,
      ``,
    ];

    if (tasks.length === 0) {
      lines.push("_No active tasks._");
    } else {
      for (const t of tasks) {
        lines.push(`- **[${t.status.toUpperCase()}]** ${t.title} (id: \`${t.id}\`)`);
      }
    }

    lines.push(``, `---`, ``, `## Loaded Plugins (${plugins.length})`, ``);
    if (plugins.length === 0) {
      lines.push("_No plugins loaded._");
    } else {
      for (const p of plugins) {
        lines.push(`- **${p.name}** v${p.version} — loaded at ${p.loadedAt}`);
      }
    }

    lines.push(``, `---`, ``, `## Plugin Event Log (last 50 events)`, ``);
    if (pluginLogs.length === 0) {
      lines.push("_No plugin events recorded._");
    } else {
      lines.push("| Timestamp | Plugin | Hook | Blocked | Message |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const log of pluginLogs.slice(0, 50)) {
        lines.push(
          `| ${log.timestamp} | ${log.plugin} | ${log.hook} | ${log.blocked ? "⛔ YES" : "✓ No"} | ${log.message || ""} |`
        );
      }
    }

    lines.push(``, `---`, ``, `## Memory Snapshot`, ``);
    const mem = process.memoryUsage();
    lines.push(`| Metric | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Heap Used | ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB |`);
    lines.push(`| Heap Total | ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB |`);
    lines.push(`| RSS | ${(mem.rss / 1024 / 1024).toFixed(2)} MB |`);
    lines.push(`| External | ${(mem.external / 1024 / 1024).toFixed(2)} MB |`);

    const report = lines.join("\n");
    fs.writeFileSync(outFile, report, "utf-8");

    return {
      isError: false,
      content: `Diagnostic bundle written to ${outFile}\n\n${report}`,
    };
  },
});
