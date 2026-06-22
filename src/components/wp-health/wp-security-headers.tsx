import { Card } from "@/components/ui/card";
import { ShieldCheck, ShieldX } from "lucide-react";
import type { WpSecurityHeaderResult } from "@/types/wp-scan";
import { cn } from "@/lib/utils";

interface Props {
  headers: WpSecurityHeaderResult[];
}

export function WpSecurityHeaders({ headers }: Props) {
  const presentCount = headers.filter((h) => h.present).length;
  const pct = headers.length > 0 ? Math.round((presentCount / headers.length) * 100) : 0;

  return (
    <Card header="HTTP Security Headers">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {headers.map((header) => (
          <div
            key={header.name}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              header.present
                ? "border-icon-success/20 bg-surface-success-light dark:bg-surface-success-dark"
                : "border-icon-error/20 bg-surface-error-light dark:bg-surface-error-dark"
            )}
          >
            <div className="flex items-center gap-2">
              {header.present ? (
                <ShieldCheck className="h-5 w-5 text-icon-success" />
              ) : (
                <ShieldX className="h-5 w-5 text-icon-error" />
              )}
              <h4 className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">
                {header.name}
              </h4>
            </div>
            <p className="mt-2 text-[0.75rem] text-[var(--text-tertiary)] line-clamp-2">
              {header.description}
            </p>
            {header.present && header.value && (
              <p className="mt-1.5 truncate rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[0.6875rem] font-mono text-[var(--text-secondary)]">
                {header.value}
              </p>
            )}
            {!header.present && (
              <span className="mt-2 inline-block rounded bg-text-error/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-text-error">
                Not set
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-right text-[0.8125rem] font-medium text-[var(--text-primary)]">
        {presentCount} of {headers.length} security headers configured
        <span className="ml-2 font-semibold text-brand">{pct}% Coverage</span>
      </div>
    </Card>
  );
}
