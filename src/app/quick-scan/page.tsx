"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuickScanner } from "@/hooks/use-quick-scanner";
import { ScanInput } from "@/components/domain-inspector/scan-input";
import { QuickScanSummary } from "@/components/quick-scan/quick-scan-summary";
import { QuickScanTabs, type QuickScanTab } from "@/components/quick-scan/quick-scan-tabs";
import { CopyMarkdownButton } from "@/components/ui/copy-markdown-button";
import { domainToMarkdown, wpToMarkdown, emailToMarkdown } from "@/lib/markdown-export";

// Domain Inspector components
import { ScanProgressIndicator } from "@/components/domain-inspector/scan-progress";
import { HealthScore } from "@/components/domain-inspector/health-score";
import { QuickFacts } from "@/components/domain-inspector/quick-facts";
import { ScoreBreakdown } from "@/components/domain-inspector/score-breakdown";
import { WhatToFix } from "@/components/domain-inspector/what-to-fix";
import { SummaryCards } from "@/components/domain-inspector/summary-cards";
import { AuditObservations } from "@/components/domain-inspector/audit-observations";

// WP Health Checker components
import { WpScanProgress } from "@/components/wp-health/wp-scan-progress";
import { WpQuickFacts } from "@/components/wp-health/wp-quick-facts";
import { WpScoreBreakdown } from "@/components/wp-health/wp-score-breakdown";
import { WpWhatToFix } from "@/components/wp-health/wp-what-to-fix";
import { WpSecurityHeaders } from "@/components/wp-health/wp-security-headers";
import { WpFileExposure } from "@/components/wp-health/wp-file-exposure";
import { WpFindings } from "@/components/wp-health/wp-findings";
import { WpDetectedPlugins } from "@/components/wp-health/wp-detected-plugins";
import { WpAccessAndApi } from "@/components/wp-health/wp-access-api";
import { WpVersionExposure } from "@/components/wp-health/wp-version-exposure";

// Email DNS Checker components
import { EmailScanProgress } from "@/components/email-dns/email-scan-progress";
import { EmailQuickFacts } from "@/components/email-dns/email-quick-facts";
import { EmailScoreBreakdown } from "@/components/email-dns/email-score-breakdown";
import { EmailWhatToFix } from "@/components/email-dns/email-what-to-fix";
import { MxRecords } from "@/components/email-dns/mx-records";
import { SpfDetails } from "@/components/email-dns/spf-details";
import { DkimDetails } from "@/components/email-dns/dkim-details";
import { DmarcDetails } from "@/components/email-dns/dmarc-details";
import { BlacklistStatus } from "@/components/email-dns/blacklist-status";

import { AlertCircle, AlertTriangle, Zap } from "lucide-react";

const RECENT_KEY = "quick-scan-recent";
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

export default function QuickScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">
          Loading...
        </div>
      }
    >
      <QuickScanContent />
    </Suspense>
  );
}

