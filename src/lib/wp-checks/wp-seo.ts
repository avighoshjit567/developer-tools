export interface WpSeoResult {
  hasRobotsTxt: boolean;
  robotsContent: string | null;
  robotsIndexable: boolean;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  hasMetaTitle: boolean;
  metaTitle: string | null;
  hasMetaDescription: boolean;
  metaDescription: string | null;
  hasFavicon: boolean;
  hasOpenGraph: boolean;
  ogTags: { property: string; content: string }[];
  hasTwitterCard: boolean;
  hasViewport: boolean;
  hasCanonical: boolean;
  canonicalUrl: string | null;
}

async function fetchSafe(
  url: string,
  timeout = 8000,
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

function parseRobotsIndexable(robotsContent: string): boolean {
  // Walk through the robots.txt line by line, tracking whether we are inside
  // a user-agent block that applies to "*". If we find "Disallow: /" inside
  // such a block, the site is not indexable.
  const lines = robotsContent.split(/\r?\n/);
  let inStarBlock = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const field = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (field === 'user-agent') {
      // A new user-agent directive starts a new block. Reset tracking unless
      // we are continuing to accumulate user-agents for the same block (which
      // is signalled by the previous non-blank line also being a user-agent
      // directive — but tracking that precisely is complex; the simple rule
      // below is correct for the vast majority of robots.txt files).
      inStarBlock = value === '*';
    } else if (field === 'disallow' && inStarBlock) {
      if (value === '/') {
        return false;
      }
    }
  }

  return true;
}

function parseSitemapFromRobots(robotsContent: string): string | null {
  const match = robotsContent.match(/^Sitemap:\s*(\S+)/im);
  return match ? match[1] : null;
}

function parseMetaTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, ' ').trim() || null;
}

function parseMetaTag(html: string, name: string): string | null {
  // Matches <meta name="..." content="..."> in either attribute order
  const pattern = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const altPattern = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`,
    'i'
  );
  const match = html.match(pattern) ?? html.match(altPattern);
  return match ? match[1].trim() : null;
}

function parseOgTags(html: string): { property: string; content: string }[] {
  const tags: { property: string; content: string }[] = [];
  // Match <meta property="og:..." content="..."> in either attribute order
  const pattern =
    /<meta[^>]+property=["'](og:[^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi;
  const altPattern =
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["'](og:[^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    tags.push({ property: match[1], content: match[2] });
  }

  // Also catch reverse-order tags not already found
  const foundProperties = new Set(tags.map((t) => t.property));
  while ((match = altPattern.exec(html)) !== null) {
    const property = match[2];
    if (!foundProperties.has(property)) {
      tags.push({ property, content: match[1] });
      foundProperties.add(property);
    }
  }

  return tags;
}

function parseFavicon(html: string): boolean {
  return /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*>/i.test(html) ||
    /<link[^>]+rel=["']icon["'][^>]*>/i.test(html);
}

function parseLinkCanonical(html: string): string | null {
  // Match <link rel="canonical" href="..."> in either attribute order
  const pattern =
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i;
  const altPattern =
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i;
  const match = html.match(pattern) ?? html.match(altPattern);
  return match ? match[1].trim() : null;
}

export async function checkWpSeo(
  domain: string,
  pageHtml: string
): Promise<WpSeoResult> {
  const result: WpSeoResult = {
    hasRobotsTxt: false,
    robotsContent: null,
    robotsIndexable: true,
    hasSitemap: false,
    sitemapUrl: null,
    hasMetaTitle: false,
    metaTitle: null,
    hasMetaDescription: false,
    metaDescription: null,
    hasFavicon: false,
    hasOpenGraph: false,
    ogTags: [],
    hasTwitterCard: false,
    hasViewport: false,
    hasCanonical: false,
    canonicalUrl: null,
  };

  // --- robots.txt ---
  const robotsRes = await fetchSafe(`https://${domain}/robots.txt`, 8000, {
    redirect: 'follow',
  });
  if (robotsRes && robotsRes.status === 200) {
    result.hasRobotsTxt = true;
    try {
      const text = await robotsRes.text();
      result.robotsContent = text;
      result.robotsIndexable = parseRobotsIndexable(text);

      // Sitemap directive in robots.txt
      const sitemapFromRobots = parseSitemapFromRobots(text);
      if (sitemapFromRobots) {
        result.hasSitemap = true;
        result.sitemapUrl = sitemapFromRobots;
      }
    } catch {
      // ignore parse errors
    }
  }

  // --- Sitemap (HEAD probe) ---
  if (!result.hasSitemap) {
    const sitemapUrls = [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/sitemap_index.xml`,
    ];

    for (const url of sitemapUrls) {
      const res = await fetchSafe(url, 8000, { method: 'HEAD', redirect: 'follow' });
      if (res && res.status === 200) {
        result.hasSitemap = true;
        result.sitemapUrl = url;
        break;
      }
    }
  }

  // --- HTML parsing ---
  const metaTitle = parseMetaTitle(pageHtml);
  result.metaTitle = metaTitle;
  result.hasMetaTitle = metaTitle !== null;

  const metaDescription = parseMetaTag(pageHtml, 'description');
  result.metaDescription = metaDescription;
  result.hasMetaDescription = metaDescription !== null;

  result.hasFavicon = parseFavicon(pageHtml);

  const ogTags = parseOgTags(pageHtml);
  result.ogTags = ogTags;
  result.hasOpenGraph = ogTags.length > 0;

  result.hasTwitterCard = parseMetaTag(pageHtml, 'twitter:card') !== null;

  result.hasViewport = parseMetaTag(pageHtml, 'viewport') !== null;

  const canonicalUrl = parseLinkCanonical(pageHtml);
  result.canonicalUrl = canonicalUrl;
  result.hasCanonical = canonicalUrl !== null;

  return result;
}
