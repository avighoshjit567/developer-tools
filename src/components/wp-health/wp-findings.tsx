import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import type { WpFinding } from "@/types/wp-scan";
import { cn } from "@/lib/utils";

interface Props {
  findings: WpFinding[];
}

const severityIcon = {
  critical: AlertCircle,
  high: AlertCircle,
  medium: AlertTriangle,
  info: Info,
};

const severityColor = {
  critical: "text-icon-error",
  high: "text-icon-error",
  medium: "text-icon-warning",
  info: "text-icon-info",
};

const statusToBadge: Record<string, BadgeVariant> = {
  verified: "verified",
  attention: "attention",
  issue: "issue",
  info: "info",
};

export function WpFindings({ findings }: Props) {
  if (findings.length === 0) return null;

  const critical = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium" || f.severity === "info");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Critical & High */}
      <Card header="Critical & High Risk">
        <div className="space-y-1">
          {critical.length === 0 && (
            <div className="flex items-center gap-2.5 py-3 text-[0.8125rem] text-[var(--text-tertiary)]">
              <CheckCircle2 className="h-4 w-4 text-icon-success" />
              No critical or high risk findings
            </div>
          )}
          {critical.map((finding, i) => {
            const Icon = severityIcon[finding.severity];
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
                <Icon className={cn("h-4 w-4 shrink-0", severityColor[finding.severity])} />
                <div className="min-w-0 flex-1">
                  <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    {finding.title}
                  </span>
                  <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">
                    {finding.detail}
                  </span>
                </div>
                <Badge variant={statusToBadge[finding.status] || "info"} className="shrink-0" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Medium & Informational */}
      <Card header="Medium & Informational">
        <div className="space-y-1">
          {medium.length === 0 && (
            <div className="flex items-center gap-2.5 py-3 text-[0.8125rem] text-[var(--text-tertiary)]">
              <CheckCircle2 className="h-4 w-4 text-icon-success" />
              No medium or informational findings
            </div>
          )}
          {medium.map((finding, i) => {
            const Icon = severityIcon[finding.severity];
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
                <Icon className={cn("h-4 w-4 shrink-0", severityColor[finding.severity])} />
                <div className="min-w-0 flex-1">
                  <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                    {finding.title}
                  </span>
                  <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">
                    {finding.detail}
                  </span>
                </div>
                <Badge variant={statusToBadge[finding.status] || "info"} className="shrink-0" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
