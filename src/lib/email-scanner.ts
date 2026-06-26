import { promises as dns } from "dns";
import { checkEmailAuth } from "./checks/email-auth";
import { checkDns } from "./checks/dns";
import { checkBlacklist } from "./checks/blacklist";
import { calculateEmailScore } from "./email-scoring";
import type {
  EmailScanResult,
  EmailQuickFacts,
  EmailIssue,
  EmailFixItem,
  MxInfo,
  SpfInfo,
  DkimInfo,
  DmarcInfo,
  BlacklistInfo,
} from "@/types/email-scan";

type ProgressCallback = (
  check: string,
  label: string,
  progress: number,
  total: number
) => void;

export async function runEmailScan(
  domain: string,
  onProgress?: ProgressCallback
): Promise<EmailScanResult> {
  const startTime = Date.now();
  const totalChecks = 3;
  let completed = 0;

  function progress(check: string, label: string) {
    completed++;
    onProgress?.(check, label, completed, totalChecks);
  }

  // Step 1: Run DNS and email auth checks in parallel
  const [dnsResult, emailAuth] = await Promise.all([
    checkDns(domain).then((r) => {
      progress("dns", "DNS Records");
      return r;
    }),
    checkEmailAuth(domain).then((r) => {
      progress("email-auth", "Email Authentication");
      return r;
    }),
  ]);

  // Step 2: Resolve MX IPs and run blacklist check
  const mxRecords = await Promise.all(
    dnsResult.mx.map(async (mx) => {
      let ip: string | null = null;
      try {
        const ips = await dns.resolve4(mx.exchange);
        ip = ips[0] || null;
      } catch {
        // MX may not resolve to an A record
      }
      return { priority: mx.priority, exchange: mx.exchange, ip };
    })
  );

  // Get the IP of the first MX record for blacklist check
  const primaryMxIp =
    mxRecords.find((r) => r.ip !== null)?.ip || dnsResult.a[0] || "";

  const blacklistResult = await checkBlacklist(primaryMxIp).then((r) => {
    progress("blacklist", "Blacklist Check");
    return r;
  });

  // Build structured data
  const mxExchanges = mxRecords.map((r) => r.exchange);
  const provider = detectMailProvider(mxExchanges);

  const mx: MxInfo = {
    records: mxRecords,
    hasBackupMx: mxRecords.length >= 2,
    provider,
  };

  const spfIncludes = parseSpfIncludes(emailAuth.spf.record);
  const spfLookupCount = countSpfLookups(emailAuth.spf.record);

  const spf: SpfInfo = {
    exists: emailAuth.spf.exists,
    record: emailAuth.spf.record,
    mechanism: emailAuth.spf.mechanism,
    isStrict: emailAuth.spf.isStrict,
    includes: spfIncludes,
    lookupCount: spfLookupCount,
    status: getSpfStatus(emailAuth.spf),
  };

  const dkim: DkimInfo = {
    found: emailAuth.dkim.found,
    selectors: emailAuth.dkim.selectors,
    activeCount: emailAuth.dkim.selectors.filter((s) => s.found).length,
  };

  const dmarcDetails = parseDmarcDetails(emailAuth.dmarc.record);

  const dmarc: DmarcInfo = {
    exists: emailAuth.dmarc.exists,
    record: emailAuth.dmarc.record,
    policy: emailAuth.dmarc.policy,
    subdomainPolicy: dmarcDetails.subdomainPolicy,
    reportingEnabled: dmarcDetails.ruaEmails.length > 0,
    ruaEmails: dmarcDetails.ruaEmails,
    rufEmails: dmarcDetails.rufEmails,
    percentage: dmarcDetails.percentage,
    status: getDmarcStatus(emailAuth.dmarc),
  };

  const blacklist: BlacklistInfo = {
    clean: blacklistResult.clean,
    listsChecked: blacklistResult.listsChecked,
    blacklistedOn: blacklistResult.blacklistedOn,
    ipChecked: primaryMxIp,
  };

  // Calculate score
  const { score, grade, breakdown } = calculateEmailScore({
    mx,
    spf,
    dkim,
    dmarc,
    blacklist,
  });

  // Build quick facts
  const quickFacts: EmailQuickFacts = {
    mailServer: mxRecords[0]?.exchange || "None",
    mailProvider: provider,
    spfStatus: spf.exists
      ? spf.isStrict
        ? "Strict (-all)"
        : `Present (${spf.mechanism || "no qualifier"})`
      : "Missing",
    dkimStatus: dkim.found
      ? `Found (${dkim.activeCount} selector${dkim.activeCount !== 1 ? "s" : ""})`
      : "Not found",
    dmarcPolicy: dmarc.exists
      ? `${dmarc.policy || "none"}`
      : "Missing",
    blacklistStatus: blacklist.clean
      ? "Clean"
      : `Listed on ${blacklist.blacklistedOn.length} list${blacklist.blacklistedOn.length !== 1 ? "s" : ""}`,
    mxCount: mxRecords.length,
    tlsSupport: "Unknown",
  };

  // Build issues and fix list
  const issues = buildIssues(mx, spf, dkim, dmarc, blacklist);
  const whatToFix = buildFixList(issues);

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
    mx,
    spf,
    dkim,
    dmarc,
    blacklist,
    breakdown,
  };
}

