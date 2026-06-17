import { checkDns } from "./checks/dns";
import { checkWhois } from "./checks/whois";
import { checkSsl } from "./checks/ssl";
import { checkEmailAuth } from "./checks/email-auth";
import { checkHttpProbe, type HttpProbeResult } from "./checks/http-probe";
import { checkBlacklist } from "./checks/blacklist";
import { checkCloudflare } from "./checks/cloudflare";
import { checkSubdomains } from "./checks/subdomains";
import { calculateScore } from "./scoring";
import type {
  ScanResult,
  QuickFacts,
  Issue,
  FixItem,
  AuditCategories,
  AuditItem,
} from "@/types/scan";

type ProgressCallback = (check: string, label: string, progress: number, total: number) => void;

export async function runDomainScan(
  domain: string,
  onProgress?: ProgressCallback
): Promise<ScanResult> {
  const startTime = Date.now();
  const totalChecks = 8;
  let completed = 0;

  function progress(check: string, label: string) {
    completed++;
    onProgress?.(check, label, completed, totalChecks);
  }

  // Run all checks in parallel
  const [dnsResult, whoisResult, sslResult, emailAuthResult, httpProbeResult] =
    await Promise.all([
      checkDns(domain).then((r) => {
        progress("dns", "DNS Records");
        return r;
      }),
      checkWhois(domain).then((r) => {
        progress("whois", "WHOIS Lookup");
        return r;
      }),
      checkSsl(domain).then((r) => {
        progress("ssl", "SSL Certificate");
        return r;
      }),
      checkEmailAuth(domain).then((r) => {
        progress("email", "Email Authentication");
        return r;
      }),
      checkHttpProbe(domain).then((r) => {
        progress("http", "HTTP & Security Headers");
        return r;
      }),
    ]);

  // These depend on DNS results
  const ip = dnsResult.a[0] || "";
  const [blacklistResult, cloudflareResult, subdomainsResult] =
    await Promise.all([
      checkBlacklist(ip).then((r) => {
        progress("blacklist", "Blacklist Check");
        return r;
      }),
      Promise.resolve(checkCloudflare(ip)).then((r) => {
        progress("cloudflare", "Cloudflare Detection");
        return r;
      }),
      checkSubdomains(domain).then((r) => {
        progress("subdomains", "Subdomain Discovery");
        return r;
      }),
    ]);

  // Calculate score
  const { score, grade, breakdown } = calculateScore({
    dns: dnsResult,
    whois: whoisResult,
    ssl: sslResult,
    emailAuth: emailAuthResult,
    httpProbe: httpProbeResult,
    blacklist: blacklistResult,
    subdomains: subdomainsResult,
  });

  // Use WHOIS nameservers, fall back to DNS NS records
  const nameServers =
    whoisResult.nameServers.length > 0
      ? whoisResult.nameServers
      : dnsResult.ns.map((ns) => ns.toLowerCase());

  // Build quick facts
  const nsProvider = detectNsProvider(nameServers);
  const expiryDisplay = whoisResult.expiryDate && whoisResult.expiryDate !== "Unknown"
    ? whoisResult.expiryDaysRemaining !== null
      ? `${whoisResult.expiryDate} (${whoisResult.expiryDaysRemaining}d)`
      : whoisResult.expiryDate
    : "Unknown";
  const quickFacts: QuickFacts = {
    registrar: whoisResult.registrar,
    nsProvider,
    ipAddress: ip
      ? `${ip}${cloudflareResult.isCloudflare ? " (Cloudflare Proxy)" : ""}`
      : "Unknown",
    mail: dnsResult.mx[0]?.exchange || "None",
    dmarc: emailAuthResult.dmarc.policy
      ? emailAuthResult.dmarc.policy.charAt(0).toUpperCase() +
        emailAuthResult.dmarc.policy.slice(1)
      : "None",
    expires: expiryDisplay,
    domainAge: whoisResult.domainAge,
    hosting: cloudflareResult.isCloudflare
      ? "Hidden by Cloudflare"
      : httpProbeResult.serverHeader || "Unknown",
    sslExpires: sslResult.active ? sslResult.validTo : "N/A",
    platform: httpProbeResult.platform,
  };

  // Build issues and fix list
  const issues = buildIssues({
    ssl: sslResult,
    emailAuth: emailAuthResult,
    httpProbe: httpProbeResult,
    dns: dnsResult,
    blacklist: blacklistResult,
    subdomains: subdomainsResult,
  });

  const whatToFix = buildFixList(issues);

  // Build audit
  const audit = buildAudit({
    whois: whoisResult,
    dns: dnsResult,
    ssl: sslResult,
    emailAuth: emailAuthResult,
    httpProbe: httpProbeResult,
    blacklist: blacklistResult,
    cloudflare: cloudflareResult,
    subdomains: subdomainsResult,
  });

  return {
    uuid: crypto.randomUUID(),
    domain,
    score,
    grade,
    scanDate: new Date().toISOString(),
    duration: Date.now() - startTime,
    quickFacts,
    issues,
    whatToFix,
    registration: {
      registrar: whoisResult.registrar,
      expiry: whoisResult.expiryDate || "Unknown",
      expiryDaysRemaining: whoisResult.expiryDaysRemaining,
      domainAge: whoisResult.domainAge,
    },
    dns: {
      nameservers: nameServers.map((ns) => ({ host: ns, type: "NS" })),
      nsProvider,
      host: cloudflareResult.isCloudflare
        ? "Hidden: Cloudflare Proxy"
        : ip || "Unknown",
      records: {
        mx: dnsResult.mx.length > 0,
        spf: emailAuthResult.spf.exists,
        dkim: emailAuthResult.dkim.found,
        dmarc: emailAuthResult.dmarc.exists,
        caa: dnsResult.caa.length > 0,
      },
      subdomains: subdomainsResult.map((s) => ({
        name: s.name,
        hasSPF: s.hasSPF,
      })),
    },
    integrity: {
      sslCertificate: sslResult.active ? "Active" : sslResult.error ? "None" : "Expired",
      sslIssuer: sslResult.issuer,
      dnssec: dnsResult.dnssec.enabled ? "Enabled" : "Disabled",
      hsts: httpProbeResult.securityHeaders.hsts.present ? "Enabled" : "Missing",
      securityHeaders: `${httpProbeResult.securityHeadersCount}/${httpProbeResult.securityHeadersTotal}`,
    },
    audit,
    breakdown,
  };
}

