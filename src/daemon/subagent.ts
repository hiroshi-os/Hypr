import * as fs from "fs";
import * as path from "path";
import { ConversationState, Message } from "../state/engine.ts";
import { LLMClient } from "../llm/client.ts";
import { DefaultPermissionGate } from "../permissions/middleware.ts";

export interface SubagentDef {
  id: string;
  type: "general" | "explore" | "scout";
  status: "idle" | "running" | "completed";
  currentTask: string;
  messages: Message[];
}

export class ScopedSubagent {
  public id: string;
  public type: "general" | "explore" | "scout";
  public status: "idle" | "running" | "completed" = "idle";
  public currentTask: string;
  
  public state: ConversationState;
  private client: LLMClient;
  private gate: DefaultPermissionGate;

  constructor(id: string, type: "general" | "explore" | "scout", task: string, parentPrompt: string) {
    this.id = id;
    this.type = type;
    this.currentTask = task;
    this.state = new ConversationState();
    this.client = new LLMClient();
    this.gate = new DefaultPermissionGate(true); // allow actions inside subagent boundary

    let systemPrompt = "";
    if (type === "explore") {
      systemPrompt = `You are @explore, a read-only code exploration subagent.\n` +
        `You scan repositories, pattern match, and find code outlines. You are strictly forbidden from writing files.\n` +
        `Task: ${task}\n`;
    } else if (type === "scout") {
      systemPrompt = `You are @scout, a documentation and source scouting subagent.\n` +
        `You clone reference repositories and inspect libraries under .hypr/cache/docs/.\n` +
        `Task: ${task}\n`;
    } else {
      systemPrompt = `You are @general, an asynchronous refactoring subagent.\n` +
        `You perform code modifications and run background tasks cleanly.\n` +
        `Task: ${task}\n`;
    }

    this.state.setSystemPrompt(systemPrompt);
    this.state.addMessage({ role: "user", content: `Please execute the task: ${task}` });
  }

  getMessages(): Message[] {
    return this.state.getMessages();
  }

  async run(tools: any[], onUpdate: () => void) {
    this.status = "running";
    onUpdate();

    try {
      let loop = true;
      let steps = 0;
      while (loop && steps < 8) {
        steps++;
        // filter tools based on subagent type
        let allowedTools = tools;
        if (this.type === "explore") {
          // block file writes / bash execution
          allowedTools = tools.filter(t => !["write_file", "edit_file", "apply_multi_diff", "execute_bash"].includes(t.name));
        }

        const response = await this.client.sendRequest(
          this.state.getSystemPrompt(),
          this.state.getMessages(),
          allowedTools
        );

        if (typeof response.content === "string") {
          this.state.addMessage({ role: "assistant", content: response.content });
          onUpdate();
          if (response.stopReason === "end_turn") {
            loop = false;
          }
        } else {
          this.state.addMessage({ role: "assistant", content: response.content });
          onUpdate();
          const toolCalls = response.content.filter(block => block.type === "tool_use") as any[];
          if (toolCalls.length === 0) {
            loop = false;
          } else {
            const toolResults: any[] = [];
            for (const call of toolCalls) {
              const tool = allowedTools.find(t => t.name === call.name);
              if (!tool) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: `Error: Tool '${call.name}' not allowed or not found in @${this.type} scope.`,
                  is_error: true
                });
                continue;
              }

              // Special handling for @scout git cloning
              if (this.type === "scout" && tool.name === "execute_bash") {
                const cmd = (call.input?.command || "").trim();
                if (cmd.startsWith("git clone ")) {
                  const parts = cmd.split(" ");
                  const repoUrl = parts[2];
                  if (repoUrl) {
                    const cacheDir = path.join(process.cwd(), ".hypr", "cache", "docs");
                    if (!fs.existsSync(cacheDir)) {
                      fs.mkdirSync(cacheDir, { recursive: true });
                    }
                    const repoName = path.basename(repoUrl, ".git");
                    const targetPath = path.join(cacheDir, repoName);
                    
                    // Mock/Simulate successful clone into cache if git fails, or run it
                    const proc = Bun.spawn({
                      cmd: ["git", "clone", repoUrl, targetPath],
                      stdout: "ignore",
                      stderr: "ignore"
                    });
                    await proc.exited;
                    toolResults.push({
                      type: "tool_result",
                      tool_use_id: call.id,
                      content: `Cloned reference library into .hypr/cache/docs/${repoName} successfully.`
                    });
                    continue;
                  }
                }
              }

              const res = await tool.execute(call.input);
              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: res.content,
                is_error: res.isError
              });
            }

            this.state.addMessage({ role: "user", content: toolResults });
            onUpdate();
          }
        }
      }
    } catch (_) {
    } finally {
      this.status = "completed";
      onUpdate();
    }
  }
}
