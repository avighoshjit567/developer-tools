"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import type { AuditCategories, AuditItem } from "@/types/scan";
import type { DnsInfo } from "@/types/scan";
import { cn } from "@/lib/utils";

interface AuditObservationsProps {
  audit: AuditCategories;
  dns?: DnsInfo;
  domain?: string;
}

const statusIcon = {
  verified: CheckCircle2,
  info: Info,
  attention: AlertTriangle,
  issue: AlertCircle,
};

const statusColor = {
  verified: "text-icon-success",
  info: "text-icon-info",
  attention: "text-icon-warning",
  issue: "text-icon-error",
};

function buildDnsText(dns: DnsInfo): string {
  const lines: string[] = [];
  for (const ns of dns.nameservers) {
    lines.push(`${ns.host}\tIN\tNS`);
  }
  if (dns.records.mx) lines.push(`; MX records present`);
  if (dns.records.spf) lines.push(`; SPF record present`);
  if (dns.records.dkim) lines.push(`; DKIM record found`);
  if (dns.records.dmarc) lines.push(`; DMARC record present`);
  if (dns.records.caa) lines.push(`; CAA record present`);
  return lines.join("\n");
}

function exportDns(dns: DnsInfo, domain: string) {
  const text = `; DNS Export for ${domain}\n; Generated ${new Date().toISOString()}\n\n${buildDnsText(dns)}`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${domain}-dns-export.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditObservations({ audit, dns, domain }: AuditObservationsProps) {
  return (
    <Card
      header="Audit Observations"
      headerAction={
        dns && (
          <div className="flex items-center gap-2">
            <CopyButton value={buildDnsText(dns)} label="Copy DNS" />
            <button
              onClick={() => exportDns(dns, domain || "domain")}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-[0.75rem] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export DNS
            </button>
          </div>
        )
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <CategorySection title="REGISTRATION" items={audit.registration} />
          <CategorySection title="HOSTING" items={audit.hosting} />
        </div>
        <div className="space-y-4">
          <CategorySection title="DNS" items={audit.dns} />
          <CategorySection title="SECURITY" items={audit.security} />
        </div>
      </div>
    </Card>
  );
}

function CategorySection({
  title,
  items,
}: {
  title: string;
  items: AuditItem[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {title}
      </h4>
      <div className="space-y-1">
        {items.map((item, i) => (
          <AuditRow key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function AuditRow({ item }: { item: AuditItem }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = statusIcon[item.status];

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-secondary)]">
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
          hasChildren && "cursor-pointer hover:bg-[var(--bg-secondary)]",
          !hasChildren && "cursor-default"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", statusColor[item.status])} />
        <div className="min-w-0 flex-1">
          <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
            {item.title}
          </span>
          <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">
            {item.detail}
          </span>
        </div>
        <Badge variant={item.status as BadgeVariant} className="shrink-0" />
        {hasChildren && (
          open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[var(--icon-secondary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--icon-secondary)]" />
          )
        )}
      </button>
      {open && item.children && (
        <div className="border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]">
          {item.children.map((child, i) => {
            const ChildIcon = statusIcon[child.status] || Info;
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2 pl-10"
              >
                <ChildIcon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    statusColor[child.status] || "text-[var(--icon-secondary)]"
                  )}
                />
                <span className="flex-1 text-[0.8125rem] text-[var(--text-secondary)]">
                  {child.title}
                </span>
                <Badge variant={(child.status as BadgeVariant) || "info"} className="shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
