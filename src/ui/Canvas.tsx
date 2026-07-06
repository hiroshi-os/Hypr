import * as React from "react";
import { useKeyboard } from "@opentui/react";
import { TaskNode } from "../state/scheduler.ts";
import { Message, ContentBlock } from "../state/engine.ts";
import { PluginLog } from "../plugins/manager.ts";

export const SLASH_COMMANDS = [
  { name: "/agents", desc: "Switch agent" },
  { name: "/connect", desc: "Connect provider" },
  { name: "/models", desc: "Switch model" },
  { name: "/variant", desc: "Switch model variant" },
];

export const VARIANTS_LIST = [
  { name: "Default", desc: "", category: "Variant" },
  { name: "low", desc: "Faster, less capable", category: "Variant" },
  { name: "medium", desc: "Balanced", category: "Variant" },
  { name: "high", desc: "More capable, slower", category: "Variant" },
  { name: "max", desc: "Best quality, slowest", category: "Variant" },
];

export const MODELS_LIST = [
  {
    name: "DeepSeek V4 Flash",
    desc: "Fast & Cheap",
    category: "Recent",
    provider: "mock",
    model: "deepseek-v4-flash",
  },
  {
    name: "Claude Mythos 5",
    desc: "Best Reasoning",
    category: "Recent",
    provider: "mock",
    model: "claude-mythos-5",
  },
  {
    name: "GPT-5.6 Preview",
    desc: "Frontier",
    category: "Recent",
    provider: "mock",
    model: "gpt-5.6-preview",
  },
  {
    name: "Qwen 3.5 4B",
    desc: "Local",
    category: "Local",
    provider: "mock",
    model: "qwen-3.5-4b",
  },
  {
    name: "Phi-4-mini-instruct",
    desc: "Local",
    category: "Local",
    provider: "mock",
    model: "phi-4-mini-instruct",
  },
  {
    name: "Gemma 4 E4B",
    desc: "Local",
    category: "Local",
    provider: "mock",
    model: "gemma-4-e4b",
  },
  {
    name: "Gemini 3.5 Flash",
    desc: "Smart & Fast",
    category: "Google",
    provider: "gemini",
    model: "gemini-3.5-flash",
  },
  {
    name: "Gemini 3.5 Pro",
    desc: "Reasoning",
    category: "Google",
    provider: "gemini",
    model: "gemini-3.5-pro",
  },
  {
    name: "Claude Opus 4.8",
    desc: "Agentic Coding",
    category: "Anthropic",
    provider: "mock",
    model: "claude-opus-4.8",
  },
  {
    name: "Claude Sonnet 5",
    desc: "Speed & Logic",
    category: "Anthropic",
    provider: "mock",
    model: "claude-sonnet-5",
  },
  {
    name: "DeepSeek V4 Pro",
    desc: "Powerhouse",
    category: "DeepSeek",
    provider: "mock",
    model: "deepseek-v4-pro",
  },
  {
    name: "Qwen 3.7 Max",
    desc: "Multilingual",
    category: "Alibaba",
    provider: "mock",
    model: "qwen-3.7-max",
  },
];

export const PROVIDERS_LIST = [
  {
    name: "OpenAI",
    desc: "(ChatGPT Plus/Pro or API key)",
    category: "Popular",
  },
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
  {
    name: "Build",
    desc: "Orchestrates compilation and error validation",
    category: "Core Agents",
  },
  {
    name: "Plan",
    desc: "Generates step-by-step implementation workflows",
    category: "Core Agents",
  },
  {
    name: "Code Architect",
    desc: "Specialist in structural refactoring",
    category: "Specialized",
  },
  {
    name: "Hardening Agent",
    desc: "Specialist in UI and styling polish",
    category: "Specialized",
  },
];

