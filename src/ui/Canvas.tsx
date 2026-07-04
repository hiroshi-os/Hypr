import * as React from "react";
import { Box, Text, useInput } from "ink";
import { Message, ContentBlock } from "../state/engine.ts";
import { TaskNode } from "../state/scheduler.ts";

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode-style design system:
//   - ZERO borders anywhere. No borderStyle, no borderColor.
//   - Flat surfaces separated by whitespace/padding only.
//   - Left-edge accent bar on input (single │ char in cyan).
//   - Colors: cyan for active labels, orange for emphasis, white for content,
//     gray/dim for secondary text. No emoji icons.
// ─────────────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  tasks: TaskNode[];
  modelName: string;
  provider: string;
  cwd: string;
  rulesFound: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ tasks, modelName, provider, cwd, rulesFound }) => {
  return (
    <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color="white">Go CLI for agentic</Text>
        <Text color="white">development tasks</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="white" bold>Context</Text>
        <Text color="gray">20,674 tokens</Text>
        <Text color="gray">0% used</Text>
        <Text color="gray">$0.00 spent</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color="white" bold>LSP</Text>
        <Text color="gray">LSPs will activate as files are read</Text>
      </Box>

      {tasks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="white" bold>Tasks</Text>
          {tasks.map(t => {
            let icon = "○";
            if (t.status === "completed") icon = "●";
            else if (t.status === "running") icon = "▶";
            else if (t.status === "failed") icon = "×";
            return (
              <Text key={t.id} color="gray">  {icon} {t.title}</Text>
            );
          })}
        </Box>
      )}

      <Box flexGrow={1} />

      <Box flexDirection="column">
        <Text color="gray">{cwd}</Text>
        <Text color="gray"><Text color="#e8a838">●</Text> Hypr 3.0.0</Text>
      </Box>
    </Box>
  );
};

export const WelcomeLogo: React.FC = () => {
  // OpenCode-style blocky pixel-art ASCII logo
  return (
    <Box flexDirection="column" alignItems="center" marginTop={4} marginBottom={2}>
      <Text color="gray">
{`
 █ █ █   █ █ █   █ █ █   █ █ █
 █   █   █   █   █   █   █   █
 █   █   █   █   █   █   █   █
 █ █ █   █ █ █   █ █ █   █ █ █
`}</Text>
      <Text color="gray" dimColor>
{`           H Y P R`}</Text>
    </Box>
  );
};

export interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.role === "system") {
    return (
      <Box marginBottom={1} paddingLeft={2}>
        <Text color="gray" italic>{typeof message.content === "string" ? message.content : JSON.stringify(message.content)}</Text>
      </Box>
    );
  }

  if (message.role === "user") {
    return (
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Text color="white">{typeof message.content === "string" ? message.content : message.content.map(c => c.type === "text" ? c.text : "").join("")}</Text>
      </Box>
    );
  }

  // Assistant message
  if (typeof message.content === "string") {
    return (
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Text color="white">{message.content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return <Text key={idx} color="white">{block.text}</Text>;
        } else if (block.type === "tool_use") {
          return (
            <Box key={idx} flexDirection="column" marginTop={1}>
              <Text color="#e8a838" bold>{block.name}</Text>
              <Text color="gray">{JSON.stringify(block.input, null, 2)}</Text>
            </Box>
          );
        } else if (block.type === "tool_result") {
          const truncated = block.content.length > 300 ? block.content.slice(0, 300) + "..." : block.content;
          return (
            <Box key={idx} flexDirection="column" marginTop={1}>
              <Text color={block.is_error ? "red" : "green"} bold>{block.is_error ? "Error" : "Done"}</Text>
              <Text color="gray">{truncated}</Text>
            </Box>
          );
        }
        return null;
      })}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bottom input bar — the signature OpenCode element.
// A flat dark band with a thin cyan left-edge accent bar (│ character).
// No box borders at all.
// ─────────────────────────────────────────────────────────────────────────────

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
    <Box flexDirection="column">
      {/* Input area with left cyan accent bar */}
      <Box flexDirection="row" paddingY={1}>
        <Text color="cyan">│ </Text>
        <Box flexDirection="column">
          <Text color={value ? "white" : "gray"}>{value || 'Ask anything... "What is the tech stack of this project?"'}</Text>
          <Box marginTop={1}>
            <Text color="cyan">Sisyphus</Text>
            <Text color="white">  {modelName} (OAuth)</Text>
            <Text color="gray">  OpenAI · </Text>
            <Text color="#e8a838">medium</Text>
          </Box>
        </Box>
      </Box>

      {/* Keyboard shortcut hints */}
      <Box justifyContent="center" marginTop={1}>
        <Text color="gray" bold>tab</Text>
        <Text color="gray" dimColor> agents   </Text>
        <Text color="gray" bold>ctrl+p</Text>
        <Text color="gray" dimColor> commands</Text>
      </Box>

      {/* Random tip */}
      <Box justifyContent="center" marginTop={1}>
        <Text color="#e8a838">● </Text>
        <Text color="#e8a838" bold>Tip</Text>
        <Text color="gray"> Create a plugin to prevent Hypr from reading sensitive files</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Active session bottom bar — displayed when conversation is active.
// Replaces the welcome input with a compact input strip.
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
  status: string;
  elapsed?: string;
}

export const SessionInput: React.FC<SessionInputProps> = ({ onSubmit, modelName, status, elapsed }) => {
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
    <Box flexDirection="column">
      {/* Status indicator */}
      {status !== "idle" && (
        <Box paddingLeft={2} marginBottom={1}>
          <Text color="blue">■</Text>
          <Text color="gray">  {status === "thinking" ? "Build" : "Exec"} · </Text>
          <Text color="gray" dimColor>{modelName} · {elapsed || "0.0s"}</Text>
        </Box>
      )}

      {/* Compact input */}
      <Box flexDirection="row" paddingY={1}>
        <Text color="cyan">│ </Text>
        <Text color={value ? "white" : "gray"}>{value || ""}</Text>
        <Text color="gray" dimColor>{value ? "" : "█"}</Text>
      </Box>

      {/* Bottom bar */}
      <Box>
        <Text color="green">Build</Text>
        <Text color="gray">  {modelName} llama.cpp (hosted)</Text>
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
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text color="#e8a838" bold>Allow this action?</Text>
      <Text color="white">{message}</Text>
      <Box marginTop={1}>
        <Text color="gray">[</Text>
        <Text color="green" bold>y</Text>
        <Text color="gray">]es  [</Text>
        <Text color="red" bold>n</Text>
        <Text color="gray">]o</Text>
      </Box>
    </Box>
  );
};
