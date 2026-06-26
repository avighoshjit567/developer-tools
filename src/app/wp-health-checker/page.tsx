"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useWpScanner } from "@/hooks/use-wp-scanner";
import { ScanInput } from "@/components/domain-inspector/scan-input";
import { WpScanProgress } from "@/components/wp-health/wp-scan-progress";
import { HealthScore } from "@/components/domain-inspector/health-score";
import { WpQuickFacts } from "@/components/wp-health/wp-quick-facts";
import { WpScoreBreakdown } from "@/components/wp-health/wp-score-breakdown";
import { WpWhatToFix } from "@/components/wp-health/wp-what-to-fix";
import { WpSecurityHeaders } from "@/components/wp-health/wp-security-headers";
import { WpFileExposure } from "@/components/wp-health/wp-file-exposure";
import { WpFindings } from "@/components/wp-health/wp-findings";
import { WpDetectedPlugins } from "@/components/wp-health/wp-detected-plugins";
import { WpAccessAndApi } from "@/components/wp-health/wp-access-api";
import { WpVersionExposure } from "@/components/wp-health/wp-version-exposure";
import { ShareLinks } from "@/components/domain-inspector/share-links";
import { AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";

const RECENT_KEY = "wp-health-recent";
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

export default function WpHealthCheckerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-tertiary)]">
          Loading...
        </div>
      }
    >
      <WpHealthCheckerContent />
    </Suspense>
  );
}

function WpHealthCheckerContent() {
  const searchParams = useSearchParams();
  const { scanning, progress, result, error, startScan } = useWpScanner();
  const lastScannedDomain = useRef<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [forceFresh, setForceFresh] = useState(false);
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
      startScan(domain, forceFresh);
    }
  }, [searchParams, startScan, forceFresh]);

  const handleScan = useCallback((domain: string) => {
    if (!authorized) return;
    const url = new URL(window.location.href);
    url.searchParams.set("domain", domain);
    window.history.pushState({}, "", url.toString());
    addRecentDomain(domain);
    setRecentDomains(getRecentDomains());
    startScan(domain, forceFresh);
  }, [authorized, forceFresh, startScan]);

  return (
    <div className="px-6 pb-16">
      {/* Hero */}
      <div className="mx-auto max-w-[680px] py-12 text-center">
        <h1 className="text-[2.25rem] font-bold leading-tight text-[var(--text-primary)]">
          WP Health{" "}
          <span className="italic text-brand">Checker</span>
        </h1>
        <p className="mt-3 text-[1rem] text-[var(--text-secondary)]">
          Audit any WordPress site for exposed files, weak security headers,
          and common configuration issues. Scored and ready to share with
          clients.
        </p>
        <div className="mt-6">
          <ScanInput onScan={handleScan} loading={scanning || !authorized} />
        </div>

        {/* Checkboxes */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <ScanOption
            checked={authorized}
            onChange={setAuthorized}
            label="I am authorized to scan this website"
            tooltip="Only scan websites you own or have explicit permission to test."
          />
          <ScanOption
            checked={forceFresh}
            onChange={setForceFresh}
            label="Force fresh scan (bypass target site cache)"
            tooltip="Adds cache-busting headers to requests so you get the latest state of the site."
          />
        </div>

        {/* Divider + Recent */}
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
                  disabled={scanning || !authorized}
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
          <WpScanProgress progress={progress} />
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

      {/* Not WordPress */}
      {result && !scanning && !result.isWordPress && (
        <div className="mx-auto max-w-[520px] space-y-5 text-center">
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-warning-light dark:bg-surface-warning-dark">
              <AlertTriangle className="h-7 w-7 text-icon-warning" />
            </div>
            <h2 className="text-[1.125rem] font-semibold text-[var(--text-primary)]">
              Not a WordPress Site
            </h2>
            <p className="text-[0.875rem] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{result.domain}</span>{" "}
              does not appear to be running WordPress. This tool is designed
              specifically for WordPress sites.
            </p>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              Try scanning with our{" "}
              <a href={`/domain-inspector?domain=${result.domain}`} className="font-medium text-brand hover:text-brand-hover transition-colors">
                Domain Inspector
              </a>{" "}
              instead for a general health check.
            </p>
          </div>
          <div className="text-[0.75rem] text-[var(--text-tertiary)]">
            Scanned in {(result.duration / 1000).toFixed(1)}s &middot;{" "}
            {new Date(result.scanDate).toLocaleString()}
          </div>
        </div>
      )}

      {/* WordPress Results */}
      {result && !scanning && result.isWordPress && (
        <div className="mx-auto max-w-[1210px] space-y-6">
          {/* Share */}
          <ShareLinks domain={result.domain} basePath="/wp-health-checker" />

          {/* Score + Quick Facts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <HealthScore
              domain={result.domain}
              score={result.score}
              grade={result.grade}
              issues={result.issues}
            />
            <WpQuickFacts facts={result.quickFacts} />
          </div>

          {/* Score Breakdown */}
          <WpScoreBreakdown breakdown={result.breakdown} />

          {/* What to Fix */}
          <WpWhatToFix items={result.whatToFix} />

          {/* Security Headers */}
          <WpSecurityHeaders headers={result.securityHeaders} />

          {/* Sensitive File Exposure */}
          <WpFileExposure files={result.exposedFiles} />

          {/* Findings */}
          <WpFindings findings={result.findings} />

          {/* Detected Plugins */}
          <WpDetectedPlugins plugins={result.detectedPlugins} />

          {/* Access & API + Version Exposure */}
          <div className="grid gap-6 md:grid-cols-2">
            <WpAccessAndApi checks={result.accessChecks} />
            <WpVersionExposure items={result.versionExposure} />
          </div>

          {/* Help CTA */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-6 sm:flex-row">
            <div>
              <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                Need help fixing these issues?
              </h3>
              <p className="mt-1 text-[0.8125rem] text-[var(--text-secondary)]">
                WordPress security hardening is one of our most common support
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

function ScanOption({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip: string;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${
          checked
            ? "border-brand bg-brand text-white"
            : "border-[var(--border-primary)] bg-[var(--bg-primary)] text-transparent"
        }`}
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6l3 3 5-5" />
        </svg>
      </button>
      <span className="text-[0.8125rem] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
        {label}
      </span>
      <span
        className="relative"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={(e) => { e.preventDefault(); setShowTip((v) => !v); }}
      >
        <HelpCircle className="h-3.5 w-3.5 cursor-help text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]" />
        {showTip && (
          <span className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-left text-[0.75rem] leading-relaxed text-[var(--text-secondary)] shadow-lg">
            {tooltip}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--bg-secondary)]" />
          </span>
        )}
      </span>
    </label>
  );
}
