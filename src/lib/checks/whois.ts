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

/**
 * Extract the section of WHOIS output that matches the queried domain.
 * VeriSign thin WHOIS can return partial matches; we scope to the correct block.
 */
function scopeToDomain(raw: string, domain: string): string {
  const upper = domain.toUpperCase();
  const blocks = raw.split(/(?=Domain Name:)/i);
  for (const block of blocks) {
    const domainLine = block.match(/Domain Name:\s*(\S+)/i);
    if (domainLine && domainLine[1].toUpperCase() === upper) {
      return block;
    }
  }
  return raw;
}

/**
 * Check if WHOIS output is TLD-level data (from IANA) rather than domain-level.
 * IANA responses have "domain: DEV" (just the TLD) and "source: IANA".
 */
function isTldLevelResponse(raw: string, domain: string): boolean {
  if (/source:\s*IANA/i.test(raw)) return true;
  // Check if it has "domain: TLD" but not "Domain Name: full.domain"
  const domainUpper = domain.toUpperCase();
  const hasDomainName = raw
    .split("\n")
    .some((line) => /Domain Name:\s*/i.test(line) && line.toUpperCase().includes(domainUpper));
  if (!hasDomainName && /^domain:\s+\w+$/im.test(raw)) return true;
  return false;
}

/**
 * For .com/.net, follow the registrar WHOIS referral for thick (detailed) WHOIS.
 */
async function followRegistrarReferral(
  thinWhois: string,
  domain: string
): Promise<string | null> {
  const referralMatch = thinWhois.match(
    /Registrar WHOIS Server:\s*(\S+)/i
  );
  if (!referralMatch) return null;
  const registrarServer = referralMatch[1].trim();
  if (registrarServer.includes("verisign")) return null;
  try {
    const { stdout } = await execAsync(
      `whois -h ${registrarServer} ${domain} 2>/dev/null`,
      { timeout: 15000 }
    );
    if (stdout.length > 100 && /Creation Date/i.test(stdout)) {
      return stdout;
    }
  } catch {
    // ignore
  }
  return null;
}

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: [string, ...unknown[][]];
}

interface RdapNameserver {
  ldhName?: string;
}

interface RdapResponse {
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
}

/**
 * Fetch domain data via RDAP (Registration Data Access Protocol).
 * Works for TLDs where traditional WHOIS fails (e.g., Google TLDs: .dev, .app, .page).
 */
async function fetchViaRdap(domain: string): Promise<WhoisResult | null> {
  try {
    const { stdout } = await execAsync(
      `curl -sL "https://rdap.org/domain/${domain}" -H "Accept: application/rdap+json" --max-time 10`,
      { timeout: 15000 }
    );
    const data: RdapResponse = JSON.parse(stdout);
    if (!data.events) return null;

    let createdDate: string | null = null;
    let expiryDate: string | null = null;

    for (const event of data.events) {
      if (event.eventAction === "registration") createdDate = event.eventDate;
      if (event.eventAction === "expiration") expiryDate = event.eventDate;
    }

    // Extract registrar from entities
    let registrar = "Unknown";
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles?.includes("registrar") && entity.vcardArray) {
          const vcard = entity.vcardArray;
          if (Array.isArray(vcard) && vcard.length > 1) {
            for (const field of vcard.slice(1) as unknown[][]) {
              if (Array.isArray(field) && field[0] === "fn" && typeof field[3] === "string") {
                registrar = field[3];
                break;
              }
            }
          }
        }
      }
    }

    // Extract nameservers
    const nameServers: string[] = [];
    if (data.nameservers) {
      for (const ns of data.nameservers) {
        if (ns.ldhName) nameServers.push(ns.ldhName.toLowerCase());
      }
    }

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
    return null;
  }
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
      // Check if we got actual domain-level data
      if (!isTldLevelResponse(stdout, domain) && stdout.length > 50) {
        const scoped = scopeToDomain(stdout, domain);

        // For .com/.net, follow registrar referral for thick WHOIS
        if (tld === "com" || tld === "net") {
          const thick = await followRegistrarReferral(scoped, domain);
          if (thick) return thick;
        }

        return scoped;
      }
    } catch {
      // fall through
    }
  }

  // Generic whois
  try {
    const { stdout } = await execAsync(`whois ${domain} 2>/dev/null`, {
      timeout: 15000,
    });
    if (!isTldLevelResponse(stdout, domain) && stdout.length > 50) {
      return stdout;
    }
  } catch {
    // fall through
  }

  // IANA referral
  try {
    const result = await fetchWhoisViaIana(domain);
    if (!isTldLevelResponse(result, domain)) {
      return result;
    }
  } catch {
    // fall through
  }

  // Return empty to trigger RDAP fallback
  return "";
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
    const diffMs = now.getTime() - created.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays < 0) return "Unknown";
    if (totalDays < 1) return "Less than a day";
    if (totalDays < 30) return `${totalDays} day${totalDays > 1 ? "s" : ""} old`;
    const totalMonths = Math.floor(totalDays / 30.44);
    if (totalMonths < 12) return `${totalMonths} month${totalMonths > 1 ? "s" : ""} old`;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (m === 0) return `${y} year${y > 1 ? "s" : ""} old`;
    return `${y} year${y > 1 ? "s" : ""}, ${m} month${m > 1 ? "s" : ""} old`;
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

    // If WHOIS returned empty/useless data, try RDAP
    if (!stdout || stdout.length < 50) {
      const rdapResult = await fetchViaRdap(domain);
      if (rdapResult) return rdapResult;
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

    // If WHOIS parsed but got no creation date, try RDAP as supplement
    if (!createdDate) {
      const rdapResult = await fetchViaRdap(domain);
      if (rdapResult) {
        return {
          registrar: registrar !== "Unknown" ? registrar : rdapResult.registrar,
          createdDate: rdapResult.createdDate,
          expiryDate: formattedExpiry !== "Unknown" ? formattedExpiry : rdapResult.expiryDate,
          expiryDaysRemaining: formattedExpiry !== "Unknown"
            ? calculateExpiryDaysRemaining(expiryDate)
            : rdapResult.expiryDaysRemaining,
          domainAge: rdapResult.domainAge,
          nameServers: nameServers.length > 0 ? nameServers : rdapResult.nameServers,
          raw: stdout,
        };
      }
    }

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
    // Last resort: try RDAP
    const rdapResult = await fetchViaRdap(domain);
    if (rdapResult) return rdapResult;
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
