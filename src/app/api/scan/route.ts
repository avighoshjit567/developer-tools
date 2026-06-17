import { runDomainScan } from "@/lib/scanner";

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(
    domain
  );
}

export async function POST(request: Request) {
  let body: { domain?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const domain = body.domain?.trim().toLowerCase();
  if (!domain || !isValidDomain(domain)) {
    return Response.json(
      { error: "Invalid domain. Please provide a valid domain like example.com" },
      { status: 400 }
    );
  }

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      sendEvent("scan_started", { domain, checks: 8 });

      try {
        const result = await runDomainScan(domain, (check, label, progress, total) => {
          sendEvent("check_complete", { check, label, progress, total });
        });

        sendEvent("scan_complete", result);
      } catch (error) {
        sendEvent("scan_error", {
          error: error instanceof Error ? error.message : "Scan failed",
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
}
