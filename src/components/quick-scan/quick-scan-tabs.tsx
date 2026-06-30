"use client";

import { Globe, Shield, Mail, Loader2, CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickScanTab = "domain" | "wp" | "email";

interface TabStatus {
  scanning: boolean;
  done: boolean;
  error: boolean;
  notApplicable?: boolean;
}

interface QuickScanTabsProps {
  active: QuickScanTab;
  onChange: (tab: QuickScanTab) => void;
  domain: TabStatus;
  wp: TabStatus;
  email: TabStatus;
}

export function QuickScanTabs({ active, onChange, domain, wp, email }: QuickScanTabsProps) {
  const tabs = [
    { id: "domain" as const, label: "Domain Inspector", icon: Globe, status: domain },
    { id: "wp" as const, label: "WP Health", icon: Shield, status: wp },
    { id: "email" as const, label: "Email DNS", icon: Mail, status: email },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[0.8125rem] font-medium transition-all",
              isActive
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="h-4 w-4 hidden sm:block" />
            <span>{tab.label}</span>
            <StatusBadge status={tab.status} />
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: TabStatus }) {
  if (status.scanning) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />;
  }
  if (status.error) {
    return <AlertCircle className="h-3.5 w-3.5 text-text-error" />;
  }
  if (status.notApplicable) {
    return <MinusCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />;
  }
  if (status.done) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-text-success" />;
  }
  return null;
}
