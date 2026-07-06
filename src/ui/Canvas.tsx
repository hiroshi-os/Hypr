import * as React from "react";
import { TaskNode } from "../state/scheduler.ts";
import { Message, ContentBlock } from "../state/engine.ts";
import { PluginLog } from "../plugins/manager.ts";

export interface SidebarProps {
  tasks: TaskNode[];
  modelName: string;
  provider: string;
  cwd: string;
  rulesFound: boolean;
  pluginLogs?: PluginLog[];
  messages?: Message[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  modelName,
  provider,
  cwd,
  rulesFound,
  pluginLogs,
  messages,
}) => {
  // Count approx tokens
  let totalChars = 0;
  if (messages) {
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        totalChars += msg.content.length;
      } else {
        for (const block of msg.content) {
          if (block.type === "text") {
            totalChars += block.text.length;
          } else if (block.type === "tool_result") {
            totalChars += block.content.length;
          }
        }
      }
    }
  }
  const sessionTokens = 20674 + Math.round(totalChars / 4);
  const percentUsed = Math.min(
    100,
    parseFloat(((sessionTokens / 200000) * 100).toFixed(2)),
  );
  const spent = (sessionTokens * 0.000003).toFixed(2); // ~ $3.00 per million tokens input rate approx

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      height="100%"
    >
      <box flexDirection="column" marginBottom={1}>
        <text fg="white">Go CLI for agentic</text>
        <text fg="white">development tasks</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg="white" style={{ weight: "bold" }}>
          Context
        </text>
        <text fg="gray">{sessionTokens.toLocaleString()} tokens</text>
        <text fg="gray">{percentUsed}% used</text>
        <text fg="gray">${spent} spent</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg="white" style={{ weight: "bold" }}>
          LSP
        </text>
        <text fg="gray">LSPs will activate as files are read</text>
      </box>

      {tasks.length > 0 && (
        <box flexDirection="column" marginBottom={1}>
          <text fg="white" style={{ weight: "bold" }}>
            Tasks
          </text>
          {tasks.map((t) => {
            let icon = "○";
            if (t.status === "completed") icon = "●";
            else if (t.status === "running") icon = "▶";
            else if (t.status === "failed") icon = "×";
            return (
              <text key={t.id} fg="gray">
                {" "}
                {icon} {t.title}
              </text>
            );
          })}
        </box>
      )}

      {pluginLogs && pluginLogs.length > 0 && (
        <box flexDirection="column" marginBottom={1}>
          <text fg="white" style={{ weight: "bold" }}>
            Plugin Events
          </text>
          {pluginLogs.slice(0, 6).map((log, i) => (
            <text key={i} fg={log.blocked ? "#e85b4a" : "#6dcf81"}>
              {log.blocked ? "⛔" : "✓"} [{log.plugin}] {log.hook}
            </text>
          ))}
        </box>
      )}

      <box flexGrow={1} />

      <box flexDirection="column" marginBottom={1}>
        <text fg="gray">{cwd}</text>
        <text fg="yellow">• Hypr 3.0.0</text>
      </box>
    </box>
  );
};

