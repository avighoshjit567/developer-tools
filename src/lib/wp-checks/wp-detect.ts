export interface WpDetectResult {
  isWordPress: boolean;
  version: string | null;
  versionExposed: boolean;
  versionSource: string | null;
  latestVersion: string | null;
  isLatest: boolean | null;
  readmeExposed: boolean;
  generatorTagExposed: boolean;
  rssVersionExposed: boolean;
}

async function fetchSafe(url: string, timeout = 10000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

export async function checkWpDetect(domain: string): Promise<WpDetectResult> {
  const result: WpDetectResult = {
    isWordPress: false,
    version: null,
    versionExposed: false,
    versionSource: null,
    latestVersion: null,
    isLatest: null,
    readmeExposed: false,
    generatorTagExposed: false,
    rssVersionExposed: false,
  };

  // --- Check homepage for WordPress indicators and generator meta tag ---
  const homeRes = await fetchSafe(`https://${domain}/`);
  if (homeRes) {
    try {
      const html = await homeRes.text();

      const hasWpContent = html.includes('wp-content');
      const hasWpIncludes = html.includes('wp-includes');

      const generatorMatch = html.match(
        /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress(?:\s+([\d.]+))?["'][^>]*\/?>/i
      );

      if (generatorMatch) {
        result.generatorTagExposed = true;
        result.isWordPress = true;
        if (generatorMatch[1]) {
          result.version = generatorMatch[1];
          result.versionExposed = true;
          result.versionSource = 'generator-meta';
        }
      }

      if (hasWpContent || hasWpIncludes) {
        result.isWordPress = true;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Check readme.html ---
  const readmeRes = await fetchSafe(`https://${domain}/readme.html`);
  if (readmeRes && readmeRes.status === 200) {
    result.readmeExposed = true;
    result.isWordPress = true;
  }

  // --- Check RSS feed for generator version ---
  const rssRes = await fetchSafe(`https://${domain}/feed/`);
  if (rssRes) {
    try {
      const rssText = await rssRes.text();
      const rssGeneratorMatch = rssText.match(
        /<generator>https?:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/i
      );
      if (rssGeneratorMatch) {
        result.rssVersionExposed = true;
        result.isWordPress = true;
        if (!result.version && rssGeneratorMatch[1]) {
          result.version = rssGeneratorMatch[1];
          result.versionExposed = true;
          result.versionSource = 'rss-generator';
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Fetch latest WordPress version ---
  const wpApiRes = await fetchSafe('https://api.wordpress.org/core/version-check/1.7/');
  if (wpApiRes) {
    try {
      const wpApiJson = await wpApiRes.json() as { offers?: Array<{ version?: string }> };
      const latestVersion = wpApiJson?.offers?.[0]?.version ?? null;
      if (latestVersion) {
        result.latestVersion = latestVersion;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Compare versions ---
  if (result.version !== null && result.latestVersion !== null) {
    result.isLatest = result.version === result.latestVersion;
  }

  return result;
}
