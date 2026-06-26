"use client";

import { useState, useCallback, useRef } from "react";
import type { EmailScanResult, EmailScanProgress } from "@/types/email-scan";

export function useEmailScanner() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<EmailScanProgress[]>([]);
  const [result, setResult] = useState<EmailScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback((domain: string) => {
    // Abort previous scan
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setScanning(true);
    setProgress([]);
    setResult(null);
    setError(null);

    const body = JSON.stringify({ domain });

    fetch("/api/email-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) return;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (!json) continue;

              try {
                const event = JSON.parse(json);
                if (event.type === "check_complete") {
                  setProgress((prev) => [
                    ...prev,
                    {
                      check: event.check,
                      label: event.label,
                      progress: event.progress,
                      total: event.total,
                    },
                  ]);
                } else if (event.type === "scan_complete") {
                  setResult(event.result);
                  setScanning(false);
                } else if (event.type === "scan_error") {
                  setError(event.error);
                  setScanning(false);
                }
              } catch {
                // Skip malformed events
              }
            }

            return pump();
          });
        }

        return pump();
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Scan failed");
          setScanning(false);
        }
      });
  }, []);

  return { scanning, progress, result, error, startScan };
}
