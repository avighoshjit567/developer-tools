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

/**
 * Extract WP version from ?ver= query params on wp-includes/wp-content assets.
 * These are present on virtually every WP site and very hard to fully remove.
 */
function extractVersionFromAssets(html: string): string | null {
  // Match wp-includes or wp-content asset URLs with ?ver= parameter
  const assetRegex = /(?:wp-includes|wp-content)\/[^"']*\?ver=([\d.]+)/g;
  const versions: Record<string, number> = {};

  let match;
  while ((match = assetRegex.exec(html)) !== null) {
    const ver = match[1];
    // Filter out plugin/theme versions — WP core versions are like 6.5.2, 6.7
    // Skip very short (likely "1" or "2") or very long versions
    if (ver && ver.split(".").length >= 2 && ver.split(".").length <= 3) {
      versions[ver] = (versions[ver] || 0) + 1;
    }
  }

  if (Object.keys(versions).length === 0) return null;

  // The WP core version appears most frequently in wp-includes assets
  // Also check wp-includes specifically for stronger signal
  const wpIncludesRegex = /wp-includes\/[^"']*\?ver=([\d.]+)/g;
  const coreVersions: Record<string, number> = {};
  while ((match = wpIncludesRegex.exec(html)) !== null) {
    const ver = match[1];
    if (ver && ver.split(".").length >= 2 && ver.split(".").length <= 3) {
      coreVersions[ver] = (coreVersions[ver] || 0) + 1;
    }
  }

  // Prefer the most frequent version from wp-includes (strongest signal)
  const source = Object.keys(coreVersions).length > 0 ? coreVersions : versions;
  const sorted = Object.entries(source).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

export async function checkWpDetect(domain: string, pageHtml?: string): Promise<WpDetectResult> {
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

  // --- Use provided HTML or fetch homepage ---
  let html = pageHtml || "";
  if (!html) {
    const homeRes = await fetchSafe(`https://${domain}/`);
    if (homeRes) {
      try { html = await homeRes.text(); } catch { /* ignore */ }
    }
  }

  if (html) {
    const hasWpContent = html.includes('wp-content');
    const hasWpIncludes = html.includes('wp-includes');

    if (hasWpContent || hasWpIncludes) {
      result.isWordPress = true;
    }

    // 1. Generator meta tag
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

    // 2. Static asset ?ver= parameters (most reliable — very hard to remove)
    if (!result.version) {
      const assetVersion = extractVersionFromAssets(html);
      if (assetVersion) {
        result.version = assetVersion;
        result.versionExposed = true;
        result.versionSource = 'asset-version';
        result.isWordPress = true;
      }
    }
  }

  // Run parallel checks for remaining sources
  const [readmeRes, rssRes, opmlRes, loginRes, restApiRes, wpApiRes] = await Promise.all([
    // 3. readme.html — check existence and parse version from content
    fetchSafe(`https://${domain}/readme.html`),
    // 4. RSS feed generator
    fetchSafe(`https://${domain}/feed/`),
    // 5. wp-links-opml.php — often exposes generator="WordPress/x.x.x"
    fetchSafe(`https://${domain}/wp-links-opml.php`),
    // 6. wp-login.php — contains ?ver= in CSS/JS references
    !result.version ? fetchSafe(`https://${domain}/wp-login.php`) : Promise.resolve(null),
    // 7. REST API root — may include version info
    !result.version ? fetchSafe(`https://${domain}/wp-json/`) : Promise.resolve(null),
    // Latest version from WordPress.org
    fetchSafe('https://api.wordpress.org/core/version-check/1.7/'),
  ]);

  // 3. readme.html
  if (readmeRes && readmeRes.status === 200) {
    result.readmeExposed = true;
    result.isWordPress = true;
    if (!result.version) {
      try {
        const readmeText = await readmeRes.text();
        // readme.html contains "Version x.x.x" in the content
        const readmeVersionMatch = readmeText.match(/Version\s+([\d.]+)/i);
        if (readmeVersionMatch?.[1]) {
          result.version = readmeVersionMatch[1];
          result.versionExposed = true;
          result.versionSource = 'readme-html';
        }
      } catch { /* ignore */ }
    }
  }

  // 4. RSS feed generator
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
    } catch { /* ignore */ }
  }

  // 5. wp-links-opml.php
  if (opmlRes && opmlRes.status === 200) {
    try {
      const opmlText = await opmlRes.text();
      // Contains generator="WordPress/6.5.2"
      const opmlMatch = opmlText.match(/generator=["']WordPress\/([\d.]+)["']/i);
      if (opmlMatch) {
        result.isWordPress = true;
        if (!result.version && opmlMatch[1]) {
          result.version = opmlMatch[1];
          result.versionExposed = true;
          result.versionSource = 'opml';
        }
      }
    } catch { /* ignore */ }
  }

  // 6. wp-login.php asset versions
  if (loginRes && loginRes.status === 200 && !result.version) {
    try {
      const loginHtml = await loginRes.text();
      if (loginHtml.includes('wp-login') || loginHtml.includes('wp-includes')) {
        result.isWordPress = true;
        const loginVersion = extractVersionFromAssets(loginHtml);
        if (loginVersion) {
          result.version = loginVersion;
          result.versionExposed = true;
          result.versionSource = 'login-assets';
        }
      }
    } catch { /* ignore */ }
  }

  // 7. REST API
  if (restApiRes && restApiRes.status === 200 && !result.version) {
    try {
      const restJson = await restApiRes.json() as {
        description?: string;
        gmt_offset?: number;
        namespaces?: string[];
      };
      // REST API presence confirms WordPress
      if (restJson.namespaces && Array.isArray(restJson.namespaces)) {
        result.isWordPress = true;
        // Some configs expose version in the response
        // The wp/v2 namespace presence confirms WP but doesn't give exact version
      }
    } catch { /* ignore */ }
  }

  // Fetch latest WordPress version
  if (wpApiRes) {
    try {
      const wpApiJson = await wpApiRes.json() as { offers?: Array<{ version?: string }> };
      const latestVersion = wpApiJson?.offers?.[0]?.version ?? null;
      if (latestVersion) {
        result.latestVersion = latestVersion;
      }
    } catch { /* ignore */ }
  }

  // Compare versions
  if (result.version !== null && result.latestVersion !== null) {
    result.isLatest = result.version === result.latestVersion;
  }

  return result;
}
