import * as React from "react";
import { render, Box, Text } from "ink";
import { ConversationState, Message, ContentBlock } from "./state/engine.ts";
import { LLMClient } from "./llm/client.ts";
import { DefaultPermissionGate } from "./permissions/middleware.ts";
import { readFileTool, writeFileTool, editFileTool, listDirectoryTool, grepSearchTool } from "./tools/fileTools.ts";
import { executeBashTool } from "./tools/bashTool.ts";
import { loadProjectDirectives } from "./config/directives.ts";
import { ChatMessage, InteractiveInput, PermissionPrompt } from "./ui/Canvas.tsx";

const toolsList = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  grepSearchTool,
  executeBashTool
];

const HyprApp: React.FC = () => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [status, setStatus] = React.useState<"idle" | "thinking" | "prompting_permission" | "executing_tool">("idle");
  const [permissionMsg, setPermissionMsg] = React.useState("");
  const [currentToolProgress, setCurrentToolProgress] = React.useState("");

  // Refs to hold conversation state and permission resolver
  const stateRef = React.useRef<ConversationState>(new ConversationState());
  const permissionResolverRef = React.useRef<((allowed: boolean) => void) | null>(null);
  const clientRef = React.useRef<LLMClient>(new LLMClient());

  // Setup permission gate
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
    // 1. Load project directives
    const directives = loadProjectDirectives();
    let sysPrompt = "You are Hypr, a powerful CLI agentic coding assistant designed to solve developer tasks.\n" +
      "You have direct access to the filesystem and system execution. Work step-by-step to complete the task.\n";
    
    if (directives.rules) {
      sysPrompt += `\nProject architectural guidelines & rules:\n${directives.rules}\n`;
    }
    
    stateRef.current.setSystemPrompt(sysPrompt);
    setMessages(stateRef.current.getMessages());

    // Print welcome message
    console.log(`⚡ Hypr CLI Initialized (LLM Provider: ${clientRef.current.getProviderName()})`);
    if (directives.rules) {
      console.log(`📋 Found project directives. Rules loaded.`);
    }
  }, []);

  const handleUserInput = async (text: string) => {
    if (status !== "idle") return;

    // Add user message
    const userMsg: Message = { role: "user", content: text };
    stateRef.current.addMessage(userMsg);
    setMessages([...stateRef.current.getMessages()]);
    
    // Start thinking loop
    await runAgentLoop();
  };

  const runAgentLoop = async () => {
    setStatus("thinking");

    try {
      let loop = true;
      while (loop) {
        // Send request to LLM
        const response = await clientRef.current.sendRequest(
          stateRef.current.getSystemPrompt(),
          stateRef.current.getMessages(),
          toolsList
        );

        // 1. Text content
        if (typeof response.content === "string") {
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);
          
          if (response.stopReason === "end_turn") {
            loop = false;
          }
        } else {
          // Assistant returned content blocks (potentially with tool_use)
          const assistantMsg: Message = { role: "assistant", content: response.content };
          stateRef.current.addMessage(assistantMsg);
          setMessages([...stateRef.current.getMessages()]);

          const toolCalls = response.content.filter(block => block.type === "tool_use") as any[];
          
          if (toolCalls.length === 0) {
            loop = false;
          } else {
            // Process tool calls sequentially
            const toolResults: any[] = [];
            for (const call of toolCalls) {
              const tool = toolsList.find(t => t.name === call.name);
              if (!tool) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Error: Tool '${call.name}' not found.`,
                  is_error: true
                });
                continue;
              }

              // Check permissions middleware
              setStatus("executing_tool");
              setCurrentToolProgress(`Verifying permissions for ${tool.name}...`);
              const allowed = await gateRef.current.check(tool, call.input);
              
              if (!allowed) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Permission denied to run tool ${tool.name}.`,
                  is_error: true
                });
                continue;
              }

              // Execute tool
              setCurrentToolProgress(`Executing ${tool.name}...`);
              const res = await tool.execute(call.input);
              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: res.content,
                is_error: res.isError
              });
            }

            // Append all tool results
            const toolMsg: Message = {
              role: "user", // Anthropic treats tool result sender as user role
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

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
      </Box>

      {status === "thinking" && (
        <Box marginY={1}>
          <Text color="yellow" bold>⏳ Thinking...</Text>
        </Box>
      )}

      {status === "executing_tool" && (
        <Box marginY={1}>
          <Text color="blue" bold>⚙️ {currentToolProgress}</Text>
        </Box>
      )}

      {status === "prompting_permission" && (
        <PermissionPrompt message={permissionMsg} onDecision={handlePermissionDecision} />
      )}

      {status === "idle" && <InteractiveInput onSubmit={handleUserInput} />}
    </Box>
  );
};

render(<HyprApp />);
