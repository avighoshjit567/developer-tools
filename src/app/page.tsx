"use client";

import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/domain-inspector/scan-input";
import {
  Globe,
  Mail,
  Shield,
  Inbox,
  MapPin,
  Zap,
  Search,
  BarChart3,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    name: "Domain Inspector",
    description:
      "Registrar, DNS, SSL, hosting, blacklists, security headers, and more.",
    icon: Globe,
    href: "/domain-inspector",
    active: true,
    color: "text-brand bg-surface-info-light dark:bg-surface-info-dark",
  },
  {
    name: "Email DNS Checker",
    description: "MX, SPF, DKIM, DMARC, blacklist analysis for any domain.",
    icon: Mail,
    href: "/email-dns-checker",
    active: false,
    color: "text-icon-warning bg-surface-warning-light dark:bg-surface-warning-dark",
  },
  {
    name: "WP Health Checker",
    description:
      "Plugin vulnerabilities, security headers, exposed files, and more.",
    icon: Shield,
    href: "/wp-health-checker",
    active: true,
    color: "text-icon-success bg-surface-success-light dark:bg-surface-success-dark",
  },
  {
    name: "Email Inbox Tester",
    description: "Live deliverability testing with remediation guidance.",
    icon: Inbox,
    href: "/email-inbox-tester",
    active: false,
    color: "text-icon-error bg-surface-error-light dark:bg-surface-error-dark",
  },
  {
    name: "DNS Propagation",
    description: "Global DNS spread monitoring with interactive world map.",
    icon: MapPin,
    href: "/dns-propagation",
    active: false,
    color: "text-brand bg-surface-info-light dark:bg-surface-info-dark",
  },
  {
    name: "Quick Scan",
    description: "All tools in one scan — full domain health report.",
    icon: Zap,
    href: "/quick-scan",
    active: false,
    color: "text-icon-warning bg-surface-warning-light dark:bg-surface-warning-dark",
  },
];

const steps = [
  {
    icon: Search,
    title: "Enter Domain",
    description: "Type any domain name to begin your analysis",
  },
  {
    icon: BarChart3,
    title: "We Scan Everything",
    description: "8 parallel checks run in seconds across DNS, SSL, email & more",
  },
  {
    icon: FileCheck,
    title: "Get Your Report",
    description: "Score, issues, and actionable fixes — ready to share with clients",
  },
];

export default function HomePage() {
  const router = useRouter();

  function handleScan(domain: string) {
    router.push(`/domain-inspector?domain=${encodeURIComponent(domain)}`);
  }

  return (
    <div>
      {/* Hero */}
      <section className="px-6 pb-16 pt-20">
        <div className="mx-auto max-w-[680px] text-center">
          <h1 className="text-[2.25rem] font-bold leading-tight text-[var(--text-primary)]">
            Instant Domain Diagnostics
            <br />
            <span className="text-brand">for Agencies & Developers</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--text-secondary)]">
            One scan. Full picture. Registration, DNS, SSL, email
            authentication, security headers, and more.
          </p>
          <div className="mt-8">
            <ScanInput onScan={handleScan} placeholder="Enter any domain..." />
          </div>
          <p className="mt-4 text-[0.8125rem] text-[var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              No signup required
            </span>
          </p>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1210px]">
          <h2 className="mb-8 text-center text-[1.5rem] font-bold text-[var(--text-primary)]">
            Available Tools
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.name}
                  href={tool.active ? tool.href : undefined}
                  className={cn(
                    "group relative flex flex-col rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)] p-5 transition-all",
                    tool.active
                      ? "cursor-pointer hover:border-brand hover:shadow-md"
                      : "cursor-default opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
                      tool.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[0.9375rem] font-semibold text-[var(--text-primary)]">
                    {tool.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[0.8125rem] leading-relaxed text-[var(--text-tertiary)]">
                    {tool.description}
                  </p>
                  <div className="mt-4">
                    {tool.active ? (
                      <span className="text-[0.8125rem] font-medium text-brand group-hover:text-brand-hover transition-colors">
                        Try Now &rarr;
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-[0.75rem] font-medium text-[var(--text-tertiary)]">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-[var(--border-primary)] bg-[var(--bg-primary)] px-6 py-16">
        <div className="mx-auto max-w-[1210px]">
          <h2 className="mb-10 text-center text-[1.5rem] font-bold text-[var(--text-primary)]">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                    <Icon className="h-6 w-6 text-brand" />
                  </div>
                  <div className="mb-1 text-[0.75rem] font-bold uppercase tracking-widest text-brand">
                    Step {i + 1}
                  </div>
                  <h3 className="text-[1.125rem] font-semibold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--text-tertiary)]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
