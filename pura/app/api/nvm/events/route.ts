import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint — streams NVM events (capacity, assignments, receipts, quality)
 * from a Nostr relay to the browser.
 *
 * Query params:
 *   relay   WebSocket URL of the NVM relay (default: ws://localhost:7777)
 *   kinds   comma-separated kind numbers (default: 31900-31905)
 *   skill   filter by skill type d-tag
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const relayUrl = searchParams.get("relay") ?? "ws://localhost:7777";
  const kindsParam = searchParams.get("kinds") ?? "31900,31901,31902,31903,31904,31905";
  const skillFilter = searchParams.get("skill");

  const kinds = kindsParam
    .split(",")
    .map((k) => parseInt(k.trim(), 10))
    .filter((k) => !isNaN(k));

  let ws: WebSocket | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      function send(data: Record<string, unknown>) {
        if (closed) return;
        try {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // stream closed by client
          closed = true;
        }
      }

      try {
        ws = new WebSocket(relayUrl);
      } catch (err) {
        send({ type: "error", message: `Failed to connect: ${String(err)}` });
        controller.close();
        return;
      }

      ws.addEventListener("open", () => {
        // Send a REQ subscription following NIP-01
        const filter: Record<string, unknown> = { kinds };
        if (skillFilter) {
          filter["#d"] = [skillFilter];
        }
        ws!.send(JSON.stringify(["REQ", "nvm-dash", filter]));
        send({ type: "connected", relay: relayUrl });
      });

      ws.addEventListener("message", (msg) => {
        try {
          const parsed = JSON.parse(String(msg.data));
          // NIP-01: ["EVENT", subId, event]
          if (Array.isArray(parsed) && parsed[0] === "EVENT" && parsed[2]) {
            const event = parsed[2] as Record<string, unknown>;
            send({ type: "event", event });
          }
          // EOSE signals initial load done
          if (Array.isArray(parsed) && parsed[0] === "EOSE") {
            send({ type: "eose" });
          }
        } catch {
          // ignore parse errors
        }
      });

      ws.addEventListener("error", () => {
        send({ type: "error", message: "WebSocket error" });
      });

      ws.addEventListener("close", () => {
        if (!closed) {
          send({ type: "disconnected" });
          controller.close();
          closed = true;
        }
      });
    },

    cancel() {
      closed = true;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
