import * as React from "react";
import { useKeyboard } from "@opentui/react";
import { TaskNode } from "../state/scheduler.ts";
import { Message, ContentBlock } from "../state/engine.ts";
import { PluginLog } from "../plugins/manager.ts";

export const SLASH_COMMANDS = [
  { name: "/agents", desc: "Switch agent" },
  { name: "/connect", desc: "Connect provider" },
  { name: "/editor", desc: "Open editor" },
  { name: "/exit", desc: "Exit the app" },
  { name: "/help", desc: "Help" },
  { name: "/init", desc: "guided AGENTS.md setup" },
  { name: "/mcps", desc: "Toggle MCPs" },
  { name: "/models", desc: "Switch model" },
  { name: "/new", desc: "New session" },
  { name: "/review", desc: "review changes [commit|branch|pr], defaults to uncommitted" },
];

export const MODELS_LIST = [
  { name: "Claude 3.5 Sonnet", desc: "Claude 3.5 Sonnet model", category: "OpenCode Zen", provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
  { name: "Claude 3 Opus", desc: "Claude 3 Opus model", category: "OpenCode Zen", provider: "anthropic", model: "claude-3-opus-20240229" },
  { name: "Gemini 2.5 Flash", desc: "Gemini 2.5 Flash model", category: "Google", provider: "gemini", model: "gemini-2.5-flash" },
  { name: "Gemini 2.5 Pro", desc: "Gemini 2.5 Pro model", category: "Google", provider: "gemini", model: "gemini-2.5-pro" },
  { name: "GPT-5.2 Codex", desc: "Mock LLM", category: "Recent", provider: "mock", model: "gpt-5.2-codex" },
];

export const AGENTS_LIST = [
  { name: "Build", desc: "Orchestrates compilation and error validation", category: "Core Agents" },
  { name: "Plan", desc: "Generates step-by-step implementation workflows", category: "Core Agents" },
  { name: "Code Architect", desc: "Specialist in structural refactoring", category: "Specialized" },
  { name: "Hardening Agent", desc: "Specialist in UI and styling polish", category: "Specialized" },
];

export interface SidebarProps {
  tasks: TaskNode[];
  modelName: string;
  provider: string;
  cwd: string;
  rulesFound: boolean;
  pluginLogs?: PluginLog[];
  messages?: Message[];
  activeAgent?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  modelName,
  provider,
  cwd,
  rulesFound,
  pluginLogs,
  messages,
  activeAgent,
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
        <text fg="gray">Agent: <span fg="white">{activeAgent || "Self"}</span></text>
        <text fg="gray">Model: <span fg="white">{modelName}</span></text>
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

interface DiffLine {
  type: "add" | "del" | "ctx";
  num: number;
  content: string;
}

function buildSimpleDiff(search: string, replace: string): DiffLine[] {
  const diffLines: DiffLine[] = [];
  const searchLines = search.split("\n");
  const replaceLines = replace.split("\n");
  
  let lineNum = 1;
  for (const line of searchLines) {
    diffLines.push({ type: "del", num: lineNum++, content: line });
  }
  lineNum = 1;
  for (const line of replaceLines) {
    diffLines.push({ type: "add", num: lineNum++, content: line });
  }
  return diffLines;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.role === "system") {
    if (Array.isArray(message.content)) {
      return (
        <box flexDirection="column" marginBottom={1} paddingLeft={2}>
          {message.content.map((block: ContentBlock, idx: number) => {
            if (block.type === "tool_result") {
              if (block.is_error) {
                return (
                  <box
                    key={idx}
                    flexDirection="column"
                    marginTop={1}
                    padding={1}
                    backgroundColor="#3c1b1b"
                    flexShrink={0}
                  >
                    <text fg="brightRed" style={{ weight: "bold" }}>Error</text>
                    <text fg="white">{block.content}</text>
                  </box>
                );
              }
              return (
                <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
                  <text fg="green">✓ Success</text>
                </box>
              );
            }
            return null;
          })}
        </box>
      );
    }
    return (
      <box marginBottom={1} paddingLeft={2}>
        <text fg="gray" style={{ italic: true }}>
          {message.content}
        </text>
      </box>
    );
  }

  if (message.role === "user") {
    if (Array.isArray(message.content) && message.content.some((c) => c.type === "tool_result")) {
      return (
        <box flexDirection="column" marginBottom={1} paddingLeft={2}>
          {message.content.map((block: ContentBlock, idx: number) => {
            if (block.type === "tool_result") {
              if (block.is_error) {
                return (
                  <box
                    key={idx}
                    flexDirection="column"
                    marginTop={1}
                    padding={1}
                    backgroundColor="#3c1b1b"
                    flexShrink={0}
                  >
                    <text fg="brightRed" style={{ weight: "bold" }}>Error</text>
                    <text fg="white">{block.content}</text>
                  </box>
                );
              }
              return (
                <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
                  <text fg="green">✓ Success</text>
                </box>
              );
            }
            return null;
          })}
        </box>
      );
    }
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
        } else if (block.type === "tool_use" && block.name === "apply_multi_diff") {
          const edits = block.input?.edits || [];
          return (
            <box key={idx} flexDirection="column" marginTop={1} width="100%" flexShrink={0}>
              {edits.map((edit: any, eIdx: number) => {
                const changes = buildSimpleDiff(edit.search, edit.replace);
                return (
                  <box key={eIdx} width="100%" flexDirection="column" paddingLeft={2} marginBottom={1} flexShrink={0}>
                    <text fg="brightBlue" style={{ weight: "bold" }}>• Edit {edit.path}</text>
                    <box flexDirection="column" backgroundColor="#1e1e24" padding={1} marginTop={1} width="100%" flexShrink={0}>
                      {changes.map((line, lIdx) => {
                        const isAddition = line.type === 'add';
                        const isDeletion = line.type === 'del';
                        
                        let lineBg = "transparent";
                        let lineFg = "white";
                        let prefix = "  ";

                        if (isAddition) {
                          lineBg = "#1b3c22"; // Deep green block tint
                          lineFg = "brightGreen";
                          prefix = "+ ";
                        } else if (isDeletion) {
                          lineBg = "#3c1b1b"; // Deep red block tint
                          lineFg = "brightRed";
                          prefix = "- ";
                        }

                        return (
                          <box key={lIdx} width="100%" backgroundColor={lineBg} paddingLeft={1} flexShrink={0}>
                            <text fg={lineFg}>
                              <span fg="gray">{line.num.toString().padEnd(4)}</span>
                              {prefix}
                              {line.content}
                            </text>
                          </box>
                        );
                      })}
                    </box>
                  </box>
                );
              })}
            </box>
          );
        } else if (block.type === "tool_use") {
          let traceText = `• Execute ${block.name}`;
          if (block.name === "read_file") {
            traceText = `• Read ${block.input?.path || block.input?.AbsolutePath}`;
          } else if (block.name === "write_file") {
            traceText = `• Write ${block.input?.path || block.input?.TargetFile}`;
          } else if (block.name === "edit_file") {
            traceText = `• Edit ${block.input?.path || block.input?.TargetFile}`;
          } else if (block.name === "list_dir") {
            traceText = `• List directory ${block.input?.path || block.input?.DirectoryPath}`;
          } else if (block.name === "grep_search") {
            traceText = `• Grep search in ${block.input?.path || block.input?.SearchPath} for "${block.input?.query || block.input?.Query}"`;
          } else if (block.name === "execute_bash" || block.name === "run_command") {
            traceText = `• Run command: ${block.input?.command || block.input?.CommandLine}`;
          } else if (block.name === "view_code_outline") {
            traceText = `• Extract code outline for ${block.input?.path || block.input?.AbsolutePath}`;
          }
          
          return (
            <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
              <text fg="gray">{traceText}</text>
            </box>
          );
        } else if (block.type === "tool_result") {
          if (block.is_error) {
            return (
              <box
                key={idx}
                flexDirection="column"
                marginTop={1}
                padding={1}
                backgroundColor="#3c1b1b"
                flexShrink={0}
              >
                <text fg="brightRed" style={{ weight: "bold" }}>Error</text>
                <text fg="white">{block.content}</text>
              </box>
            );
          }
          return (
            <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
              <text fg="green">✓ Success</text>
            </box>
          );
        }
        return null;
      })}
    </box>
  );
};

