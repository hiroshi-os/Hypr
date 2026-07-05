import * as React from "react";
import { TaskNode } from "../state/scheduler.ts";
import { Message, ContentBlock } from "../state/engine.ts";

export interface SidebarProps {
  tasks: TaskNode[];
  modelName: string;
  provider: string;
  cwd: string;
  rulesFound: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ tasks, modelName, provider, cwd, rulesFound }) => {
  return (
    <box 
      flexDirection="column" 
      paddingLeft={2} 
      paddingRight={2}
      paddingTop={1} 
      height="100%"
      backgroundColor="#121214"
    >
      <box flexDirection="column" marginBottom={1}>
        <text fg="white">Go CLI for agentic</text>
        <text fg="white">development tasks</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg="white" style={{ weight: "bold" }}>Context</text>
        <text fg="gray">20,674 tokens</text>
        <text fg="gray">0% used</text>
        <text fg="gray">$0.00 spent</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg="white" style={{ weight: "bold" }}>LSP</text>
        <text fg="gray">LSPs will activate as files are read</text>
      </box>

      {tasks.length > 0 && (
        <box flexDirection="column" marginBottom={1}>
          <text fg="white" style={{ weight: "bold" }}>Tasks</text>
          {tasks.map(t => {
            let icon = "○";
            if (t.status === "completed") icon = "●";
            else if (t.status === "running") icon = "▶";
            else if (t.status === "failed") icon = "×";
            return (
              <text key={t.id} fg="gray">  {icon} {t.title}</text>
            );
          })}
        </box>
      )}

      <box flexGrow={1} />

      <box flexDirection="column" marginBottom={1}>
        <text fg="gray">{cwd}</text>
        <text fg="gray"><span fg="#e8a838">●</span> Hypr 3.0.0</text>
      </box>
    </box>
  );
};

export const WelcomeLogo: React.FC = () => {
  return (
    <box flexDirection="column" alignItems="center" marginTop={4} marginBottom={2}>
      <text fg="gray">
{`
 █ █ █   █ █ █   █ █ █   █ █ █
 █   █   █   █   █   █   █   █
 █   █   █   █   █   █   █   █
 █ █ █   █ █ █   █ █ █   █ █ █
`}
      </text>
      <text fg="gray">           H Y P R</text>
    </box>
  );
};

export interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.role === "system") {
    return (
      <box marginBottom={1} paddingLeft={2}>
        <text fg="gray" style={{ italic: true }}>
          {typeof message.content === "string" ? message.content : JSON.stringify(message.content)}
        </text>
      </box>
    );
  }

  if (message.role === "user") {
    return (
      <box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <text fg="white">
          {typeof message.content === "string" 
            ? message.content 
            : message.content.map(c => c.type === "text" ? c.text : "").join("")}
        </text>
      </box>
    );
  }

  // Assistant message
  if (typeof message.content === "string") {
    return (
      <box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <text fg="white">{message.content}</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" marginBottom={1} paddingLeft={2}>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return <text key={idx} fg="white">{block.text}</text>;
        } else if (block.type === "tool_use") {
          return (
            <box key={idx} flexDirection="column" marginTop={1} padding={1} backgroundColor="#1a1a1e">
              <text fg="#e8a838" style={{ weight: "bold" }}>{block.name}</text>
              <text fg="gray">{JSON.stringify(block.input, null, 2)}</text>
            </box>
          );
        } else if (block.type === "tool_result") {
          const truncated = block.content.length > 300 ? block.content.slice(0, 300) + "..." : block.content;
          return (
            <box key={idx} flexDirection="column" marginTop={1} padding={1} backgroundColor="#1a1a1e">
              <text fg={block.is_error ? "red" : "green"} style={{ weight: "bold" }}>
                {block.is_error ? "Error" : "Done"}
              </text>
              <text fg="gray">{truncated}</text>
            </box>
          );
        }
        return null;
      })}
    </box>
  );
};

