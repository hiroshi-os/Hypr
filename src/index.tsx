import * as React from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { ConversationState, Message } from "./state/engine.ts";
import { LLMClient } from "./llm/client.ts";
import { DefaultPermissionGate } from "./permissions/middleware.ts";
import { readFileTool, writeFileTool, editFileTool, listDirectoryTool, grepSearchTool } from "./tools/fileTools.ts";
import { executeBashTool } from "./tools/bashTool.ts";
import { viewCodeOutlineTool } from "./tools/outlineTool.ts";
import { applyMultiDiffTool } from "./tools/multiDiffTool.ts";
import { scheduleTasksTool, updateTaskStatusTool, globalScheduler } from "./state/scheduler.ts";
import { connectMcpServerTool, dynamicMcpTools } from "./tools/mcpTool.ts";
import { scanComplianceTool } from "./tools/complianceTool.ts";
import { registerExtensionTool } from "./tools/extensionTool.ts";
import { generateDiagnosticBundleTool } from "./tools/diagnosticTool.ts";
import { globalPluginManager, PluginLog } from "./plugins/manager.ts";
import { loadProjectDirectives } from "./config/directives.ts";
import { ChatMessage, InteractiveInput, SessionInput, PermissionPrompt, Sidebar, WelcomeLogo } from "./ui/Canvas.tsx";

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
  // Phase 4: Platform hardening tools
  scanComplianceTool,
  registerExtensionTool,
  generateDiagnosticBundleTool,
];

