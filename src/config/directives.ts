import * as fs from "fs";
import * as path from "path";

export interface ProjectDirectives {
  rules: string;
  testCommand?: string;
}

export function loadProjectDirectives(cwd: string = "."): ProjectDirectives {
  const possibleFiles = [
    "DEVELOPER.md",
    "AGENT.md",
    "CLAUDE.md",
    "developer.md",
    "agent.md",
    "claude.md"
  ];

  let rules = "";
  let testCommand: string | undefined;

  for (const filename of possibleFiles) {
    const fullPath = path.join(cwd, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        rules = content;

        // Simple regex/heuristic to extract a test command:
        // E.g., looking for code blocks under "Test" or "Verification" section,
        // or lines containing commands like `npm run test` or `bun test` or `cargo test`
        const testCommandRegex = /(?:npm run test|bun test|cargo test|npm test|pytest|go test)/i;
        const match = content.match(testCommandRegex);
        if (match) {
          testCommand = match[0];
        }
        break; // Stop at first file found
      } catch (e) {
        // ignore read errors
      }
    }
  }

  return {
    rules,
    testCommand
  };
}
