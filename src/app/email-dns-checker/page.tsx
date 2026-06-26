"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useEmailScanner } from "@/hooks/use-email-scanner";
import { ScanInput } from "@/components/domain-inspector/scan-input";
import { EmailScanProgress } from "@/components/email-dns/email-scan-progress";
import { HealthScore } from "@/components/domain-inspector/health-score";
import { EmailQuickFacts } from "@/components/email-dns/email-quick-facts";
import { EmailScoreBreakdown } from "@/components/email-dns/email-score-breakdown";
import { EmailWhatToFix } from "@/components/email-dns/email-what-to-fix";
import { MxRecords } from "@/components/email-dns/mx-records";
import { SpfDetails } from "@/components/email-dns/spf-details";
import { DkimDetails } from "@/components/email-dns/dkim-details";
import { DmarcDetails } from "@/components/email-dns/dmarc-details";
import { BlacklistStatus } from "@/components/email-dns/blacklist-status";
import { ShareLinks } from "@/components/domain-inspector/share-links";
import { AlertCircle } from "lucide-react";

const RECENT_KEY = "email-dns-recent";
const MAX_RECENT = 5;

function getRecentDomains(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentDomain(domain: string) {
  const recent = getRecentDomains().filter((d) => d !== domain);
  recent.unshift(domain);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export default function EmailDnsCheckerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">
          Loading...
        </div>
      }
    >
      <EmailDnsCheckerContent />
    </Suspense>
  );
}

function EmailDnsCheckerContent() {
  const searchParams = useSearchParams();
  const { scanning, progress, result, error, startScan } = useEmailScanner();
  const lastScannedDomain = useRef<string | null>(null);
  const [recentDomains, setRecentDomains] = useState<string[]>([]);

  useEffect(() => {
    setRecentDomains(getRecentDomains());
  }, []);

  useEffect(() => {
    const domain = searchParams.get("domain");
    if (domain && domain !== lastScannedDomain.current) {
      lastScannedDomain.current = domain;
      addRecentDomain(domain);
      setRecentDomains(getRecentDomains());
      const url = new URL(window.location.href);
      url.searchParams.set("domain", domain);
      window.history.pushState({}, "", url.toString());
      startScan(domain);
    }
  }, [searchParams, startScan]);

  const handleScan = useCallback((domain: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("domain", domain);
    window.history.pushState({}, "", url.toString());
    addRecentDomain(domain);
    setRecentDomains(getRecentDomains());
    startScan(domain);
  }, [startScan]);

  return (
    <div className="px-6 pb-16">
      {/* Hero */}
      <div className="mx-auto max-w-[680px] py-12 text-center">
        <h1 className="text-[2.25rem] font-bold leading-tight text-[var(--text-primary)]">
          Email DNS{" "}
          <span className="italic text-brand">Checker</span>
        </h1>
        <p className="mt-3 text-[1rem] text-[var(--text-secondary)]">
          Analyze MX records, SPF, DKIM, DMARC, and blacklist status for any
          domain. Scored and ready to share.
        </p>
        <div className="mt-6">
          <ScanInput onScan={handleScan} loading={scanning} />
        </div>

        {/* Recent */}
        {recentDomains.length > 0 && (
          <div className="mt-5">
            <div className="mx-auto mb-4 h-px w-48 bg-[var(--border-primary)]" />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Recent:
              </span>
              {recentDomains.map((d) => (
                <button
                  key={d}
                  onClick={() => handleScan(d)}
                  disabled={scanning}
                  className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1 text-[0.8125rem] font-medium text-[var(--text-primary)] transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scanning progress */}
      {scanning && (
        <div className="mx-auto max-w-[1210px]">
          <EmailScanProgress progress={progress} />
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
          {/* Share */}
          <ShareLinks domain={result.domain} basePath="/email-dns-checker" />

          {/* Score + Quick Facts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <HealthScore
              domain={result.domain}
              score={result.score}
              grade={result.grade}
              issues={result.issues}
            />
            <EmailQuickFacts facts={result.quickFacts} />
          </div>

          {/* Score Breakdown */}
          <EmailScoreBreakdown breakdown={result.breakdown} />

          {/* What to Fix */}
          <EmailWhatToFix items={result.whatToFix} />

          {/* MX Records */}
          <MxRecords mx={result.mx} />

          {/* SPF + DKIM */}
          <div className="grid gap-6 md:grid-cols-2">
            <SpfDetails spf={result.spf} />
            <DkimDetails dkim={result.dkim} />
          </div>

          {/* DMARC */}
          <DmarcDetails dmarc={result.dmarc} />

          {/* Blacklist */}
          <BlacklistStatus blacklist={result.blacklist} />

          {/* Help CTA */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 sm:flex-row">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                Need help fixing these issues?
              </h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--text-secondary)]">
                Email deliverability issues are one of our most common support
                requests. We can help configure SPF, DKIM, and DMARC for your
                domain.
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
