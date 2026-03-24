import type { ChatMessage } from "./providers";
import type { Provider } from "./providers";
import { streamOpenAI } from "./providers/openai";
import { streamAnthropic } from "./providers/anthropic";
import { streamGroq } from "./providers/groq";
import { getProviderConfig } from "./providers";

export { type Provider } from "./providers";

/**
 * Stream a chat completion from the chosen provider.
 * Returns a ReadableStream in OpenAI SSE format regardless of provider.
 */
export async function streamChat(
  provider: Provider,
  messages: ChatMessage[],
  model?: string,
  providerKey?: string,
): Promise<ReadableStream<Uint8Array>> {
  const config = getProviderConfig(provider, providerKey);

  if (provider === "openai") {
    return streamOpenAI(config, messages, model);
  }
  if (provider === "groq") {
    return streamGroq(config, messages, model);
  }
  return streamAnthropic(config, messages, model);
}
