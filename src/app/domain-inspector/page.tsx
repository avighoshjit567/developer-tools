"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useScanner } from "@/hooks/use-scanner";
import { ScanInput } from "@/components/domain-inspector/scan-input";
import { ScanProgressIndicator } from "@/components/domain-inspector/scan-progress";
import { HealthScore } from "@/components/domain-inspector/health-score";
import { QuickFacts } from "@/components/domain-inspector/quick-facts";
import { ScoreBreakdown } from "@/components/domain-inspector/score-breakdown";
import { WhatToFix } from "@/components/domain-inspector/what-to-fix";
import { SummaryCards } from "@/components/domain-inspector/summary-cards";
import { AuditObservations } from "@/components/domain-inspector/audit-observations";
import { ShareLinks } from "@/components/domain-inspector/share-links";
import { CopyMarkdownButton } from "@/components/ui/copy-markdown-button";
import { domainToMarkdown } from "@/lib/markdown-export";
import { AlertCircle } from "lucide-react";

export default function DomainInspectorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">
          Loading...
        </div>
      }
    >
      <DomainInspectorContent />
    </Suspense>
  );
}

function DomainInspectorContent() {
  const searchParams = useSearchParams();
  const { scanning, progress, result, error, startScan } = useScanner();
  const lastScannedDomain = useRef<string | null>(null);

  // Auto-scan if domain is in URL
  useEffect(() => {
    const domain = searchParams.get("domain");
    if (domain && domain !== lastScannedDomain.current) {
      lastScannedDomain.current = domain;
      startScan(domain);
    }
  }, [searchParams, startScan]);

  function handleScan(domain: string) {
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("domain", domain);
    window.history.pushState({}, "", url.toString());
    startScan(domain);
  }

  return (
    <div className="px-6 pb-16">
      {/* Hero */}
      <div className="mx-auto max-w-[680px] py-12 text-center">
        <h1 className="text-[2.25rem] font-bold leading-tight text-[var(--text-primary)]">
          Domain{" "}
          <span className="italic text-brand">Inspector</span>
        </h1>
        <p className="mt-3 text-[1rem] text-[var(--text-secondary)]">
          Instant deep-dive analysis of registrar, DNS, SSL, hosting,
          blacklists, misconfigured Cloudflare proxies and more for any domain.
        </p>
        <div className="mt-6">
          <ScanInput onScan={handleScan} loading={scanning} />
        </div>
      </div>

      {/* Scanning progress */}
      {scanning && (
        <div className="mx-auto max-w-[1210px]">
          <ScanProgressIndicator progress={progress} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-auto max-w-[1210px]">
          <div className="flex items-center gap-3 rounded-[10px] bg-surface-error-light p-4 dark:bg-surface-error-dark">
            <AlertCircle className="h-5 w-5 shrink-0 text-icon-error" />
            <p className="text-[0.875rem] text-text-error">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <div className="mx-auto max-w-[1210px] space-y-6">
          {/* Share + Copy */}
          <div className="flex items-center justify-between">
            <ShareLinks domain={result.domain} />
            <CopyMarkdownButton getMarkdown={() => domainToMarkdown(result)} />
          </div>

          {/* Score + Quick Facts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <HealthScore
              domain={result.domain}
              score={result.score}
              grade={result.grade}
              issues={result.issues}
            />
            <QuickFacts facts={result.quickFacts} />
          </div>

          {/* Score Breakdown */}
          <ScoreBreakdown breakdown={result.breakdown} />

          {/* What to Fix */}
          <WhatToFix items={result.whatToFix} />

          {/* Summary Cards */}
          <SummaryCards
            registration={result.registration}
            dns={result.dns}
            integrity={result.integrity}
          />

          {/* Audit Observations */}
          <AuditObservations audit={result.audit} dns={result.dns} domain={result.domain} />

          {/* Help CTA */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 sm:flex-row">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                Need help fixing these issues?
              </h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--text-secondary)]">
                Domain and DNS configuration is one of our most common support
                requests. We offer white-label friendly support for agencies and
                freelancers.
              </p>
            </div>
            <a
              href="#"
              className="shrink-0 rounded-lg bg-text-error px-6 py-2.5 text-[0.875rem] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get Help
            </a>
          </div>

          {/* Scan info */}
          <div className="text-center text-[0.75rem] text-[var(--text-tertiary)]">
            Scanned in {(result.duration / 1000).toFixed(1)}s &middot;{" "}
            {new Date(result.scanDate).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
