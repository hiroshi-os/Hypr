import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { Message } from "../state/engine.ts";
import { TaskNode } from "../state/scheduler.ts";

export interface SessionStateSnapshot {
  sessionId: string;
  messages: Message[];
  tasks: TaskNode[];
  activeAgent: string;
  activeVariant: string;
  currentModelName: string;
  providerName: string;
  savedAt: string;
}

export function getDirectoryHash(dir: string): string {
  return createHash("sha256").update(path.resolve(dir)).digest("hex").slice(0, 16);
}

export class SessionPersistence {
  private sessionsDir: string;
  private mappingsPath: string;

  constructor() {
    this.sessionsDir = path.join(process.cwd(), ".hypr", "sessions");
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
    this.mappingsPath = path.join(this.sessionsDir, "directory-mappings.json");
  }

  private getMappings(): Record<string, string> {
    if (fs.existsSync(this.mappingsPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.mappingsPath, "utf-8"));
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  private saveMappings(mappings: Record<string, string>) {
    const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
    if (isTest) return;
    try {
      fs.writeFileSync(this.mappingsPath, JSON.stringify(mappings, null, 2), "utf-8");
    } catch (_) {}
  }

  getSessionIdForDirectory(dirPath: string): string {
    const hash = getDirectoryHash(dirPath);
    const mappings = this.getMappings();
    if (!mappings[hash]) {
      mappings[hash] = `session-${hash}-${Date.now()}`;
      this.saveMappings(mappings);
    }
    return mappings[hash];
  }

  resetSessionForDirectory(dirPath: string): string {
    const hash = getDirectoryHash(dirPath);
    const mappings = this.getMappings();
    mappings[hash] = `session-${hash}-${Date.now()}`;
    this.saveMappings(mappings);
    return mappings[hash];
  }

  saveSession(snapshot: SessionStateSnapshot) {
    const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
    if (isTest) return;
    const filePath = path.join(this.sessionsDir, `${snapshot.sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
    // Also save as latest
    const latestPath = path.join(this.sessionsDir, "latest.json");
    fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2), "utf-8");
  }

  loadSession(sessionId: string): SessionStateSnapshot | null {
    const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  loadLatest(): SessionStateSnapshot | null {
    const latestPath = path.join(this.sessionsDir, "latest.json");
    if (fs.existsSync(latestPath)) {
      try {
        return JSON.parse(fs.readFileSync(latestPath, "utf-8"));
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}

export const globalPersistence = new SessionPersistence();