function detectMailProvider(mxRecords: string[]): string {
  const mx = mxRecords.join(" ").toLowerCase();
  if (mx.includes("google") || mx.includes("gmail")) return "Google Workspace";
  if (mx.includes("outlook") || mx.includes("microsoft")) return "Microsoft 365";
  if (mx.includes("zoho")) return "Zoho Mail";
  if (mx.includes("protonmail") || mx.includes("proton")) return "ProtonMail";
  if (mx.includes("mimecast")) return "Mimecast";
  if (mx.includes("barracuda")) return "Barracuda";
  if (mx.includes("pphosted") || mx.includes("proofpoint")) return "Proofpoint";
  if (mx.includes("securemx") || mx.includes("forcepoint")) return "Forcepoint";
  if (mx.includes("mailgun")) return "Mailgun";
  if (mx.includes("sendgrid")) return "SendGrid";
  if (mx.includes("postmark")) return "Postmark";
  if (mx.includes("amazonses") || mx.includes("aws")) return "Amazon SES";
  if (mx.includes("yandex")) return "Yandex Mail";
  if (mx.includes("hostinger")) return "Hostinger";
  if (mx.includes("namecheap")) return "Namecheap";
  if (mx.includes("godaddy") || mx.includes("secureserver")) return "GoDaddy";
  if (mx.includes("titan")) return "Titan Email";
  return mxRecords[0]?.split(".").slice(-2).join(".") || "Unknown";
}

function parseSpfIncludes(record: string | null): string[] {
  if (!record) return [];
  const matches = record.match(/include:(\S+)/g) || [];
  return matches.map((m) => m.replace("include:", ""));
}

function countSpfLookups(record: string | null): number {
  if (!record) return 0;
  const includeCount = (record.match(/include:/g) || []).length;
  const aCount = (record.match(/\ba\b/g) || []).length;
  const mxCount = (record.match(/\bmx\b/g) || []).length;
  const ptrCount = (record.match(/\bptr\b/g) || []).length;
  const redirectCount = (record.match(/redirect=/g) || []).length;
  return includeCount + aCount + mxCount + ptrCount + redirectCount;
}

function getSpfStatus(
  spf: { exists: boolean; mechanism: string | null; isStrict: boolean }
): "pass" | "softfail" | "neutral" | "fail" | "missing" {
  if (!spf.exists) return "missing";
  if (spf.mechanism === "-all") return "pass";
  if (spf.mechanism === "~all") return "softfail";
  if (spf.mechanism === "?all") return "neutral";
  if (spf.mechanism === "+all") return "fail";
  return "neutral";
}

function getDmarcStatus(
  dmarc: { exists: boolean; policy: string | null }
): "reject" | "quarantine" | "none" | "missing" {
  if (!dmarc.exists) return "missing";
  if (dmarc.policy === "reject") return "reject";
  if (dmarc.policy === "quarantine") return "quarantine";
  return "none";
}

function parseDmarcDetails(record: string | null): {
  subdomainPolicy: string | null;
  ruaEmails: string[];
  rufEmails: string[];
  percentage: number;
} {
  if (!record) {
    return { subdomainPolicy: null, ruaEmails: [], rufEmails: [], percentage: 100 };
  }

  const spMatch = record.match(/sp\s*=\s*(none|quarantine|reject)/i);
  const subdomainPolicy = spMatch ? spMatch[1].toLowerCase() : null;

  const ruaMatch = record.match(/rua\s*=\s*([^;]+)/i);
  const ruaEmails = ruaMatch
    ? ruaMatch[1]
        .split(",")
        .map((e) => e.trim().replace(/^mailto:/i, ""))
        .filter(Boolean)
    : [];

  const rufMatch = record.match(/ruf\s*=\s*([^;]+)/i);
  const rufEmails = rufMatch
    ? rufMatch[1]
        .split(",")
        .map((e) => e.trim().replace(/^mailto:/i, ""))
        .filter(Boolean)
    : [];

  const pctMatch = record.match(/pct\s*=\s*(\d+)/i);
  const percentage = pctMatch ? parseInt(pctMatch[1], 10) : 100;

  return { subdomainPolicy, ruaEmails, rufEmails, percentage };
}

