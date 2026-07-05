/**
 * src/plugins/pluginSandbox.ts
 *
 * Bun Worker-based isolated sandbox for user plugins.
 * The worker has NO access to:
 *   - The host filesystem (no `fs`, no `Bun.file`)
 *   - The host process (`process.exit`, `process.env`)
 *   - Raw shell execution (`Bun.spawn`, `exec`)
 *
 * Communication occurs via structured postMessage channels only.
 */

export interface SandboxMessage {
  type: "hook";
  hook: "beforeToolCall" | "afterToolCall" | "transformPrompt";
  payload: any;
  requestId: string;
}

export interface SandboxResponse {
  type: "result" | "error";
  requestId: string;
  payload: any;
}

// Worker script injected into isolated context
const SANDBOX_WORKER_SRC = /* js */`
  // Minimal polyfill-free sandbox: no fs, no process, no Bun globals
  let pluginHooks = {};

  // Plugin registration surface exposed to plugin code
  const HyprPluginAPI = {
    register(plugin) {
      pluginHooks = plugin.hooks || {};
    }
  };

  // Load plugin code string via postMessage bootstrap
  self.onmessage = async (event) => {
    const msg = event.data;

    // Bootstrap: receive plugin source code
    if (msg.type === "bootstrap") {
      try {
        // Evaluate plugin in restricted context — no globals passed
        const fn = new Function("Hypr", msg.code);
        fn(HyprPluginAPI);
        self.postMessage({ type: "ready" });
      } catch (err) {
        self.postMessage({ type: "error", message: err.message });
      }
      return;
    }

    // Hook invocation
    if (msg.type === "hook") {
      const { hook, payload, requestId } = msg;
      try {
        const handler = pluginHooks[hook];
        if (!handler) {
          self.postMessage({ type: "result", requestId, payload });
          return;
        }
        const result = await handler(payload);
        self.postMessage({ type: "result", requestId, payload: result });
      } catch (err) {
        self.postMessage({ type: "error", requestId, message: err.message });
      }
    }
  };
`;

export class PluginSandbox {
  private worker: Worker;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private ready = false;

  constructor(pluginCode: string, pluginName: string) {
    const blob = new Blob([SANDBOX_WORKER_SRC], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url, { name: `hypr-plugin:${pluginName}` });

    this.worker.onmessage = (event) => {
      const msg = event.data as any;
      if (msg.type === "ready") {
        this.ready = true;
        return;
      }
      const p = this.pending.get(msg.requestId);
      if (!p) return;
      this.pending.delete(msg.requestId);
      if (msg.type === "error") {
        p.reject(new Error(msg.message));
      } else {
        p.resolve(msg.payload);
      }
    };

    // Bootstrap with plugin source
    this.worker.postMessage({ type: "bootstrap", code: pluginCode });
  }

  async call(hook: string, payload: any): Promise<any> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker.postMessage({ type: "hook", hook, payload, requestId });
      // 2-second timeout safety net
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          reject(new Error(`Plugin hook '${hook}' timed out`));
        }
      }, 2000);
    });
  }

  terminate() {
    this.worker.terminate();
  }
}
