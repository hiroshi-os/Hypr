import * as React from "react";
import { useKeyboard } from "@opentui/react";
import { TaskNode } from "../state/scheduler.ts";
import { Message, ContentBlock } from "../state/engine.ts";
import { PluginLog } from "../plugins/manager.ts";

export const SLASH_COMMANDS = [
  { name: "/agents", desc: "Switch agent" },
  { name: "/connect", desc: "Connect provider" },
  { name: "/models", desc: "Switch model" },
];

export const MODELS_LIST = [
  { name: "DeepSeek V4 Flash", desc: "Fast & Cheap", category: "Recent", provider: "mock", model: "deepseek-v4-flash" },
  { name: "Claude Mythos 5", desc: "Best Reasoning", category: "Recent", provider: "mock", model: "claude-mythos-5" },
  { name: "GPT-5.6 Preview", desc: "Frontier", category: "Recent", provider: "mock", model: "gpt-5.6-preview" },
  { name: "Qwen 3.5 4B", desc: "Local", category: "Local", provider: "mock", model: "qwen-3.5-4b" },
  { name: "Phi-4-mini-instruct", desc: "Local", category: "Local", provider: "mock", model: "phi-4-mini-instruct" },
  { name: "Gemma 4 E4B", desc: "Local", category: "Local", provider: "mock", model: "gemma-4-e4b" },
  { name: "Gemini 3.5 Flash", desc: "Smart & Fast", category: "Google", provider: "gemini", model: "gemini-3.5-flash" },
  { name: "Gemini 3.5 Pro", desc: "Reasoning", category: "Google", provider: "gemini", model: "gemini-3.5-pro" },
  { name: "Claude Opus 4.8", desc: "Agentic Coding", category: "Anthropic", provider: "mock", model: "claude-opus-4.8" },
  { name: "Claude Sonnet 5", desc: "Speed & Logic", category: "Anthropic", provider: "mock", model: "claude-sonnet-5" },
  { name: "DeepSeek V4 Pro", desc: "Powerhouse", category: "DeepSeek", provider: "mock", model: "deepseek-v4-pro" },
  { name: "Qwen 3.7 Max", desc: "Multilingual", category: "Alibaba", provider: "mock", model: "qwen-3.7-max" },
];

export const PROVIDERS_LIST = [
  { name: "OpenAI", desc: "(ChatGPT Plus/Pro or API key)", category: "Popular" },
  { name: "GitHub Copilot", desc: "", category: "Popular" },
  { name: "Anthropic", desc: "(API key)", category: "Popular" },
  { name: "Google", desc: "", category: "Popular", selected: true },
  { name: "Requesty", desc: "", category: "Providers" },
  { name: "Qiniu", desc: "", category: "Providers" },
  { name: "Alibaba (China)", desc: "", category: "Providers" },
  { name: "Regolo AI", desc: "", category: "Providers" },
  { name: "STACKIT", desc: "", category: "Providers" },
  { name: "Vercel AI Gateway", desc: "", category: "Providers" },
  { name: "submodel", desc: "", category: "Providers" },
  { name: "Hugging Face", desc: "", category: "Providers" },
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
  dimmed?: boolean;
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
  dimmed,
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

  const whiteColor = dimmed ? "gray" : "white";

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      height="100%"
    >
      <box flexDirection="column" marginBottom={1}>
        <text fg={whiteColor}>Go CLI for agentic</text>
        <text fg={whiteColor}>development tasks</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg={whiteColor} style={{ weight: "bold" }}>
          Context
        </text>
        <text fg="gray">{sessionTokens.toLocaleString()} tokens</text>
        <text fg="gray">{percentUsed}% used</text>
        <text fg="gray">${spent} spent</text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg={whiteColor} style={{ weight: "bold" }}>
          LSP
        </text>
        <text fg="gray">LSPs will activate as files are read</text>
      </box>

      {tasks.length > 0 && (
        <box flexDirection="column" marginBottom={1}>
          <text fg={whiteColor} style={{ weight: "bold" }}>
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
          <text fg={whiteColor} style={{ weight: "bold" }}>
            Plugin Events
          </text>
          {pluginLogs.slice(0, 6).map((log, i) => (
            <text key={i} fg={dimmed ? "gray" : (log.blocked ? "#e85b4a" : "#6dcf81")}>
              {log.blocked ? "⛔" : "✓"} [{log.plugin}] {log.hook}
            </text>
          ))}
        </box>
      )}

      <box flexGrow={1} />

      <box flexDirection="column" marginBottom={1}>
        <text fg="gray">{cwd}</text>
        <text fg="gray">Agent: <span fg={whiteColor}>{activeAgent || "Self"}</span></text>
        <text fg="gray">Model: <span fg={whiteColor}>{modelName}</span></text>
        <text fg={dimmed ? "gray" : "yellow"}>• Hypr 3.0.0</text>
      </box>
    </box>
  );
};

