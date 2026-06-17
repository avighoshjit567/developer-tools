export interface HttpProbeResult {
  httpsRedirect: boolean;
  redirectChain: string[];
  wwwCanonical: boolean;
  wwwResolvesToSame: boolean;
  serverHeader: string | null;
  poweredBy: string | null;
  platform: string;
  robotsIndexable: boolean;
  securityHeaders: SecurityHeaders;
  securityHeadersCount: number;
  securityHeadersTotal: number;
}

export interface SecurityHeaders {
  hsts: { present: boolean; value: string | null; maxAge: number | null };
  csp: { present: boolean; value: string | null };
  xContentTypeOptions: { present: boolean; value: string | null };
  xFrameOptions: { present: boolean; value: string | null };
  referrerPolicy: { present: boolean; value: string | null };
  permissionsPolicy: { present: boolean; value: string | null };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function detectPlatform(
  headers: Headers,
  body: string
): string {
  const server = (headers.get("server") || "").toLowerCase();
  const poweredBy = (headers.get("x-powered-by") || "").toLowerCase();
  const generator =
    body.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i)?.[1] || "";

  if (generator.toLowerCase().includes("wordpress") || body.includes("wp-content"))
    return "WordPress";
  if (generator.toLowerCase().includes("shopify") || headers.get("x-shopid"))
    return "Shopify";
  if (generator.toLowerCase().includes("drupal")) return "Drupal";
  if (generator.toLowerCase().includes("joomla")) return "Joomla";
  if (poweredBy.includes("next.js")) return "Next.js";
  if (poweredBy.includes("express")) return "Express/Node.js";
  if (poweredBy.includes("php")) return "PHP";
  if (poweredBy.includes("asp.net")) return "ASP.NET";
  if (server.includes("nginx")) return "Nginx";
  if (server.includes("apache")) return "Apache";
  if (server.includes("cloudflare")) return "Cloudflare";
  return "Unknown";
}

export async function checkHttpProbe(domain: string): Promise<HttpProbeResult> {
  const result: HttpProbeResult = {
    httpsRedirect: false,
    redirectChain: [],
    wwwCanonical: false,
    wwwResolvesToSame: false,
    serverHeader: null,
    poweredBy: null,
    platform: "Unknown",
    robotsIndexable: false,
    securityHeaders: {
      hsts: { present: false, value: null, maxAge: null },
      csp: { present: false, value: null },
      xContentTypeOptions: { present: false, value: null },
      xFrameOptions: { present: false, value: null },
      referrerPolicy: { present: false, value: null },
      permissionsPolicy: { present: false, value: null },
    },
    securityHeadersCount: 0,
    securityHeadersTotal: 6,
  };

  try {
    // Check HTTP → HTTPS redirect
    try {
      const httpRes = await fetchWithTimeout(`http://${domain}`, {
        redirect: "manual",
        timeout: 8000,
      });
      const location = httpRes.headers.get("location") || "";
      result.httpsRedirect = location.startsWith("https://");
      if (location) result.redirectChain.push(`http://${domain} → ${location}`);
    } catch {
      // HTTP not available, that's fine
    }

    // Main HTTPS fetch
    const res = await fetchWithTimeout(`https://${domain}`, { timeout: 10000 });
    const body = await res.text().catch(() => "");
    const headers = res.headers;

    result.serverHeader = headers.get("server");
    result.poweredBy = headers.get("x-powered-by");
    result.platform = detectPlatform(headers, body);

    // Security headers
    const hsts = headers.get("strict-transport-security");
    const maxAgeMatch = hsts?.match(/max-age=(\d+)/);
    result.securityHeaders.hsts = {
      present: !!hsts,
      value: hsts,
      maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : null,
    };

    const csp = headers.get("content-security-policy");
    result.securityHeaders.csp = { present: !!csp, value: csp ? csp.substring(0, 200) : null };

    const xcto = headers.get("x-content-type-options");
    result.securityHeaders.xContentTypeOptions = { present: !!xcto, value: xcto };

    const xfo = headers.get("x-frame-options");
    result.securityHeaders.xFrameOptions = { present: !!xfo, value: xfo };

    const rp = headers.get("referrer-policy");
    result.securityHeaders.referrerPolicy = { present: !!rp, value: rp };

    const pp = headers.get("permissions-policy");
    result.securityHeaders.permissionsPolicy = { present: !!pp, value: pp };

    result.securityHeadersCount = Object.values(result.securityHeaders).filter(
      (h) => h.present
    ).length;

    // Check www canonicalization
    try {
      const wwwRes = await fetchWithTimeout(`https://www.${domain}`, {
        redirect: "manual",
        timeout: 5000,
      });
      const wwwLocation = wwwRes.headers.get("location") || "";
      result.wwwCanonical =
        wwwRes.status >= 300 &&
        wwwRes.status < 400 &&
        (wwwLocation.includes(`//${domain}`) || wwwLocation.includes(`//www.${domain}`));
      result.wwwResolvesToSame = wwwRes.status === 200 || result.wwwCanonical;
    } catch {
      result.wwwResolvesToSame = false;
    }

    // Check robots.txt
    try {
      const robotsRes = await fetchWithTimeout(`https://${domain}/robots.txt`, {
        timeout: 5000,
      });
      if (robotsRes.ok) {
        const robotsBody = await robotsRes.text();
        result.robotsIndexable = !robotsBody.includes("Disallow: /\n");
      }
    } catch {
      result.robotsIndexable = false;
    }
  } catch {
    // Domain unreachable via HTTPS
  }

  return result;
}
