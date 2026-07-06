import * as fs from "fs";
import * as path from "path";
import { ConversationState, Message } from "../state/engine.ts";
import { LLMClient } from "../llm/client.ts";
import { DefaultPermissionGate } from "../permissions/middleware.ts";
import { globalScheduler } from "../state/scheduler.ts";
import { globalPluginManager } from "../plugins/manager.ts";
import { loadProjectDirectives } from "../config/directives.ts";
import { readFileTool, writeFileTool, editFileTool, listDirectoryTool, grepSearchTool } from "../tools/fileTools.ts";
import { executeBashTool } from "../tools/bashTool.ts";
import { viewCodeOutlineTool } from "../tools/outlineTool.ts";
import { applyMultiDiffTool } from "../tools/multiDiffTool.ts";
import { scheduleTasksTool, updateTaskStatusTool } from "../state/scheduler.ts";
import { connectMcpServerTool, dynamicMcpTools } from "../tools/mcpTool.ts";
import { scanComplianceTool } from "../tools/complianceTool.ts";
import { registerExtensionTool } from "../tools/extensionTool.ts";
import { generateDiagnosticBundleTool } from "../tools/diagnosticTool.ts";
import { globalPersistence, SessionStateSnapshot } from "./persistence.ts";
import { AGENTS_LIST } from "../ui/Canvas.tsx";
import { ScopedSubagent } from "./subagent.ts";
import { globalCompactor } from "./compactor.ts";
import { globalLspManager } from "./lsp.ts";

const toolsList = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  grepSearchTool,
  executeBashTool,
  viewCodeOutlineTool,
  applyMultiDiffTool,
  scheduleTasksTool,
  updateTaskStatusTool,
  connectMcpServerTool,
  scanComplianceTool,
  registerExtensionTool,
  generateDiagnosticBundleTool,
];

export const SOCKET_PATH = process.platform === "win32" ? "127.0.0.1" : "/tmp/hypr.sock";
export const SOCKET_PORT = 49153;

export class HyprDaemon {
  private server: any;
  private clients: Set<any> = new Set();
  
  // Orchestration State
  private sessionId = "default-session";
  private messages: Message[] = [];
  private status: "idle" | "thinking" | "prompting_permission" | "executing_tool" = "idle";
  private permissionMsg = "";
  private currentToolProgress = "";
  private tasks = globalScheduler.getTasks();
  private rulesFound = false;
  private activeAgent = "Build";
  private activeVariant = "medium";
  private currentModelName = "Gemini 2.5 Flash";
  private providerName = "gemini";
  
  private subagents: ScopedSubagent[] = [];
  private activeSessionIndex = 0;

  private state: ConversationState;
  private client: LLMClient;
  private gate: DefaultPermissionGate;
  private permissionResolver: ((allowed: boolean) => void) | null = null;
  private retryCount = 0;
  private maxRetries = 5;

  constructor() {
    this.state = new ConversationState();
    this.client = new LLMClient();
    this.gate = new DefaultPermissionGate(false, async (msg) => {
      this.status = "prompting_permission";
      this.permissionMsg = msg;
      this.broadcastState();
      return new Promise<boolean>((resolve) => {
        this.permissionResolver = resolve;
      });
    });

    // Restore latest session if available
    const latest = globalPersistence.loadLatest();
    if (latest) {
      this.messages = latest.messages;
      this.activeAgent = latest.activeAgent;
      this.activeVariant = latest.activeVariant;
      this.currentModelName = latest.currentModelName;
      this.providerName = latest.providerName;
      for (const m of this.messages) {
        this.state.addMessage(m);
      }
    }

    // Set compliance scrubbing callback
    this.client.onScrub = (hits) => {
      this.messages.push({
        role: "compliance",
        content: `Scrubbed sensitive token(s)`,
        fileScrubbed: "outbound payload"
      });
      this.broadcastState();
    };

    const directives = loadProjectDirectives();
    let sysPrompt = "You are Hypr, a powerful CLI agentic coding assistant designed to solve developer tasks.\n" +
      "You have direct access to the filesystem and system execution. Work step-by-step to complete the task.\n";
    if (directives.rules) {
      sysPrompt += `\nProject architectural guidelines & rules:\n${directives.rules}\n`;
      this.rulesFound = true;
    }
    this.state.setSystemPrompt(sysPrompt);
  }

