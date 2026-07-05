import { ToolDef } from "../tools/index.ts";
import { Message, ContentBlock } from "../state/engine.ts";
import { scrubMessages } from "../privacy/scrubber.ts";

export interface LLMResponse {
  content: string | ContentBlock[];
  stopReason: "end_turn" | "max_tokens" | "tool_use" | string;
}

// Convert a basic Zod schema to Anthropic-compatible JSON Schema
export function zodToJsonSchema(schema: any): any {
  // Extract shape from ZodObject
  const shape = schema.shape;
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const val = value as any;
    const typeName = val._def?.typeName;

    // Check if optional
    const isOptional = typeName === "ZodOptional";
    const innerType = isOptional ? val._def.innerType : val;
    const innerTypeName = innerType._def?.typeName;

    let typeStr = "string";
    let desc = val.description;

    if (innerTypeName === "ZodBoolean") {
      typeStr = "boolean";
    } else if (innerTypeName === "ZodNumber") {
      typeStr = "number";
    } else if (innerTypeName === "ZodArray") {
      typeStr = "array";
    } else if (innerTypeName === "ZodObject") {
      typeStr = "object";
    }

    properties[key] = {
      type: typeStr,
      description: desc || ""
    };

    if (innerTypeName === "ZodArray") {
      properties[key].items = { type: "string" }; // default fallback
    }

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    required
  };
}

export class LLMClient {
  private apiKey?: string;
  private provider: "anthropic" | "gemini" | "mock" = "mock";
  private modelName: string = "";

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.apiKey = process.env.ANTHROPIC_API_KEY;
      this.provider = "anthropic";
      this.modelName = process.env.HYPR_MODEL || "claude-3-5-sonnet-20241022";
    } else if (process.env.GEMINI_API_KEY) {
      this.apiKey = process.env.GEMINI_API_KEY;
      this.provider = "gemini";
      this.modelName = process.env.HYPR_MODEL || "gemini-2.5-flash";
    } else {
      this.provider = "mock";
    }
  }

  getProviderName(): string {
    return this.provider;
  }

  async sendRequest(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDef[]
  ): Promise<LLMResponse> {
    // ── Compliance scrubbing: strip PII/secrets before they leave the host ──
    const { messages: safeMessages, totalHits } = scrubMessages(messages);
    if (totalHits > 0) {
      process.stderr.write(`[scrubber] Redacted ${totalHits} secret(s) from outbound payload\n`);
    }

    if (this.provider === "mock") {
      return this.generateMockResponse(safeMessages as Message[]);
    }

    if (this.provider === "anthropic") {
      return this.sendAnthropicRequest(systemPrompt, safeMessages as Message[], tools);
    }

    return this.sendGeminiRequest(systemPrompt, safeMessages as Message[], tools);
  }

  private async sendAnthropicRequest(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDef[]
  ): Promise<LLMResponse> {
    const formattedTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: zodToJsonSchema(t.schema)
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.modelName,
        max_tokens: 4000,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        tools: formattedTools.length > 0 ? formattedTools : undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      content: data.content,
      stopReason: data.stop_reason
    };
  }

  private async sendGeminiRequest(
    systemPrompt: string,
    messages: Message[],
    tools: ToolDef[]
  ): Promise<LLMResponse> {
    // Convert Anthropic style tool definition/message to Gemini generateContent structure
    // Since Gemini supports tool calls, we can implement it as:
    // https://ai.google.dev/api/rest/v1beta/models/generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    
    // Gemini contents format
    const contents = messages.map(m => {
      let parts: any[] = [];
      if (typeof m.content === "string") {
        parts.push({ text: m.content });
      } else {
        m.content.forEach(c => {
          if (c.type === "text") {
            parts.push({ text: c.text });
          } else if (c.type === "tool_use") {
            parts.push({
              functionCall: {
                name: c.name,
                args: c.input
              }
            });
          } else if (c.type === "tool_result") {
            parts.push({
              functionResponse: {
                name: c.tool_use_id, // we map id/name to match functionCall
                response: { output: c.content }
              }
            });
          }
        });
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts
      };
    });

    const geminiTools = tools.map(t => ({
      functionDeclarations: [{
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.schema)
      }]
    }));

    const body: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    if (geminiTools.length > 0) {
      body.tools = geminiTools;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const candidate = data.candidates?.[0];
    const modelParts = candidate?.content?.parts || [];

    const contentBlocks: ContentBlock[] = [];
    let textOut = "";

    modelParts.forEach((p: any) => {
      if (p.text) {
        textOut += p.text;
        contentBlocks.push({ type: "text", text: p.text });
      }
      if (p.functionCall) {
        contentBlocks.push({
          type: "tool_use",
          id: p.functionCall.name, // Gemini functionCall has name, we treat it as id/name
          name: p.functionCall.name,
          input: p.functionCall.args
        });
      }
    });

    const stopReason = candidate?.finishReason === "STOP" ? "end_turn" : 
                       (contentBlocks.some(c => c.type === "tool_use") ? "tool_use" : "end_turn");

    return {
      content: contentBlocks.length === 1 && contentBlocks[0].type === "text" ? textOut : contentBlocks,
      stopReason
    };
  }

  private generateMockResponse(messages: Message[]): LLMResponse {
    const lastMsg = messages[messages.length - 1];
    let userText = "";
    if (typeof lastMsg.content === "string") {
      userText = lastMsg.content;
    } else {
      const lastText = lastMsg.content.find(c => c.type === "text") as TextContentBlock;
      if (lastText) userText = lastText.text;
    }

    // A simple rules-based simulator for testing/development
    if (userText.toLowerCase().includes("hello") || userText.toLowerCase().includes("hi")) {
      return {
        content: "Hello! I am Hypr, your agentic CLI assistant. How can I help you today?",
        stopReason: "end_turn"
      };
    }

    if (userText.toLowerCase().includes("run test") || userText.toLowerCase().includes("test")) {
      return {
        content: [
          {
            type: "tool_use",
            id: "tool_run_test",
            name: "execute_bash",
            input: { command: "bun test" }
          }
        ],
        stopReason: "tool_use"
      };
    }

    // Default response
    return {
      content: `I received your request: "${userText}". How should we proceed?`,
      stopReason: "end_turn"
    };
  }
}
