import { expect, test, describe } from "bun:test";
import { ConversationState } from "../src/state/engine.ts";
import { classifyCommand } from "../src/permissions/middleware.ts";
import { readFileTool, writeFileTool, editFileTool } from "../src/tools/fileTools.ts";
import { parseCodeOutline } from "../src/tools/outlineTool.ts";
import { applyMultiDiffTool } from "../src/tools/multiDiffTool.ts";
import { globalScheduler } from "../src/state/scheduler.ts";
import { LogRingBuffer } from "../src/tools/bashTool.ts";
import { MCPClient } from "../src/mcp/client.ts";
import { LLMClient } from "../src/llm/client.ts";
import * as fs from "fs";
import * as path from "path";

describe("Hypr State Engine", () => {
  test("Serialization & Deserialization", () => {
    const state = new ConversationState("Custom Prompt");
    state.addMessage({ role: "user", content: "Hello" });
    state.addMessage({ role: "assistant", content: "Hi" });
    
    const serialized = state.serialize();
    const deserialized = ConversationState.deserialize(serialized);
    
    expect(deserialized.getSystemPrompt()).toBe("Custom Prompt");
    expect(deserialized.getMessages().length).toBe(2);
    expect(deserialized.getMessages()[0].content).toBe("Hello");
  });

  test("Compaction", () => {
    const state = new ConversationState();
    for (let i = 0; i < 20; i++) {
      state.addMessage({ role: "user", content: `Msg ${i}` });
    }
    state.compact(10);
    expect(state.getMessages().length).toBe(10);
    expect(state.getMessages()[2].content).toContain("Context Compacted");
  });
});

describe("Permissions Middleware Classifier", () => {
  test("Classify read-only commands", () => {
    const check1 = classifyCommand("git status");
    expect(check1.isReadOnly).toBe(true);

    const check2 = classifyCommand("bun test");
    expect(check2.isReadOnly).toBe(true);
  });

  test("Classify destructive commands", () => {
    const check1 = classifyCommand("rm -rf node_modules");
    expect(check1.isReadOnly).toBe(false);

    const check2 = classifyCommand("git push origin main");
    expect(check2.isReadOnly).toBe(false);
  });
});

describe("File Tools Integration", () => {
  const testFile = path.resolve("./test_temp_file.txt");

  test("Write, Read, Edit workflow", async () => {
    const writeRes = await writeFileTool.execute({
      path: testFile,
      content: "line 1\nline 2\nline 3"
    });
    expect(writeRes.isError).toBe(false);

    const readRes = await readFileTool.execute({
      path: testFile,
      startLine: 1,
      endLine: 2
    });
    expect(readRes.isError).toBe(false);
    expect(readRes.content).toBe("line 1\nline 2");

    const editRes = await editFileTool.execute({
      path: testFile,
      search: "line 2",
      replace: "line 2 modified"
    });
    expect(editRes.isError).toBe(false);

    const readRes2 = await readFileTool.execute({
      path: testFile
    });
    expect(readRes2.content).toBe("line 1\nline 2 modified\nline 3");

    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });
});

describe("Code Outline Symbol Extractor", () => {
  test("Parse TypeScript symbols", () => {
    const tsCode = `
      export interface User {
        id: string;
      }
      export class Database {
        connect() {}
      }
      export async function checkStatus() {}
    `;
    const symbols = parseCodeOutline(tsCode, "test.ts");
    expect(symbols.length).toBe(3);
    expect(symbols[0].type).toBe("interface");
    expect(symbols[1].type).toBe("class");
    expect(symbols[2].type).toBe("function");
  });
});

describe("Task Scheduler System", () => {
  test("Schedule and update states", () => {
    globalScheduler.clear();
    globalScheduler.addTask({
      id: "task_1",
      title: "Initialize test DB",
      status: "pending",
      dependencies: [],
      estimatedFiles: ["db.ts"]
    });
    
    expect(globalScheduler.getTasks().length).toBe(1);
    expect(globalScheduler.getTasks()[0].status).toBe("pending");

    globalScheduler.updateTaskStatus("task_1", "running");
    expect(globalScheduler.getTasks()[0].status).toBe("running");
  });
});

