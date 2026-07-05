/**
 * src/privacy/scrubber.ts
 *
 * Streaming RegExp + token-based PII/secret scanner.
 * Sits directly before the LLM network transport layer.
 * Detects and replaces credentials, keys, and sensitive paths
 * with deterministic hashed placeholders so they never leave the host.
 */

import { createHash } from "crypto";

// ─── Secret pattern registry ─────────────────────────────────────────────────

interface PatternRule {
  name: string;
  pattern: RegExp;
}

const SECRET_PATTERNS: PatternRule[] = [
  // AWS
  { name: "aws_access_key",    pattern: /AKIA[0-9A-Z]{16}/g },
  { name: "aws_secret_key",    pattern: /(?<![A-Za-z0-9])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g },
  // Generic API keys / tokens
  { name: "bearer_token",      pattern: /Bearer\s+[A-Za-z0-9\-_\.~+/]+=*/g },
  { name: "generic_api_key",   pattern: /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([A-Za-z0-9\-_]{20,})["']?/gi },
  // GitHub PAT
  { name: "github_pat",        pattern: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/g },
  // OpenAI / Anthropic / Google
  { name: "openai_key",        pattern: /sk-[A-Za-z0-9]{32,}/g },
  { name: "anthropic_key",     pattern: /sk-ant-[A-Za-z0-9\-]{40,}/g },
  // Private SSH keys
  { name: "ssh_private_key",   pattern: /-----BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|OPENSSH) PRIVATE KEY-----/g },
  // .env-style assignments
  { name: "env_secret",        pattern: /^(?:export\s+)?[A-Z_]{3,}(?:KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|CREDENTIAL)\s*=\s*.+$/gm },
  // Connection strings
  { name: "connection_string", pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+/g },
  // Absolute local paths (enterprise internal route leakage)
  { name: "absolute_path",     pattern: /(?:\/home\/|\/Users\/|C:\\Users\\|D:\\)[^\s"'<>|]+/g },
];

// ─── Deterministic hash replacer ─────────────────────────────────────────────

function redact(value: string, ruleName: string): string {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `[REDACTED:${ruleName.toUpperCase()}:${hash}]`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ScrubReport {
  original: string;
  scrubbed: string;
  hits: Array<{ rule: string; count: number }>;
  durationMs: number;
}

/**
 * Scrubs a string payload in-place using all registered pattern rules.
 * Returns the sanitized string and a detailed report.
 */
export function scrubPayload(input: string): ScrubReport {
  const t0 = Date.now();
  let scrubbed = input;
  const hits: Array<{ rule: string; count: number }> = [];

  for (const { name, pattern } of SECRET_PATTERNS) {
    // Reset lastIndex for stateful global regexes
    pattern.lastIndex = 0;
    const matches = scrubbed.match(pattern);
    if (matches && matches.length > 0) {
      hits.push({ rule: name, count: matches.length });
      scrubbed = scrubbed.replace(pattern, (match) => redact(match, name));
    }
  }

  return {
    original: input,
    scrubbed,
    hits,
    durationMs: Date.now() - t0,
  };
}

/**
 * Scrubs every string leaf inside a messages array (used before LLM transport).
 */
export function scrubMessages(messages: any[]): { messages: any[]; totalHits: number } {
  let totalHits = 0;

  const walk = (obj: any): any => {
    if (typeof obj === "string") {
      const { scrubbed, hits } = scrubPayload(obj);
      totalHits += hits.reduce((s, h) => s + h.count, 0);
      return scrubbed;
    }
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === "object") {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
      return out;
    }
    return obj;
  };

  return { messages: walk(messages), totalHits };
}
