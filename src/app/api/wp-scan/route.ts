import { NextRequest } from "next/server";
import { runWpScan } from "@/lib/wp-scanner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate domain format
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleanDomain)) {
      return new Response(JSON.stringify({ error: "Invalid domain format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(data: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        send({ type: "scan_started", domain: cleanDomain });

        try {
          const result = await runWpScan(cleanDomain, (check, label, progress, total) => {
            send({ type: "check_complete", check, label, progress, total });
          });
          send({ type: "scan_complete", result });
        } catch (err) {
          send({
            type: "scan_error",
            error: err instanceof Error ? err.message : "Scan failed",
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
