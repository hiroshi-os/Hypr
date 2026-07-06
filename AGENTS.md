# Hypr CLI — agent notes

## Runtime & toolchain

- **Bun** runtime (v1.3.5+). Not Node.js.
- `bun start` — run from source (`src/index.tsx` is entrypoint).
- `bun run build` — compile to standalone binary `dist/hypr` (or `dist/hypr.exe` on Windows).
- `bun test` — run all tests (Bun's built-in test runner, no Jest/Vitest).
- No linter, no formatter, no CI, no pre-commit hooks.

## Architecture

- **OpenTUI** for terminal rendering (`@opentui/core` + `@opentui/react`), not React DOM.
- **14+ registered tools** in `src/tools/`. Key tools:
  - `apply_multi_diff` — atomic multi-file edit that runs `bun run build` to validate and rolls back on failure.
  - `connect_mcp_server` — spawns external stdio MCP servers, converts JSON schemas to Zod at runtime.
  - `execute_bash` — ring-buffered command execution (no TUI pollution).
- **Plugin sandbox**: plugins run in isolated Bun Workers with no fs/process/Bun.spawn access, 2s timeout.
- **Privacy scrubber** (`src/privacy/scrubber.ts`) — regex-based PII/secret redaction on all outbound LLM messages.
- **Self-correction**: agent loop runs the detected test command after each turn, retries up to 5 times on failure.

## Project directives

- `src/config/directives.ts` loads project rules from `AGENT.md`, `CLAUDE.md`, or `DEVELOPER.md` (case-insensitive) in the project root. Not `AGENTS.md`.
- If a test command regex is found in those files (e.g., `bun test`, `npm test`), the agent loop uses it for self-correction.

## Tests

- `tests/hypr.test.ts` — core unit tests (state, permissions, file tools, scheduler, MCP, LLM).
- `tests/phase4.test.ts` — scrubber, plugin sandbox isolation tests.
- Uses `describe`, `expect`, `mock`, `spyOn` from `bun:test`.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@opentui/core` | Native Zig rendering via FFI |
| `@opentui/react` | React bindings for OpenTUI |
| `zod` | Schema validation for all tools |
| `react` ^19 | UI framework |
