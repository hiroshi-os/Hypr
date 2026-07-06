# Hypr CLI — High-Performance Agentic CLI Developer Companion

Hypr is an open-source AI coding agent, built from the ground up as a terminal-first coding companion. Powered by a native **Zig rendering core** via **OpenTUI** and **Bun FFI**, Hypr delivers fluid, sub-millisecond drawing speeds, zero TUI layout tearing, and structured agent loops.

---

## ⚡ Core Features

- **Native OpenTUI Canvas**: Fully screen-buffered viewport switcher utilizing native Zig bindings instead of JS-heavy layouts.
- **Flat Monochrome Aesthetic**: A borderless visual style with clean zinc highlights, left-vertical accent lines (`│`), and a tabbed right-hand metadata panel.
- **Zod-to-Tool Registry**: Every tool is validated against a strict Zod schema before execution.
- **Permissions Middleware**: Programmatic classifier that intercepts destructive subprocess commands and file updates, requesting manual override.
- **Actor-Critic Scheduler**: Formulates lists of `TaskNode` parameters (Actor) and validates edits against compiler outcomes (Critic).
- **Subprocess Ring-Buffer**: Diverts command line output stream records into memory blocks to keep TUI layouts intact.
- **Model Context Protocol (MCP)**: Native stdio JSON-RPC client mapping external schemas to dynamic Zod configurations.

---

## 🚀 Getting Started

### Prerequisites

- **Bun Runtime**: Bun `1.3.5` or newer.
- **API Keys**: Gemini (`GEMINI_API_KEY`) or Anthropic (`ANTHROPIC_API_KEY`).

### Installation & Run

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/hiroshi-os/Hypr.git
   cd Hypr
   bun install
   ```

2. Export your API keys:
   ```bash
   export GEMINI_API_KEY="your_api_key"
   ```

3. Launch Hypr:
   ```bash
   bun start
   ```

4. Or bundle into a standalone binary:
   ```bash
   bun run build
   ./dist/hypr
   ```

---

## 🛠️ Tools Reference

| Tool | Permission | Action |
| --- | --- | --- |
| `read_file` | Read-only | Reads target lines from source files |
| `write_file` | Destructive | Overwrites file contents |
| `edit_file` | Destructive | Applies search-and-replace line edits |
| `view_code_outline` | Read-only | Extracts symbol exports across TS, Python, Go, and Rust |
| `execute_bash` | Destructive | Executes terminal commands in isolated ring buffers |
| `schedule_tasks` | Read-only | Appends task nodes to the sidebar queue |
| `update_task_status` | Read-only | Transitions task status between `pending`, `running`, `completed`, `failed` |
| `connect_mcp_server` | Destructive | Spawns external MCP server stdio connections |

---

## 📄 Documentation

For full guides and APIs, view our Mintlify docs under the `docs` folder or run locally:
```bash
npm i -g mint
cd docs
mint dev
```
