import * as tls from 'tls';

export interface WpServerResult {
  ssl: { active: boolean; issuer: string; daysRemaining: number };
  securityHeaders: {
    name: string;
    key: string;
    present: boolean;
    value: string | null;
    description: string;
  }[];
  securityHeadersCount: number;
  securityHeadersTotal: number;
  serverHeader: string | null;
  phpVersionExposed: boolean;
  phpVersion: string | null;
  serverVersionExposed: boolean;
  httpsRedirect: boolean;
  poweredBy: string | null;
}

async function fetchSafe(
  url: string,
  timeout = 10000,
  options?: RequestInit
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

function checkSslCert(domain: string): Promise<{ active: boolean; issuer: string; daysRemaining: number }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ active: false, issuer: 'Unknown', daysRemaining: 0 });
    }, 10000);

    try {
      const socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false,
          timeout: 10000,
        },
        () => {
          clearTimeout(timeout);
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({ active: false, issuer: 'Unknown', daysRemaining: 0 });
            return;
          }

          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysRemaining = Math.max(
            0,
            Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          );

          resolve({
            active: daysRemaining > 0,
            issuer: String(cert.issuer?.O || cert.issuer?.CN || 'Unknown'),
            daysRemaining,
          });
        }
      );

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({ active: false, issuer: 'Unknown', daysRemaining: 0 });
      });
    } catch {
      clearTimeout(timeout);
      resolve({ active: false, issuer: 'Unknown', daysRemaining: 0 });
    }
  });
}

const SECURITY_HEADER_DEFINITIONS = [
  {
    name: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    description:
      'Enforces HTTPS connections by telling browsers to only access the site over HTTPS for a specified period.',
  },
  {
    name: 'X-Frame-Options',
    key: 'x-frame-options',
    description:
      'Prevents the page from being embedded in iframes on other origins, protecting against clickjacking attacks.',
  },
  {
    name: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    description:
      'Stops browsers from MIME-sniffing a response away from the declared content type, preventing drive-by download attacks.',
  },
  {
    name: 'Content-Security-Policy',
    key: 'content-security-policy',
    description:
      'Controls which resources the browser is allowed to load, helping to prevent XSS and data injection attacks.',
  },
  {
    name: 'Referrer-Policy',
    key: 'referrer-policy',
    description:
      'Controls how much referrer information is included with requests, protecting user privacy and sensitive URL data.',
  },
  {
    name: 'Permissions-Policy',
    key: 'permissions-policy',
    description:
      'Restricts which browser features and APIs the page can use (e.g. camera, microphone, geolocation).',
  },
];

export async function checkWpServer(domain: string): Promise<WpServerResult> {
  const result: WpServerResult = {
    ssl: { active: false, issuer: 'Unknown', daysRemaining: 0 },
    securityHeaders: [],
    securityHeadersCount: 0,
    securityHeadersTotal: SECURITY_HEADER_DEFINITIONS.length,
    serverHeader: null,
    phpVersionExposed: false,
    phpVersion: null,
    serverVersionExposed: false,
    httpsRedirect: false,
    poweredBy: null,
  };

  // --- SSL certificate check ---
  result.ssl = await checkSslCert(domain);

  // --- Fetch HTTPS homepage and inspect headers ---
  const httpsRes = await fetchSafe(`https://${domain}/`, 10000, { redirect: 'follow' });
  if (httpsRes) {
    // Security headers
    const securityHeaders = SECURITY_HEADER_DEFINITIONS.map((def) => {
      const value = httpsRes.headers.get(def.key);
      return {
        name: def.name,
        key: def.key,
        present: value !== null,
        value,
        description: def.description,
      };
    });

    result.securityHeaders = securityHeaders;
    result.securityHeadersCount = securityHeaders.filter((h) => h.present).length;

    // Server header — check for version exposure
    const serverHeader = httpsRes.headers.get('server');
    result.serverHeader = serverHeader;
    if (serverHeader) {
      // A version number is present if the header contains digits after a slash or space (e.g. Apache/2.4.51)
      result.serverVersionExposed = /[\d.]{3,}/.test(serverHeader);
    }

    // X-Powered-By — PHP version exposure
    const poweredBy = httpsRes.headers.get('x-powered-by');
    result.poweredBy = poweredBy;
    if (poweredBy) {
      const phpMatch = poweredBy.match(/PHP\/([\d.]+)/i);
      if (phpMatch) {
        result.phpVersionExposed = true;
        result.phpVersion = phpMatch[1];
      }
    }
  }

  // --- HTTP → HTTPS redirect check ---
  const httpRes = await fetchSafe(`http://${domain}/`, 10000, { redirect: 'manual' });
  if (httpRes) {
    const location = httpRes.headers.get('location') ?? '';
    const isRedirectStatus = httpRes.status >= 300 && httpRes.status < 400;
    result.httpsRedirect = isRedirectStatus && location.toLowerCase().startsWith('https://');
  }

  return result;
}
