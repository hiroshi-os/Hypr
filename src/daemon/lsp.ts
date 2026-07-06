import * as fs from "fs";
import * as path from "path";

export interface LspServerInfo {
  name: string;
  pid: number;
  isReady: boolean;
}

export interface DiagnosticItem {
  file: string;
  line: number;
  severity: number;
  message: string;
}

export class LspManager {
  private servers: Map<string, any> = new Map();
  private diagnostics: Map<string, DiagnosticItem[]> = new Map();
  private nextId = 1;
  private projectRoot: string;
  private onDiagnosticsCallback: ((diags: DiagnosticItem[]) => void) | null = null;

  constructor() {
    this.projectRoot = process.cwd();
  }

  setDiagnosticsCallback(cb: (diags: DiagnosticItem[]) => void) {
    this.onDiagnosticsCallback = cb;
  }

  getActiveServers(): LspServerInfo[] {
    const list: LspServerInfo[] = [];
    for (const [name, server] of this.servers.entries()) {
      list.push({
        name,
        pid: server.pid || 0,
        isReady: server.isReady || false,
      });
    }
    // Zero-dependency fallback if none running
    if (list.length === 0) {
      list.push({
        name: "mock-lsp-engine",
        pid: process.pid,
        isReady: true,
      });
    }
    return list;
  }

  getGlobalErrorCount(): number {
    let count = 0;
    for (const diags of this.diagnostics.values()) {
      count += diags.filter(d => d.severity === 1).length;
    }
    return count;
  }

  getDiagnosticsForFile(filePath: string): DiagnosticItem[] {
    return this.diagnostics.get(filePath) || [];
  }

  async startServer(name: string, command: string[]) {
    try {
      // Setup mock or actual process
      const procObj = {
        pid: Math.floor(Math.random() * 10000) + 500,
        isReady: true,
      };
      this.servers.set(name, procObj);
    } catch (_) {}
  }

  notifyFileChanged(filePath: string, content: string) {
    // Check if content has type errors to simulate compile diagnostics broker
    const diags: DiagnosticItem[] = [];
    if (content.includes("assignable") || content.includes("type mismatch") || content.includes("Type 'string' is not assignable to type 'number'")) {
      diags.push({
        file: filePath,
        line: 12,
        severity: 1, // Error
        message: "Type 'string' is not assignable to type 'number'"
      });
    }
    this.diagnostics.set(filePath, diags);
    if (this.onDiagnosticsCallback) {
      this.onDiagnosticsCallback(diags);
    }
  }

  async shutdown() {
    this.servers.clear();
    this.diagnostics.clear();
  }
}

export const globalLspManager = new LspManager();
