export interface WpPerformanceResult {
  ttfb: number | null;
  pageSize: number | null;
  gzip: boolean;
  brotli: boolean;
  cacheControl: boolean;
  cacheControlValue: string | null;
  etag: boolean;
  cdnDetected: boolean;
  cdnProvider: string | null;
  cachingPlugin: string | null;
  loadTime: number | null;
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

const CDN_HEADER_PROVIDERS: { header: string; pattern: RegExp; name: string }[] = [
  { header: 'cf-ray', pattern: /.+/, name: 'Cloudflare' },
  { header: 'server', pattern: /cloudflare/i, name: 'Cloudflare' },
  { header: 'x-amz-cf-id', pattern: /.+/, name: 'Amazon CloudFront' },
  { header: 'x-served-by', pattern: /cache-/i, name: 'Fastly' },
  { header: 'x-cdn', pattern: /.+/, name: 'CDN' },
];

const CACHING_PLUGIN_SIGNATURES: { pattern: RegExp; name: string }[] = [
  { pattern: /wp-rocket/i, name: 'WP Rocket' },
  { pattern: /litespeed/i, name: 'LiteSpeed Cache' },
  { pattern: /w3tc/i, name: 'W3 Total Cache' },
  { pattern: /wp-super-cache/i, name: 'WP Super Cache' },
  { pattern: /wpfc/i, name: 'WP Fastest Cache' },
  { pattern: /sg-cachepress/i, name: 'SG Optimizer' },
  { pattern: /breeze/i, name: 'Breeze' },
  { pattern: /wphb-cache/i, name: 'Hummingbird' },
  { pattern: /autoptimize/i, name: 'Autoptimize' },
];

export async function checkWpPerformance(
  domain: string,
  pageHtml: string
): Promise<WpPerformanceResult> {
  const result: WpPerformanceResult = {
    ttfb: null,
    pageSize: null,
    gzip: false,
    brotli: false,
    cacheControl: false,
    cacheControlValue: null,
    etag: false,
    cdnDetected: false,
    cdnProvider: null,
    cachingPlugin: null,
    loadTime: null,
  };

  // --- Page size from provided HTML ---
  result.pageSize = Buffer.byteLength(pageHtml, 'utf8');

  // --- TTFB and load time measurement ---
  const startTime = Date.now();
  const res = await fetchSafe(`https://${domain}/`, 10000, { redirect: 'follow' });
  const endTime = Date.now();

  if (res) {
    // Record total load time (time until response is received)
    result.loadTime = endTime - startTime;

    // TTFB: measure how long until we get the first byte by timing the fetch
    // We use the same request; TTFB approximation is the time to receive the response headers
    result.ttfb = endTime - startTime;

    // Content-Encoding: gzip / brotli
    const contentEncoding = res.headers.get('content-encoding') ?? '';
    result.gzip = contentEncoding.includes('gzip');
    result.brotli = contentEncoding.includes('br');

    // Cache-Control
    const cacheControl = res.headers.get('cache-control');
    if (cacheControl) {
      result.cacheControl = true;
      result.cacheControlValue = cacheControl;
    }

    // ETag
    result.etag = res.headers.get('etag') !== null;

    // CDN detection from response headers
    for (const { header, pattern, name } of CDN_HEADER_PROVIDERS) {
      const value = res.headers.get(header);
      if (value && pattern.test(value)) {
        result.cdnDetected = true;
        result.cdnProvider = name;
        break;
      }
    }
  }

  // --- Caching plugin detection from HTML ---
  for (const { pattern, name } of CACHING_PLUGIN_SIGNATURES) {
    if (pattern.test(pageHtml)) {
      result.cachingPlugin = name;
      break;
    }
  }

  return result;
}
