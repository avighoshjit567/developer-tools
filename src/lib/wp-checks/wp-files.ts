export interface WpFileCheck {
  name: string;
  path: string;
  accessible: boolean;
  status: number | null;
}

export interface WpFilesResult {
  files: WpFileCheck[];
  debugLogExposed: boolean;
  debugModeOn: boolean;
  directoryListingEnabled: boolean;
}

async function fetchSafe(
  url: string,
  method: 'HEAD' | 'GET' = 'HEAD',
  timeout = 5000
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { method, signal: controller.signal, redirect: 'follow' });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

const FILE_CHECKS: Array<{ name: string; path: string }> = [
  { name: 'WordPress Readme', path: '/readme.html' },
  { name: 'WordPress License', path: '/license.txt' },
  { name: 'wp-config.php', path: '/wp-config.php' },
  { name: 'wp-config.php Backup (.bak)', path: '/wp-config.php.bak' },
  { name: 'wp-config.php Backup (~)', path: '/wp-config.php~' },
  { name: 'wp-config-sample.php', path: '/wp-config-sample.php' },
  { name: '.htaccess', path: '/.htaccess' },
  { name: 'Debug Log', path: '/wp-content/debug.log' },
  { name: 'WP Cron', path: '/wp-cron.php' },
  { name: 'XML-RPC', path: '/xmlrpc.php' },
  { name: 'Uploads Directory', path: '/wp-content/uploads/' },
  { name: 'Plugins Directory', path: '/wp-content/plugins/' },
  { name: 'wp-includes Directory', path: '/wp-includes/' },
  { name: 'Git HEAD', path: '/.git/HEAD' },
  { name: 'Backup Directory', path: '/backup/' },
];

const PHP_ERROR_PATTERN =
  /<b>(?:Fatal error|Warning|Notice|Parse error|Deprecated)<\/b>/i;

export async function checkWpFiles(
  domain: string,
  pageHtml: string
): Promise<WpFilesResult> {
  const base = `https://${domain}`;

  // Run all HEAD checks in parallel alongside the debug.log GET and uploads body check
  const headPromises = FILE_CHECKS.map(async ({ name, path }) => {
    const res = await fetchSafe(`${base}${path}`, 'HEAD', 5000);
    const status = res ? res.status : null;
    const accessible = status === 200;
    return { name, path, accessible, status } satisfies WpFileCheck;
  });

  // GET first 100 bytes of debug.log to confirm it contains log data
  const debugLogGetPromise = (async (): Promise<boolean> => {
    const res = await fetchSafe(`${base}/wp-content/debug.log`, 'GET', 5000);
    if (!res || res.status !== 200) return false;
    try {
      const reader = res.body?.getReader();
      if (!reader) return false;
      const { value } = await reader.read();
      await reader.cancel();
      if (!value) return false;
      const snippet = new TextDecoder().decode(value.slice(0, 100));
      return snippet.includes('[') || snippet.toLowerCase().includes('php') || snippet.includes('WordPress');
    } catch {
      return false;
    }
  })();

  // GET uploads directory body to check for directory listing
  const uploadsBodyPromise = (async (): Promise<boolean> => {
    const res = await fetchSafe(`${base}/wp-content/uploads/`, 'GET', 5000);
    if (!res || res.status !== 200) return false;
    try {
      const text = await res.text();
      return text.includes('Index of');
    } catch {
      return false;
    }
  })();

  const [fileChecks, debugLogConfirmed, directoryListingEnabled] =
    await Promise.all([
      Promise.all(headPromises),
      debugLogGetPromise,
      uploadsBodyPromise,
    ]);

  const debugLogFile = fileChecks.find((f) => f.path === '/wp-content/debug.log');
  const debugLogExposed = (debugLogFile?.accessible ?? false) && debugLogConfirmed;

  const debugModeOn = PHP_ERROR_PATTERN.test(pageHtml);

  return {
    files: fileChecks,
    debugLogExposed,
    debugModeOn,
    directoryListingEnabled,
  };
}
