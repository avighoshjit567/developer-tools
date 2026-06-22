export interface WpPluginInfo {
  name: string;
  slug: string;
  version: string | null;
  detected: boolean;
}

export interface WpPluginsResult {
  detected: WpPluginInfo[];
  totalChecked: number;
}

const PLUGIN_SLUGS: string[] = [
  "akismet",
  "contact-form-7",
  "woocommerce",
  "wordpress-seo",
  "elementor",
  "classic-editor",
  "wpforms-lite",
  "wordfence",
  "updraftplus",
  "really-simple-ssl",
  "jetpack",
  "all-in-one-seo-pack",
  "w3-total-cache",
  "wp-super-cache",
  "litespeed-cache",
  "google-analytics-for-wordpress",
  "duplicate-post",
  "redirection",
  "advanced-custom-fields",
  "wp-mail-smtp",
  "wp-optimize",
  "tablepress",
  "tinymce-advanced",
  "sucuri-scanner",
  "ithemes-security",
  "better-wp-security",
  "limit-login-attempts-reloaded",
  "google-sitemap-generator",
  "broken-link-checker",
  "wp-smushit",
  "autoptimize",
  "async-javascript",
  "ewww-image-optimizer",
  "shortpixel-image-optimiser",
  "imagify",
  "regenerate-thumbnails",
  "enable-media-replace",
  "svg-support",
  "safe-svg",
  "wordpress-importer",
  "widget-importer-exporter",
  "all-in-one-wp-migration",
  "duplicate-page",
  "insert-headers-and-footers",
  "header-footer-code-manager",
  "cookie-notice",
  "cookie-law-info",
  "gdpr-cookie-consent",
  "complianz-gdpr",
  "wp-fastest-cache",
  "hummingbird-performance",
  "perfmatters",
  "flying-press",
  "wp-rocket",
  "breeze",
  "sg-cachepress",
  "cache-enabler",
  "comet-cache",
  "powered-cache",
  "swift-performance-lite",
  "ninja-forms",
  "formidable",
  "gravity-forms",
  "happy-elementor-addons",
  "essential-addons-for-elementor-lite",
  "starter-templates",
  "astra-sites",
  "generatepress",
  "flavor",
  "mailchimp-for-wp",
  "mailpoet",
  "convertkit",
  "optinmonster",
  "sumo",
  "popup-maker",
  "popup-builder",
  "easy-digital-downloads",
  "loco-translate",
  "polylang",
  "translatepress-multilingual",
  "gtranslate",
  "members",
  "user-role-editor",
  "theme-my-login",
];

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchSafe(
  url: string,
  method: "HEAD" | "GET" = "GET",
  timeout = 5000
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(id);
    return res;
  } catch {
    return null;
  }
}

function extractStableTag(readmeText: string): string | null {
  const match = readmeText.match(/^Stable tag:\s*([\d.]+)/im);
  return match ? match[1] : null;
}

function extractSlugsFromHtml(html: string): Set<string> {
  const found = new Set<string>();
  const pattern = /\/wp-content\/plugins\/([a-z0-9_-]+)\//gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    found.add(match[1].toLowerCase());
  }
  return found;
}

async function probePlugin(
  domain: string,
  slug: string,
  preDetected: boolean
): Promise<WpPluginInfo | null> {
  const readmeUrl = `https://${domain}/wp-content/plugins/${slug}/readme.txt`;

  if (!preDetected) {
    const headRes = await fetchSafe(readmeUrl, "HEAD");
    if (!headRes || headRes.status !== 200) {
      return null;
    }
  }

  // Plugin detected — attempt to read version from readme.txt
  let version: string | null = null;
  const getRes = await fetchSafe(readmeUrl, "GET");
  if (getRes && getRes.status === 200) {
    try {
      const text = await getRes.text();
      version = extractStableTag(text);
    } catch {
      // ignore parse errors
    }
  }

  return {
    name: slugToName(slug),
    slug,
    version,
    detected: true,
  };
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<WpPluginInfo | null>
): Promise<WpPluginInfo[]> {
  const results: WpPluginInfo[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.all(batch.map(fn));
    for (const info of settled) {
      if (info !== null) {
        results.push(info);
      }
    }
  }
  return results;
}

export async function checkWpPlugins(
  domain: string,
  pageHtml: string
): Promise<WpPluginsResult> {
  const htmlSlugs = extractSlugsFromHtml(pageHtml);

  // Slugs visible in HTML are already confirmed — skip the HEAD probe for them.
  // Remaining slugs still need a HEAD probe.
  const slugsToProbe = PLUGIN_SLUGS.filter((s) => !htmlSlugs.has(s));
  const slugsFromHtml = PLUGIN_SLUGS.filter((s) => htmlSlugs.has(s));

  // Collect version info for HTML-detected plugins (GET only, no HEAD needed)
  const htmlDetected = await runInBatches(slugsFromHtml, 10, (slug) =>
    probePlugin(domain, slug, true)
  );

  // Probe remaining slugs with HEAD then GET
  const probed = await runInBatches(slugsToProbe, 10, (slug) =>
    probePlugin(domain, slug, false)
  );

  // Also surface any slugs found in HTML that aren't in our list
  const extraHtmlSlugs = Array.from(htmlSlugs).filter(
    (s) => !PLUGIN_SLUGS.includes(s)
  );
  const extraDetected: WpPluginInfo[] = extraHtmlSlugs.map((slug) => ({
    name: slugToName(slug),
    slug,
    version: null,
    detected: true,
  }));

  const detected = [...htmlDetected, ...probed, ...extraDetected];

  return {
    detected,
    totalChecked: PLUGIN_SLUGS.length,
  };
}
