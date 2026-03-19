import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { incrementRequests } from "@/lib/keys";
import { selectProvider } from "@/lib/routing";
import { streamChat } from "@/lib/stream";
import { recordCompletionEpoch } from "@/lib/completion";
import { maybeRebalance } from "@/lib/rebalance";
import type { ChatMessage } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  // --- Auth ---
  const auth = authenticate(request.headers.get("authorization"));
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.error } }, { status: 401 });
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
      { status: 402 },
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
    const fallback = provider === "openai" ? "anthropic" : "openai";
    try {
      stream = await streamChat(fallback as "openai" | "anthropic", messages, undefined);
      provider = fallback as "openai" | "anthropic";
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

  if (wantStream) {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Backproto-Provider": provider,
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

  return NextResponse.json({
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
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}
