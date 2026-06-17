"use client";

import { useState, useCallback, useRef } from "react";
import type { ScanResult, ScanProgress } from "@/types/scan";

export function useScanner() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async (domain: string) => {
    // Abort previous scan if running
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setScanning(true);
    setProgress([]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Scan failed" }));
        throw new Error(errData.error || "Scan failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventName = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            switch (eventName) {
              case "check_complete":
                setProgress((prev) => [...prev, data as ScanProgress]);
                break;
              case "scan_complete":
                setResult(data as ScanResult);
                setScanning(false);
                break;
              case "scan_error":
                setError(data.error);
                setScanning(false);
                break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Scan failed");
        setScanning(false);
      }
    }
  }, []);

  return { scanning, progress, result, error, startScan };
}
