import { promises as dns } from "dns";

export interface BlacklistResult {
  clean: boolean;
  listsChecked: number;
  blacklistedOn: string[];
}

const DNSBL_SERVERS = [
  "zen.spamhaus.org",
  "bl.spamcop.net",
  "b.barracudacentral.org",
  "dnsbl.sorbs.net",
  "spam.dnsbl.sorbs.net",
  "dul.dnsbl.sorbs.net",
  "dnsbl-1.uceprotect.net",
  "dnsbl-2.uceprotect.net",
  "dnsbl-3.uceprotect.net",
  "db.wpbl.info",
  "psbl.surriel.com",
  "dyna.spamrats.com",
  "noptr.spamrats.com",
  "spam.spamrats.com",
  "cbl.abuseat.org",
  "dnsbl.dronebl.org",
  "rbl.interserver.net",
  "bl.mailspike.net",
  "bl.spameatingmonkey.net",
  "backscatter.spameatingmonkey.net",
];

function reverseIp(ip: string): string {
  return ip.split(".").reverse().join(".");
}

export async function checkBlacklist(ip: string): Promise<BlacklistResult> {
  if (!ip || ip.includes(":")) {
    // Skip IPv6 or empty
    return { clean: true, listsChecked: 0, blacklistedOn: [] };
  }

  const reversed = reverseIp(ip);
  const blacklistedOn: string[] = [];

  const results = await Promise.allSettled(
    DNSBL_SERVERS.map(async (server) => {
      try {
        await dns.resolve4(`${reversed}.${server}`);
        return server; // If it resolves, the IP is listed
      } catch {
        return null; // Not listed
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      blacklistedOn.push(result.value);
    }
  }

  return {
    clean: blacklistedOn.length === 0,
    listsChecked: DNSBL_SERVERS.length,
    blacklistedOn,
  };
}
