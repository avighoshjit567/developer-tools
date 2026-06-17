import { promises as dns } from "dns";

export interface EmailAuthResult {
  spf: {
    exists: boolean;
    record: string | null;
    mechanism: string | null; // "-all", "~all", "?all", "+all"
    isStrict: boolean;
  };
  dkim: {
    found: boolean;
    selectors: { name: string; found: boolean }[];
  };
  dmarc: {
    exists: boolean;
    record: string | null;
    policy: string | null; // "none", "quarantine", "reject"
  };
}

const COMMON_DKIM_SELECTORS = [
  "default",
  "google",
  "selector1",
  "selector2",
  "k1",
  "mail",
  "dkim",
  "s1",
  "s2",
  "smtp",
  "mandrill",
  "everlytickey1",
  "everlytickey2",
  "mxvault",
];

export async function checkEmailAuth(domain: string): Promise<EmailAuthResult> {
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);
  return { spf, dkim, dmarc };
}

async function checkSpf(domain: string) {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map((r) => r.join(""));
    const spfRecord = flat.find((r) => r.toLowerCase().startsWith("v=spf1"));

    if (!spfRecord) {
      return { exists: false, record: null, mechanism: null, isStrict: false };
    }

    let mechanism: string | null = null;
    if (spfRecord.includes("-all")) mechanism = "-all";
    else if (spfRecord.includes("~all")) mechanism = "~all";
    else if (spfRecord.includes("?all")) mechanism = "?all";
    else if (spfRecord.includes("+all")) mechanism = "+all";

    return {
      exists: true,
      record: spfRecord,
      mechanism,
      isStrict: mechanism === "-all",
    };
  } catch {
    return { exists: false, record: null, mechanism: null, isStrict: false };
  }
}

async function checkDkim(domain: string) {
  const results = await Promise.all(
    COMMON_DKIM_SELECTORS.map(async (selector) => {
      try {
        const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        const flat = records.map((r) => r.join("")).join("");
        return { name: selector, found: flat.includes("v=DKIM1") || flat.includes("p=") };
      } catch {
        return { name: selector, found: false };
      }
    })
  );

  return {
    found: results.some((r) => r.found),
    selectors: results.filter((r) => r.found),
  };
}

async function checkDmarc(domain: string) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = records.map((r) => r.join(""));
    const dmarcRecord = flat.find((r) => r.toLowerCase().startsWith("v=dmarc1"));

    if (!dmarcRecord) {
      return { exists: false, record: null, policy: null };
    }

    const policyMatch = dmarcRecord.match(/p\s*=\s*(none|quarantine|reject)/i);
    const policy = policyMatch ? policyMatch[1].toLowerCase() : null;

    return { exists: true, record: dmarcRecord, policy };
  } catch {
    return { exists: false, record: null, policy: null };
  }
}