export const WelcomeLogo: React.FC = () => {
  const [activeRipple, setActiveRipple] = React.useState<{ source: number; step: number } | null>(null);

  React.useEffect(() => {
    if (!activeRipple) return;
    if (activeRipple.step > 8) {
      setActiveRipple(null);
      return;
    }
    const timer = setTimeout(() => {
      setActiveRipple(prev => prev ? { ...prev, step: prev.step + 1 } : null);
    }, 70);
    return () => clearTimeout(timer);
  }, [activeRipple]);

  const letters = [
    // h
    [
      "█   ",
      "█▀▀█",
      "█__█",
      "▀  ▀",
    ],
    // y
    [
      "    ",
      "█__█",
      "▀▄▄█",
      "▄▄▄▀",
    ],
    // p
    [
      "    ",
      "█▀▀█",
      "█__█",
      "█▀▀▀",
    ],
    // r
    [
      "    ",
      "█▀▀▄",
      "█   ",
      "▀   ",
    ],
    // c
    [
      "    ",
      "█▀▀▀",
      "█___",
      "▀▀▀▀",
    ],
    // o
    [
      "    ",
      "█▀▀█",
      "█^^█",
      "▀▀▀▀",
    ],
    // d
    [
      "   ▄",
      "█▀▀█",
      "█__█",
      "▀▀▀▀",
    ],
    // e
    [
      "    ",
      "█▀▀█",
      "█▀▀▀",
      "▀▀▀▀",
    ],
  ];

  return (
    <box flexDirection="column" alignItems="center" marginTop={4} marginBottom={2}>
      <box flexDirection="row">
        {letters.map((letterLines, idx) => {
          let color = idx < 4 ? "gray" : "white";
          if (activeRipple) {
            const distance = Math.abs(idx - activeRipple.source);
            if (distance === activeRipple.step) {
              color = "#ff7e33"; // Wave peak (vibrant orange)
            } else if (distance === activeRipple.step - 1) {
              color = "#ffa54f"; // Trail 1 (warm peach)
            } else if (distance === activeRipple.step - 2) {
              color = "#ffe4b5"; // Trail 2 (fading light peach)
            }
          }

          return (
            <box
              key={idx}
              flexDirection="column"
              marginRight={idx === 7 ? 0 : 1}
              onMouseDown={() => {
                setActiveRipple({ source: idx, step: 0 });
              }}
            >
              {letterLines.map((line, lineIdx) => (
                <text key={lineIdx} fg={color}>
                  {line}
                </text>
              ))}
            </box>
          );
        })}
      </box>
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
          {typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content)}
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
            : message.content
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("")}
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
          return (
            <text key={idx} fg="white">
              {block.text}
            </text>
          );
        } else if (block.type === "tool_use") {
          return (
            <box
              key={idx}
              flexDirection="column"
              marginTop={1}
              padding={1}
              backgroundColor="#1a1a1e"
            >
              <text fg="#e8a838" style={{ weight: "bold" }}>
                {block.name}
              </text>
              <text fg="gray">{JSON.stringify(block.input, null, 2)}</text>
            </box>
          );
        } else if (block.type === "tool_result") {
          const truncated =
            block.content.length > 300
              ? block.content.slice(0, 300) + "..."
              : block.content;
          return (
            <box
              key={idx}
              flexDirection="column"
              marginTop={1}
              padding={1}
              backgroundColor="#1a1a1e"
            >
              <text
                fg={block.is_error ? "red" : "green"}
                style={{ weight: "bold" }}
              >
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

export const InteractiveInput: React.FC<InteractiveInputProps> = ({
  onSubmit,
  modelName,
}) => {
  const [value, setValue] = React.useState("");

  const handleSubmit = (val: string) => {
    onSubmit(val);
    setValue("");
  };

  return (
    <box flexDirection="column" width="100%">
      {/* Input area with left cyan accent bar and flat zinc bg */}
      <box flexDirection="row" width="100%" backgroundColor="#202024">
        <box flexDirection="column" width={1}>
          <text fg="brightCyan">▏</text>
          <text fg="brightCyan">▏</text>
        </box>
        <box
          flexDirection="column"
          flexGrow={1}
          paddingY={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <input
            focused={true}
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder='Ask anything... "What is the tech stack of this project?"'
          />
          <box marginTop={1} flexDirection="row">
            <text fg="cyan">Sisyphus</text>
            <text fg="white"> {modelName} (OAuth)</text>
            <text fg="gray"> OpenAI · </text>
            <text fg="#e8a838">medium</text>
          </box>
        </box>
      </box>

      {/* Keyboard shortcut hints */}
      <box flexDirection="row" justifyContent="flex-end" marginTop={1}>
        <text fg="gray" style={{ weight: "bold" }}>
          tab
        </text>
        <text fg="gray"> agents </text>
        <text fg="gray" style={{ weight: "bold" }}>
          ctrl+p
        </text>
        <text fg="gray"> commands</text>
      </box>

      {/* Random tip */}
      <box flexDirection="row" justifyContent="center" marginTop={1}>
        <text fg="#e8a838">• Tip</text>
        <text fg="gray">
          {" "}
          Create a plugin to prevent Hypr from reading sensitive files
        </text>
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

export const SessionInput: React.FC<SessionInputProps> = ({
  onSubmit,
  modelName,
  status,
  elapsed,
}) => {
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
          <text fg="gray"> {status === "thinking" ? "Build" : "Exec"} · </text>
          <text fg="gray">
            {" "}
            {modelName} · {elapsed || "0.0s"}
          </text>
        </box>
      )}

      {/* Compact input with left cyan accent bar and flat zinc bg */}
      <box flexDirection="row" width="100%" backgroundColor="#202024">
        <box flexDirection="column" width={1}>
          <text fg="brightCyan">▏</text>
        </box>
        <box flexGrow={1} paddingY={1} paddingLeft={1} paddingRight={1}>
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
        <text fg="gray"> {modelName} llama.cpp (hosted)</text>
      </box>
    </box>
  );
};

export interface PermissionPromptProps {
  message: string;
  onDecision: (allowed: boolean) => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  message,
  onDecision,
}) => {
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
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingY={1}
      backgroundColor="#1e1313"
    >
      <text fg="#e8a838" style={{ weight: "bold" }}>
        Allow this action?
      </text>
      <text fg="white">{message}</text>
      <box marginTop={1} flexDirection="row">
        <text fg="gray">[</text>
        <text fg="green" style={{ weight: "bold" }}>
          y
        </text>
        <text fg="gray">]es [</text>
        <text fg="red" style={{ weight: "bold" }}>
          n
        </text>
        <text fg="gray">]o</text>
      </box>
    </box>
  );
};
