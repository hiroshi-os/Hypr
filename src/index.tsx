import * as React from "react";
import * as path from "path";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
import { ConversationState, Message } from "./state/engine.ts";
import {
  ChatMessage,
  InteractiveInput,
  SessionInput,
  PermissionPrompt,
  Sidebar,
  WelcomeLogo,
  PickerOverlay,
  MODELS_LIST,
  AGENTS_LIST,
  PROVIDERS_LIST,
  VARIANTS_LIST,
  AGENT_COLORS,
  DEFAULT_PRIMARY
} from "./ui/Canvas.tsx";
import { HyprDaemon, SOCKET_PATH, SOCKET_PORT } from "./daemon/daemon.ts";

if (Bun.argv[2] === "daemon") {
  const daemon = new HyprDaemon();
  daemon.start();
} else {
  const clientConnect = async (): Promise<any> => {
    const isWindows = process.platform === "win32";
    const connectOptions: any = isWindows
      ? { hostname: SOCKET_PATH, port: SOCKET_PORT }
      : { unix: SOCKET_PATH };

    try {
      const socket = await Bun.connect({
        ...connectOptions,
        socket: {
          data(socket, data) {},
          error(socket, err) {},
          close(socket) {}
        }
      });
      socket.end();
      return connectOptions;
    } catch (_) {
      const proc = Bun.spawn({
        cmd: [process.argv[0], process.argv[1], "daemon"],
        stdout: "ignore",
        stderr: "ignore",
        detached: true
      });
      proc.unref();
      await Bun.sleep(500);
      return connectOptions;
    }
  };

  await clientConnect();

  const HyprApp: React.FC = () => {
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [status, setStatus] = React.useState<"idle" | "thinking" | "prompting_permission" | "executing_tool">("idle");
    const [permissionMsg, setPermissionMsg] = React.useState("");
    const [currentToolProgress, setCurrentToolProgress] = React.useState("");
    const [tasks, setTasks] = React.useState<any[]>([]);
    const [rulesFound, setRulesFound] = React.useState(false);
    const [activePicker, setActivePicker] = React.useState<"models" | "agents" | "providers" | "variant" | null>(null);
    const [activeAgent, setActiveAgent] = React.useState("Build");
    const [activeVariant, setActiveVariant] = React.useState("medium");
    const [pickerFocusKey, setPickerFocusKey] = React.useState(0);
    const [currentModelName, setCurrentModelName] = React.useState("Gemini 2.5 Flash");
    const [providerName, setProviderName] = React.useState("gemini");
    const [connectedClients, setConnectedClients] = React.useState(1);
    const [activeWorkers, setActiveWorkers] = React.useState(4);
    const [activeDelegations, setActiveDelegations] = React.useState<any[]>([]);

    const socketRef = React.useRef<any>(null);
    const ctrlXActiveRef = React.useRef(false);

    useKeyboard((e) => {
      if (e.ctrl && e.name === "x") {
        ctrlXActiveRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (ctrlXActiveRef.current) {
        if (e.name === "left") {
          sendRequest("prevSession");
          ctrlXActiveRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        } else if (e.name === "right") {
          sendRequest("nextSession");
          ctrlXActiveRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        } else {
          ctrlXActiveRef.current = false;
        }
      }
    });

    const closePicker = React.useCallback(() => {
      setActivePicker(null);
      setPickerFocusKey((k) => k + 1);
    }, []);

    const sendRequest = (method: string, params: any = {}) => {
      if (socketRef.current) {
        try {
          socketRef.current.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
        } catch (_) {}
      }
    };

    React.useEffect(() => {
      let active = true;
      const connectSocket = async () => {
        const isWindows = process.platform === "win32";
        const connectOptions: any = isWindows
          ? { hostname: SOCKET_PATH, port: SOCKET_PORT }
          : { unix: SOCKET_PATH };

        try {
          socketRef.current = await Bun.connect({
            ...connectOptions,
            socket: {
              data(socket, data) {
                const rawStr = new TextDecoder().decode(data);
                const rawLines = rawStr.split("\n").filter(l => l.trim());
                for (const line of rawLines) {
                  try {
                    const msg = JSON.parse(line);
                    if (msg.method === "stateUpdate") {
                      const p = msg.params;
                      setMessages(p.messages || []);
                      setStatus(p.status || "idle");
                      setPermissionMsg(p.permissionMsg || "");
                      setCurrentToolProgress(p.currentToolProgress || "");
                      setTasks(p.tasks || []);
                      setRulesFound(p.rulesFound || false);
                      setActiveAgent(p.activeAgent || "Build");
                      setActiveVariant(p.activeVariant || "medium");
                      setCurrentModelName(p.currentModelName || "Gemini 2.5 Flash");
                      setProviderName(p.providerName || "gemini");
                      setConnectedClients(p.connectedClients || 1);
                      setActiveWorkers(p.activeWorkers || 4);
                      setActiveDelegations(p.activeDelegations || []);
                    }
                  } catch (_) {}
                }
              },
              close() {
                if (active) setTimeout(connectSocket, 1000);
              },
              error(socket, err) {
                if (active) setTimeout(connectSocket, 1000);
              }
            }
          });
        } catch (e) {
          if (active) setTimeout(connectSocket, 1000);
        }
      };

      connectSocket();

      return () => {
        active = false;
        if (socketRef.current) {
          socketRef.current.end();
        }
      };
    }, []);

    const handleUserInput = (text: string) => {
      sendRequest("submitInput", { text });
    };

    const handleCycleAgent = () => {
      sendRequest("cycleAgent");
    };

    const handleSelectModel = (model: any) => {
      sendRequest("selectModel", { model });
      closePicker();
    };

    const handleSelectAgent = (agent: any) => {
      sendRequest("selectAgent", { agent });
      closePicker();
    };

    const handleSelectProvider = (provider: any) => {
      sendRequest("selectProvider", { provider });
      closePicker();
    };

    const handleSelectVariant = (variant: any) => {
      sendRequest("selectVariant", { variant });
      closePicker();
    };

    const handlePermissionDecision = (allowed: boolean) => {
      sendRequest("resolvePermission", { allowed });
    };

    const hasSession = messages.length > 0;
    const isDimmed = activePicker !== null;
    const primaryColor = AGENT_COLORS[activeAgent] ?? DEFAULT_PRIMARY;

    let content;
    if (!hasSession && status === "idle") {
      content = (
        <box flexDirection="column" width="100%" height="100%" alignItems="center">
          <box flexGrow={1} />
          <WelcomeLogo dimmed={isDimmed} />
          <box width={85} marginBottom={4} flexShrink={0}>
            <InteractiveInput
              onSubmit={handleUserInput}
              modelName={currentModelName}
              providerName={providerName}
              activeAgent={activeAgent}
              activeVariant={activeVariant}
              primaryColor={primaryColor}
              onCycleAgent={handleCycleAgent}
              onOpenModelPicker={() => setActivePicker("models")}
              onOpenAgentPicker={() => setActivePicker("agents")}
              onOpenProviderPicker={() => setActivePicker("providers")}
              onOpenVariantPicker={() => setActivePicker("variant")}
              dimmed={isDimmed}
              focusKey={pickerFocusKey}
            />
          </box>
          <box flexGrow={2} />
        </box>
      );
    } else {
      content = (
        <box flexDirection="row" width="100%" height="100%">
          <box flexDirection="column" width="75%" paddingRight={4}>
            <box flexDirection="column" flexGrow={1} overflowY="scroll">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} dimmed={isDimmed} />
              ))}

              {(status === "thinking" || status === "executing_tool") && (
                <box paddingLeft={2} marginBottom={1}>
                  <text fg={isDimmed ? "gray" : "yellow"} style={{ italic: true }}>Thinking: </text>
                  <text fg="gray">{status === "executing_tool" ? currentToolProgress : "Processing your request..."}</text>
                </box>
              )}
            </box>

            {status === "prompting_permission" && (
              <PermissionPrompt message={permissionMsg} onDecision={handlePermissionDecision} />
            )}

            {status === "idle" && (
              <box flexShrink={0}>
                <SessionInput
                  onSubmit={handleUserInput}
                  modelName={currentModelName}
                  providerName={providerName}
                  activeAgent={activeAgent}
                  activeVariant={activeVariant}
                  primaryColor={primaryColor}
                  status="idle"
                  onCycleAgent={handleCycleAgent}
                  onOpenModelPicker={() => setActivePicker("models")}
                  onOpenAgentPicker={() => setActivePicker("agents")}
                  onOpenProviderPicker={() => setActivePicker("providers")}
                  onOpenVariantPicker={() => setActivePicker("variant")}
                  dimmed={isDimmed}
                  focusKey={pickerFocusKey}
                />
              </box>
            )}
          </box>

          <box width="25%">
            <Sidebar
              tasks={tasks}
              modelName={currentModelName}
              provider={providerName}
              cwd={process.cwd()}
              rulesFound={rulesFound}
              messages={messages}
              activeAgent={activeAgent}
              dimmed={isDimmed}
              connectedClients={connectedClients}
              activeWorkers={activeWorkers}
              activeDelegations={activeDelegations}
            />
          </box>
        </box>
      );
    }

    return (
      <box width="100%" height="100%" flexDirection="column">
        <box flexGrow={1} width="100%" height="100%">
          {content}
        </box>

        {/* Footer bar showing working dir and version */}
        <box flexDirection="row" width="100%" justifyContent="space-between" flexShrink={0} marginTop={1}>
          <text fg={isDimmed ? "gray" : "gray"}>{process.cwd()}:main</text>
          <text fg={isDimmed ? "gray" : "gray"}>1.15.7</text>
        </box>

        {activePicker === "models" && (
          <PickerOverlay
            title="Select model"
            items={MODELS_LIST}
            onSelect={handleSelectModel}
            onClose={closePicker}
          />
        )}

        {activePicker === "agents" && (
          <PickerOverlay
            title="Select agent"
            items={AGENTS_LIST}
            onSelect={handleSelectAgent}
            onClose={closePicker}
          />
        )}

        {activePicker === "providers" && (
          <PickerOverlay
            title="Connect a provider"
            items={PROVIDERS_LIST}
            onSelect={handleSelectProvider}
            onClose={closePicker}
          />
        )}

        {activePicker === "variant" && (
          <PickerOverlay
            title="Select variant"
            items={VARIANTS_LIST}
            onSelect={handleSelectVariant}
            onClose={closePicker}
          />
        )}
      </box>
    );
  };

  const renderer = await createCliRenderer({
    screenMode: "alternate-screen",
    exitOnCtrlC: true
  });

  createRoot(renderer).render(<HyprApp />);
}
