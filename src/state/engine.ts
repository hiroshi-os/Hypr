import * as fs from "fs";

export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: any;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ContentBlock = TextContentBlock | ToolUseBlock | ToolResultBlock;

export interface Message {
  role: "system" | "user" | "assistant" | "compliance";
  content: string | ContentBlock[];
  fileScrubbed?: string;
}

export class ConversationState {
  private messages: Message[] = [];
  private systemPrompt: string = "You are Hypr, an agentic CLI developer companion.";

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.systemPrompt = systemPrompt;
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  addMessage(msg: Message) {
    this.messages.push(msg);
  }

  clone(): ConversationState {
    const newState = new ConversationState(this.systemPrompt);
    // Deep clone the messages
    newState.messages = JSON.parse(JSON.stringify(this.messages));
    return newState;
  }

  // Serialize to JSON string
  serialize(): string {
    return JSON.stringify({
      systemPrompt: this.systemPrompt,
      messages: this.messages
    }, null, 2);
  }

  // Load from JSON string
  static deserialize(jsonStr: string): ConversationState {
    const data = JSON.parse(jsonStr);
    const state = new ConversationState(data.systemPrompt);
    state.messages = data.messages || [];
    return state;
  }

  // Context compaction logic: removes intermediate tool call conversations
  // if message count exceeds maxMessages to keep context lightweight.
  compact(maxMessages: number = 30) {
    if (this.messages.length <= maxMessages) return;

    // Keep the first user message, and the last N messages
    const preservedFirst = this.messages.slice(0, 2); // E.g., system context / first user input
    const preservedLast = this.messages.slice(-(maxMessages - 3));
    
    // We insert a system message to indicate compaction occurred
    const compactionIndicator: Message = {
      role: "system",
      content: "[Context Compacted: Older message history summarized or truncated to conserve context window]"
    };

    this.messages = [...preservedFirst, compactionIndicator, ...preservedLast];
  }
}
