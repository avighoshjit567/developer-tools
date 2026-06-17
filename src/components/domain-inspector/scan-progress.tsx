"use client";

import { CheckCircle2, Loader2, Shield, Globe, Mail, Server, Search, Radio, Cloud, Network } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ScanProgress } from "@/types/scan";
import { cn } from "@/lib/utils";

const ALL_CHECKS = [
  { key: "dns", label: "DNS Records", description: "Resolving A, AAAA, MX, NS, TXT, CAA records", icon: Globe },
  { key: "whois", label: "WHOIS Lookup", description: "Querying registrar, expiry, and nameserver data", icon: Search },
  { key: "ssl", label: "SSL Certificate", description: "Validating certificate chain and expiration", icon: Shield },
  { key: "email", label: "Email Authentication", description: "Checking SPF, DKIM, and DMARC records", icon: Mail },
  { key: "http", label: "HTTP & Security Headers", description: "Testing redirects, headers, and platform", icon: Server },
  { key: "blacklist", label: "Blacklist Check", description: "Scanning 20 DNSBL servers for listings", icon: Radio },
  { key: "cloudflare", label: "Cloudflare Detection", description: "Detecting Cloudflare proxy and CDN", icon: Cloud },
  { key: "subdomains", label: "Subdomain Discovery", description: "Enumerating common subdomains", icon: Network },
];

interface ScanProgressProps {
  progress: ScanProgress[];
}

export function ScanProgressIndicator({ progress }: ScanProgressProps) {
  const completedKeys = new Set(progress.map((p) => p.check));
  const pct = ALL_CHECKS.length > 0 ? (completedKeys.size / ALL_CHECKS.length) * 100 : 0;

  // Find the currently active check (first incomplete one)
  const activeKey = ALL_CHECKS.find((c) => !completedKeys.has(c.key))?.key;

  return (
    <Card>
      {/* Header */}
      <div className="mb-5 flex items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 21}`}
              strokeDashoffset={`${2 * Math.PI * 21 * (1 - pct / 100)}`}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className="text-[0.75rem] font-bold text-brand">
            {completedKeys.size}/{ALL_CHECKS.length}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-[1rem] font-semibold text-[var(--text-primary)]">
            Analyzing domain...
          </h3>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--text-tertiary)]">
            Running {ALL_CHECKS.length} diagnostic checks in parallel
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Check grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_CHECKS.map((check) => {
          const done = completedKeys.has(check.key);
          const active = check.key === activeKey;
          const Icon = check.icon;

          return (
            <div
              key={check.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300",
                done
                  ? "border-icon-success/20 bg-surface-success-light dark:bg-surface-success-dark"
                  : active
                    ? "border-brand/30 bg-brand/5"
                    : "border-[var(--border-secondary)] bg-[var(--bg-secondary)]"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                done
                  ? "bg-icon-success/10"
                  : active
                    ? "bg-brand/10"
                    : "bg-[var(--bg-tertiary)]"
              )}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-icon-success" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                ) : (
                  <Icon className="h-4 w-4 text-[var(--icon-secondary)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-[0.8125rem] font-medium truncate",
                  done ? "text-text-success" : active ? "text-brand" : "text-[var(--text-tertiary)]"
                )}>
                  {check.label}
                </p>
                <p className="text-[0.6875rem] text-[var(--text-tertiary)] truncate">
                  {done ? "Complete" : check.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
