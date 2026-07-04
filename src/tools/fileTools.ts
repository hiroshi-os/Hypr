import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as React from "react";
import { createTool } from "./index.ts";

// 1. Read File Tool
export const readFileTool = createTool({
  name: "read_file",
  description: "Read content of a file, optionally specifying start and end lines (1-indexed).",
  schema: z.object({
    path: z.string().describe("Absolute path or relative path to the file"),
    startLine: z.number().optional().describe("Optional start line (1-indexed)"),
    endLine: z.number().optional().describe("Optional end line (1-indexed)")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    try {
      const filePath = path.resolve(args.path);
      if (!fs.existsSync(filePath)) {
        return { isError: true, content: `Error: File not found: ${args.path}` };
      }
      const data = fs.readFileSync(filePath, "utf-8");
      const lines = data.split(/\r?\n/);
      
      const start = args.startLine ? Math.max(1, args.startLine) - 1 : 0;
      const end = args.endLine ? Math.min(lines.length, args.endLine) : lines.length;
      
      const sliced = lines.slice(start, end).join("\n");
      return { isError: false, content: sliced };
    } catch (e: any) {
      return { isError: true, content: `Error reading file: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `📖 Reading ${args.path}...`);
  }
});

// 2. Write File Tool
export const writeFileTool = createTool({
  name: "write_file",
  description: "Write content to a file, overwriting existing content if it exists.",
  schema: z.object({
    path: z.string().describe("Absolute path or relative path to the file"),
    content: z.string().describe("Content to write into the file")
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  execute: async (args) => {
    try {
      const filePath = path.resolve(args.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, args.content, "utf-8");
      return { isError: false, content: `Successfully wrote file to ${args.path}` };
    } catch (e: any) {
      return { isError: true, content: `Error writing file: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `💾 Writing ${args.path}...`);
  }
});

// 3. Edit File (Atomic Search-and-Replace) Tool
export const editFileTool = createTool({
  name: "edit_file",
  description: "Perform search and replace editing of an existing file.",
  schema: z.object({
    path: z.string().describe("Absolute path or relative path to the file"),
    search: z.string().describe("Exact string content to search for in the file"),
    replace: z.string().describe("String content to replace the searched content with")
  }),
  isReadOnly: false,
  isConcurrencySafe: false,
  execute: async (args) => {
    try {
      const filePath = path.resolve(args.path);
      if (!fs.existsSync(filePath)) {
        return { isError: true, content: `Error: File not found: ${args.path}` };
      }
      const original = fs.readFileSync(filePath, "utf-8");
      if (!original.includes(args.search)) {
        return { isError: true, content: `Error: Search block not found in file ${args.path}` };
      }
      // Verify uniqueness to avoid accidental multiple replacements if not desired, 
      // or simply report success. Let's do a replace.
      const occurrenceCount = original.split(args.search).length - 1;
      if (occurrenceCount > 1) {
        return { isError: true, content: `Error: Search block is not unique; it appears ${occurrenceCount} times.` };
      }

      const updated = original.replace(args.search, args.replace);
      fs.writeFileSync(filePath, updated, "utf-8");
      return { isError: false, content: `Successfully updated ${args.path}` };
    } catch (e: any) {
      return { isError: true, content: `Error editing file: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `📝 Editing ${args.path}...`);
  }
});

// 4. List Directory Tool
export const listDirectoryTool = createTool({
  name: "list_directory",
  description: "List contents of a directory.",
  schema: z.object({
    path: z.string().describe("Path of the directory to list (defaults to '.')")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    try {
      const dirPath = path.resolve(args.path || ".");
      if (!fs.existsSync(dirPath)) {
        return { isError: true, content: `Error: Directory not found: ${args.path}` };
      }
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return { isError: true, content: `Error: Path is not a directory: ${args.path}` };
      }
      
      const files = fs.readdirSync(dirPath);
      const output = files.map(file => {
        const full = path.join(dirPath, file);
        const fStat = fs.statSync(full);
        const type = fStat.isDirectory() ? "DIR" : "FILE";
        return `${type}\t${file}`;
      }).join("\n");
      
      return { isError: false, content: output || "(Empty Directory)" };
    } catch (e: any) {
      return { isError: true, content: `Error listing directory: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `📂 Listing directory ${args.path}...`);
  }
});

// 5. Grep Search Tool
export const grepSearchTool = createTool({
  name: "grep_search",
  description: "Search for a text pattern recursively in files.",
  schema: z.object({
    directory: z.string().describe("Root directory to search (defaults to '.')"),
    query: z.string().describe("Plain text query or pattern to search for")
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  execute: async (args) => {
    try {
      const searchDir = path.resolve(args.directory || ".");
      if (!fs.existsSync(searchDir)) {
        return { isError: true, content: `Error: Directory not found: ${args.directory}` };
      }

      const results: string[] = [];
      
      function searchRecursive(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === "node_modules" || file === ".git" || file === "dist" || file === ".bun") {
            continue;
          }
          const full = path.join(dir, file);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            searchRecursive(full);
          } else if (stat.isFile()) {
            try {
              const content = fs.readFileSync(full, "utf-8");
              if (content.includes(args.query)) {
                const lines = content.split(/\r?\n/);
                lines.forEach((line, index) => {
                  if (line.includes(args.query)) {
                    const relative = path.relative(searchDir, full);
                    results.push(`${relative}:${index + 1}: ${line.trim()}`);
                  }
                });
              }
            } catch (e) {
              // ignore binary or unreadable files
            }
          }
        }
      }

      searchRecursive(searchDir);
      return { isError: false, content: results.join("\n") || "(No matches found)" };
    } catch (e: any) {
      return { isError: true, content: `Error running grep: ${e.message}` };
    }
  },
  renderProgress: (args) => {
    return React.createElement("span", null, `🔍 Searching for "${args.query}"...`);
  }
});
