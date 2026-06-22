"use client";

import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { WpFixItem } from "@/types/wp-scan";

interface Props {
  items: WpFixItem[];
}

const guideUrls: Record<string, string> = {
  "login": "https://developer.wordpress.org/advanced-administration/security/hardening/",
  "xml-rpc": "https://developer.wordpress.org/advanced-administration/security/hardening/#disable-xml-rpc",
  "readme": "https://developer.wordpress.org/advanced-administration/security/hardening/",
  "version": "https://developer.wordpress.org/advanced-administration/security/hardening/",
  "debug": "https://developer.wordpress.org/advanced-administration/debug/debug-wordpress/",
  "hsts": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
  "security header": "https://securityheaders.com/",
  "ssl": "https://letsencrypt.org/getting-started/",
  "user enum": "https://developer.wordpress.org/rest-api/",
  "sitemap": "https://developer.wordpress.org/advanced-administration/seo/",
};

function getGuideUrl(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [key, url] of Object.entries(guideUrls)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

export function WpWhatToFix({ items }: Props) {
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
