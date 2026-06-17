import { promises as dns } from "dns";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DnsResult {
  a: string[];
  aaaa: string[];
  mx: { priority: number; exchange: string }[];
  ns: string[];
  txt: string[];
  caa: { critical: number; isdomain: string; value: string }[];
  soa: { nsname: string; hostmaster: string } | null;
  dnssec: { enabled: boolean; dsRecord: string | null; dnskeyRecord: string | null };
}

async function safeResolve<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function checkDns(domain: string): Promise<DnsResult> {
  const [a, aaaa, mx, ns, txt, caa, soa, dnssec] = await Promise.all([
    safeResolve(() => dns.resolve4(domain), []),
    safeResolve(() => dns.resolve6(domain), []),
    safeResolve(
      () => dns.resolveMx(domain).then((records) =>
        records.map((r) => ({ priority: r.priority, exchange: r.exchange }))
      ),
      []
    ),
    safeResolve(() => dns.resolveNs(domain), []),
    safeResolve(
      () => dns.resolveTxt(domain).then((records) => records.map((r) => r.join(""))),
      []
    ),
    safeResolve(
      () => dns.resolveCaa(domain).then((records) =>
        records.map((r) => ({
          critical: r.critical,
          isdomain: r.contactemail || r.iodef || "",
          value: r.issue || r.issuewild || "",
        }))
      ),
      []
    ),
    safeResolve(
      () => dns.resolveSoa(domain).then((r) => ({
        nsname: r.nsname,
        hostmaster: r.hostmaster,
      })),
      null
    ),
    checkDnssec(domain),
  ]);

  return { a, aaaa, mx, ns, txt, caa, soa, dnssec };
}

async function checkDnssec(
  domain: string
): Promise<{ enabled: boolean; dsRecord: string | null; dnskeyRecord: string | null }> {
  try {
    const [dsResult, dnskeyResult] = await Promise.all([
      execAsync(`dig +short DS ${domain} 2>/dev/null`, { timeout: 10000 }).catch(
        () => ({ stdout: "" })
      ),
      execAsync(`dig +short DNSKEY ${domain} 2>/dev/null`, { timeout: 10000 }).catch(
        () => ({ stdout: "" })
      ),
    ]);

    const ds = dsResult.stdout.trim() || null;
    const dnskey = dnskeyResult.stdout.trim() || null;

    return { enabled: !!ds, dsRecord: ds, dnskeyRecord: dnskey };
  } catch {
    return { enabled: false, dsRecord: null, dnskeyRecord: null };
  }
}
