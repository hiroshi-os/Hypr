import * as React from "react";
import { Box, Text, useInput } from "ink";
import { Message, ContentBlock } from "../state/engine.ts";
import { TaskNode } from "../state/scheduler.ts";

export interface SidebarProps {
  tasks: TaskNode[];
  modelName: string;
  provider: string;
  cwd: string;
  rulesFound: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ tasks, modelName, provider, cwd, rulesFound }) => {
  return (
    <Box flexDirection="column" padding={1} borderStyle="single" borderColor="cyan" minHeight={20}>
      <Text color="cyan" bold>HYPR CLI</Text>
      <Text color="gray" dimColor>-------------------------</Text>
      
      <Box flexDirection="column" marginY={1}>
        <Text color="yellow" bold>Context Status</Text>
        <Text color="white">Model: <Text color="green">{modelName}</Text></Text>
        <Text color="white">Provider: <Text color="blue">{provider}</Text></Text>
        <Text color="white">Tokens: <Text color="magenta">14,250 tokens</Text></Text>
        <Text color="white">Rules: <Text color="green">{rulesFound ? "DEVELOPER.md active" : "None discovered"}</Text></Text>
      </Box>
      
      <Box flexDirection="column" marginY={1}>
        <Text color="yellow" bold>LSP & Environment</Text>
        <Text color="gray">LSPs active for TS, Python, Go, Rust</Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="yellow" bold>Scheduled Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Text color="gray" italic>No tasks scheduled.</Text>
        ) : (
          tasks.map(t => {
            let statusIcon = "⚪";
            let color = "gray";
            if (t.status === "completed") { statusIcon = "✅"; color = "green"; }
            else if (t.status === "running") { statusIcon = "⏳"; color = "yellow"; }
            else if (t.status === "failed") { statusIcon = "❌"; color = "red"; }
            return (
              <Box key={t.id} paddingLeft={1}>
                <Text color={color}>{statusIcon} {t.title}</Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box flexGrow={1} />
      
      <Box flexDirection="column">
        <Text color="gray" dimColor>{cwd}</Text>
        <Text color="white" bold>● Hypr 2.0.0</Text>
      </Box>
    </Box>
  );
};

export const WelcomeLogo: React.FC = () => {
  return (
    <Box flexDirection="column" alignItems="center" marginY={2}>
      <Text color="cyan" bold>
{`
 ___  ___  ___ _  _    ___ ___  ___  ___
| _ \\| __| __| \\| |  / __/ _ \\|   \\| __|
|  _/| _|| _|| .\` | | (_| (_) | |) | _|
|_|  |___|___|_|\\_|  \\___\\___/|___/|___|
`}
      </Text>
    </Box>
  );
};

export interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.role === "system") {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="gray" italic>
          {typeof message.content === "string" ? message.content : JSON.stringify(message.content)}
        </Text>
      </Box>
    );
  }

  if (message.role === "user") {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="green" bold>👤 You:</Text>
        <Text color="white">
          {typeof message.content === "string" 
            ? message.content 
            : message.content.map(c => c.type === "text" ? c.text : "").join("")}
        </Text>
      </Box>
    );
  }

  // Assistant
  if (typeof message.content === "string") {
    return (
      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>🤖 Hypr:</Text>
        <Text color="white">{message.content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan" bold>🤖 Hypr:</Text>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return <Text key={idx} color="white">{block.text}</Text>;
        } else if (block.type === "tool_use") {
          return (
            <Box key={idx} marginY={1} paddingLeft={2} borderStyle="round" borderColor="yellow">
              <Text color="yellow">🛠️ Calling Tool: {block.name}</Text>
              <Text color="gray">{JSON.stringify(block.input, null, 2)}</Text>
            </Box>
          );
        } else if (block.type === "tool_result") {
          return (
            <Box key={idx} paddingLeft={2}>
              <Text color={block.is_error ? "red" : "green"}>
                {block.is_error ? "❌ Tool Failed" : "✅ Tool Completed"} (ID: {block.tool_use_id})
              </Text>
              <Text color="gray" dimColor>
                {block.content.length > 200 ? block.content.slice(0, 200) + "..." : block.content}
              </Text>
            </Box>
          );
        }
        return null;
      })}
    </Box>
  );
};

export interface InteractiveInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({ onSubmit, modelName }) => {
  const [value, setValue] = React.useState("");

  useInput((input, key) => {
    if (key.return) {
      if (value.trim()) {
        onSubmit(value);
        setValue("");
      }
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (!key.meta && !key.ctrl && input) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
        <Box flexDirection="row">
          <Text color="green" bold>> </Text>
          <Text color="white">{value}</Text>
          <Text color="gray" dimColor>_</Text>
        </Box>
        <Box marginY={1} />
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="blue">Sisyphus <Text color="green">{modelName} (OAuth)</Text> OpenAI</Text>
          <Text color="yellow">medium</Text>
        </Box>
      </Box>
      <Box justifyContent="center" marginY={1}>
        <Text color="gray">ctrl+t variants  •  tab agents  •  ctrl+p commands</Text>
      </Box>
      <Box justifyContent="center">
        <Text color="yellow">● Tip <Text color="white">Create a plugin to prevent Hypr from reading sensitive files</Text></Text>
      </Box>
    </Box>
  );
};

export interface PermissionPromptProps {
  message: string;
  onDecision: (allowed: boolean) => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({ message, onDecision }) => {
  useInput((input) => {
    if (input.toLowerCase() === "y") {
      onDecision(true);
    } else if (input.toLowerCase() === "n") {
      onDecision(false);
    }
  });

  return (
    <Box flexDirection="column" marginY={1} padding={1} borderStyle="double" borderColor="red">
      <Text color="red" bold>⚠️ Security Authorization Required</Text>
      <Text color="white">{message}</Text>
      <Text color="yellow" bold>Press [y] to Allow or [n] to Deny</Text>
    </Box>
  );
};
