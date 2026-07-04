import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as React from "react";
import { createTool } from "./index.ts";

export const applyMultiDiffTool = createTool({
  name: "apply_multi_diff",
  description: "Apply atomic search-and-replace line edits across multiple files in a single transaction. If validation fails, all changes are rolled back.",
  schema: z.object({
    edits: z.array(z.object({
      path: z.string().describe("Path of the file to edit"),
      search: z.string().describe("Content block to search for"),
      replace: z.string().describe("Content block to replace it with")
    })).min(1).describe("List of search-and-replace actions to execute atomically")
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  execute: async (args) => {
    const backupFiles: { originalPath: string; backupPath: string; content: string }[] = [];
    
    try {
      // 1. Pre-flight verification: Check if all files exist and search blocks are present/unique
      for (const edit of args.edits) {
        const fullPath = path.resolve(edit.path);
        if (!fs.existsSync(fullPath)) {
          return { isError: true, content: `Transaction aborted: File not found: ${edit.path}` };
        }
        
        const originalContent = fs.readFileSync(fullPath, "utf-8");
        if (!originalContent.includes(edit.search)) {
          return { isError: true, content: `Transaction aborted: Search block not found in file: ${edit.path}` };
        }

        const count = originalContent.split(edit.search).length - 1;
        if (count > 1) {
          return { isError: true, content: `Transaction aborted: Search block is not unique in file: ${edit.path} (found ${count} occurrences)` };
        }
      }

      // 2. Perform backups
      for (const edit of args.edits) {
        const fullPath = path.resolve(edit.path);
        const originalContent = fs.readFileSync(fullPath, "utf-8");
        const backupPath = `${fullPath}.bak`;
        fs.writeFileSync(backupPath, originalContent, "utf-8");
        backupFiles.push({
          originalPath: fullPath,
          backupPath,
          content: originalContent
        });
      }

      // 3. Apply changes
      for (const edit of args.edits) {
        const fullPath = path.resolve(edit.path);
        const originalContent = fs.readFileSync(fullPath, "utf-8");
        const updatedContent = originalContent.replace(edit.search, edit.replace);
        fs.writeFileSync(fullPath, updatedContent, "utf-8");
      }

      // 4. Run validation loop (compile or tests check)
      // Check if bun build/test command works
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "powershell.exe" : "bash";
      const validateCmdArgs = isWindows ? ["-Command", "bun test"] : ["-c", "bun test"];

      const proc = Bun.spawn({
        cmd: [shell, ...validateCmdArgs],
        stdout: "pipe",
        stderr: "pipe"
      });

      const exitCode = await proc.exited;

      if (exitCode !== 0) {
        const errText = await new Response(proc.stderr).text();
        const outText = await new Response(proc.stdout).text();
        
        // Validation failed, trigger Rollback
        for (const backup of backupFiles) {
          fs.writeFileSync(backup.originalPath, backup.content, "utf-8");
        }
        
        return {
          isError: true,
          content: `Validation failed (Exit code: ${exitCode}). All changes have been rolled back.\nErrors:\n${errText || outText}`
        };
      }

      // 5. Cleanup backups on success
      for (const backup of backupFiles) {
        if (fs.existsSync(backup.backupPath)) {
          fs.unlinkSync(backup.backupPath);
        }
      }

      return {
        isError: false,
        content: `Successfully applied modifications across ${args.edits.length} files.`
      };

    } catch (e: any) {
      // General error fallback: Rollback
      for (const backup of backupFiles) {
        if (fs.existsSync(backup.originalPath)) {
          fs.writeFileSync(backup.originalPath, backup.content, "utf-8");
        }
      }
      return {
        isError: true,
        content: `Critical error during transaction: ${e.message}. Rolled back all changes.`
      };
    } finally {
      // Ensure all backups are deleted
      for (const backup of backupFiles) {
        if (fs.existsSync(backup.backupPath)) {
          try {
            fs.unlinkSync(backup.backupPath);
          } catch (_) {}
        }
      }
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `🔄 Applying multi-file edits across ${args.edits.length} files atomically...`);
  }
});
