import { Card } from "@/components/ui/card";
import type { SpfInfo } from "@/types/email-scan";
import { cn } from "@/lib/utils";

interface Props {
  spf: SpfInfo;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pass: { label: "Pass", color: "text-text-success", bg: "bg-surface-success-light dark:bg-surface-success-dark" },
  softfail: { label: "Softfail", color: "text-text-warning", bg: "bg-surface-warning-light dark:bg-surface-warning-dark" },
  neutral: { label: "Neutral", color: "text-text-warning", bg: "bg-surface-warning-light dark:bg-surface-warning-dark" },
  fail: { label: "Fail", color: "text-text-error", bg: "bg-surface-error-light dark:bg-surface-error-dark" },
  missing: { label: "Missing", color: "text-text-error", bg: "bg-surface-error-light dark:bg-surface-error-dark" },
};

export function SpfDetails({ spf }: Props) {
  const config = statusConfig[spf.status] ?? statusConfig.missing;

  return (
    <Card header="SPF Record">
      <div className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold", config.color, config.bg)}>
            {config.label}
          </span>
          {spf.mechanism && (
            <span className="rounded-full border border-[var(--border-secondary)] px-2.5 py-0.5 text-[0.75rem] font-medium text-[var(--text-secondary)]">
              {spf.mechanism}
            </span>
          )}
        </div>

        {/* Record display */}
        {spf.record ? (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2.5">
            <code className="whitespace-nowrap text-[0.75rem] text-[var(--text-primary)]">
              {spf.record}
            </code>
          </div>
        ) : (
          <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
            No SPF record found for this domain.
          </p>
        )}

        {/* Includes */}
        {spf.includes.length > 0 && (
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Include Directives
            </p>
            <div className="space-y-1.5">
              {spf.includes.map((inc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-secondary)] px-3 py-2"
                >
                  <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    {inc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lookup count */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
          <span className="text-[0.8125rem] text-[var(--text-secondary)]">
            DNS Lookups
          </span>
          <span
            className={cn(
              "text-[0.8125rem] font-semibold",
              spf.lookupCount > 10
                ? "text-text-error"
                : spf.lookupCount >= 8
                  ? "text-text-warning"
                  : "text-text-success"
            )}
          >
            {spf.lookupCount}/10
            {spf.lookupCount >= 8 && spf.lookupCount <= 10 && (
              <span className="ml-1 text-[0.6875rem] font-normal text-text-warning">
                (approaching limit)
              </span>
            )}
            {spf.lookupCount > 10 && (
              <span className="ml-1 text-[0.6875rem] font-normal text-text-error">
                (exceeds limit)
              </span>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}
