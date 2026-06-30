"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyMarkdownButtonProps {
  getMarkdown: () => string;
}

export function CopyMarkdownButton({ getMarkdown }: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = getMarkdown();
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getMarkdown]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-[0.8125rem] font-medium text-[var(--text-secondary)] transition-all hover:border-brand hover:text-brand"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-icon-success" />
          <span className="text-icon-success">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy as Markdown
        </>
      )}
    </button>
  );
}
