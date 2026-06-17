"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ScoreBreakdown as ScoreBreakdownType } from "@/types/scan";
import { cn } from "@/lib/utils";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

const categories: { key: keyof ScoreBreakdownType; label: string; color: string }[] = [
  { key: "registration", label: "Registration", color: "bg-brand" },
  { key: "dns", label: "DNS", color: "bg-text-info" },
  { key: "hosting", label: "Hosting", color: "bg-text-warning" },
  { key: "security", label: "Security", color: "bg-text-success" },
];

function getBarColor(earned: number, max: number): string {
  const pct = max > 0 ? (earned / max) * 100 : 0;
  if (pct >= 80) return "bg-icon-success";
  if (pct >= 50) return "bg-icon-warning";
  return "bg-icon-error";
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      header="Score Breakdown"
      headerAction={
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[0.8125rem] font-medium text-brand hover:text-brand-hover transition-colors"
        >
          {expanded ? "Hide" : "View"} Details
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {categories.map(({ key, label }) => {
          const cat = breakdown[key];
          const pct = cat.max > 0 ? (cat.earned / cat.max) * 100 : 0;
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                  {label}
                </span>
                <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">
                  {cat.earned}/{cat.max}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", getBarColor(cat.earned, cat.max))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {expanded && (
                <div className="mt-2 space-y-1 pl-1">
                  {cat.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[0.75rem]"
                    >
                      <span className="text-[var(--text-tertiary)]">
                        {item.name}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          item.earned === item.max
                            ? "text-text-success"
                            : item.earned > 0
                              ? "text-text-warning"
                              : "text-text-error"
                        )}
                      >
                        {item.earned}/{item.max}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