const HyprApp: React.FC = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [status, setStatus] = React.useState<"idle" | "thinking" | "prompting_permission" | "executing_tool">("idle");
  const [permissionMsg, setPermissionMsg] = React.useState("");
  const [currentToolProgress, setCurrentToolProgress] = React.useState("");
  const [tasks, setTasks] = React.useState(globalScheduler.getTasks());
  const [rulesFound, setRulesFound] = React.useState(false);
  const [pluginLogs, setPluginLogs] = React.useState<PluginLog[]>([]);

  const stateRef = React.useRef<ConversationState>(new ConversationState());
  const permissionResolverRef = React.useRef<((allowed: boolean) => void) | null>(null);
  const clientRef = React.useRef<LLMClient>(new LLMClient());

  const gateRef = React.useRef(
    new DefaultPermissionGate(false, async (msg) => {
      setStatus("prompting_permission");
      setPermissionMsg(msg);
      return new Promise<boolean>((resolve) => {
        permissionResolverRef.current = resolve;
      });
    })
  );

  React.useEffect(() => {
    const directives = loadProjectDirectives();
    let sysPrompt = "You are Hypr, a powerful CLI agentic coding assistant designed to solve developer tasks.\n" +
      "You have direct access to the filesystem and system execution. Work step-by-step to complete the task.\n";
    
    if (directives.rules) {
      sysPrompt += `\nProject architectural guidelines & rules:\n${directives.rules}\n`;
      setRulesFound(true);
    }
    
    stateRef.current.setSystemPrompt(sysPrompt);
    setMessages(stateRef.current.getMessages());
  }, []);

  const handleUserInput = async (text: string) => {
    if (status !== "idle") return;

    if (text.trim().toLowerCase() === "exit" || text.trim().toLowerCase() === "quit") {
      process.exit(0);
    }

    const userMsg: Message = { role: "user", content: text };
    stateRef.current.addMessage(userMsg);
    setMessages([...stateRef.current.getMessages()]);
    
    await runAgentLoop();
  };

  const runAgentLoop = async () => {
    setStatus("thinking");

    try {
      let loop = true;
      while (loop) {
        const allAvailableTools = [...toolsList, ...dynamicMcpTools];
        const response = await clientRef.current.sendRequest(
          stateRef.current.getSystemPrompt(),
          stateRef.current.getMessages(),
          allAvailableTools
        );

        if (typeof response.content === "string") {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);
          
          if (response.stopReason === "end_turn") {
            loop = false;
          }
        } else {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);

          const toolCalls = response.content.filter(block => block.type === "tool_use") as any[];
          
          if (toolCalls.length === 0) {
            loop = false;
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

              setStatus("executing_tool");
              setCurrentToolProgress(`Verifying permissions for ${tool.name}...`);
              const allowed = await gateRef.current.check(tool, call.input);

              // ── Phase 4: beforeToolCall lifecycle hook ──────────────────
              const hookResult = await globalPluginManager.runHook("beforeToolCall", { tool: tool.name, input: call.input });
              setPluginLogs(globalPluginManager.getLogs());

              if (!hookResult.proceed) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Blocked by plugin: ${hookResult.blocked}`,
                  is_error: true
                });
                continue;
              }
              // ──────────────────────────────────────────────────────────
              
              if (!allowed) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Permission denied to run tool ${tool.name}.`,
                  is_error: true
                });
                continue;
              }

              setCurrentToolProgress(`Executing ${tool.name}...`);
              const res = await tool.execute(call.input);

              // ── Phase 4: afterToolCall lifecycle hook ───────────────────
              const { payload: finalResult } = await globalPluginManager.runHook("afterToolCall", res);
              setPluginLogs(globalPluginManager.getLogs());
              // ──────────────────────────────────────────────────────────

              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: finalResult.content ?? res.content,
                is_error: finalResult.isError ?? res.isError
              });
              
              setTasks(globalScheduler.getTasks());
            }

            const toolMsg: Message = {
              role: "user",
              content: toolResults
            };
            stateRef.current.addMessage(toolMsg);
            setMessages([...stateRef.current.getMessages()]);
          }
        }
      }
    } catch (err: any) {
      const errMessage: Message = { role: "system", content: `System Error: ${err.message}` };
      stateRef.current.addMessage(errMessage);
      setMessages([...stateRef.current.getMessages()]);
    } finally {
      setStatus("idle");
      setCurrentToolProgress("");
      setTasks(globalScheduler.getTasks());
    }
  };

  const handlePermissionDecision = (allowed: boolean) => {
    if (permissionResolverRef.current) {
      permissionResolverRef.current(allowed);
      permissionResolverRef.current = null;
      setStatus("thinking");
      setPermissionMsg("");
    }
  };

  const provider = clientRef.current.getProviderName();
  const modelName = provider === "anthropic" ? "Claude 3.5 Sonnet" : 
                    provider === "gemini" ? "Gemini 2.5 Flash" : "GPT-5.2 Codex";

  const hasSession = messages.length > 0;

  // Welcome screen: centered logo + input, no sidebar
  if (!hasSession && status === "idle") {
    return (
      <box flexDirection="column" width="100%" height="100%" alignItems="center" justifyContent="center">
        <WelcomeLogo />
        <box width={60}>
          <InteractiveInput onSubmit={handleUserInput} modelName={modelName} />
        </box>
      </box>
    );
  }

  // Active session: two-column flat layout
  return (
    <box flexDirection="row" width="100%" height="100%">
      {/* Left pane — chat + input */}
      <box flexDirection="column" width="65%" paddingLeft={1} paddingTop={1}>
        <box flexDirection="column" flexGrow={1}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {(status === "thinking" || status === "executing_tool") && (
            <box paddingLeft={2} marginBottom={1}>
              <text fg="yellow" style={{ italic: true }}>Thinking: </text>
              <text fg="gray">{status === "executing_tool" ? currentToolProgress : "Processing your request..."}</text>
            </box>
          )}
        </box>

        {status === "prompting_permission" && (
          <PermissionPrompt message={permissionMsg} onDecision={handlePermissionDecision} />
        )}

        {status === "idle" && (
          <SessionInput onSubmit={handleUserInput} modelName={modelName} status="idle" />
        )}
      </box>

      {/* Right pane — context sidebar */}
      <box width="35%">
      <Sidebar
          tasks={tasks}
          modelName={modelName}
          provider={provider}
          cwd={process.cwd()}
          rulesFound={rulesFound}
          pluginLogs={pluginLogs}
        />
      </box>
    </box>
  );
};

// Initialize native OpenTUI core CLI Renderer
const renderer = await createCliRenderer({
  screenMode: "alternate-screen",
  exitOnCtrlC: true
});

createRoot(renderer).render(<HyprApp />);