function buildIssues(
  mx: MxInfo,
  spf: SpfInfo,
  dkim: DkimInfo,
  dmarc: DmarcInfo,
  blacklist: BlacklistInfo
): EmailIssue[] {
  const issues: EmailIssue[] = [];

  // MX issues
  if (mx.records.length === 0) {
    issues.push({
      severity: "critical",
      title: "No MX records found",
      description:
        "Your domain has no MX records configured. Email cannot be delivered to this domain.",
      category: "mx",
    });
  }

  if (mx.records.length > 0 && !mx.hasBackupMx) {
    issues.push({
      severity: "info",
      title: "No backup MX server",
      description:
        "Only one MX record is configured. Adding a backup MX ensures email delivery if the primary server is unavailable.",
      category: "mx",
    });
  }

  // SPF issues
  if (!spf.exists) {
    issues.push({
      severity: "warning",
      title: "No SPF record found",
      description:
        "SPF (Sender Policy Framework) is not configured. This allows anyone to send email on behalf of your domain.",
      category: "spf",
    });
  }

  if (spf.mechanism === "+all") {
    issues.push({
      severity: "critical",
      title: "SPF allows all senders (+all)",
      description:
        "Your SPF record uses +all which permits any server to send email as your domain. This is extremely insecure.",
      category: "spf",
    });
  }

  if (spf.mechanism === "~all") {
    issues.push({
      severity: "info",
      title: "SPF uses soft fail (~all)",
      description:
        "Your SPF record uses ~all (soft fail) instead of -all (hard fail). Consider switching to -all for stricter enforcement.",
      category: "spf",
    });
  }

  if (spf.exists && spf.lookupCount > 10) {
    issues.push({
      severity: "warning",
      title: "SPF exceeds DNS lookup limit",
      description: `Your SPF record requires ${spf.lookupCount} DNS lookups, exceeding the RFC limit of 10. This may cause SPF validation failures.`,
      category: "spf",
    });
  }

  // DKIM issues
  if (!dkim.found) {
    issues.push({
      severity: "warning",
      title: "No DKIM records found",
      description:
        "DKIM (DomainKeys Identified Mail) is not configured. DKIM helps verify that emails are not tampered with in transit.",
      category: "dkim",
    });
  }

  // DMARC issues
  if (!dmarc.exists) {
    issues.push({
      severity: "warning",
      title: "No DMARC record found",
      description:
        "DMARC (Domain-based Message Authentication) is not configured. DMARC protects against email spoofing and phishing.",
      category: "dmarc",
    });
  }

  if (dmarc.exists && dmarc.policy === "none") {
    issues.push({
      severity: "info",
      title: "DMARC policy set to none",
      description:
        "Your DMARC policy is set to 'none', which only monitors without enforcing. Consider upgrading to 'quarantine' or 'reject'.",
      category: "dmarc",
    });
  }

  if (dmarc.exists && !dmarc.reportingEnabled) {
    issues.push({
      severity: "info",
      title: "No DMARC reporting configured",
      description:
        "Your DMARC record does not include a rua= tag for aggregate reports. Enable reporting to monitor email authentication.",
      category: "dmarc",
    });
  }

  // Blacklist issues
  if (!blacklist.clean) {
    issues.push({
      severity: "critical",
      title: `Mail server IP blacklisted on ${blacklist.blacklistedOn.length} list${blacklist.blacklistedOn.length !== 1 ? "s" : ""}`,
      description: `The mail server IP (${blacklist.ipChecked}) is listed on: ${blacklist.blacklistedOn.join(", ")}. This will cause email delivery failures.`,
      category: "blacklist",
    });
  }

  return issues.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function buildFixList(issues: EmailIssue[]): EmailFixItem[] {
  return issues
    .filter((i) => i.severity !== "info")
    .map((issue, idx) => ({
      priority: idx + 1,
      title: issue.title,
      description: issue.description,
    }));
}
