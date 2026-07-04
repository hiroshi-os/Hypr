import * as React from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Message, ContentBlock } from "../state/engine.ts";

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
        <Text color="green" bold>
          👤 You:
        </Text>
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
        <Text color="cyan" bold>
          🤖 Hypr:
        </Text>
        <Text color="white">{message.content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan" bold>
        🤖 Hypr:
      </Text>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return (
            <Text key={idx} color="white">
              {block.text}
            </Text>
          );
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
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({ onSubmit }) => {
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
    <Box flexDirection="row" marginY={1}>
      <Text color="green" bold>> </Text>
      <Text color="white">{value}</Text>
      <Text color="gray" dimColor>_</Text>
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
