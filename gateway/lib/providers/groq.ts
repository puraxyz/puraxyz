import type { ChatMessage, ProviderConfig } from "../providers";

/**
 * Stream a chat completion from Groq.
 * Groq uses an OpenAI-compatible API, so the request/response format is identical.
 */
export async function streamGroq(
  config: ProviderConfig,
  messages: ChatMessage[],
  model?: string,
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? config.model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body}`);
  }

  return res.body!;
}
