import * as fs from "fs";
import * as path from "path";

export interface ProviderEntry {
  api_key?: string;
  endpoint?: string;
  model?: string;
}

export interface HyprConfig {
  current_provider: string;
  current_model: string;
  providers: Record<string, ProviderEntry>;
}

export const DEFAULT_CONFIG: HyprConfig = {
  current_provider: "anthropic",
  current_model: "claude-3-5-sonnet",
  providers: {
    anthropic: { model: "claude-3-5-sonnet" },
    openai: { model: "gpt-4o" },
    gemini: { model: "gemini-2.5-pro" },
    deepseek: { model: "deepseek-coder" },
    openrouter: { model: "meta-llama/llama-3.1-70b" },
    groq: { model: "llama3-70b-8192" },
    together: { model: "meta-llama/Meta-Llama-3.1-70B-Instruct" },
    ollama: { endpoint: "http://localhost:11434", model: "llama3" },
    lmstudio: { endpoint: "http://localhost:1234", model: "local-model" },
    vllm: { endpoint: "http://localhost:8000", model: "custom-model" },
    github: { model: "gpt-4o" },
    opencode_zen: { model: "opencode-zen-model" }
  }
};

export class ProviderConfigManager {
  private configPath: string;
  private currentConfig: HyprConfig;

  constructor() {
    this.configPath = path.join(process.cwd(), "hypr.jsonc");
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.load();
  }

  load() {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        // Strip single line & multi-line comments for JSONC parsing compatibility
        const clean = raw
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*/g, "");
        this.currentConfig = JSON.parse(clean);
      } catch (_) {
        this.currentConfig = { ...DEFAULT_CONFIG };
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      const data = JSON.stringify(this.currentConfig, null, 2);
      const comments = `// Hypr Multi-Provider Configuration Profile\n`;
      fs.writeFileSync(this.configPath, comments + data, "utf-8");
    } catch (_) {}
  }

  getConfig(): HyprConfig {
    return this.currentConfig;
  }

  setProvider(provider: string) {
    this.currentConfig.current_provider = provider;
    const entry = this.currentConfig.providers[provider];
    if (entry && entry.model) {
      this.currentConfig.current_model = entry.model;
    }
    this.save();
  }

  setKey(provider: string, key: string) {
    if (!this.currentConfig.providers[provider]) {
      this.currentConfig.providers[provider] = {};
    }
    this.currentConfig.providers[provider].api_key = key;
    this.save();
  }

  setEndpoint(provider: string, endpoint: string) {
    if (!this.currentConfig.providers[provider]) {
      this.currentConfig.providers[provider] = {};
    }
    this.currentConfig.providers[provider].endpoint = endpoint;
    this.save();
  }

  /**
   * Get credential token with environment variable overrides
   */
  getApiKey(provider: string): string {
    const envKey = `${provider.toUpperCase()}_API_KEY`;
    if (process.env[envKey]) {
      return process.env[envKey] as string;
    }
    return this.currentConfig.providers[provider]?.api_key || "";
  }
}

export const globalConfigManager = new ProviderConfigManager();
