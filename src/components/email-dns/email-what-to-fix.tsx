"use client";

import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { EmailFixItem } from "@/types/email-scan";

interface Props {
  items: EmailFixItem[];
}

const guideUrls: Record<string, string> = {
  spf: "https://www.cloudflare.com/learning/dns/dns-records/dns-spf-record/",
  dkim: "https://www.cloudflare.com/learning/dns/dns-records/dns-dkim-record/",
  dmarc: "https://www.cloudflare.com/learning/dns/dns-records/dns-dmarc-record/",
  mx: "https://www.cloudflare.com/learning/dns/dns-records/dns-mx-record/",
  blacklist: "https://mxtoolbox.com/blacklists.aspx",
  tls: "https://www.cloudflare.com/learning/ssl/transport-layer-security-tls/",
};

function getGuideUrl(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [key, url] of Object.entries(guideUrls)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

export function EmailWhatToFix({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Card header="What to Fix">
      <div className="space-y-3">
        {items.map((item) => {
          const guideUrl = getGuideUrl(item.title);
          return (
            <div
              key={item.priority}
              className="flex gap-3 rounded-lg bg-surface-error-light p-4 dark:bg-surface-error-dark"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-error text-[0.75rem] font-bold text-white">
                {item.priority}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[0.875rem] font-semibold text-text-error">{item.title}</h4>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
              {guideUrl && (
                <a
                  href={guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 self-center text-[0.8125rem] font-medium text-brand hover:text-brand-hover transition-colors"
                >
                  View <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <a href="#" className="text-[0.8125rem] font-medium text-brand hover:text-brand-hover transition-colors">
          Need help fixing these issues?
        </a>
      </div>
    </Card>
  );
}