export const WelcomeLogo: React.FC<{ dimmed?: boolean }> = ({ dimmed }) => {
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
      "█▀▀█",
      "█▄▄█",
      "  ▄█",
    ],
    // p
    [
      "    ",
      "█▀▀▄",
      "█▄▄▀",
      "▀   ",
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
          if (dimmed) {
            color = "gray";
          } else if (activeRipple) {
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
  dimmed?: boolean;
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

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, dimmed }) => {
  const textFg = dimmed ? "gray" : "white";
  const systemFg = dimmed ? "gray" : "gray";
  const successFg = dimmed ? "gray" : "green";
  const errorFg = dimmed ? "gray" : "brightRed";
  const infoFg = dimmed ? "gray" : "brightBlue";

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
                    <text fg={errorFg} style={{ weight: "bold" }}>Error</text>
                    <text fg={textFg}>{block.content}</text>
                  </box>
                );
              }
              return (
                <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
                  <text fg={successFg}>✓ Success</text>
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
        <text fg={systemFg} style={{ italic: true }}>
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
                    <text fg={errorFg} style={{ weight: "bold" }}>Error</text>
                    <text fg={textFg}>{block.content}</text>
                  </box>
                );
              }
              return (
                <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
                  <text fg={successFg}>✓ Success</text>
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
        <text fg={textFg}>
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
        <text fg={textFg}>{message.content}</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" marginBottom={1} paddingLeft={2}>
      {message.content.map((block: ContentBlock, idx: number) => {
        if (block.type === "text") {
          return (
            <text key={idx} fg={textFg}>
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
                    <text fg={infoFg} style={{ weight: "bold" }}>• Edit {edit.path}</text>
                    <box flexDirection="column" backgroundColor="#1e1e24" padding={1} marginTop={1} width="100%" flexShrink={0}>
                      {changes.map((line, lIdx) => {
                        const isAddition = line.type === 'add';
                        const isDeletion = line.type === 'del';
                        
                        let lineBg = "transparent";
                        let lineFg = textFg;
                        let prefix = "  ";

                        if (isAddition) {
                          lineBg = "#1b3c22"; // Deep green block tint
                          lineFg = dimmed ? "gray" : "brightGreen";
                          prefix = "+ ";
                        } else if (isDeletion) {
                          lineBg = "#3c1b1b"; // Deep red block tint
                          lineFg = dimmed ? "gray" : "brightRed";
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
                <text fg={errorFg} style={{ weight: "bold" }}>Error</text>
                <text fg={textFg}>{block.content}</text>
              </box>
            );
          }
          return (
            <box key={idx} paddingLeft={2} marginBottom={1} flexShrink={0}>
              <text fg={successFg}>✓ Success</text>
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
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useKeyboard((e) => {
    if (e.name === "down") {
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "up") {
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "escape") {
      onClose();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "enter") {
      if (filteredItems[selectedIndex]) {
        onSelect(filteredItems[selectedIndex]);
      }
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const categories = Array.from(new Set(filteredItems.map((i) => i.category)));

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
        width={70}
        height={18}
        flexDirection="column"
        backgroundColor="#161618"
        paddingY={1}
        paddingX={2}
        flexShrink={0}
      >
        {/* Header */}
        <box flexDirection="row" justifyContent="space-between" marginBottom={1} flexShrink={0}>
          <text fg="white" style={{ weight: "bold" }}>
            {title}
          </text>
          <text fg="gray">esc</text>
        </box>

        {/* Search box */}
        <box flexDirection="row" backgroundColor="#27272a" paddingX={1} marginBottom={1} flexShrink={0}>
          <input
            focused={true}
            value={searchQuery}
            onInput={(val) => {
              setSearchQuery(val);
              setSelectedIndex(0);
            }}
            placeholder="Search"
          />
        </box>

        {/* Categories and List Items - SCROLLABLE container */}
        <box flexDirection="column" flexGrow={1} overflowY="scroll">
          {categories.map((cat) => {
            const catItems = filteredItems.filter((i) => i.category === cat);
            return (
              <box key={cat} flexDirection="column" marginBottom={1} flexShrink={0}>
                <text fg="brightBlue" style={{ weight: "bold" }} flexShrink={0}>
                  {cat}
                </text>
                {catItems.map((item) => {
                  const absIndex = filteredItems.indexOf(item);
                  const isSelected = absIndex === selectedIndex;
                  const hasCheck = (item as any).selected;
                  return (
                    <box
                      key={item.name}
                      flexDirection="row"
                      backgroundColor={isSelected ? "#e8a838" : undefined}
                      paddingLeft={1}
                      onMouseOver={() => setSelectedIndex(absIndex)}
                      onMouseDown={() => onSelect(item)}
                      flexShrink={0}
                    >
                      <text fg={isSelected ? "black" : "white"} flexShrink={0}>
                        {hasCheck ? (
                          <span fg={isSelected ? "black" : "green"}>✓ </span>
                        ) : (
                          isSelected ? "• " : "  "
                        )}
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
        <box marginTop={1} flexDirection="row" gap={2} flexShrink={0}>
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
  onOpenProviderPicker: () => void;
  dimmed?: boolean;
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({
  onSubmit,
  modelName,
  onOpenModelPicker,
  onOpenAgentPicker,
  onOpenProviderPicker,
  dimmed,
}) => {
  const [value, setValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleSubmit = (val: string) => {
    if (!val.trim()) return;
    onSubmit(val.trim());
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

  const handleSelectCommand = (cmdName: string) => {
    if (cmdName === "/agents") {
      onOpenAgentPicker();
      setValue("");
      setSelectedIndex(0);
    } else if (cmdName === "/models") {
      onOpenModelPicker();
      setValue("");
      setSelectedIndex(0);
    } else if (cmdName === "/connect") {
      onOpenProviderPicker();
      setValue("");
      setSelectedIndex(0);
    } else {
      setValue(cmdName + " ");
      setSelectedIndex(0);
    }
  };

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
          handleSelectCommand(selected.name);
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
                   onMouseDown={() => handleSelectCommand(cmd.name)}
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
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
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
              <text fg={dimmed ? "gray" : "cyan"}>Sisyphus</text>
              <text fg={dimmed ? "gray" : "white"}> {modelName} (OAuth)</text>
              <text fg="gray"> OpenAI · </text>
              <text fg={dimmed ? "gray" : "#e8a838"}>medium</text>
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
  onOpenProviderPicker: () => void;
  dimmed?: boolean;
}

export const SessionInput: React.FC<SessionInputProps> = ({
  onSubmit,
  modelName,
  status,
  elapsed,
  onOpenModelPicker,
  onOpenAgentPicker,
  onOpenProviderPicker,
  dimmed,
}) => {
  const [value, setValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const handleSubmit = (val: string) => {
    if (!val.trim()) return;
    onSubmit(val.trim());
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

  const handleSelectCommand = (cmdName: string) => {
    if (cmdName === "/agents") {
      onOpenAgentPicker();
      setValue("");
      setSelectedIndex(0);
    } else if (cmdName === "/models") {
      onOpenModelPicker();
      setValue("");
      setSelectedIndex(0);
    } else if (cmdName === "/connect") {
      onOpenProviderPicker();
      setValue("");
      setSelectedIndex(0);
    } else {
      setValue(cmdName + " ");
      setSelectedIndex(0);
    }
  };

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
          handleSelectCommand(selected.name);
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
                   onMouseDown={() => handleSelectCommand(cmd.name)}
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
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
            <text fg={dimmed ? "gray" : "brightCyan"}>▏</text>
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
        <text fg={dimmed ? "gray" : "green"}>Build</text>
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
