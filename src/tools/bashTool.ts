import { z } from "zod";
import * as React from "react";
import { createTool } from "./index.ts";

// Simple memory-resident Ring Buffer for subprocess logs
export class LogRingBuffer {
  private lines: string[] = [];
  private maxLines: number;

  constructor(maxLines = 150) {
    this.maxLines = maxLines;
  }

  write(chunk: string) {
    const splitLines = chunk.split(/\r?\n/);
    splitLines.forEach(line => {
      this.lines.push(line);
      if (this.lines.length > this.maxLines) {
        this.lines.shift();
      }
    });
  }

  read(): string {
    return this.lines.join("\n");
  }
}

export const executeBashTool = createTool({
  name: "execute_bash",
  description: "Execute a command in the system terminal and capture isolated streams.",
  schema: z.object({
    command: z.string().describe("The shell command to run")
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  execute: async (args) => {
    try {
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "powershell.exe" : "bash";
      const shellArgs = isWindows ? ["-Command", args.command] : ["-c", args.command];

      const proc = Bun.spawn({
        cmd: [shell, ...shellArgs],
        stdout: "pipe",
        stderr: "pipe"
      });

      const outBuffer = new LogRingBuffer(200);
      const errBuffer = new LogRingBuffer(200);

      // Read streams in chunks
      const stdoutReader = proc.stdout.getReader();
      const stderrReader = proc.stderr.getReader();
      const decoder = new TextDecoder();

      const readStdout = async () => {
        while (true) {
          const { done, value } = await stdoutReader.read();
          if (done) break;
          outBuffer.write(decoder.decode(value));
        }
      };

      const readStderr = async () => {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          errBuffer.write(decoder.decode(value));
        }
      };

      // Run stream readers concurrently
      await Promise.all([readStdout(), readStderr()]);
      const exitCode = await proc.exited;

      const stdoutText = outBuffer.read();
      const stderrText = errBuffer.read();

      const output = [
        stdoutText ? stdoutText : "",
        stderrText ? `[STDERR]\n${stderrText}` : ""
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
