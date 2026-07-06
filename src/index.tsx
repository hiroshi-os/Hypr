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
import { ChatMessage, InteractiveInput, SessionInput, PermissionPrompt, Sidebar, WelcomeLogo, PickerOverlay, MODELS_LIST, AGENTS_LIST, PROVIDERS_LIST, VARIANTS_LIST, AGENT_COLORS, DEFAULT_PRIMARY } from "./ui/Canvas.tsx";

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
  const [activePicker, setActivePicker] = React.useState<"models" | "agents" | "providers" | "variant" | null>(null);
  const [activeAgent, setActiveAgent] = React.useState("Build");
  const [activeVariant, setActiveVariant] = React.useState("medium");
  const [pickerFocusKey, setPickerFocusKey] = React.useState(0);
  const [currentModelName, setCurrentModelName] = React.useState("");

  const closePicker = React.useCallback(() => {
    setActivePicker(null);
    setPickerFocusKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    const provider = clientRef.current.getProviderName();
    const name = provider === "anthropic" ? "Claude 3.5 Sonnet" : 
                 provider === "gemini" ? "Gemini 2.5 Flash" : "GPT-5.2 Codex";
    setCurrentModelName(name);
  }, []);

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

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    if (lower === "exit" || lower === "quit" || lower === "/exit") {
      process.exit(0);
    }

    if (lower === "/new") {
      stateRef.current = new ConversationState();
      setMessages([]);
      return;
    }

    if (lower === "/models") {
      setActivePicker("models");
      return;
    }

    if (lower === "/agents") {
      setActivePicker("agents");
      return;
    }

    if (lower === "/connect") {
      setActivePicker("providers");
      return;
    }

    if (lower === "/variant") {
      setActivePicker("variant");
      return;
    }

    if (lower === "/help") {
      const helpText = "Available Slash Commands:\n" +
        "  /agents    Switch agent\n" +
        "  /connect   Connect provider\n" +
        "  /editor    Open editor\n" +
        "  /exit      Exit the app\n" +
        "  /help      Help info\n" +
        "  /init      guided AGENTS.md setup\n" +
        "  /mcps      Toggle MCPs\n" +
        "  /models    Switch model\n" +
        "  /new       New session\n" +
        "  /review    review changes";
      const helpMsg: Message = { role: "system", content: helpText };
      stateRef.current.addMessage(helpMsg);
      setMessages([...stateRef.current.getMessages()]);
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    stateRef.current.addMessage(userMsg);
    setMessages([...stateRef.current.getMessages()]);
    
    await runAgentLoop();
  };

  const runAgentLoop = async () => {
    setStatus("thinking");

    let retryCount = 0;
    const maxRetries = 5;

    try {
      let loop = true;
      while (loop) {
        const allAvailableTools = [...toolsList, ...dynamicMcpTools];
        const response = await clientRef.current.sendRequest(
          stateRef.current.getSystemPrompt(),
          stateRef.current.getMessages(),
          allAvailableTools
        );

        let turnEnded = false;

        if (typeof response.content === "string") {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);
          
          if (response.stopReason === "end_turn") {
            turnEnded = true;
          }
        } else {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);

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

        // ── Phase 3: Recursive Test-Driven Self-Correction Loop ──
        if (turnEnded) {
          const directives = loadProjectDirectives();
          if (directives.testCommand && retryCount < maxRetries) {
            setStatus("executing_tool");
            setCurrentToolProgress(`Running tests: ${directives.testCommand}...`);
            
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
              
              retryCount++;
              
              const systemMsg: Message = {
                role: "system",
                content: `Test failure detected (Exit code: ${exitCode}) after running: ${directives.testCommand}\n` +
                         `[Self-Correction Cycle ${retryCount}/${maxRetries}]\n` +
                         `Console Output:\n${failureLog}`
              };
              stateRef.current.addMessage(systemMsg);
              setMessages([...stateRef.current.getMessages()]);
              
              loop = true;
              setStatus("thinking");
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
  const hasSession = messages.length > 0;
  const isDimmed = activePicker !== null;
  const primaryColor = AGENT_COLORS[activeAgent] ?? DEFAULT_PRIMARY;

  let content;
  if (!hasSession && status === "idle") {
    content = (
      <box flexDirection="column" width="100%" height="100%" alignItems="center">
        <box flexGrow={1} />
        <WelcomeLogo dimmed={isDimmed} />
        <box width={85} marginBottom={4} flexShrink={0}>
          <InteractiveInput
            onSubmit={handleUserInput}
            modelName={currentModelName}
            providerName={provider}
            activeAgent={activeAgent}
            activeVariant={activeVariant}
            primaryColor={primaryColor}
            onOpenModelPicker={() => setActivePicker("models")}
            onOpenAgentPicker={() => setActivePicker("agents")}
            onOpenProviderPicker={() => setActivePicker("providers")}
            onOpenVariantPicker={() => setActivePicker("variant")}
            dimmed={isDimmed}
            focusKey={pickerFocusKey}
          />
        </box>
        <box flexGrow={2} />
      </box>
    );
  } else {
    content = (
      <box flexDirection="row" width="100%" height="100%">
        {/* Left Column: Chat Stream & Active Input Bar */}
        <box flexDirection="column" width="75%" paddingRight={4}>
          <box flexDirection="column" flexGrow={1} overflowY="scroll">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} dimmed={isDimmed} />
            ))}

            {(status === "thinking" || status === "executing_tool") && (
              <box paddingLeft={2} marginBottom={1}>
                <text fg={isDimmed ? "gray" : "yellow"} style={{ italic: true }}>Thinking: </text>
                <text fg="gray">{status === "executing_tool" ? currentToolProgress : "Processing your request..."}</text>
              </box>
            )}
          </box>

          {status === "prompting_permission" && (
            <PermissionPrompt message={permissionMsg} onDecision={handlePermissionDecision} />
          )}

          {status === "idle" && (
            <box flexShrink={0}>
              <SessionInput
                onSubmit={handleUserInput}
                modelName={currentModelName}
                providerName={provider}
                activeAgent={activeAgent}
                activeVariant={activeVariant}
                primaryColor={primaryColor}
                status="idle"
                onOpenModelPicker={() => setActivePicker("models")}
                onOpenAgentPicker={() => setActivePicker("agents")}
                onOpenProviderPicker={() => setActivePicker("providers")}
                onOpenVariantPicker={() => setActivePicker("variant")}
                dimmed={isDimmed}
                focusKey={pickerFocusKey}
              />
            </box>
          )}
        </box>

        {/* Right Column: Borderless Context HUD */}
        <box width="25%">
          <Sidebar
            tasks={tasks}
            modelName={currentModelName}
            provider={provider}
            cwd={process.cwd()}
            rulesFound={rulesFound}
            pluginLogs={pluginLogs}
            messages={messages}
            activeAgent={activeAgent}
            dimmed={isDimmed}
          />
        </box>
      </box>
    );
  }

  const handleSelectModel = (model: any) => {
    clientRef.current.setProvider(model.provider as any);
    clientRef.current.setModelName(model.model);
    setCurrentModelName(model.name);
    closePicker();
  };

  const handleSelectAgent = (agent: any) => {
    setActiveAgent(agent.name);
    closePicker();
  };

  const handleSelectProvider = (prov: any) => {
    closePicker();
    const systemMsg: Message = {
      role: "system",
      content: `System: Provider connected to ${prov.name}`
    };
    stateRef.current.addMessage(systemMsg);
    setMessages([...stateRef.current.getMessages()]);
  };

  const handleSelectVariant = (variant: any) => {
    setActiveVariant(variant.name);
    closePicker();
  };

  return (
    <box width="100%" height="100%" flexDirection="column">
      <box flexGrow={1} width="100%" height="100%">
        {content}
      </box>

      {/* Footer bar showing working dir and version */}
      <box flexDirection="row" width="100%" justifyContent="space-between" flexShrink={0} marginTop={1}>
        <text fg={isDimmed ? "gray" : "gray"}>{process.cwd()}:main</text>
        <text fg={isDimmed ? "gray" : "gray"}>1.15.7</text>
      </box>

      {activePicker === "models" && (
        <PickerOverlay
          title="Select model"
          items={MODELS_LIST}
          onSelect={handleSelectModel}
          onClose={closePicker}
        />
      )}

      {activePicker === "agents" && (
        <PickerOverlay
          title="Select agent"
          items={AGENTS_LIST}
          onSelect={handleSelectAgent}
          onClose={closePicker}
        />
      )}

      {activePicker === "providers" && (
        <PickerOverlay
          title="Connect a provider"
          items={PROVIDERS_LIST}
          onSelect={handleSelectProvider}
          onClose={closePicker}
        />
      )}

      {activePicker === "variant" && (
        <PickerOverlay
          title="Select variant"
          items={VARIANTS_LIST}
          onSelect={handleSelectVariant}
          onClose={closePicker}
        />
      )}
    </box>
  );
};

// Initialize native OpenTUI core CLI Renderer
const renderer = await createCliRenderer({
  screenMode: "alternate-screen",
  exitOnCtrlC: true
});

createRoot(renderer).render(<HyprApp />);
