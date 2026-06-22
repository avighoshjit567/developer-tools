"use client";

import { CopyButton } from "@/components/ui/copy-button";

interface ShareLinksProps {
  domain: string;
  basePath?: string;
}

export function ShareLinks({ domain, basePath = "/domain-inspector" }: ShareLinksProps) {
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${basePath}?domain=${domain}`
      : `${basePath}?domain=${domain}`;

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row">
      <span className="text-[0.8125rem] font-medium text-[var(--text-tertiary)]">
        Share:
      </span>
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5">
        <span className="flex-1 truncate text-[0.8125rem] text-[var(--text-secondary)]">
          {shareUrl}
        </span>
        <CopyButton value={shareUrl} label="Copy Link" />
      </div>
    </div>
  );
}