function QuickScanContent() {
  const searchParams = useSearchParams();
  const { domain, wp, email, scanning, startScan } = useQuickScanner();
  const lastScannedDomain = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<QuickScanTab>("domain");
  const [recentDomains, setRecentDomains] = useState<string[]>([]);

  useEffect(() => {
    setRecentDomains(getRecentDomains());
  }, []);

  // Auto-scan from URL
  useEffect(() => {
    const d = searchParams.get("domain");
    if (d && d !== lastScannedDomain.current) {
      lastScannedDomain.current = d;
      addRecentDomain(d);
      setRecentDomains(getRecentDomains());
      startScan(d);
    }
  }, [searchParams, startScan]);

  const handleScan = useCallback(
    (d: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("domain", d);
      window.history.pushState({}, "", url.toString());
      lastScannedDomain.current = d;
      addRecentDomain(d);
      setRecentDomains(getRecentDomains());
      setActiveTab("domain");
      startScan(d);
    },
    [startScan]
  );

  // Auto-switch tab when a scan finishes
  useEffect(() => {
    if (domain.result && !wp.result && !wp.scanning && !email.result && !email.scanning) {
      setActiveTab("domain");
    }
  }, [domain.result, wp.result, wp.scanning, email.result, email.scanning]);

  const hasAnyResult = !!(domain.result || wp.result || email.result);
  const hasAnyActivity = scanning || hasAnyResult;

  // Build combined markdown
  function getCombinedMarkdown(): string {
    const parts: string[] = [];
    const d = lastScannedDomain.current || "unknown";
    parts.push(`# Quick Scan Report: ${d}\n`);
    parts.push(`All three tools scanned in parallel.\n`);

    if (domain.result) {
      parts.push("\n---\n");
      parts.push(domainToMarkdown(domain.result));
    }
    if (wp.result && wp.result.isWordPress) {
      parts.push("\n---\n");
      parts.push(wpToMarkdown(wp.result));
    }
    if (email.result) {
      parts.push("\n---\n");
      parts.push(emailToMarkdown(email.result));
    }
    return parts.join("\n");
  }

  return (
    <div className="px-6 pb-16">
      {/* Hero */}
      <div className="mx-auto max-w-[680px] py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
          <Zap className="h-7 w-7 text-brand" />
        </div>
        <h1 className="text-[2.25rem] font-bold leading-tight text-[var(--text-primary)]">
          Quick{" "}
          <span className="italic text-brand">Scan</span>
        </h1>
        <p className="mt-3 text-[1rem] text-[var(--text-secondary)]">
          All tools in one scan — domain health, WordPress security, and email
          authentication analyzed in parallel.
        </p>
        <div className="mt-6">
          <ScanInput onScan={handleScan} loading={scanning} placeholder="Enter any domain..." />
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

      {/* Progress indicators while scanning */}
      {scanning && !hasAnyResult && (
        <div className="mx-auto max-w-[1210px] space-y-4">
          {domain.scanning && <ScanProgressIndicator progress={domain.progress} />}
        </div>
      )}

      {/* Results area */}
      {hasAnyActivity && (
        <div className="mx-auto max-w-[1210px] space-y-6">
          {/* Summary scores */}
          <QuickScanSummary domain={domain} wp={wp} email={email} />

          {/* Copy markdown */}
          {hasAnyResult && (
            <div className="flex justify-end">
              <CopyMarkdownButton getMarkdown={getCombinedMarkdown} />
            </div>
          )}

          {/* Tabs */}
          <QuickScanTabs
            active={activeTab}
            onChange={setActiveTab}
            domain={{
              scanning: domain.scanning,
              done: !!domain.result,
              error: !!domain.error,
            }}
            wp={{
              scanning: wp.scanning,
              done: !!wp.result,
              error: !!wp.error,
              notApplicable: wp.result ? !wp.result.isWordPress : false,
            }}
            email={{
              scanning: email.scanning,
              done: !!email.result,
              error: !!email.error,
            }}
          />

          {/* Tab content */}
          <div>
            {/* Domain Inspector Tab */}
            {activeTab === "domain" && (
              <div className="space-y-6">
                {domain.scanning && (
                  <ScanProgressIndicator progress={domain.progress} />
                )}
                {domain.error && (
                  <div className="flex items-center gap-3 rounded-[10px] bg-surface-error-light p-4 dark:bg-surface-error-dark">
                    <AlertCircle className="h-5 w-5 shrink-0 text-icon-error" />
                    <p className="text-[0.875rem] text-text-error">{domain.error}</p>
                  </div>
                )}
                {domain.result && !domain.scanning && (
                  <>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <HealthScore
                        domain={domain.result.domain}
                        score={domain.result.score}
                        grade={domain.result.grade}
                        issues={domain.result.issues}
                      />
                      <QuickFacts facts={domain.result.quickFacts} />
                    </div>
                    <ScoreBreakdown breakdown={domain.result.breakdown} />
                    <WhatToFix items={domain.result.whatToFix} />
                    <SummaryCards
                      registration={domain.result.registration}
                      dns={domain.result.dns}
                      integrity={domain.result.integrity}
                    />
                    <AuditObservations
                      audit={domain.result.audit}
                      dns={domain.result.dns}
                      domain={domain.result.domain}
                    />
                  </>
                )}
                {!domain.scanning && !domain.result && !domain.error && (
                  <EmptyTab label="Domain Inspector scan will appear here" />
                )}
              </div>
            )}

            {/* WP Health Checker Tab */}
            {activeTab === "wp" && (
              <div className="space-y-6">
                {wp.scanning && (
                  <WpScanProgress progress={wp.progress} />
                )}
                {wp.error && (
                  <div className="flex items-center gap-3 rounded-[10px] bg-surface-error-light p-4 dark:bg-surface-error-dark">
                    <AlertCircle className="h-5 w-5 shrink-0 text-icon-error" />
                    <p className="text-[0.875rem] text-text-error">{wp.error}</p>
                  </div>
                )}
                {wp.result && !wp.scanning && !wp.result.isWordPress && (
                  <div className="mx-auto max-w-[520px] text-center">
                    <div className="flex flex-col items-center gap-3 rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-warning-light dark:bg-surface-warning-dark">
                        <AlertTriangle className="h-7 w-7 text-icon-warning" />
                      </div>
                      <h2 className="text-[1.125rem] font-semibold text-[var(--text-primary)]">
                        Not a WordPress Site
                      </h2>
                      <p className="text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">{wp.result.domain}</span>{" "}
                        does not appear to be running WordPress. Check the other tabs for domain and email results.
                      </p>
                    </div>
                  </div>
                )}
                {wp.result && !wp.scanning && wp.result.isWordPress && (
                  <>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <HealthScore
                        domain={wp.result.domain}
                        score={wp.result.score}
                        grade={wp.result.grade}
                        issues={wp.result.issues}
                      />
                      <WpQuickFacts facts={wp.result.quickFacts} />
                    </div>
                    <WpScoreBreakdown breakdown={wp.result.breakdown} />
                    <WpWhatToFix items={wp.result.whatToFix} />
                    <WpSecurityHeaders headers={wp.result.securityHeaders} />
                    <WpFileExposure files={wp.result.exposedFiles} />
                    <WpFindings findings={wp.result.findings} />
                    <WpDetectedPlugins plugins={wp.result.detectedPlugins} />
                    <div className="grid gap-6 md:grid-cols-2">
                      <WpAccessAndApi checks={wp.result.accessChecks} />
                      <WpVersionExposure items={wp.result.versionExposure} />
                    </div>
                  </>
                )}
                {!wp.scanning && !wp.result && !wp.error && (
                  <EmptyTab label="WP Health Checker scan will appear here" />
                )}
              </div>
            )}

            {/* Email DNS Checker Tab */}
            {activeTab === "email" && (
              <div className="space-y-6">
                {email.scanning && (
                  <EmailScanProgress progress={email.progress} />
                )}
                {email.error && (
                  <div className="flex items-center gap-3 rounded-[10px] bg-surface-error-light p-4 dark:bg-surface-error-dark">
                    <AlertCircle className="h-5 w-5 shrink-0 text-icon-error" />
                    <p className="text-[0.875rem] text-text-error">{email.error}</p>
                  </div>
                )}
                {email.result && !email.scanning && (
                  <>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <HealthScore
                        domain={email.result.domain}
                        score={email.result.score}
                        grade={email.result.grade}
                        issues={email.result.issues}
                      />
                      <EmailQuickFacts facts={email.result.quickFacts} />
                    </div>
                    <EmailScoreBreakdown breakdown={email.result.breakdown} />
                    <EmailWhatToFix items={email.result.whatToFix} />
                    <MxRecords mx={email.result.mx} />
                    <div className="grid gap-6 md:grid-cols-2">
                      <SpfDetails spf={email.result.spf} />
                      <DkimDetails dkim={email.result.dkim} />
                    </div>
                    <DmarcDetails dmarc={email.result.dmarc} />
                    <BlacklistStatus blacklist={email.result.blacklist} />
                  </>
                )}
                {!email.scanning && !email.result && !email.error && (
                  <EmptyTab label="Email DNS Checker scan will appear here" />
                )}
              </div>
            )}
          </div>

          {/* Scan info */}
          {hasAnyResult && !scanning && (
            <div className="text-center text-[0.75rem] text-[var(--text-tertiary)]">
              {domain.result && (
                <>
                  Domain scanned in {(domain.result.duration / 1000).toFixed(1)}s
                </>
              )}
              {domain.result && (wp.result || email.result) && " · "}
              {wp.result && (
                <>
                  WP scanned in {(wp.result.duration / 1000).toFixed(1)}s
                </>
              )}
              {wp.result && email.result && " · "}
              {email.result && (
                <>
                  Email scanned in {(email.result.duration / 1000).toFixed(1)}s
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[var(--border-primary)] py-16">
      <p className="text-[0.875rem] text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}
