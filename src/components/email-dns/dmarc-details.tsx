import { Card } from "@/components/ui/card";
import type { DmarcInfo } from "@/types/email-scan";
import { cn } from "@/lib/utils";

interface Props {
  dmarc: DmarcInfo;
}

const policyConfig: Record<string, { label: string; color: string; bg: string }> = {
  reject: { label: "Reject", color: "text-text-success", bg: "bg-surface-success-light dark:bg-surface-success-dark" },
  quarantine: { label: "Quarantine", color: "text-text-warning", bg: "bg-surface-warning-light dark:bg-surface-warning-dark" },
  none: { label: "None", color: "text-text-error", bg: "bg-surface-error-light dark:bg-surface-error-dark" },
  missing: { label: "Missing", color: "text-text-error", bg: "bg-surface-error-light dark:bg-surface-error-dark" },
};

export function DmarcDetails({ dmarc }: Props) {
  const config = policyConfig[dmarc.status] ?? policyConfig.missing;

  return (
    <Card header="DMARC Record">
      <div className="space-y-4">
        {/* Policy badge */}
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold", config.color, config.bg)}>
            Policy: {config.label}
          </span>
        </div>

        {/* Record display */}
        {dmarc.record ? (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2.5">
            <code className="whitespace-nowrap text-[0.75rem] text-[var(--text-primary)]">
              {dmarc.record}
            </code>
          </div>
        ) : (
          <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
            No DMARC record found for this domain.
          </p>
        )}

        {/* Details grid */}
        {dmarc.exists && (
          <div className="space-y-2">
            {dmarc.subdomainPolicy && (
              <DetailRow label="Subdomain Policy" value={dmarc.subdomainPolicy} />
            )}
            {dmarc.ruaEmails.length > 0 && (
              <DetailRow label="Aggregate Reports (rua)" value={dmarc.ruaEmails.join(", ")} />
            )}
            {dmarc.rufEmails.length > 0 && (
              <DetailRow label="Forensic Reports (ruf)" value={dmarc.rufEmails.join(", ")} />
            )}
            <DetailRow label="Percentage" value={`${dmarc.percentage}%`} />
            {dmarc.policy && (
              <DetailRow label="Alignment Mode" value={dmarc.policy === "reject" ? "Strict" : "Relaxed"} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
      <span className="text-[0.8125rem] text-[var(--text-secondary)]">{label}</span>
      <span className="text-right text-[0.8125rem] font-medium text-[var(--text-primary)] truncate ml-4">
        {value}
      </span>
    </div>
  );
}