function detectNsProvider(nameServers: string[]): string {
  const ns = nameServers.map((n) => n.toLowerCase()).join(" ");
  if (ns.includes("cloudflare")) return "Cloudflare";
  if (ns.includes("awsdns")) return "AWS Route 53";
  if (ns.includes("google") || ns.includes("googledomains")) return "Google";
  if (ns.includes("digitalocean")) return "DigitalOcean";
  if (ns.includes("hetzner")) return "Hetzner";
  if (ns.includes("namecheap") || ns.includes("registrar-servers")) return "Namecheap";
  if (ns.includes("godaddy") || ns.includes("domaincontrol")) return "GoDaddy";
  if (ns.includes("hostinger")) return "Hostinger";
  return nameServers[0]?.split(".").slice(-2).join(".") || "Unknown";
}

interface IssueInput {
  ssl: { active: boolean; daysRemaining: number };
  emailAuth: {
    spf: { exists: boolean; isStrict: boolean; mechanism: string | null };
    dkim: { found: boolean };
    dmarc: { exists: boolean; policy: string | null };
  };
  httpProbe: {
    httpsRedirect: boolean;
    securityHeaders: { hsts: { present: boolean } };
    securityHeadersCount: number;
    securityHeadersTotal: number;
    wwwCanonical: boolean;
    wwwResolvesToSame: boolean;
  };
  dns: { dnssec: { enabled: boolean }; caa: unknown[] };
  blacklist: { clean: boolean; blacklistedOn: string[] };
  subdomains: { name: string; hasSPF: boolean }[];
}

