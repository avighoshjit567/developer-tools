import { ScoreCircle } from "./score-circle";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Issue } from "@/types/scan";
import { cn } from "@/lib/utils";

interface HealthScoreProps {
  domain: string;
  score: number;
  grade: string;
  issues: Issue[];
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-text-error",
    bg: "bg-surface-error-light dark:bg-surface-error-dark",
    dot: "bg-text-error",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-text-warning",
    bg: "bg-surface-warning-light dark:bg-surface-warning-dark",
    dot: "bg-text-warning",
  },
  info: {
    icon: Info,
    color: "text-text-info",
    bg: "bg-surface-info-light dark:bg-surface-info-dark",
    dot: "bg-brand",
  },
};

export function HealthScore({ domain, score, grade, issues }: HealthScoreProps) {
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <Card>
      <div className="flex items-start gap-5">
        <ScoreCircle score={score} grade={grade} size={100} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[1.375rem] font-bold text-[var(--text-primary)]">
              {score}
              <span className="text-[0.875rem] font-normal text-[var(--text-tertiary)]">
                /100
              </span>
            </h3>
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--text-secondary)] truncate">
            {domain}
          </p>
          {(criticalCount > 0 || warningCount > 0 || infoCount > 0) && (
            <p className="mt-2 text-[0.8125rem] text-[var(--text-tertiary)]">
              {criticalCount > 0 && (
                <span className="text-text-error font-medium">
                  {criticalCount} critical
                </span>
              )}
              {criticalCount > 0 && warningCount > 0 && ", "}
              {warningCount > 0 && (
                <span className="text-text-warning font-medium">
                  {warningCount} warning{warningCount > 1 ? "s" : ""}
                </span>
              )}
              {(criticalCount > 0 || warningCount > 0) && infoCount > 0 && ", "}
              {infoCount > 0 && (
                <span className="text-brand font-medium">
                  {infoCount} info
                </span>
              )}
              {" found"}
            </p>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {issues.slice(0, 8).map((issue, i) => {
            const config = severityConfig[issue.severity];
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-[0.8125rem]",
                  config.bg
                )}
              >
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", config.dot)} />
                <span className={config.color}>{issue.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
