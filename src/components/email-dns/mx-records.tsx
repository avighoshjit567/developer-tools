import { Card } from "@/components/ui/card";
import type { MxInfo } from "@/types/email-scan";
import { cn } from "@/lib/utils";

interface Props {
  mx: MxInfo;
}

export function MxRecords({ mx }: Props) {
  return (
    <Card header="MX Records">
      <div className="space-y-2.5">
        {mx.records.length === 0 && (
          <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
            No MX records found for this domain.
          </p>
        )}
        {mx.records.map((record, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <span className="text-[0.75rem] font-bold text-brand">
                {record.priority}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium text-[var(--text-primary)] truncate">
                {record.exchange}
              </p>
              {record.ip && (
                <p className="text-[0.6875rem] text-[var(--text-tertiary)] truncate">
                  {record.ip}
                </p>
              )}
            </div>
            {mx.provider && (
              <span className="shrink-0 rounded-full bg-surface-info-light px-2.5 py-0.5 text-[0.6875rem] font-medium text-brand dark:bg-surface-info-dark">
                {mx.provider}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[0.75rem] font-medium text-[var(--text-tertiary)]">
          Backup MX:
        </span>
        <span
          className={cn(
            "text-[0.75rem] font-semibold",
            mx.hasBackupMx ? "text-text-success" : "text-text-warning"
          )}
        >
          {mx.hasBackupMx ? "Available" : "Not configured"}
        </span>
      </div>
    </Card>
  );
}