export interface PickerOverlayProps {
  title: string;
  items: { name: string; desc: string; category: string }[];
  onSelect: (item: any) => void;
  onClose: () => void;
}

export const PickerOverlay: React.FC<PickerOverlayProps> = ({
  title,
  items,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useKeyboard((e) => {
    if (e.name === "down") {
      setSelectedIndex((prev) => (prev + 1) % items.length);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "up") {
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "escape") {
      onClose();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "enter") {
      onSelect(items[selectedIndex]);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.ctrl && e.name === "a") {
      // Connect provider
      e.preventDefault();
      e.stopPropagation();
    } else if (e.ctrl && e.name === "f") {
      // Favorite
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      flexShrink={0}
    >
      <box
        width={55}
        flexDirection="column"
        backgroundColor="#161618"
        paddingY={1}
        paddingX={2}
        flexShrink={0}
      >
        {/* Header */}
        <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <text fg="white" style={{ weight: "bold" }}>
            {title}
          </text>
          <text fg="gray">esc</text>
        </box>

        {/* Categories and List Items */}
        <box flexDirection="column">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            return (
              <box key={cat} flexDirection="column" marginBottom={1}>
                <text fg="brightBlue" style={{ weight: "bold" }}>
                  {cat}
                </text>
                 {catItems.map((item) => {
                   const absIndex = items.indexOf(item);
                   const isSelected = absIndex === selectedIndex;
                   return (
                     <box
                       key={item.name}
                       flexDirection="row"
                       backgroundColor={isSelected ? "#e8a838" : undefined}
                       paddingLeft={1}
                       onMouseOver={() => setSelectedIndex(absIndex)}
                       onMouseDown={() => onSelect(item)}
                     >
                       <text fg={isSelected ? "black" : "white"}>
                         {isSelected ? "• " : "  "}
                         <span style={{ weight: "bold" }}>{item.name}</span>
                         {"   "}
                         <span fg={isSelected ? "black" : "gray"}>{item.desc}</span>
                       </text>
                     </box>
                   );
                 })}
              </box>
            );
          })}
        </box>

        {/* Footer shortcuts */}
        <box marginTop={1} flexDirection="row" gap={2}>
          <text fg="gray">
            Connect provider <span fg="white">ctrl+a</span>   
          </text>
          <text fg="gray">
            Favorite <span fg="white">ctrl+f</span>
          </text>
        </box>
      </box>
    </box>
  );
};

