import type { ProviderConfig, ChatMessage } from "../providers";

/**
 * Stream a chat completion from Google Gemini.
 * Gemini uses the OpenAI-compatible endpoint for simplicity.
 */
export async function streamGemini(
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
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.body!;
}