// Primary color per agent — drives accent bar, chip, hint keys, tip bullet
export const AGENT_COLORS: Record<string, string> = {
  "Build":           "#06b6d4", // cyan
  "Plan":            "#a78bfa", // violet
  "Code Architect":  "#7aa2f7", // blue
  "Hardening Agent": "#fb923c", // orange
};
export const DEFAULT_PRIMARY = "#06b6d4";

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
            <text
              key={i}
              fg={dimmed ? "gray" : log.blocked ? "#e85b4a" : "#6dcf81"}
            >
              {log.blocked ? "⛔" : "✓"} [{log.plugin}] {log.hook}
            </text>
          ))}
        </box>
      )}

      <box flexGrow={1} />

      <box flexDirection="column" marginBottom={1}>
        <text fg="gray">{cwd}</text>
        <text fg="gray">
          Agent: <span fg={whiteColor}>{activeAgent || "Self"}</span>
        </text>
        <text fg="gray">
          Model: <span fg={whiteColor}>{modelName}</span>
        </text>
        <text fg={dimmed ? "gray" : "yellow"}>• Hypr 3.0.0</text>
      </box>
    </box>
  );
};

export const WelcomeLogo: React.FC<{ dimmed?: boolean }> = ({ dimmed }) => {
  // ── palettes ──────────────────────────────────────────────────────────────
  const RIPPLE_COLORS   = ["#ff7e33","#ff5e00","#ffa54f","#ffe4b5","#ffcc80","#ff6f20"];
  const CHARGE_RING     = ["#e040fb","#ce93d8","#ab47bc","#7b1fa2","#f8bbd9","#ff80ab","#ea80fc","#d500f9"];
  const EXPLODE_PALETTE = ["#ff1744","#ff6d00","#ffea00","#00e5ff","#69ff47","#ff4081","#7c4dff","#18ffff","#f50057","#aeea00"];

  // ── letter glyphs ─────────────────────────────────────────────────────────
  // prettier-ignore
  const letters = [
    ["█   ","█▀▀█","█__█","▀  ▀"],  // h
    ["    ","█  █","█▄▄█","▄▄▄█"],  // y
    ["    ","█▀▀▄","█▄▄▀","▀   "],  // p
    ["    ","█▀▀▄","█   ","▀   "],  // r
    ["    ","█▀▀▀","█___","▀▀▀▀"],  // c
    ["    ","█▀▀█","█^^█","▀▀▀▀"],  // o
    ["   ▄","█▀▀█","█__█","▀▀▀▀"],  // d
    ["    ","█▀▀█","█▀▀▀","▀▀▀▀"],  // e
  ];

  type Phase = "idle" | "ripple" | "charging" | "exploding";
  const [phase, setPhase]           = React.useState<Phase>("idle");
  const [source, setSource]         = React.useState(0);
  const [tick, setTick]             = React.useState(0);
  const [noiseSeed, setNoiseSeed]   = React.useState(0);
  const phaseRef                    = React.useRef<Phase>("idle");
  phaseRef.current                  = phase;
  const boomRef                     = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeRef                   = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // deterministic pseudo-random (seed-based, no Math.random in render)
  const prng = (s: number) => Math.abs(Math.sin(s * 127.1 + 311.7) * 43758.5453) % 1;

  // ── tick driver ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => setTick((t) => t + 1), 55);
    return () => clearInterval(id);
  }, [phase]);

  // ── ripple auto-end ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== "ripple") return;
    const t = setTimeout(() => { setPhase("idle"); setTick(0); }, 850);
    return () => clearTimeout(t);
  }, [phase]);

  // ── explosion auto-end ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== "exploding") return;
    const t = setTimeout(() => { setPhase("idle"); setTick(0); }, 950);
    return () => clearTimeout(t);
  }, [phase]);

  const triggerExplode = React.useCallback(() => {
    if (boomRef.current)   clearTimeout(boomRef.current);
    if (chargeRef.current) clearTimeout(chargeRef.current);
    setTick(0);
    setPhase("exploding");
  }, []);

  const handleMouseDown = (lIdx: number) => {
    if (boomRef.current)   clearTimeout(boomRef.current);
    if (chargeRef.current) clearTimeout(chargeRef.current);
    setSource(lIdx);
    setNoiseSeed(Date.now() % 9999);
    setTick(0);
    setPhase("ripple");
    // transition to charging after 200 ms if still held
    chargeRef.current = setTimeout(() => {
      if (phaseRef.current !== "idle") { setPhase("charging"); setTick(0); }
    }, 200);
    // auto-explode after 3 s
    boomRef.current = setTimeout(triggerExplode, 3000);
  };

  const handleMouseUp = () => {
    if (boomRef.current)   clearTimeout(boomRef.current);
    if (chargeRef.current) clearTimeout(chargeRef.current);
    if (phaseRef.current === "charging" || phaseRef.current === "ripple") {
      triggerExplode();
    }
  };

  // ── per-char color resolver (called inside render) ────────────────────────
  const getColor = (lIdx: number, rowIdx: number, colIdx: number, ch: string): string => {
    const base = lIdx < 4 ? "#52525b" : "#a1a1aa";
    if (dimmed) return "#3f3f46";
    if (ch === " ") return base;

    // unique char index for noise
    const ci = lIdx * 16 + rowIdx * 4 + colIdx;
    const noise = (prng(ci + noiseSeed) * 2 - 1); // -1..1

    if (phase === "ripple") {
      const dist = Math.abs(lIdx - source);
      const noiseShift = noise > 0.5 ? 1 : noise < -0.5 ? -1 : 0;
      const effDist = Math.max(0, dist + noiseShift);
      if (effDist === tick)        return RIPPLE_COLORS[Math.floor(prng(ci) * 3)];
      if (effDist === tick - 1)    return RIPPLE_COLORS[3 + Math.floor(prng(ci + 1) * 3)];
      if (effDist === tick - 2)    return "#ffe4b5";
      return base;
    }

    if (phase === "charging") {
      if (lIdx === source) {
        // spinning ring: position + row/col blend around the letter
        const angle = (tick * 1.3 + rowIdx * 2.5 + colIdx * 1.7) % CHARGE_RING.length;
        return CHARGE_RING[Math.floor(angle)];
      }
      // distant letters pulse faintly
      const faint = prng(ci + tick * 7) > 0.88;
      return faint ? CHARGE_RING[Math.floor(prng(ci + tick) * CHARGE_RING.length)] : base;
    }

    if (phase === "exploding") {
      const dist = Math.abs(lIdx - source);
      // char-level distance: each row is a step
      const charDist = dist * 4 + rowIdx;
      const wave = tick * 2.2;
      const inWave = charDist <= wave && charDist >= wave - 5;
      if (inWave) return EXPLODE_PALETTE[(ci + tick) % EXPLODE_PALETTE.length];
      // aftermath noise: chars that the wave has passed flicker briefly
      if (charDist < wave - 5 && tick < 12 && prng(ci + tick * 3) > 0.72) {
        return EXPLODE_PALETTE[(ci + tick * 2) % EXPLODE_PALETTE.length];
      }
      return base;
    }

    return base;
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <box flexDirection="column" alignItems="center" marginTop={4} marginBottom={2}>
      <box flexDirection="row">
        {letters.map((letterLines, lIdx) => (
          <box
            key={lIdx}
            flexDirection="column"
            marginRight={lIdx === 7 ? 0 : 1}
            onMouseDown={() => handleMouseDown(lIdx)}
            onMouseUp={handleMouseUp}
          >
            {letterLines.map((line, rowIdx) => (
              <box key={rowIdx} flexDirection="row">
                {line.split("").map((ch, colIdx) => (
                  <text key={colIdx} fg={getColor(lIdx, rowIdx, colIdx, ch)}>{ch}</text>
                ))}
              </box>
            ))}
          </box>
        ))}
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

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  dimmed,
}) => {
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
                    <text fg={errorFg} style={{ weight: "bold" }}>
                      Error
                    </text>
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
    if (
      Array.isArray(message.content) &&
      message.content.some((c) => c.type === "tool_result")
    ) {
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
                    <text fg={errorFg} style={{ weight: "bold" }}>
                      Error
                    </text>
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
        } else if (
          block.type === "tool_use" &&
          block.name === "apply_multi_diff"
        ) {
          const edits = block.input?.edits || [];
          return (
            <box
              key={idx}
              flexDirection="column"
              marginTop={1}
              width="100%"
              flexShrink={0}
            >
              {edits.map((edit: any, eIdx: number) => {
                const changes = buildSimpleDiff(edit.search, edit.replace);
                return (
                  <box
                    key={eIdx}
                    width="100%"
                    flexDirection="column"
                    paddingLeft={2}
                    marginBottom={1}
                    flexShrink={0}
                  >
                    <text fg={infoFg} style={{ weight: "bold" }}>
                      • Edit {edit.path}
                    </text>
                    <box
                      flexDirection="column"
                      backgroundColor="#1e1e24"
                      padding={1}
                      marginTop={1}
                      width="100%"
                      flexShrink={0}
                    >
                      {changes.map((line, lIdx) => {
                        const isAddition = line.type === "add";
                        const isDeletion = line.type === "del";

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
                          <box
                            key={lIdx}
                            width="100%"
                            backgroundColor={lineBg}
                            paddingLeft={1}
                            flexShrink={0}
                          >
                            <text fg={lineFg}>
                              <span fg="gray">
                                {line.num.toString().padEnd(4)}
                              </span>
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
          } else if (
            block.name === "execute_bash" ||
            block.name === "run_command"
          ) {
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
                <text fg={errorFg} style={{ weight: "bold" }}>
                  Error
                </text>
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

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useKeyboard((e) => {
    if (e.name === "down") {
      setSelectedIndex(
        (prev) => (prev + 1) % Math.max(1, filteredItems.length),
      );
      e.preventDefault();
      e.stopPropagation();
    } else if (e.name === "up") {
      setSelectedIndex(
        (prev) =>
          (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length),
      );
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
  const listHeight = Math.min(10, categories.length + filteredItems.length);

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      {/* Card: fixed height = 1(pad) + 1(title) + 1(gap) + 1(search) + 1(gap) + 10(list) + 1(gap) + 1(footer) + 1(pad) = 18 */}
      <box
        width={72}
        height={18}
        flexDirection="column"
        backgroundColor="#161618"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
      >
        {/* Header */}
        <box
          flexDirection="row"
          justifyContent="space-between"
          height={1}
          marginBottom={1}
        >
          <text fg="white" style={{ weight: "bold" }}>{title}</text>
          <text fg="#52525b">esc</text>
        </box>

        {/* Search bar */}
        <box
          flexDirection="row"
          backgroundColor="#27272a"
          paddingLeft={1}
          paddingRight={1}
          height={1}
          marginBottom={1}
        >
          <input
            focused={true}
            value={searchQuery}
            onInput={(val) => {
              setSearchQuery(val);
              setSelectedIndex(0);
            }}
            placeholder="Search..."
          />
        </box>

        {/* Scrollable list — height is fixed, scrollbox clips overflow */}
        <scrollbox
          width={66}
          height={10}
          scrollY={true}
          scrollX={false}
          viewportCulling={false}
          verticalScrollbarOptions={{
            trackOptions: {
              foregroundColor: "#e8a838",
              backgroundColor: "#1e1e22",
            },
          }}
        >
          {categories.map((cat) => {
            const catItems = filteredItems.filter((i) => i.category === cat);
            return (
              <box key={cat} flexDirection="column" marginBottom={1} width={65}>
                <text fg="#7aa2f7" style={{ weight: "bold" }}>
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
                      width={65}
                      height={1}
                      backgroundColor={isSelected ? "#e8a838" : "#161618"}
                      paddingLeft={1}
                      onMouseOver={() => setSelectedIndex(absIndex)}
                      onMouseDown={() => onSelect(item)}
                    >
                      <text fg={isSelected ? "#111" : "white"}>
                        {hasCheck ? (
                          <span fg={isSelected ? "#111" : "#22c55e"}>✓ </span>
                        ) : isSelected ? (
                          "▶ "
                        ) : (
                          "  "
                        )}
                        <span style={{ weight: "bold" }}>{item.name}</span>
                        {item.desc ? (
                          <span fg={isSelected ? "#333" : "#52525b"}>{"  "}{item.desc}</span>
                        ) : null}
                      </text>
                    </box>
                  );
                })}
              </box>
            );
          })}
        </scrollbox>

        {/* Footer */}
        <box height={1} marginTop={1} flexDirection="row">
          <text fg="#3f3f46">↑↓ navigate  enter select  esc close</text>
        </box>
      </box>
    </box>
  );
};

export interface InteractiveInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
  providerName: string;
  activeAgent: string;
  activeVariant: string;
  primaryColor: string;
  onCycleAgent: () => void;
  onOpenModelPicker: () => void;
  onOpenAgentPicker: () => void;
  onOpenProviderPicker: () => void;
  onOpenVariantPicker: () => void;
  dimmed?: boolean;
  focusKey?: number;
}

export const InteractiveInput: React.FC<InteractiveInputProps> = ({
  onSubmit,
  modelName,
  providerName,
  activeAgent,
  activeVariant,
  primaryColor,
  onCycleAgent,
  onOpenModelPicker,
  onOpenAgentPicker,
  onOpenProviderPicker,
  onOpenVariantPicker,
  dimmed,
  focusKey,
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
    cmd.name.toLowerCase().startsWith(trimmed.toLowerCase()),
  );

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(0, filteredCommands.length - 1),
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
    } else if (cmdName === "/variant") {
      onOpenVariantPicker();
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
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length,
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (
        e.name === "return" ||
        e.name === "enter" ||
        e.name === "tab"
      ) {
        const selected = filteredCommands[activeIndex];
        if (selected) {
          handleSelectCommand(selected.name);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } else {
      if (e.name === "tab") {
        onCycleAgent();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.ctrl && e.name === "p") {
        onOpenModelPicker();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  const [hoveredChip, setHoveredChip] = React.useState<string | null>(null);

  const accentColor = dimmed ? "#3f3f46" : primaryColor;
  const mutedFg     = dimmed ? "#3f3f46" : "#52525b";
  const boldFg      = dimmed ? "#3f3f46" : "white";
  const hoverBg     = "#2d2d30";  // subtle hover highlight

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
                  backgroundColor={isSelected ? primaryColor : undefined}
                  paddingX={1}
                  onMouseOver={() => setSelectedIndex(idx)}
                  onMouseDown={() => handleSelectCommand(cmd.name)}
                >
                  <text fg={isSelected ? "black" : "white"} style={{ weight: "bold" }}>
                    {cmd.name.padEnd(12)}
                  </text>
                  <text fg={isSelected ? "black" : "gray"}>{cmd.desc}</text>
                </box>
              );
            })}
          </box>
        )}

        {/* Input card */}
        <box flexDirection="row" width="100%" backgroundColor="#27272a" flexShrink={0}>
          {/* Accent bar — primary color */}
          <box flexDirection="column" width={1}>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
          </box>
          <box flexDirection="column" flexGrow={1} paddingY={1} paddingLeft={1} paddingRight={1}>
            <input
              key={focusKey}
              focused={!dimmed}
              value={value}
              onInput={(val) => { setValue(val); setSelectedIndex(0); }}
              onSubmit={handleSubmit}
              placeholder='Ask anything... "What is the tech stack of this project?"'
            />
            {/* Inline status row — hover-highlighted chips */}
            <box marginTop={1} flexDirection="row" alignItems="center">
              {/* Agent */}
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={!dimmed && hoveredChip === "agent" ? hoverBg : undefined}
                onMouseOver={() => { if (!dimmed) setHoveredChip("agent"); }}
                onMouseLeave={() => setHoveredChip(null)}
                onMouseDown={() => { if (!dimmed) onOpenAgentPicker(); }}
              >
                <text fg={accentColor} style={{ weight: "bold" }}>{activeAgent}</text>
              </box>
              <text fg={mutedFg}>{" · "}</text>
              {/* Model */}
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={!dimmed && hoveredChip === "model" ? hoverBg : undefined}
                onMouseOver={() => { if (!dimmed) setHoveredChip("model"); }}
                onMouseLeave={() => setHoveredChip(null)}
                onMouseDown={() => { if (!dimmed) onOpenModelPicker(); }}
              >
                <text fg={!dimmed && hoveredChip === "model" ? accentColor : boldFg} style={{ weight: "bold" }}>{modelName}</text>
              </box>
              {/* Provider (inline, no separator box needed) */}
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={!dimmed && hoveredChip === "provider" ? hoverBg : undefined}
                onMouseOver={() => { if (!dimmed) setHoveredChip("provider"); }}
                onMouseLeave={() => setHoveredChip(null)}
                onMouseDown={() => { if (!dimmed) onOpenProviderPicker(); }}
              >
                <text fg={!dimmed && hoveredChip === "provider" ? boldFg : mutedFg}>{providerName}</text>
              </box>
              <text fg={mutedFg}>{" · "}</text>
              {/* Variant */}
              <box
                flexDirection="row"
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={!dimmed && hoveredChip === "variant" ? hoverBg : undefined}
                onMouseOver={() => { if (!dimmed) setHoveredChip("variant"); }}
                onMouseLeave={() => setHoveredChip(null)}
                onMouseDown={() => { if (!dimmed) onOpenVariantPicker(); }}
              >
                <text fg={dimmed ? "#3f3f46" : hoveredChip === "variant" ? "#fbbf24" : "#e8a838"}>{activeVariant}</text>
              </box>
            </box>
          </box>
        </box>
      </box>

      {/* Keyboard shortcut hints */}
      <box flexDirection="row" justifyContent="flex-end" marginTop={1}>
        <text fg={accentColor} style={{ weight: "bold" }}>tab</text>
        <text fg={mutedFg}> next agent </text>
        <text fg={accentColor} style={{ weight: "bold" }}>ctrl+p</text>
        <text fg={mutedFg}> commands</text>
      </box>

      {/* Tip */}
      <box flexDirection="row" justifyContent="center" marginTop={1}>
        <text fg={accentColor}>• </text>
        <text fg={accentColor} style={{ weight: "bold" }}>Tip</text>
        <text fg={mutedFg}>{" Press "}</text>
        <text fg={boldFg} style={{ weight: "bold" }}>ctrl+x b</text>
        <text fg={mutedFg}>{" in a session to show or hide the sidebar panel"}</text>
      </box>
    </box>
  );
};

export interface SessionInputProps {
  onSubmit: (text: string) => void;
  modelName: string;
  providerName: string;
  activeAgent: string;
  activeVariant: string;
  primaryColor: string;
  status: string;
  elapsed?: string;
  onCycleAgent: () => void;
  onOpenModelPicker: () => void;
  onOpenAgentPicker: () => void;
  onOpenProviderPicker: () => void;
  onOpenVariantPicker: () => void;
  dimmed?: boolean;
  focusKey?: number;
}

export const SessionInput: React.FC<SessionInputProps> = ({
  onSubmit,
  modelName,
  providerName,
  activeAgent,
  activeVariant,
  primaryColor,
  status,
  elapsed,
  onCycleAgent,
  onOpenModelPicker,
  onOpenAgentPicker,
  onOpenProviderPicker,
  onOpenVariantPicker,
  dimmed,
  focusKey,
}) => {
  const [value, setValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [hoveredChip, setHoveredChip] = React.useState<string | null>(null);

  const handleSubmit = (val: string) => {
    if (!val.trim()) return;
    onSubmit(val.trim());
    setValue("");
  };

  const trimmed = value.trim();
  const showSlashMenu = trimmed.startsWith("/") && !trimmed.includes(" ");

  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(trimmed.toLowerCase()),
  );

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(0, filteredCommands.length - 1),
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
    } else if (cmdName === "/variant") {
      onOpenVariantPicker();
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
          (prev) =>
            (prev - 1 + filteredCommands.length) % filteredCommands.length,
        );
        e.preventDefault();
        e.stopPropagation();
      } else if (
        e.name === "return" ||
        e.name === "enter" ||
        e.name === "tab"
      ) {
        const selected = filteredCommands[activeIndex];
        if (selected) {
          handleSelectCommand(selected.name);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    } else {
      if (e.name === "tab") {
        onCycleAgent();
        e.preventDefault();
        e.stopPropagation();
      } else if (e.ctrl && e.name === "p") {
        onOpenModelPicker();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  const accentColor = dimmed ? "#3f3f46" : primaryColor;
  const mutedFg     = dimmed ? "#3f3f46" : "#52525b";
  const boldFg      = dimmed ? "#3f3f46" : "white";
  const hoverBg     = "#2d2d30";

  return (
    <box flexDirection="column" width="100%">
      {/* Running status indicator */}
      {status !== "idle" && (
        <box paddingLeft={2} marginBottom={1} flexDirection="row">
          <text fg={primaryColor}>■ </text>
          <text fg={boldFg} style={{ weight: "bold" }}>{activeAgent}</text>
          <text fg={mutedFg}>{" · "}{modelName}{" · "}{elapsed || "0.0s"}</text>
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
                  backgroundColor={isSelected ? primaryColor : undefined}
                  paddingX={1}
                  onMouseOver={() => setSelectedIndex(idx)}
                  onMouseDown={() => handleSelectCommand(cmd.name)}
                >
                  <text fg={isSelected ? "black" : "white"} style={{ weight: "bold" }}>
                    {cmd.name.padEnd(12)}
                  </text>
                  <text fg={isSelected ? "black" : "gray"}>{cmd.desc}</text>
                </box>
              );
            })}
          </box>
        )}

        {/* Compact input card */}
        <box flexDirection="row" width="100%" backgroundColor="#27272a" flexShrink={0}>
          {/* Accent bar */}
          <box flexDirection="column" width={1}>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
            <text fg={accentColor}>▏</text>
          </box>
          <box flexGrow={1} paddingY={1} paddingLeft={1} paddingRight={1}>
            <input
              key={focusKey}
              focused={!dimmed}
              value={value}
              onInput={(val) => { setValue(val); setSelectedIndex(0); }}
              onSubmit={handleSubmit}
            />
          </box>
        </box>
      </box>

      {/* Inline status row — hover-highlighted chips */}
      <box flexDirection="row" marginTop={1} alignItems="center">
        {/* Agent */}
        <box
          flexDirection="row"
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={!dimmed && hoveredChip === "agent" ? hoverBg : undefined}
          onMouseOver={() => { if (!dimmed) setHoveredChip("agent"); }}
          onMouseLeave={() => setHoveredChip(null)}
          onMouseDown={() => { if (!dimmed) onOpenAgentPicker(); }}
        >
          <text fg={accentColor} style={{ weight: "bold" }}>{activeAgent}</text>
        </box>
        <text fg={mutedFg}>{" · "}</text>
        {/* Model */}
        <box
          flexDirection="row"
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={!dimmed && hoveredChip === "model" ? hoverBg : undefined}
          onMouseOver={() => { if (!dimmed) setHoveredChip("model"); }}
          onMouseLeave={() => setHoveredChip(null)}
          onMouseDown={() => { if (!dimmed) onOpenModelPicker(); }}
        >
          <text fg={!dimmed && hoveredChip === "model" ? accentColor : boldFg} style={{ weight: "bold" }}>{modelName}</text>
        </box>
        {/* Provider */}
        <box
          flexDirection="row"
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={!dimmed && hoveredChip === "provider" ? hoverBg : undefined}
          onMouseOver={() => { if (!dimmed) setHoveredChip("provider"); }}
          onMouseLeave={() => setHoveredChip(null)}
          onMouseDown={() => { if (!dimmed) onOpenProviderPicker(); }}
        >
          <text fg={!dimmed && hoveredChip === "provider" ? boldFg : mutedFg}>{providerName}</text>
        </box>
        <text fg={mutedFg}>{" · "}</text>
        {/* Variant */}
        <box
          flexDirection="row"
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={!dimmed && hoveredChip === "variant" ? hoverBg : undefined}
          onMouseOver={() => { if (!dimmed) setHoveredChip("variant"); }}
          onMouseLeave={() => setHoveredChip(null)}
          onMouseDown={() => { if (!dimmed) onOpenVariantPicker(); }}
        >
          <text fg={dimmed ? "#3f3f46" : hoveredChip === "variant" ? "#fbbf24" : "#e8a838"}>{activeVariant}</text>
        </box>
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