  start() {
    if (process.platform !== "win32" && fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }

    const listenOptions: any = process.platform === "win32"
      ? { hostname: SOCKET_PATH, port: SOCKET_PORT }
      : { unix: SOCKET_PATH };

    this.server = Bun.listen({
      ...listenOptions,
      socket: {
        open: (socket) => {
          this.clients.add(socket);
          this.sendToSocket(socket, "stateUpdate", this.getStatePayload());
        },
        data: async (socket, data) => {
          try {
            const rawStr = new TextDecoder().decode(data);
            const rawLines = rawStr.split("\n").filter(l => l.trim());
            for (const line of rawLines) {
              const msg = JSON.parse(line);
              await this.handleClientRequest(socket, msg);
            }
          } catch (e: any) {
            console.error("Socket error processing client request: " + e.message);
          }
        },
        close: (socket) => {
          this.clients.delete(socket);
        },
      }
    });

    console.log(`Hypr daemon active on ${process.platform === "win32" ? `${SOCKET_PATH}:${SOCKET_PORT}` : SOCKET_PATH}`);
  }

  private sendToSocket(socket: any, method: string, params: any) {
    try {
      socket.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
    } catch (_) {}
  }

  private broadcastState() {
    const payload = this.getStatePayload();
    for (const client of this.clients) {
      this.sendToSocket(client, "stateUpdate", payload);
    }
    // Persist snapshot
    globalPersistence.saveSession({
      sessionId: this.sessionId,
      messages: this.messages,
      tasks: this.tasks,
      activeAgent: this.activeAgent,
      activeVariant: this.activeVariant,
      currentModelName: this.currentModelName,
      providerName: this.providerName,
      savedAt: new Date().toISOString(),
    });
  }

  private getTotalSessions() {
    return 1 + this.subagents.length;
  }

  private getStatePayload() {
    const currentMsgs = this.activeSessionIndex === 0
      ? this.messages
      : (this.subagents[this.activeSessionIndex - 1]?.getMessages() || []);

    const activeDelegations = this.subagents.map(s => ({
      id: s.id,
      type: s.type,
      status: s.status,
      currentTask: s.currentTask
    }));

    return {
      messages: currentMsgs,
      status: this.status,
      permissionMsg: this.permissionMsg,
      currentToolProgress: this.currentToolProgress,
      tasks: this.tasks,
      rulesFound: this.rulesFound,
      activeAgent: this.activeAgent,
      activeVariant: this.activeVariant,
      currentModelName: this.currentModelName,
      providerName: this.providerName,
      connectedClients: this.clients.size,
      activeWorkers: AGENTS_LIST.length,
      activeSessionIndex: this.activeSessionIndex,
      activeDelegations,
    };
  }

  private async handleClientRequest(socket: any, msg: any) {
    const { method, params } = msg;
    if (method === "submitInput") {
      this.handleUserInput(params.text);
    } else if (method === "cycleAgent") {
      const idx = AGENTS_LIST.findIndex((a) => a.name === this.activeAgent);
      const next = AGENTS_LIST[(idx + 1) % AGENTS_LIST.length];
      this.activeAgent = next.name;
      this.broadcastState();
    } else if (method === "selectModel") {
      this.client.setProvider(params.model.provider);
      this.client.setModelName(params.model.model);
      this.currentModelName = params.model.name;
      this.providerName = params.model.provider;
      this.broadcastState();
    } else if (method === "selectAgent") {
      this.activeAgent = params.agent.name;
      this.broadcastState();
    } else if (method === "selectProvider") {
      this.messages.push({
        role: "system",
        content: `System: Provider connected to ${params.provider.name}`
      });
      this.broadcastState();
    } else if (method === "selectVariant") {
      this.activeVariant = params.variant.name;
      this.broadcastState();
    } else if (method === "resolvePermission") {
      if (this.permissionResolver) {
        this.permissionResolver(params.allowed);
        this.permissionResolver = null;
        this.status = "thinking";
        this.permissionMsg = "";
        this.broadcastState();
      }
    } else if (method === "prevSession") {
      const count = this.getTotalSessions();
      this.activeSessionIndex = (this.activeSessionIndex - 1 + count) % count;
      this.broadcastState();
    } else if (method === "nextSession") {
      const count = this.getTotalSessions();
      this.activeSessionIndex = (this.activeSessionIndex + 1) % count;
      this.broadcastState();
    }
  }

