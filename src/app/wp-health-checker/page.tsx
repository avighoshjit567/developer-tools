"use client";

import { Suspense, useEffect, useRef } from "react";
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
import { AlertCircle, AlertTriangle } from "lucide-react";

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
  const autoScanned = useRef(false);

  useEffect(() => {
    const domain = searchParams.get("domain");
    if (domain && !autoScanned.current) {
      autoScanned.current = true;
      startScan(domain);
    }
  }, [searchParams, startScan]);

  function handleScan(domain: string) {
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
          WP Health{" "}
          <span className="italic text-brand">Checker</span>
        </h1>
        <p className="mt-3 text-[1rem] text-[var(--text-secondary)]">
          Audit any WordPress site for exposed files, weak security headers,
          and common configuration issues. Scored and ready to share with
          clients.
        </p>
        <div className="mt-6">
          <ScanInput onScan={handleScan} loading={scanning} />
        </div>
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

      {/* Results */}
      {result && !scanning && (
        <div className="mx-auto max-w-[1210px] space-y-6">
          {/* Not WordPress warning */}
          {!result.isWordPress && (
            <div className="flex items-center gap-3 rounded-[10px] bg-surface-warning-light p-4 dark:bg-surface-warning-dark">
              <AlertTriangle className="h-5 w-5 shrink-0 text-icon-warning" />
              <p className="text-[0.875rem] text-text-warning">
                This site does not appear to be running WordPress. Results may be limited.
              </p>
            </div>
          )}

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
