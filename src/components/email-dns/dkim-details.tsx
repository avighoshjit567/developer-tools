import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import type { DkimInfo } from "@/types/email-scan";
import { cn } from "@/lib/utils";

interface Props {
  dkim: DkimInfo;
}

export function DkimDetails({ dkim }: Props) {
  return (
    <Card header="DKIM Selectors">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold",
              dkim.activeCount > 0
                ? "bg-surface-success-light text-text-success dark:bg-surface-success-dark"
                : "bg-surface-error-light text-text-error dark:bg-surface-error-dark"
            )}
          >
            {dkim.activeCount} of {dkim.selectors.length} selectors found
          </span>
        </div>

        {/* Selector grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {dkim.selectors.map((sel) => (
            <div
              key={sel.name}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5",
                sel.found
                  ? "border-icon-success/20 bg-surface-success-light dark:bg-surface-success-dark"
                  : "border-[var(--border-secondary)] bg-[var(--bg-secondary)]"
              )}
            >
              {sel.found ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-icon-success" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-[var(--icon-secondary)]" />
              )}
              <span
                className={cn(
                  "truncate text-[0.8125rem] font-medium",
                  sel.found ? "text-text-success" : "text-[var(--text-tertiary)]"
                )}
              >
                {sel.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