  private async handleUserInput(text: string) {
    if (this.status !== "idle") return;

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    if (lower === "/new") {
      this.state = new ConversationState();
      this.messages = [];
      this.subagents = [];
      this.activeSessionIndex = 0;
      this.broadcastState();
      return;
    }

    if (this.activeSessionIndex > 0) {
      const sub = this.subagents[this.activeSessionIndex - 1];
      if (sub) {
        sub.state.addMessage({ role: "user", content: text });
        this.broadcastState();
        sub.run(toolsList, () => {
          this.broadcastState();
        });
      }
      return;
    }

    if (trimmed.startsWith("@explore ") || trimmed.startsWith("@scout ") || trimmed.startsWith("@general ")) {
      const spaceIdx = trimmed.indexOf(" ");
      const type = trimmed.slice(1, spaceIdx) as "explore" | "scout" | "general";
      const task = trimmed.slice(spaceIdx + 1);

      const subId = `sub_${Date.now()}`;
      const sub = new ScopedSubagent(subId, type, task, this.state.getSystemPrompt());
      this.subagents.push(sub);
      this.activeSessionIndex = this.subagents.length;
      this.broadcastState();

      sub.run(toolsList, () => {
        this.broadcastState();
      });
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    this.state.addMessage(userMsg);
    this.messages.push(userMsg);
    this.broadcastState();

    await this.runAgentLoop();

    const compacted = await globalCompactor.checkAndCompact(this.state);
    if (compacted) {
      this.messages = this.state.getMessages();
      this.broadcastState();
    }
  }

  private async runAgentLoop() {
    this.status = "thinking";
    this.broadcastState();

    // Automated Forking on message volume
    if (this.state.getMessages().length > 12 && this.subagents.length === 0) {
      const subId = `sub_auto_${Date.now()}`;
      const sub = new ScopedSubagent(subId, "explore", "Automated context analysis & indexing", this.state.getSystemPrompt());
      this.subagents.push(sub);
      this.broadcastState();
      sub.run(toolsList, () => {
        this.broadcastState();
      });
    }

    this.retryCount = 0;

    try {
      let loop = true;
      while (loop) {
        const allAvailableTools = [...toolsList, ...dynamicMcpTools];
        const response = await this.client.sendRequest(
          this.state.getSystemPrompt(),
          this.state.getMessages(),
          allAvailableTools
        );

        let turnEnded = false;

        if (typeof response.content === "string") {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          this.state.addMessage(assistantMsg);
          this.messages.push(assistantMsg);
          this.broadcastState();

          if (response.stopReason === "end_turn") {
            turnEnded = true;
          }
        } else {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          this.state.addMessage(assistantMsg);
          this.messages.push(assistantMsg);
          this.broadcastState();

          const toolCalls = response.content.filter(block => block.type === "tool_use") as any[];

          if (toolCalls.length === 0) {
            turnEnded = true;
          } else {
            const toolResults: any[] = [];
            for (const call of toolCalls) {
              const allAvailableTools = [...toolsList, ...dynamicMcpTools];
              const tool = allAvailableTools.find(t => t.name === call.name);
              if (!tool) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Error: Tool '${call.name}' not found.`,
                  is_error: true
                });
                continue;
              }

              this.status = "executing_tool";
              this.currentToolProgress = `Verifying permissions for ${tool.name}...`;
              this.broadcastState();
              
              const allowed = await this.gate.check(tool, call.input);

              // ── Phase 4: Mode-Based Tool Execution Permission Restrictions ──
              let modeBlocked = false;
              let modeBlockReason = "";

              if (this.activeAgent === "Plan") {
                const allowedPlanTools = ["grep_search", "list_directory", "read_file", "view_code_outline"];
                if (!allowedPlanTools.includes(tool.name)) {
                  modeBlocked = true;
                  modeBlockReason = `Plan Mode deactivates non-indexing tool executions to prevent structural drift.`;
                }
              } else if (this.activeAgent === "Hardening Agent") {
                if (["write_file", "edit_file", "apply_multi_diff"].includes(tool.name)) {
                  const pathsToCheck: string[] = [];
                  if (tool.name === "apply_multi_diff" && call.input?.edits) {
                    for (const ed of call.input.edits) {
                      if (ed.path) pathsToCheck.push(ed.path);
                    }
                  } else if (call.input?.path) {
                    pathsToCheck.push(call.input.path);
                  } else if (call.input?.TargetFile) {
                    pathsToCheck.push(call.input.TargetFile);
                  }

                  const isSecurityConfig = (p: string) => {
                    const base = path.basename(p).toLowerCase();
                    return base === "agents.md" || base === "agent.md" || base === ".gitignore" || p.includes(".agents");
                  };

                  const allSecurity = pathsToCheck.every(isSecurityConfig);
                  if (!allSecurity) {
                    modeBlocked = true;
                    modeBlockReason = `Hardening Mode restricts file writes to security configuration files only.`;
                  }
                }
              }

              if (modeBlocked) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Mode Restriction: ${modeBlockReason}`,
                  is_error: true
                });
                continue;
              }

              // ── Phase 4: beforeToolCall lifecycle hook ──────────────────
              const hookResult = await globalPluginManager.runHook("beforeToolCall", { tool: tool.name, input: call.input });
              if (!hookResult.proceed) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Blocked by plugin: ${hookResult.blocked}`,
                  is_error: true
                });
                continue;
              }
              
              if (!allowed) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Permission denied to run tool ${tool.name}.`,
                  is_error: true
                });
                continue;
              }

              this.currentToolProgress = `Executing ${tool.name}...`;
              this.broadcastState();

              const res = await tool.execute(call.input);

              // ── Epic 2: Connect didChange / didOpen notification synchronization ──
              if (res && !res.isError) {
                if (tool.name === "write_file" && call.input?.TargetFile && call.input?.CodeContent) {
                  globalLspManager.notifyFileChanged(call.input.TargetFile, call.input.CodeContent);
                } else if (tool.name === "edit_file" && call.input?.path) {
                  try {
                    const content = fs.readFileSync(call.input.path, "utf-8");
                    globalLspManager.notifyFileChanged(call.input.path, content);
                  } catch (_) {}
                } else if (tool.name === "apply_multi_diff" && call.input?.edits) {
                  for (const ed of call.input.edits) {
                    if (ed.path) {
                      try {
                        const content = fs.readFileSync(ed.path, "utf-8");
                        globalLspManager.notifyFileChanged(ed.path, content);
                      } catch (_) {}
                    }
                  }
                }
              }

              // ── Phase 4: afterToolCall lifecycle hook ───────────────────
              const { payload: finalResult } = await globalPluginManager.runHook("afterToolCall", res);

              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: finalResult.content ?? res.content,
                is_error: finalResult.isError ?? res.isError
              });
              
              this.tasks = globalScheduler.getTasks();
              this.broadcastState();
            }

            const toolMsg: Message = {
              role: "user",
              content: toolResults
            };
            this.state.addMessage(toolMsg);
            this.messages.push(toolMsg);
            this.broadcastState();
          }
        }

        // ── Phase 3: Recursive Test-Driven Self-Correction Loop ──
        if (turnEnded) {
          const directives = loadProjectDirectives();
          if (directives.testCommand && this.retryCount < this.maxRetries) {
            this.status = "executing_tool";
            this.currentToolProgress = `Running tests: ${directives.testCommand}...`;
            this.broadcastState();
            
            const isWindows = process.platform === "win32";
            const shell = isWindows ? "powershell.exe" : "bash";
            const cmdArgs = isWindows ? ["-Command", directives.testCommand] : ["-c", directives.testCommand];
            
            const proc = Bun.spawn({
              cmd: [shell, ...cmdArgs],
              stdout: "pipe",
              stderr: "pipe"
            });
            
            const exitCode = await proc.exited;
            
            if (exitCode !== 0) {
              const errText = await new Response(proc.stderr).text();
              const outText = await new Response(proc.stdout).text();
              const failureLog = errText || outText;
              
              this.retryCount++;
              
              const systemMsg: Message = {
                role: "system",
                content: `Test failure detected (Exit code: ${exitCode}) after running: ${directives.testCommand}\n` +
                         `[Self-Correction Cycle ${this.retryCount}/${this.maxRetries}]\n` +
                         `Console Output:\n${failureLog}`
              };
              this.state.addMessage(systemMsg);
              this.messages.push(systemMsg);
              this.broadcastState();
              
              loop = true;
              this.status = "thinking";
            } else {
              loop = false;
            }
          } else {
            loop = false;
          }
        }
      }
    } catch (err: any) {
      const errMessage: Message = { role: "system", content: `System Error: ${err.message}` };
      this.state.addMessage(errMessage);
      this.messages.push(errMessage);
      this.broadcastState();
    } finally {
      this.status = "idle";
      this.currentToolProgress = "";
      this.tasks = globalScheduler.getTasks();
      this.broadcastState();
    }
  }
}
