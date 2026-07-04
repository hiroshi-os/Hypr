import { ToolDef } from "../tools/index.ts";

export type PermissionDecision = "allow" | "deny" | "prompt";

export interface PermissionGate {
  check: (tool: ToolDef, args: any) => Promise<boolean>;
}

// Simple classifier for bash/terminal commands
export function classifyCommand(command: string): { isReadOnly: boolean; reason?: string } {
  const trimmed = command.trim();
  
  // Safe patterns: status, log, diff, test
  const readOnlyPrefixes = [
    "git status", "git diff", "git log", "git show", "git branch",
    "npm test", "npm run test", "bun test", "cargo test", "pytest",
    "ls ", "dir ", "cat ", "type ", "echo ", "pwd"
  ];
  
  const isMatch = readOnlyPrefixes.some(prefix => 
    trimmed === prefix || trimmed.startsWith(prefix + " ")
  );

  if (isMatch) {
    return { isReadOnly: true };
  }

  // Destructive or modifying commands
  const destructiveKeywords = [
    "rm ", "del ", "rd ", "format ", "git push", "git commit", "git reset", "git checkout",
    "git merge", "git rebase", "npm publish", "pip install", "npm install", "bun install", "yarn install"
  ];

  const hasDestructive = destructiveKeywords.some(keyword => trimmed.includes(keyword));
  if (hasDestructive) {
    return { isReadOnly: false, reason: "Command contains potentially destructive keyword or modification action." };
  }

  // Default to non-read-only for general commands (like running build or start servers, or generic scripts)
  return { isReadOnly: false, reason: "General execution command" };
}

export class DefaultPermissionGate implements PermissionGate {
  private autoApprove: boolean;
  private promptCallback?: (message: string) => Promise<boolean>;

  constructor(autoApprove = false, promptCallback?: (message: string) => Promise<boolean>) {
    this.autoApprove = autoApprove;
    this.promptCallback = promptCallback;
  }

  setPromptCallback(callback: (message: string) => Promise<boolean>) {
    this.promptCallback = callback;
  }

  async check(tool: ToolDef, args: any): Promise<boolean> {
    // 1. Zod schema validation is handled before this stage, but we check tool read-only flag.
    let isReadOnly = tool.isReadOnly;
    let reason = "Tool is configured as modifying/destructive";

    // 2. If it is terminal/bash execution, classify the command
    if (tool.name === "execute_bash" && args.command) {
      const classification = classifyCommand(args.command);
      if (classification.isReadOnly) {
        return true;
      } else {
        isReadOnly = false;
        reason = classification.reason || "Terminal execution command is not classified as read-only";
      }
    }

    if (isReadOnly) {
      return true;
    }

    // If autoApprove is enabled, bypass
    if (this.autoApprove) {
      return true;
    }

    // Otherwise, require interactive prompt
    if (this.promptCallback) {
      const promptMsg = `Tool '${tool.name}' wants to perform a non-read-only action: ${reason}. Allow?`;
      return await this.promptCallback(promptMsg);
    }

    // Default to deny if no prompt callback is available
    return false;
  }
}