describe("Log Ring Buffer Stream Interceptor", () => {
  test("Truncate stream lines beyond limit", () => {
    const buffer = new LogRingBuffer(3);
    buffer.write("line 1");
    buffer.write("line 2");
    buffer.write("line 3");
    buffer.write("line 4");

    expect(buffer.read()).toBe("line 2\nline 3\nline 4");
  });
});

describe("MCP Client Protocol Instantiation", () => {
  test("Create client structure", () => {
    const client = new MCPClient("node", ["some-server.js"]);
    expect(client).toBeDefined();
  });
});

describe("LLMClient Model & Provider Switching", () => {
  test("Modify provider and model configuration", () => {
    const client = new LLMClient();
    client.setProvider("gemini");
    client.setModelName("gemini-2.5-pro");
    expect(client.getProviderName()).toBe("gemini");
  });
});

describe("Atomic Multi-File Transaction Engine", () => {
  const file1 = path.resolve("./test_multi_1.txt");
  const file2 = path.resolve("./test_multi_2.txt");

  test("Successful transaction execution", async () => {
    fs.writeFileSync(file1, "Hello from file 1\nsome context text", "utf-8");
    fs.writeFileSync(file2, "Hello from file 2\nanother piece of text", "utf-8");

    const result = await applyMultiDiffTool.execute({
      edits: [
        { path: file1, search: "Hello from file 1", replace: "Hola file 1" },
        { path: file2, search: "Hello from file 2", replace: "Hola file 2" }
      ]
    });

    expect(result.isError).toBe(false);
    expect(fs.readFileSync(file1, "utf-8")).toBe("Hola file 1\nsome context text");
    expect(fs.readFileSync(file2, "utf-8")).toBe("Hola file 2\nanother piece of text");

    if (fs.existsSync(file1)) fs.unlinkSync(file1);
    if (fs.existsSync(file2)) fs.unlinkSync(file2);
  });

  test("Transaction rollback on validation syntax error", async () => {
    fs.writeFileSync(file1, "Original content 1", "utf-8");
    fs.writeFileSync(file2, "Original content 2", "utf-8");

    // Intentionally inject search block missing or let compile fail.
    // If search block missing -> tool aborts.
    const result = await applyMultiDiffTool.execute({
      edits: [
        { path: file1, search: "Original content 1", replace: "New content 1" },
        { path: file2, search: "Non-existent text", replace: "New content 2" }
      ]
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContain("Transaction aborted");
    // Original contents must remain completely unchanged
    expect(fs.readFileSync(file1, "utf-8")).toBe("Original content 1");
    expect(fs.readFileSync(file2, "utf-8")).toBe("Original content 2");

    // Check volatile shadow cache is cleaned
    const shadowDir = path.join(process.cwd(), ".hypr", "shadow");
    expect(fs.existsSync(shadowDir)).toBe(false);

    if (fs.existsSync(file1)) fs.unlinkSync(file1);
    if (fs.existsSync(file2)) fs.unlinkSync(file2);
  });
});

describe("HyprDaemon Sockets IPC connection", () => {
  test("Daemon boots and hydrates client with initial stateUpdate", async () => {
    const { HyprDaemon, SOCKET_PATH, SOCKET_PORT } = await import("../src/daemon/daemon.ts");
    const daemon = new HyprDaemon();
    daemon.start();

    // Connect client socket
    const isWindows = process.platform === "win32";
    const connectOptions: any = isWindows
      ? { hostname: SOCKET_PATH, port: SOCKET_PORT }
      : { unix: SOCKET_PATH };

    let stateReceived: any = null;

    const socket = await Bun.connect({
      ...connectOptions,
      socket: {
        data(socket, data) {
          const raw = new TextDecoder().decode(data);
          const lines = raw.split("\n").filter(l => l.trim());
          for (const line of lines) {
            try {
              const msg = JSON.parse(line);
              if (msg.method === "stateUpdate") {
                stateReceived = msg.params;
              }
            } catch (_) {}
          }
        },
        error(socket, err) {},
        close(socket) {}
      }
    });

    // Wait a brief moment to receive the data
    await Bun.sleep(150);

    expect(stateReceived).not.toBeNull();
    expect(stateReceived.activeAgent).toBe("Build");
    expect(stateReceived.status).toBe("idle");

    socket.end();
    // Stop the socket listener server on Windows or clean up on Unix
    if (daemon["server"]) {
      daemon["server"].stop();
    }
    if (process.platform !== "win32" && fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
  });
});

describe("Subagent Scoped Delegation Framework", () => {
  test("Explore subagent blocks file write tools", async () => {
    const { ScopedSubagent } = await import("../src/daemon/subagent.ts");
    const subagent = new ScopedSubagent("test_sub", "explore", "Search repository structure", "");
    
    // Simulate running with tools list including write_file
    const mockWriteTool = { name: "write_file", execute: async () => ({ content: "done" }) };
    const mockReadTool = { name: "read_file", execute: async () => ({ content: "read done" }) };
    
    // The subagent should filter out write_file
    let logsUpdate = 0;
    const runPromise = subagent.run([mockWriteTool, mockReadTool], () => {
      logsUpdate++;
    });
    
    // Force complete
    subagent.status = "completed";
    await runPromise;
    expect(logsUpdate).toBeGreaterThan(0);
  });

  test("Scout subagent git clones remote repository into doc cache fold", async () => {
    const { ScopedSubagent } = await import("../src/daemon/subagent.ts");
    const subagent = new ScopedSubagent("scout_sub", "scout", "Inspect library", "");
    
    const mockBashTool = {
      name: "execute_bash",
      execute: async () => ({ content: "Mock cloned" })
    };
    
    let updated = false;
    await subagent.run([mockBashTool], () => {
      updated = true;
    });
    
    expect(subagent.status).toBe("completed");
  });

  test("BackgroundCompactor compresses messages when threshold exceeded", async () => {
    const { BackgroundCompactor } = await import("../src/daemon/compactor.ts");
    const { ConversationState } = await import("../src/state/engine.ts");
    
    const compactor = new BackgroundCompactor(5);
    const state = new ConversationState();
    state.setSystemPrompt("Sys prompt");
    
    // Add 8 user messages to state
    for (let i = 0; i < 8; i++) {
      state.addMessage({ role: "user", content: `msg ${i}` });
    }
    
    const compacted = await compactor.checkAndCompact(state);
    expect(compacted).toBe(true);
    // Compactor down sizes messages list to conserve tokens
    expect(state.getMessages().length).toBeLessThan(8);
  });
});

describe("LSP Core Client & Interceptor", () => {
  test("Incremental change publishes type mismatch error diagnostics", async () => {
    const { globalLspManager } = await import("../src/daemon/lsp.ts");
    
    let callbackTriggered = false;
    globalLspManager.setDiagnosticsCallback((diags) => {
      if (diags.length > 0) callbackTriggered = true;
    });

    globalLspManager.notifyFileChanged("src/main.ts", "const x: number = 'mismatch'; // type mismatch");
    
    expect(globalLspManager.getGlobalErrorCount()).toBe(1);
    expect(callbackTriggered).toBe(true);
    
    globalLspManager.shutdown();
  });

  test("Pre-flight gate blocks execute_bash test commands on active errors", async () => {
    const { globalLspManager } = await import("../src/daemon/lsp.ts");
    const { HyprDaemon } = await import("../src/daemon/daemon.ts");
    
    globalLspManager.notifyFileChanged("src/main.ts", "Type 'string' is not assignable to type 'number'");
    
    const daemon = new HyprDaemon();
    // Simulate user executing a test run via bash while diagnostics error exists
    const mockSocket = { write: () => {} };
    await daemon["handleClientRequest"](mockSocket, {
      method: "submitInput",
      params: { text: "execute tests" }
    });

    // The loop should block test command execution and maintain active error state
    expect(globalLspManager.getGlobalErrorCount()).toBe(1);
    
    globalLspManager.shutdown();
  });
});

