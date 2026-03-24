import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { incrementRequests } from "@/lib/keys";
import { selectProvider, getFallbackProvider } from "@/lib/routing";
import { streamChat } from "@/lib/stream";
import { recordCompletionEpoch } from "@/lib/completion";
import { maybeRebalance } from "@/lib/rebalance";
import { checkRateLimitAsync } from "@/lib/ratelimit";
import { estimateTokens } from "@/lib/tokens";
import { log } from "@/lib/log";
import type { ChatMessage } from "@/lib/providers";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Provider-Key",
  "Access-Control-Expose-Headers":
    "X-Pura-Provider, X-Pura-Capacity, X-Pura-Request-Id, X-RateLimit-Remaining",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startMs = Date.now();

  // --- Auth ---
  const auth = await authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error } },
      { status: 401, headers: CORS_HEADERS },
    );
  }
  if (auth.walletRequired) {
    return NextResponse.json(
      {
        error: {
          message: auth.error,
          type: "wallet_required",
          code: "free_tier_exceeded",
        },
      },
      { status: 402, headers: CORS_HEADERS },
    );
  }

  // --- Rate limit ---
  const keyHash = createHash("sha256")
    .update(request.headers.get("authorization")!.slice(7))
    .digest("hex");
  const rl = await checkRateLimitAsync(keyHash);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { message: "Rate limit exceeded. Try again shortly." } },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // --- Parse body ---
  let body: { messages?: ChatMessage[]; model?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: { message: "messages array is required" } },
      { status: 400 },
    );
  }

  // Validate message shape
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== "string") {
      return NextResponse.json(
        { error: { message: "Each message must have role and content" } },
        { status: 400 },
      );
    }
    if (!["system", "user", "assistant"].includes(msg.role)) {
      return NextResponse.json(
        { error: { message: `Invalid role: ${msg.role}` } },
        { status: 400 },
      );
    }
  }

  // --- Route ---
  let provider;
  try {
    provider = await selectProvider(body.model);
  } catch (e) {
    return NextResponse.json(
      { error: { message: (e as Error).message } },
      { status: 503 },
    );
  }

  // --- BYOK: optional provider key pass-through ---
  const providerKey = request.headers.get("x-provider-key") ?? undefined;

  // --- Stream ---
  const wantStream = body.stream !== false; // default true
  let stream: ReadableStream<Uint8Array>;

  try {
    stream = await streamChat(provider, messages, body.model, providerKey);
  } catch (e) {
    // When using a BYOK key, don't fall back — the key is provider-specific
    if (providerKey) {
      return NextResponse.json(
        { error: { message: (e as Error).message } },
        { status: 502 },
      );
    }
    // Try fallback provider
    const fallback = getFallbackProvider(provider);
    try {
      stream = await streamChat(fallback, messages, undefined);
      provider = fallback;
    } catch {
      return NextResponse.json(
        { error: { message: (e as Error).message } },
        { status: 502 },
      );
    }
  }

  // Increment usage
  const raw = request.headers.get("authorization")!.slice(7);
  incrementRequests(raw);

  // Fire-and-forget: advance completion epoch + maybe rebalance
  recordCompletionEpoch(provider).catch(() => {});
  maybeRebalance().catch(() => {});

  // Estimate prompt tokens from input messages
  const promptText = messages.map((m) => m.content).join(" ");
  const promptTokens = estimateTokens(promptText);

  const puraHeaders = {
    ...CORS_HEADERS,
    "X-Pura-Provider": provider,
    "X-Pura-Request-Id": requestId,
    "X-RateLimit-Remaining": String(rl.remaining),
  };

  log.info("chat.request", {
    requestId,
    provider,
    model: body.model ?? "default",
    messageCount: messages.length,
    promptTokens,
    stream: wantStream,
    latencyMs: Date.now() - startMs,
  });

  if (wantStream) {
    return new Response(stream, {
      headers: {
        ...puraHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Non-streaming: collect full response
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) fullContent += delta;
      } catch {
        // skip
      }
    }
  }

  return NextResponse.json(
    {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model ?? provider,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: fullContent },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: estimateTokens(fullContent),
        total_tokens: promptTokens + estimateTokens(fullContent),
      },
    },
    { headers: puraHeaders },
  );
}
