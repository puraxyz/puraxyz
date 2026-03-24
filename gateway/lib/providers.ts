export type Provider = "openai" | "anthropic" | "groq" | "gemini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderConfig {
  name: Provider;
  model: string;
  apiKey: string;
  endpoint: string;
}

function getOpenAIConfig(apiKeyOverride?: string): ProviderConfig {
  const key = apiKeyOverride ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  return {
    name: "openai",
    model: "gpt-4o",
    apiKey: key,
    endpoint: "https://api.openai.com/v1/chat/completions",
  };
}

function getAnthropicConfig(apiKeyOverride?: string): ProviderConfig {
  const key = apiKeyOverride ?? process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return {
    name: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: key,
    endpoint: "https://api.anthropic.com/v1/messages",
  };
}

function getGroqConfig(apiKeyOverride?: string): ProviderConfig {
  const key = apiKeyOverride ?? process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  return {
    name: "groq",
    model: "llama-3.3-70b-versatile",
    apiKey: key,
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  };
}

function getGeminiConfig(apiKeyOverride?: string): ProviderConfig {
  const key = apiKeyOverride ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return {
    name: "gemini",
    model: "gemini-2.0-flash",
    apiKey: key,
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  };
}

export function getProviderConfig(provider: Provider, apiKeyOverride?: string): ProviderConfig {
  if (provider === "openai") return getOpenAIConfig(apiKeyOverride);
  if (provider === "groq") return getGroqConfig(apiKeyOverride);
  if (provider === "gemini") return getGeminiConfig(apiKeyOverride);
  return getAnthropicConfig(apiKeyOverride);
}

export function getProviderConfigs(): ProviderConfig[] {
  const configs: ProviderConfig[] = [];
  try { configs.push(getOpenAIConfig()); } catch { /* skip */ }
  try { configs.push(getAnthropicConfig()); } catch { /* skip */ }
  try { configs.push(getGroqConfig()); } catch { /* skip */ }
  try { configs.push(getGeminiConfig()); } catch { /* skip */ }
  return configs;
}
