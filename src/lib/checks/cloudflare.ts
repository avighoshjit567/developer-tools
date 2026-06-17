// Cloudflare IPv4 ranges (updated periodically from https://www.cloudflare.com/ips-v4)
const CF_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

function ipToLong(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [rangeIp, bits] = cidr.split("/");
  const mask = ~((1 << (32 - Number(bits))) - 1) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(rangeIp) & mask);
}

export interface CloudflareResult {
  isCloudflare: boolean;
}

export function checkCloudflare(ip: string): CloudflareResult {
  if (!ip || ip.includes(":")) {
    return { isCloudflare: false };
  }

  const isCloudflare = CF_RANGES.some((range) => isIpInCidr(ip, range));
  return { isCloudflare };
}