function buildIssues(data: IssueInput): Issue[] {
  const issues: Issue[] = [];

  if (!data.ssl.active) {
    issues.push({
      severity: "critical",
      title: "SSL Certificate not active",
      description: "Your domain does not have a valid SSL certificate. Visitors will see security warnings.",
      category: "security",
    });
  } else if (data.ssl.daysRemaining <= 14) {
    issues.push({
      severity: "critical",
      title: "SSL Certificate expiring soon",
      description: `Your SSL certificate expires in ${data.ssl.daysRemaining} days. Renew it immediately.`,
      category: "security",
    });
  }

  if (!data.blacklist.clean) {
    issues.push({
      severity: "critical",
      title: `Listed on ${data.blacklist.blacklistedOn.length} blacklist(s)`,
      description: `Your IP is blacklisted on: ${data.blacklist.blacklistedOn.join(", ")}. This affects email delivery.`,
      category: "security",
    });
  }

  if (!data.httpProbe.securityHeaders.hsts.present) {
    issues.push({
      severity: "warning",
      title: "HSTS not enabled",
      description: "HSTS tells browsers to always use HTTPS. Without it, visitors are vulnerable to SSL stripping attacks on first visit.",
      category: "security",
    });
  }

  if (!data.dns.dnssec.enabled) {
    issues.push({
      severity: "warning",
      title: "DNSSEC not enabled",
      description: "DNSSEC protects your DNS records from being tampered with or forged, preventing DNS hijacking attacks.",
      category: "security",
    });
  }

  if (!data.emailAuth.spf.exists) {
    issues.push({
      severity: "warning",
      title: "No SPF record found",
      description: "Without SPF, anyone can send emails pretending to be from your domain.",
      category: "dns",
    });
  } else if (!data.emailAuth.spf.isStrict && data.emailAuth.spf.mechanism === "~all") {
    issues.push({
      severity: "info",
      title: "SPF uses ~all (softfail)",
      description: "Consider using -all for stricter enforcement. Softfail (~all) only marks suspicious emails rather than rejecting them.",
      category: "dns",
    });
  }

  if (!data.emailAuth.dmarc.exists) {
    issues.push({
      severity: "warning",
      title: "No DMARC record found",
      description: "DMARC helps prevent email spoofing by telling receivers what to do with unauthenticated emails.",
      category: "dns",
    });
  } else if (data.emailAuth.dmarc.policy === "none") {
    issues.push({
      severity: "info",
      title: "DMARC is monitoring only (p=none)",
      description: "Setting DMARC to quarantine or reject would block spoofed emails instead of just monitoring them.",
      category: "dns",
    });
  }

  if (!data.emailAuth.dkim.found) {
    issues.push({
      severity: "info",
      title: "No DKIM record found",
      description: "DKIM adds a digital signature to your emails, proving they haven't been altered in transit.",
      category: "dns",
    });
  }

  if (data.httpProbe.securityHeadersCount < 3) {
    issues.push({
      severity: "warning",
      title: `Only ${data.httpProbe.securityHeadersCount}/${data.httpProbe.securityHeadersTotal} security headers set`,
      description: "Security headers protect against XSS, clickjacking, and other browser-based attacks.",
      category: "security",
    });
  }

  if (!data.httpProbe.httpsRedirect) {
    issues.push({
      severity: "warning",
      title: "HTTP does not redirect to HTTPS",
      description: "Visitors accessing your site via HTTP are not automatically redirected to the secure version.",
      category: "hosting",
    });
  }

  if (data.httpProbe.wwwResolvesToSame && !data.httpProbe.wwwCanonical) {
    issues.push({
      severity: "info",
      title: "www does not redirect to canonical URL",
      description: "Both www and non-www versions serve content. Set up a redirect to avoid duplicate content.",
      category: "hosting",
    });
  }

  const subsWithoutSpf = data.subdomains.filter((s) => !s.hasSPF);
  if (subsWithoutSpf.length > 0) {
    issues.push({
      severity: "info",
      title: `${subsWithoutSpf.length} subdomain(s) without SPF`,
      description: `Subdomains without SPF can be used to send spoofed email: ${subsWithoutSpf.map((s) => s.name).join(", ")}.`,
      category: "dns",
    });
  }

  return issues.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function buildFixList(issues: Issue[]): FixItem[] {
  return issues
    .filter((i) => i.severity !== "info")
    .map((issue, idx) => ({
      priority: idx + 1,
      title: issue.title,
      description: issue.description,
    }));
}

function buildAudit(data: {
  whois: { registrar: string; domainAge: string; nameServers: string[] };
  dns: { mx: unknown[]; caa: unknown[]; dnssec: { enabled: boolean; dsRecord: string | null; dnskeyRecord: string | null } };
  ssl: { active: boolean; issuer: string; validTo: string; daysRemaining: number };
  emailAuth: { spf: { exists: boolean; record: string | null }; dkim: { found: boolean; selectors: { name: string }[] }; dmarc: { exists: boolean; record: string | null; policy: string | null } };
  httpProbe: HttpProbeResult;
  blacklist: { clean: boolean; listsChecked: number; blacklistedOn: string[] };
  cloudflare: { isCloudflare: boolean };
  subdomains: { name: string; hasSPF: boolean }[];
}): AuditCategories {
  const registration: AuditItem[] = [
    {
      title: "Domain Age & Reputation",
      detail: data.whois.domainAge,
      status: data.whois.domainAge !== "Unknown" ? "verified" : "info",
    },
    {
      title: "Name Servers",
      detail: data.whois.nameServers.join(", ") || "Unknown",
      status: data.whois.nameServers.length >= 2 ? "verified" : "attention",
    },
  ];

  const dnsItems: AuditItem[] = [
    {
      title: "DNS Records",
      detail: [
        data.dns.mx.length > 0 ? "MX" : null,
        data.emailAuth.spf.exists ? "SPF" : null,
        data.emailAuth.dkim.found ? "DKIM" : null,
        data.emailAuth.dmarc.exists ? "DMARC" : null,
        data.dns.caa.length > 0 ? "CAA" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "None found",
      status:
        data.emailAuth.spf.exists && data.emailAuth.dmarc.exists
          ? "verified"
          : "attention",
    },
    {
      title: "Subdomains",
      detail: `${data.subdomains.length} discovered`,
      status: "info",
      children: data.subdomains.map((s) => ({
        title: s.name,
        detail: s.hasSPF ? "Has SPF" : "No SPF",
        status: s.hasSPF ? ("verified" as const) : ("info" as const),
      })),
    },
  ];

  const hostingItems: AuditItem[] = [
    {
      title: "Web Hosting",
      detail: data.cloudflare.isCloudflare
        ? "Hidden by Cloudflare Proxy"
        : data.httpProbe.platform !== "Unknown"
          ? data.httpProbe.platform
          : "Unknown",
      status: "info",
    },
    {
      title: "Web & Redirects",
      detail: data.httpProbe.httpsRedirect
        ? "HTTPS redirect active"
        : "No HTTPS redirect",
      status: data.httpProbe.httpsRedirect ? "verified" : "issue",
    },
    {
      title: "Search Engine Visibility",
      detail: data.httpProbe.robotsIndexable ? "Indexable" : "Not indexable or no robots.txt",
      status: data.httpProbe.robotsIndexable ? "verified" : "info",
    },
  ];

  const securityItems: AuditItem[] = [
    {
      title: "DNSSEC",
      detail: data.dns.dnssec.enabled ? "Enabled" : "Not enabled",
      status: data.dns.dnssec.enabled ? "verified" : "attention",
      children: [
        {
          title: "DS Record",
          detail: data.dns.dnssec.dsRecord || "Not found",
          status: data.dns.dnssec.dsRecord ? "verified" : ("not-found" as "issue"),
        },
        {
          title: "DNSKEY Record",
          detail: data.dns.dnssec.dnskeyRecord ? "Present" : "Not found",
          status: data.dns.dnssec.dnskeyRecord ? "verified" : ("not-found" as "issue"),
        },
      ],
    },
    {
      title: "SSL Certificate",
      detail: data.ssl.active
        ? `Active — ${data.ssl.issuer} (expires ${data.ssl.validTo})`
        : "Not active",
      status: data.ssl.active ? (data.ssl.daysRemaining > 14 ? "info" : "attention") : "issue",
    },
    {
      title: "Blacklist Check",
      detail: data.blacklist.clean
        ? `Clean (${data.blacklist.listsChecked} lists)`
        : `Listed on ${data.blacklist.blacklistedOn.length} list(s)`,
      status: data.blacklist.clean ? "verified" : "issue",
    },
    {
      title: "Security Headers",
      detail: `${data.httpProbe.securityHeadersCount}/${data.httpProbe.securityHeadersTotal} headers set`,
      status:
        data.httpProbe.securityHeadersCount >= 4
          ? "verified"
          : data.httpProbe.securityHeadersCount >= 2
            ? "attention"
            : "issue",
      children: Object.entries(data.httpProbe.securityHeaders).map(
        ([key, val]) => ({
          title: formatHeaderName(key),
          detail: val.present ? (val.value?.substring(0, 80) || "Present") : "Missing",
          status: val.present ? ("verified" as const) : ("issue" as const),
        })
      ),
    },
    {
      title: "Cloudflare Proxy",
      detail: data.cloudflare.isCloudflare
        ? "Cloudflare proxy detected"
        : "Not using Cloudflare proxy",
      status: "verified",
    },
  ];

  return {
    registration,
    dns: dnsItems,
    hosting: hostingItems,
    security: securityItems,
  };
}

function formatHeaderName(key: string): string {
  const map: Record<string, string> = {
    hsts: "Strict-Transport-Security",
    csp: "Content-Security-Policy",
    xContentTypeOptions: "X-Content-Type-Options",
    xFrameOptions: "X-Frame-Options",
    referrerPolicy: "Referrer-Policy",
    permissionsPolicy: "Permissions-Policy",
  };
  return map[key] || key;
}
