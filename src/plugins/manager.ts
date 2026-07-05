/**
 * src/plugins/manager.ts
 *
 * Lifecycle-hook-based plugin manager.
 * Provisions plugins inside isolated PluginSandbox workers.
 * Exposes runHook() for the orchestrator to call before/after tool executions.
 */

import * as fs from "fs";
import * as path from "path";
import { PluginSandbox } from "./pluginSandbox.ts";

export interface RegisteredPlugin {
  name: string;
  version: string;
  sandbox: PluginSandbox;
  loadedAt: string;
}

export interface PluginLog {
  plugin: string;
  hook: string;
  blocked: boolean;
  message?: string;
  timestamp: string;
}

class PluginManager {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private logs: PluginLog[] = [];

  /**
   * Load a plugin from a source code string or local .js file path.
   */
  register(nameOrPath: string, codeOrUndefined?: string): RegisteredPlugin {
    let code = codeOrUndefined;
    let name = nameOrPath;

    if (!code) {
      // Treat as file path
      const resolved = path.resolve(nameOrPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Plugin file not found: ${resolved}`);
      }
      code = fs.readFileSync(resolved, "utf-8");
      name = path.basename(resolved, path.extname(resolved));
    }

    if (this.plugins.has(name)) {
      this.plugins.get(name)!.sandbox.terminate();
    }

    const sandbox = new PluginSandbox(code, name);
    const plugin: RegisteredPlugin = {
      name,
      version: "1.0.0",
      sandbox,
      loadedAt: new Date().toISOString(),
    };
    this.plugins.set(name, plugin);
    return plugin;
  }

  unregister(name: string) {
    const p = this.plugins.get(name);
    if (p) {
      p.sandbox.terminate();
      this.plugins.delete(name);
    }
  }

  /**
   * Run a lifecycle hook across all registered plugins.
   * If any plugin returns { proceed: false }, execution is blocked.
   */
  async runHook(
    hook: "beforeToolCall" | "afterToolCall" | "transformPrompt",
    payload: any
  ): Promise<{ proceed: boolean; payload: any; blocked?: string }> {
    let current = payload;

    for (const [name, plugin] of this.plugins) {
      try {
        const result = await plugin.sandbox.call(hook, current);

        // beforeToolCall can block execution
        if (hook === "beforeToolCall" && result?.proceed === false) {
          this.logs.push({
            plugin: name,
            hook,
            blocked: true,
            message: result?.error || "Blocked by plugin",
            timestamp: new Date().toISOString(),
          });
          return { proceed: false, payload: current, blocked: `Plugin '${name}': ${result?.error || "blocked"}` };
        }

        // afterToolCall / transformPrompt: pass result forward
        if (result !== undefined && result !== null) {
          current = hook === "afterToolCall" ? result : result;
        }

        this.logs.push({ plugin: name, hook, blocked: false, timestamp: new Date().toISOString() });
      } catch (err: any) {
        this.logs.push({
          plugin: name, hook, blocked: false,
          message: `Error: ${err.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { proceed: true, payload: current };
  }

  getPlugins(): RegisteredPlugin[] {
    return [...this.plugins.values()];
  }

  getLogs(): PluginLog[] {
    return [...this.logs].reverse().slice(0, 100);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const globalPluginManager = new PluginManager();
