import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import type { WpAccessCheck } from "@/types/wp-scan";
import { cn } from "@/lib/utils";

interface Props {
  checks: WpAccessCheck[];
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

export function WpAccessAndApi({ checks }: Props) {
  const access = checks.filter((c) => c.category === "access");
  const background = checks.filter((c) => c.category === "background");

  return (
    <Card header="Access & Authentication">
      <div className="space-y-4">
        {access.length > 0 && (
          <div className="space-y-1">
            {access.map((check, i) => {
              const Icon = statusIcon[check.status];
              return (
                <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
                  <Icon className={cn("h-4 w-4 shrink-0", statusColor[check.status])} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">{check.title}</span>
                    <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">{check.detail}</span>
                  </div>
                  <Badge variant={check.status as BadgeVariant} className="shrink-0" />
                </div>
              );
            })}
          </div>
        )}
        {background.length > 0 && (
          <div>
            <h4 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Background Processes & API
            </h4>
            <div className="space-y-1">
              {background.map((check, i) => {
                const Icon = statusIcon[check.status];
                return (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
                    <Icon className={cn("h-4 w-4 shrink-0", statusColor[check.status])} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">{check.title}</span>
                      <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">{check.detail}</span>
                    </div>
                    <Badge variant={check.status as BadgeVariant} className="shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
