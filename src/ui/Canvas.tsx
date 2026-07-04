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
  // Borderless, monochrome right sidebar pane
  return (
    <Box flexDirection="column" padding={1} minHeight={20} borderStyle="classic" borderColor="gray">
      <Text color="white" bold>Hypr Companion</Text>
      <Text color="gray" dimColor>─────────────────────────</Text>
      
      <Box flexDirection="column" marginY={1}>
        <Text color="white" bold>Context</Text>
        <Text color="gray">Model: <Text color="white">{modelName}</Text></Text>
        <Text color="gray">Provider: <Text color="white">{provider}</Text></Text>
        <Text color="gray">Tokens: <Text color="white">14,250 tokens</Text></Text>
        <Text color="gray">Rules: <Text color="white">{rulesFound ? "DEVELOPER.md active" : "None discovered"}</Text></Text>
      </Box>
      
      <Box flexDirection="column" marginY={1}>
        <Text color="white" bold>LSP</Text>
        <Text color="gray" dimColor>LSPs active for TS, Python, Go, Rust</Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="white" bold>Tasks ({tasks.length})</Text>
        {tasks.length === 0 ? (
          <Text color="gray" italic>No active tasks.</Text>
        ) : (
          tasks.map(t => {
            let statusIcon = "○";
            let color = "gray";
            if (t.status === "completed") { statusIcon = "●"; color = "white"; }
            else if (t.status === "running") { statusIcon = "▶"; color = "white"; }
            else if (t.status === "failed") { statusIcon = "×"; color = "gray"; }
            return (
              <Box key={t.id} paddingLeft={1}>
                <Text color={color}>{statusIcon} {t.title}</Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box flexGrow={1} />
      
      <Box flexDirection="column" marginY={1}>
        <Text color="gray" dimColor>{cwd}</Text>
        <Text color="gray" bold>● Hypr 3.0.0</Text>
      </Box>
    </Box>
  );
};

export const WelcomeLogo: React.FC = () => {
  return (
    <Box flexDirection="column" alignItems="center" marginY={3}>
      <Text color="white" bold>
{`
.---.  .---.  .---. .---.  .---. .---.  .---.  .---.
|   |  |   |  |   | |   |  |   | |   |  |   |  |   |
|   '--'   |  |   '-'   |  |   '--'  |  |   '--'   |
'----------'  '---------'  '---------'  '----------'
  H   Y   P   R       C   O   M   P   A   N   I   O   N
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
        <Text color="white" bold>👤 you:</Text>
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
        <Text color="gray" bold>🤖 hypr:</Text>
        <Text color="white">{message.content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="gray" bold>🤖 hypr:</Text>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return <Text key={idx} color="white">{block.text}</Text>;
        } else if (block.type === "tool_use") {
          return (
            <Box key={idx} marginY={1} paddingLeft={2} borderStyle="classic" borderColor="gray">
              <Text color="white" bold>Calling Tool: {block.name}</Text>
              <Text color="gray">{JSON.stringify(block.input, null, 2)}</Text>
            </Box>
          );
        } else if (block.type === "tool_result") {
          return (
            <Box key={idx} paddingLeft={2}>
              <Text color="gray" bold>
                {block.is_error ? "× Tool Failed" : "● Tool Completed"} (ID: {block.tool_use_id})
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
      <Box flexDirection="column" borderStyle="single" borderColor="gray" padding={1}>
        <Box flexDirection="row">
          <Text color="gray" bold>Ask anything... </Text>
          <Text color="white">{value}</Text>
          <Text color="gray" dimColor>_</Text>
        </Box>
        <Box marginY={1} />
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="gray">Sisyphus <Text color="white">{modelName} (OAuth)</Text> OpenAI</Text>
          <Text color="white">medium</Text>
        </Box>
      </Box>
      <Box justifyContent="center" marginY={1}>
        <Text color="gray" dimColor>ctrl+t variants  •  tab agents  •  ctrl+p commands</Text>
      </Box>
      <Box justifyContent="center">
        <Text color="gray">● Tip <Text color="gray" dimColor>Create a plugin to prevent Hypr from reading sensitive files</Text></Text>
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
    <Box flexDirection="column" marginY={1} padding={1} borderStyle="classic" borderColor="gray">
      <Text color="white" bold>⚠️ Security Authorization Required</Text>
      <Text color="white">{message}</Text>
      <Text color="gray" bold>Press [y] to Allow or [n] to Deny</Text>
    </Box>
  );
};