export interface InteractiveInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({ onSubmit, modelName }) => {
  const [value, setValue] = React.useState("");

  const handleSubmit = (val: string) => {
    onSubmit(val);
    setValue("");
  };

  return (
    <box flexDirection="column" width="100%">
      {/* Input area with left cyan accent bar and flat zinc bg */}
      <box 
        flexDirection="row" 
        paddingY={1} 
        paddingLeft={1}
        paddingRight={1}
        width="100%" 
        backgroundColor="#18181b"
      >
        <text fg="cyan">│ </text>
        <box flexDirection="column" flexGrow={1}>
          <input
            focused={true}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder='Ask anything... "What is the tech stack of this project?"'
          />
          <box marginTop={1} flexDirection="row">
            <text fg="cyan">Sisyphus</text>
            <text fg="white">  {modelName} (OAuth)</text>
            <text fg="gray">  OpenAI · </text>
            <text fg="#e8a838">medium</text>
          </box>
        </box>
      </box>

      {/* Keyboard shortcut hints */}
      <box justifyContent="center" marginTop={1}>
        <text fg="gray" style={{ weight: "bold" }}>tab</text>
        <text fg="gray"> agents   </text>
        <text fg="gray" style={{ weight: "bold" }}>ctrl+p</text>
        <text fg="gray"> commands</text>
      </box>

      {/* Random tip */}
      <box justifyContent="center" marginTop={1}>
        <text fg="#e8a838">● </text>
        <text fg="#e8a838" style={{ weight: "bold" }}>Tip</text>
        <text fg="gray"> Create a plugin to prevent Hypr from reading sensitive files</text>
      </box>
    </box>
  );
};

export interface SessionInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
  status: string;
  elapsed?: string;
}

export const SessionInput: React.FC<SessionInputProps> = ({ onSubmit, modelName, status, elapsed }) => {
  const [value, setValue] = React.useState("");

  const handleSubmit = (val: string) => {
    onSubmit(val);
    setValue("");
  };

  return (
    <box flexDirection="column" width="100%">
      {/* Status indicator */}
      {status !== "idle" && (
        <box paddingLeft={2} marginBottom={1}>
          <text fg="blue">■</text>
          <text fg="gray">  {status === "thinking" ? "Build" : "Exec"} · </text>
          <text fg="gray"> {modelName} · {elapsed || "0.0s"}</text>
        </box>
      )}

      {/* Compact input with left cyan accent bar and flat zinc bg */}
      <box 
        flexDirection="row" 
        paddingY={1} 
        paddingLeft={1}
        paddingRight={1}
        width="100%" 
        backgroundColor="#18181b"
      >
        <text fg="cyan">│ </text>
        <box flexGrow={1}>
          <input
            focused={true}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
          />
        </box>
      </box>

      {/* Bottom status bar */}
      <box flexDirection="row" marginTop={1}>
        <text fg="green">Build</text>
        <text fg="gray">  {modelName} llama.cpp (hosted)</text>
      </box>
    </box>
  );
};

export interface PermissionPromptProps {
  message: string;
  onDecision: (allowed: boolean) => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({ message, onDecision }) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "y" || e.key === "Y") {
        onDecision(true);
      } else if (e.key === "n" || e.key === "N") {
        onDecision(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onDecision]);

  return (
    <box flexDirection="column" paddingLeft={2} paddingY={1} backgroundColor="#1e1313">
      <text fg="#e8a838" style={{ weight: "bold" }}>Allow this action?</text>
      <text fg="white">{message}</text>
      <box marginTop={1} flexDirection="row">
        <text fg="gray">[</text>
        <text fg="green" style={{ weight: "bold" }}>y</text>
        <text fg="gray">]es  [</text>
        <text fg="red" style={{ weight: "bold" }}>n</text>
        <text fg="gray">]o</text>
      </box>
    </box>
  );
};
