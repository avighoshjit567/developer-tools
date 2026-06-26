import { Card } from "@/components/ui/card";
import { Shield, ShieldOff, Cloud, CloudOff } from "lucide-react";
import type { QuickFacts as QuickFactsType } from "@/types/scan";
import { cn } from "@/lib/utils";

interface QuickFactsProps {
  facts: QuickFactsType;
}

const rows: { left: { label: string; key: keyof QuickFactsType }; right: { label: string; key: keyof QuickFactsType } }[] = [
  { left: { label: "REGISTRAR", key: "registrar" }, right: { label: "EXPIRES", key: "expires" } },
  { left: { label: "NS PROVIDER", key: "nsProvider" }, right: { label: "DOMAIN AGE", key: "domainAge" } },
  { left: { label: "IP ADDRESS", key: "ipAddress" }, right: { label: "HOSTING", key: "hosting" } },
  { left: { label: "MAIL", key: "mail" }, right: { label: "SSL EXPIRES", key: "sslExpires" } },
  { left: { label: "DMARC", key: "dmarc" }, right: { label: "PLATFORM", key: "platform" } },
];

export function QuickFacts({ facts }: QuickFactsProps) {
  const showCfBanner = facts.cloudflareDns || facts.cloudflareProxy;

  return (
    <Card header="Quick Facts">
      <div className="space-y-3.5">
        {showCfBanner && (
          <div className="flex items-center gap-3 rounded-lg border border-[#F48120]/20 bg-[#F48120]/5 px-3.5 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F48120]/10">
              <Cloud className="h-[18px] w-[18px] text-[#F48120]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">
                Cloudflare Managed
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="flex items-center gap-1 text-[0.75rem] text-[var(--text-secondary)]">
                  {facts.cloudflareDns ? (
                    <Cloud className="h-3 w-3 text-[#F48120]" />
                  ) : (
                    <CloudOff className="h-3 w-3 text-[var(--text-tertiary)]" />
                  )}
                  DNS {facts.cloudflareDns ? "Active" : "Not Active"}
                </span>
                <span className="flex items-center gap-1 text-[0.75rem] text-[var(--text-secondary)]">
                  {facts.cloudflareProxy ? (
                    <Shield className="h-3 w-3 text-[#F48120]" />
                  ) : (
                    <ShieldOff className="h-3 w-3 text-[var(--text-tertiary)]" />
                  )}
                  Proxy {facts.cloudflareProxy ? "On" : "Off"}
                </span>
              </div>
            </div>
          </div>
        )}
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-x-6">
            <FactRow label={row.left.label} value={String(facts[row.left.key])} />
            <FactRow label={row.right.label} value={String(facts[row.right.key])} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-right text-[0.8125rem] font-medium text-[var(--text-primary)] truncate">
        {value}
      </span>
    </div>
  );
}
