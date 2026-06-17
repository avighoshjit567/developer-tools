import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, ShieldCheck } from "lucide-react";
import type { RegistrationInfo, DnsInfo, IntegrityInfo } from "@/types/scan";

interface SummaryCardsProps {
  registration: RegistrationInfo;
  dns: DnsInfo;
  integrity: IntegrityInfo;
}

export function SummaryCards({ registration, dns, integrity }: SummaryCardsProps) {
  const expiryDisplay =
    registration.expiry !== "Unknown" && registration.expiryDaysRemaining !== null
      ? `${registration.expiry} (${registration.expiryDaysRemaining}d)`
      : registration.expiry;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Registration */}
      <Card noPadding>
        <div className="flex items-center gap-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-error-light dark:bg-surface-error-dark">
            <FileText className="h-4 w-4 text-icon-error" />
          </div>
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">Registration</p>
            <p className="text-[0.6875rem] text-[var(--text-tertiary)]">METADATA</p>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <Row label="Registrar" value={registration.registrar} />
          <Row label="Expiry" value={expiryDisplay} highlight={registration.expiryDaysRemaining !== null && registration.expiryDaysRemaining < 90} />
          <Row label="Domain Age" value={registration.domainAge} />
        </div>
      </Card>

      {/* DNS */}
      <Card noPadding>
        <div className="flex items-center gap-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-info-light dark:bg-surface-info-dark">
            <Globe className="h-4 w-4 text-icon-info" />
          </div>
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">DNS</p>
            <p className="text-[0.6875rem] text-[var(--text-tertiary)]">NETWORK</p>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          {dns.nameservers.slice(0, 4).map((ns, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[0.8125rem] text-[var(--text-secondary)] truncate mr-2">
                {ns.host}
              </span>
              <Badge variant="info" label="NS" />
            </div>
          ))}
          <Row label="NS Provider" value={dns.nsProvider} />
          <Row label="Host" value={dns.host} />
        </div>
      </Card>

      {/* Integrity */}
      <Card noPadding>
        <div className="flex items-center gap-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-success-light dark:bg-surface-success-dark">
            <ShieldCheck className="h-4 w-4 text-icon-success" />
          </div>
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">Integrity</p>
            <p className="text-[0.6875rem] text-[var(--text-tertiary)]">SECURITY</p>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">SSL Certificate</span>
            <Badge variant={integrity.sslCertificate === "Active" ? "verified" : "issue"} label={integrity.sslCertificate} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">DNSSEC</span>
            <Badge variant={integrity.dnssec === "Enabled" ? "verified" : "disabled"} label={integrity.dnssec} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">HSTS</span>
            <Badge variant={integrity.hsts === "Enabled" ? "verified" : "missing"} label={integrity.hsts} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">Security Headers</span>
            <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">{integrity.securityHeaders}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.8125rem] text-[var(--text-tertiary)]">{label}</span>
      <span className={`text-[0.8125rem] font-medium truncate ml-2 text-right max-w-[60%] ${highlight ? "text-text-warning" : "text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}
