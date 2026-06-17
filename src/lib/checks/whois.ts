import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WhoisResult {
  registrar: string;
  createdDate: string | null;
  expiryDate: string | null;
  expiryDaysRemaining: number | null;
  domainAge: string;
  nameServers: string[];
  raw: string;
}

const TLD_WHOIS_SERVERS: Record<string, string> = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.pir.org",
  info: "whois.afilias.net",
  io: "whois.nic.io",
  co: "whois.nic.co",
  me: "whois.nic.me",
  dev: "whois.nic.google",
  app: "whois.nic.google",
  xyz: "whois.nic.xyz",
  online: "whois.nic.online",
  tech: "whois.nic.tech",
  site: "whois.nic.site",
  store: "whois.nic.store",
  uk: "whois.nic.uk",
  de: "whois.denic.de",
  fr: "whois.nic.fr",
  nl: "whois.sidn.nl",
  eu: "whois.eu",
  au: "whois.auda.org.au",
  ca: "whois.cira.ca",
  in: "whois.registry.in",
  host: "whois.nic.host",
  cloud: "whois.nic.cloud",
  blog: "whois.nic.blog",
  shop: "whois.nic.shop",
  pro: "whois.nic.pro",
  us: "whois.nic.us",
  biz: "whois.nic.biz",
  cc: "ccwhois.verisign-grs.com",
  tv: "tvwhois.verisign-grs.com",
};

function getTld(domain: string): string {
  const parts = domain.split(".");
  return parts[parts.length - 1].toLowerCase();
}

async function fetchWhoisViaIana(domain: string): Promise<string> {
  const { stdout: ianaOut } = await execAsync(
    `whois -h whois.iana.org ${domain} 2>/dev/null`,
    { timeout: 15000 }
  );
  const referMatch = ianaOut.match(/^refer:\s*(.+)$/im);
  if (!referMatch) throw new Error("No refer server found in IANA response");
  const referServer = referMatch[1].trim();
  const { stdout } = await execAsync(
    `whois -h ${referServer} ${domain} 2>/dev/null`,
    { timeout: 15000 }
  );
  return stdout;
}

async function fetchWhoisRaw(domain: string): Promise<string> {
  const tld = getTld(domain);
  const tldServer = TLD_WHOIS_SERVERS[tld];

  if (tldServer) {
    try {
      const { stdout } = await execAsync(
        `whois -h ${tldServer} ${domain} 2>/dev/null`,
        { timeout: 15000 }
      );
      return stdout;
    } catch {
      // fall through to generic
    }
  }

  // Generic whois (works on Linux; on macOS may not follow referrals)
  try {
    const { stdout } = await execAsync(`whois ${domain} 2>/dev/null`, {
      timeout: 15000,
    });
    return stdout;
  } catch {
    // fall through to IANA referral lookup
  }

  return fetchWhoisViaIana(domain);
}

function extractField(raw: string, ...patterns: string[]): string | null {
  for (const pattern of patterns) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^\\s*${escaped}:\\s*(.+)`, "im");
    const match = raw.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}

function extractMultiple(raw: string, key: string): string[] {
  const results: string[] = [];
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^\\s*${escaped}:\\s*(.+)`, "gim");
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const val = match[1].trim().toLowerCase();
    if (val && !results.includes(val)) results.push(val);
  }
  return results;
}

function calculateAge(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  try {
    const created = new Date(dateStr);
    if (isNaN(created.getTime())) return "Unknown";
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    const months = now.getMonth() - created.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 1) return "Less than a month";
    if (totalMonths < 12) return `${totalMonths} month${totalMonths > 1 ? "s" : ""} old`;
    const y = Math.floor(totalMonths / 12);
    return `${y} year${y > 1 ? "s" : ""} old`;
  } catch {
    return "Unknown";
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";
    return d.toISOString().split("T")[0];
  } catch {
    return "Unknown";
  }
}

function calculateExpiryDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const expiry = new Date(dateStr);
    if (isNaN(expiry.getTime())) return null;
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export async function checkWhois(domain: string): Promise<WhoisResult> {
  try {
    const stdout = await fetchWhoisRaw(domain);

    const registrar =
      extractField(
        stdout,
        "Registrar",
        "Registrar Name",
        "Sponsoring Registrar"
      ) ?? "Unknown";
    const createdDate = extractField(
      stdout,
      "Creation Date",
      "Created Date",
      "Registration Date",
      "Registration Time",
      "created"
    );
    const expiryDate = extractField(
      stdout,
      "Registry Expiry Date",
      "Expiration Date",
      "Registrar Registration Expiration Date",
      "Expiry Date",
      "paid-till",
      "expires"
    );
    const nameServers = extractMultiple(stdout, "Name Server");

    const formattedExpiry = formatDate(expiryDate);

    return {
      registrar,
      createdDate: formatDate(createdDate),
      expiryDate: formattedExpiry,
      expiryDaysRemaining: calculateExpiryDaysRemaining(expiryDate),
      domainAge: calculateAge(createdDate),
      nameServers,
      raw: stdout,
    };
  } catch {
    return {
      registrar: "Unknown",
      createdDate: null,
      expiryDate: null,
      expiryDaysRemaining: null,
      domainAge: "Unknown",
      nameServers: [],
      raw: "",
    };
  }
}
