import { Message } from "../state/engine.ts";

export interface GenericPayload {
  systemPrompt: string;
  messages: Message[];
  model: string;
  maxTokens?: number;
}

export function translatePayload(provider: string, payload: GenericPayload): any {
  const prov = provider.toLowerCase();

  // ── 1. Anthropic target format ──
  if (prov === "anthropic") {
    return {
      model: payload.model || "claude-3-5-sonnet",
      max_tokens: payload.maxTokens || 4000,
      system: payload.systemPrompt,
      messages: payload.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      }))
    };
  }

  // ── 2. Google Gemini Target format ──
  if (prov === "google gemini" || prov === "gemini") {
    return {
      contents: payload.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
      })),
      systemInstruction: {
        parts: [{ text: payload.systemPrompt }]
      }
    };
  }

  // ── 3. Ollama Target format ──
  if (prov === "ollama") {
    return {
      model: payload.model || "llama3",
      messages: [
        { role: "system", content: payload.systemPrompt },
        ...payload.messages.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        }))
      ],
      stream: false
    };
  }

  // ── 4. OpenAI / DeepSeek / OpenRouter / Groq / Together / LM Studio / vLLM / GitHub / OpenCode Zen (OpenAI-compatible) ──
  return {
    model: payload.model || "gpt-4o",
    messages: [
      { role: "system", content: payload.systemPrompt },
      ...payload.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      }))
    ],
    max_tokens: payload.maxTokens || 4000
  };
}
