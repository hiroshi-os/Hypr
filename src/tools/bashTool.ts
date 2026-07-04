import { z } from "zod";
import * as React from "react";
import { createTool } from "./index.ts";

export const executeBashTool = createTool({
  name: "execute_bash",
  description: "Execute a command in the system terminal/bash shell and return stdout and stderr.",
  schema: z.object({
    command: z.string().describe("The exact shell command line string to run")
  }),
  isReadOnly: false, // can be destructive depending on the command (permissions middleware evaluates this)
  isConcurrencySafe: false,
  execute: async (args) => {
    try {
      // Standardize execution shell depending on platform
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "powershell.exe" : "bash";
      const shellArgs = isWindows ? ["-Command", args.command] : ["-c", args.command];

      const proc = Bun.spawn({
        cmd: [shell, ...shellArgs],
        stdout: "pipe",
        stderr: "pipe"
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const output = [
        stdout ? stdout : "",
        stderr ? `[STDERR]\n${stderr}` : ""
      ].filter(Boolean).join("\n");

      return {
        isError: exitCode !== 0,
        content: `Exit Code: ${exitCode}\n${output}`
      };
    } catch (e: any) {
      return {
        isError: true,
        content: `Error executing command: ${e.message}`
      };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `💻 Executing: ${args.command}`);
  }
});
