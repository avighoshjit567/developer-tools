"use client";

import { ScoreCircle } from "@/components/domain-inspector/score-circle";
import { Globe, Shield, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/types/scan";
import type { WpScanResult } from "@/types/wp-scan";
import type { EmailScanResult } from "@/types/email-scan";

interface QuickScanSummaryProps {
  domain: { scanning: boolean; result: ScanResult | null; error: string | null };
  wp: { scanning: boolean; result: WpScanResult | null; error: string | null };
  email: { scanning: boolean; result: EmailScanResult | null; error: string | null };
}

export function QuickScanSummary({ domain, wp, email }: QuickScanSummaryProps) {
  const tools = [
    {
      name: "Domain Inspector",
      icon: Globe,
      scanning: domain.scanning,
      score: domain.result?.score ?? null,
      grade: domain.result?.grade ?? null,
      error: domain.error,
      color: "text-brand",
    },
    {
      name: "WP Health",
      icon: Shield,
      scanning: wp.scanning,
      score: wp.result?.isWordPress ? (wp.result?.score ?? null) : null,
      grade: wp.result?.isWordPress ? (wp.result?.grade ?? null) : null,
      error: wp.error,
      notApplicable: wp.result && !wp.result.isWordPress,
      color: "text-icon-success",
    },
    {
      name: "Email DNS",
      icon: Mail,
      scanning: email.scanning,
      score: email.result?.score ?? null,
      grade: email.result?.grade ?? null,
      error: email.error,
      color: "text-icon-warning",
    },
  ];

  // Calculate overall score (average of available scores)
  const scores = tools
    .filter((t) => t.score !== null && !t.notApplicable)
    .map((t) => t.score as number);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const anyDone = tools.some((t) => t.score !== null || t.error || t.notApplicable);

  function getOverallGrade(score: number): string {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "A-";
    if (score >= 80) return "B+";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  }

  return (
    <div className="rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        {/* Overall score */}
        <div className="flex flex-col items-center gap-2">
          {overallScore !== null ? (
            <>
              <ScoreCircle score={overallScore} grade={getOverallGrade(overallScore)} size={100} />
              <div className="text-center">
                <p className="text-[1.125rem] font-bold text-[var(--text-primary)]">
                  {overallScore}<span className="text-[0.8125rem] font-normal text-[var(--text-tertiary)]">/100</span>
                </p>
                <p className="text-[0.75rem] text-[var(--text-tertiary)]">Overall</p>
              </div>
            </>
          ) : (
            <div className="flex h-[100px] w-[100px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
            </div>
          )}
        </div>

        {/* Per-tool scores */}
        <div className="flex flex-1 flex-wrap justify-center gap-4 sm:justify-start">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.name}
                className="flex min-w-[140px] flex-col items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3"
              >
                <Icon className={cn("h-5 w-5", tool.color)} />
                <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)]">
                  {tool.name}
                </span>
                {tool.scanning ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
                ) : tool.error ? (
                  <span className="text-[0.8125rem] font-semibold text-text-error">Error</span>
                ) : tool.notApplicable ? (
                  <span className="text-[0.75rem] font-medium text-[var(--text-tertiary)]">Not WordPress</span>
                ) : tool.score !== null && tool.grade !== null ? (
                  <div className="text-center">
                    <span className="text-[1.25rem] font-bold text-[var(--text-primary)]">
                      {tool.grade}
                    </span>
                    <p className="text-[0.75rem] text-[var(--text-tertiary)]">
                      {tool.score}/100
                    </p>
                  </div>
                ) : (
                  <span className="text-[0.75rem] text-[var(--text-tertiary)]">Waiting...</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