export interface InteractiveInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
  onOpenModelPicker: () => void;
  onOpenAgentPicker: () => void;
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({
  onSubmit,
  modelName,
  onOpenModelPicker,
  onOpenAgentPicker,
}) => {
  const [value, setValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleSubmit = (val: string) => {
    onSubmit(val);
    setValue("");
  };

  const trimmed = value.trim();
  const showSlashMenu = trimmed.startsWith("/") && !trimmed.includes(" ");

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(trimmed.toLowerCase())
  );

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(0, filteredCommands.length - 1)
  );

  useKeyboard((e) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.name === "down") {
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.name === "up") {
        setSelectedIndex(
          (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (e.name === "return" || e.name === "enter" || e.name === "tab") {
        const selected = filteredCommands[activeIndex];
        if (selected) {
          setValue(selected.name + " ");
          setSelectedIndex(0);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } else {
      if (e.name === "tab") {
        onOpenAgentPicker();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.ctrl && e.name === "p") {
        onOpenModelPicker();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  return (
    <box flexDirection="column" width="100%">
      <box width="100%" position="relative">
        {showSlashMenu && filteredCommands.length > 0 && (
          <box
            position="absolute"
            bottom={4}
            left={0}
            width="100%"
            backgroundColor="#27272a"
            flexShrink={0}
            paddingY={1}
            paddingLeft={2}
            paddingRight={2}
          >
            {filteredCommands.map((cmd, idx) => {
              const isSelected = idx === activeIndex;
              return (
                 <box
                   key={cmd.name}
                   flexDirection="row"
                   backgroundColor={isSelected ? "#e8a838" : undefined}
                   paddingX={1}
                   onMouseOver={() => setSelectedIndex(idx)}
                   onMouseDown={() => {
                     setValue(cmd.name + " ");
                     setSelectedIndex(0);
                   }}
                 >
                  <text
                    fg={isSelected ? "black" : "white"}
                    style={{ weight: "bold" }}
                  >
                    {cmd.name.padEnd(12)}
                  </text>
                  <text fg={isSelected ? "black" : "gray"}>
                    {cmd.desc}
                  </text>
                </box>
              );
            })}
          </box>
        )}

        {/* Input area with left cyan accent bar and flat zinc bg */}
        <box flexDirection="row" width="100%" backgroundColor="#27272a" flexShrink={0}>
          <box flexDirection="column" width={1}>
            <text fg="brightCyan">▏</text>
            <text fg="brightCyan">▏</text>
            <text fg="brightCyan">▏</text>
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
              onInput={(val) => {
                setValue(val);
                setSelectedIndex(0);
              }}
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
  onOpenModelPicker: () => void;
  onOpenAgentPicker: () => void;
}

export const SessionInput: React.FC<SessionInputProps> = ({
  onSubmit,
  modelName,
  status,
  elapsed,
  onOpenModelPicker,
  onOpenAgentPicker,
}) => {
  const [value, setValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleSubmit = (val: string) => {
    onSubmit(val);
    setValue("");
  };

  const trimmed = value.trim();
  const showSlashMenu = trimmed.startsWith("/") && !trimmed.includes(" ");

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(trimmed.toLowerCase())
  );

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(0, filteredCommands.length - 1)
  );

  useKeyboard((e) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.name === "down") {
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.name === "up") {
        setSelectedIndex(
          (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (e.name === "return" || e.name === "enter" || e.name === "tab") {
        const selected = filteredCommands[activeIndex];
        if (selected) {
          setValue(selected.name + " ");
          setSelectedIndex(0);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } else {
      if (e.name === "tab") {
        onOpenAgentPicker();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.ctrl && e.name === "p") {
        onOpenModelPicker();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

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

      <box width="100%" position="relative">
        {showSlashMenu && filteredCommands.length > 0 && (
          <box
            position="absolute"
            bottom={3}
            left={0}
            width="100%"
            backgroundColor="#27272a"
            flexShrink={0}
            paddingY={1}
            paddingLeft={2}
            paddingRight={2}
          >
            {filteredCommands.map((cmd, idx) => {
              const isSelected = idx === activeIndex;
              return (
                 <box
                   key={cmd.name}
                   flexDirection="row"
                   backgroundColor={isSelected ? "#e8a838" : undefined}
                   paddingX={1}
                   onMouseOver={() => setSelectedIndex(idx)}
                   onMouseDown={() => {
                     setValue(cmd.name + " ");
                     setSelectedIndex(0);
                   }}
                 >
                  <text
                    fg={isSelected ? "black" : "white"}
                    style={{ weight: "bold" }}
                  >
                    {cmd.name.padEnd(12)}
                  </text>
                  <text fg={isSelected ? "black" : "gray"}>
                    {cmd.desc}
                  </text>
                </box>
              );
            })}
          </box>
        )}

        {/* Compact input with left cyan accent bar and flat zinc bg */}
        <box flexDirection="row" width="100%" backgroundColor="#27272a" flexShrink={0}>
          <box flexDirection="column" width={1}>
            <text fg="brightCyan">▏</text>
            <text fg="brightCyan">▏</text>
            <text fg="brightCyan">▏</text>
          </box>
          <box flexGrow={1} paddingY={1} paddingLeft={1} paddingRight={1}>
            <input
              focused={true}
              value={value}
              onInput={(val) => {
                setValue(val);
                setSelectedIndex(0);
              }}
              onSubmit={handleSubmit}
            />
          </box>
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
