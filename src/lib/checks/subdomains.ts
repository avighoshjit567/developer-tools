import { promises as dns } from "dns";

export interface SubdomainResult {
  name: string;
  ip: string | null;
  hasSPF: boolean;
}

const COMMON_SUBDOMAINS = [
  "www",
  "mail",
  "ftp",
  "api",
  "dev",
  "staging",
  "cdn",
  "blog",
  "shop",
  "app",
  "admin",
  "portal",
  "m",
  "remote",
  "vpn",
];

export async function checkSubdomains(domain: string): Promise<SubdomainResult[]> {
  const results = await Promise.allSettled(
    COMMON_SUBDOMAINS.map(async (sub) => {
      const full = `${sub}.${domain}`;
      try {
        const ips = await dns.resolve4(full);
        if (!ips.length) return null;

        // Check if subdomain has SPF
        let hasSPF = false;
        try {
          const txts = await dns.resolveTxt(full);
          const flat = txts.map((r) => r.join(""));
          hasSPF = flat.some((r) => r.toLowerCase().startsWith("v=spf1"));
        } catch {
          // No TXT records
        }

        return { name: sub, ip: ips[0], hasSPF };
      } catch {
        return null;
      }
    })
  );

  const fulfilled: SubdomainResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) {
      fulfilled.push(r.value);
    }
  }
  return fulfilled;
}
