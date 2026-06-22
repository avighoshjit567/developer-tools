import type { WpScoreBreakdown, WpScoreItem } from "@/types/wp-scan";

interface ScoringInput {
  wpDetect: {
    isWordPress: boolean;
    version: string | null;
    isLatest: boolean | null;
    versionExposed: boolean;
    readmeExposed: boolean;
    generatorTagExposed: boolean;
  };
  plugins: { count: number; detected: { version: string | null }[] };
  theme: { detected: boolean; name: string | null };
  loginSecurity: {
    loginPageAccessible: boolean;
    xmlrpcEnabled: boolean;
    restApiUsersExposed: boolean;
    authorEnumerationExposed: boolean;
    registrationOpen: boolean;
  };
  server: {
    ssl: { active: boolean; daysRemaining: number };
    securityHeadersCount: number;
    securityHeadersTotal: number;
    httpsRedirect: boolean;
    phpVersionExposed: boolean;
    serverVersionExposed: boolean;
  };
  performance: {
    gzip: boolean;
    cacheControl: boolean;
    cdnDetected: boolean;
    cachingPlugin: string | null;
    ttfb: number | null;
  };
  seo: {
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    hasMetaTitle: boolean;
    hasMetaDescription: boolean;
    hasFavicon: boolean;
    hasOpenGraph: boolean;
    hasViewport: boolean;
    hasCanonical: boolean;
  };
  files: {
    debugLogExposed: boolean;
    debugModeOn: boolean;
    directoryListingEnabled: boolean;
    files: { accessible: boolean; path: string }[];
  };
}

export function calculateWpScore(data: ScoringInput): {
  score: number;
  grade: string;
  breakdown: WpScoreBreakdown;
} {
  // WP Core: 15 points
  const wpCoreItems: WpScoreItem[] = [];
  const wpDetected = data.wpDetect.isWordPress ? 3 : 0;
  wpCoreItems.push({ name: "WordPress Detected", earned: wpDetected, max: 3 });

  const wpVersion =
    data.wpDetect.isLatest === true ? 5 : data.wpDetect.version ? 2 : 0;
  wpCoreItems.push({ name: "WP Version Up to Date", earned: wpVersion, max: 5 });

  const versionHidden = !data.wpDetect.versionExposed && !data.wpDetect.generatorTagExposed ? 4 : data.wpDetect.generatorTagExposed ? 0 : 2;
  wpCoreItems.push({ name: "Version Hidden", earned: versionHidden, max: 4 });

  const readmeHidden = !data.wpDetect.readmeExposed ? 3 : 0;
  wpCoreItems.push({ name: "Readme Hidden", earned: readmeHidden, max: 3 });

  const wpCoreEarned = wpCoreItems.reduce((s, i) => s + i.earned, 0);

  // Plugins & Themes: 20 points
  const pluginItems: WpScoreItem[] = [];
  const themeDetected = data.theme.detected ? 5 : 0;
  pluginItems.push({ name: "Theme Detected", earned: themeDetected, max: 5 });

  const pluginsOk = data.plugins.count > 0 ? 5 : 3;
  pluginItems.push({ name: "Plugins Discovered", earned: pluginsOk, max: 5 });

  // Check if plugins have versions (good sign of maintenance)
  const pluginsWithVersion = data.plugins.detected.filter((p) => p.version).length;
  const pluginVersionScore = data.plugins.count > 0
    ? Math.min(5, Math.round((pluginsWithVersion / Math.max(data.plugins.count, 1)) * 5))
    : 3;
  pluginItems.push({ name: "Plugin Versions Detectable", earned: pluginVersionScore, max: 5 });

  const noVulnerableFiles =
    !data.files.files.some((f) => f.path.includes("wp-config") && f.accessible) ? 5 : 0;
  pluginItems.push({ name: "Config Files Protected", earned: noVulnerableFiles, max: 5 });

  const pluginEarned = pluginItems.reduce((s, i) => s + i.earned, 0);

  // Login Security: 20 points
  const loginItems: WpScoreItem[] = [];
  const loginProtected = !data.loginSecurity.loginPageAccessible ? 5 : 0;
  loginItems.push({ name: "Login Page Protected", earned: loginProtected, max: 5 });

  const xmlrpcDisabled = !data.loginSecurity.xmlrpcEnabled ? 4 : 0;
  loginItems.push({ name: "XML-RPC Disabled", earned: xmlrpcDisabled, max: 4 });

  const usersHidden = !data.loginSecurity.restApiUsersExposed ? 4 : 0;
  loginItems.push({ name: "REST API Users Hidden", earned: usersHidden, max: 4 });

  const authorHidden = !data.loginSecurity.authorEnumerationExposed ? 4 : 0;
  loginItems.push({ name: "Author Enumeration Blocked", earned: authorHidden, max: 4 });

  const regClosed = !data.loginSecurity.registrationOpen ? 3 : 0;
  loginItems.push({ name: "Registration Closed", earned: regClosed, max: 3 });

  const loginEarned = loginItems.reduce((s, i) => s + i.earned, 0);

  // Server & SSL: 15 points
  const serverItems: WpScoreItem[] = [];
  const sslActive = data.server.ssl.active
    ? data.server.ssl.daysRemaining > 14
      ? 4
      : 2
    : 0;
  serverItems.push({ name: "SSL Certificate", earned: sslActive, max: 4 });

  const httpsRedirect = data.server.httpsRedirect ? 2 : 0;
  serverItems.push({ name: "HTTPS Redirect", earned: httpsRedirect, max: 2 });

  const headersPct = data.server.securityHeadersTotal > 0
    ? data.server.securityHeadersCount / data.server.securityHeadersTotal
    : 0;
  const headersScore = Math.round(headersPct * 5);
  serverItems.push({ name: "Security Headers", earned: headersScore, max: 5 });

  const phpHidden = !data.server.phpVersionExposed ? 2 : 0;
  serverItems.push({ name: "PHP Version Hidden", earned: phpHidden, max: 2 });

  const serverHidden = !data.server.serverVersionExposed ? 2 : 0;
  serverItems.push({ name: "Server Version Hidden", earned: serverHidden, max: 2 });

  const serverEarned = serverItems.reduce((s, i) => s + i.earned, 0);

  // Performance: 15 points
  const perfItems: WpScoreItem[] = [];
  const gzipScore = data.performance.gzip ? 4 : 0;
  perfItems.push({ name: "GZIP/Brotli Compression", earned: gzipScore, max: 4 });

  const cacheScore = data.performance.cacheControl ? 3 : 0;
  perfItems.push({ name: "Cache Headers", earned: cacheScore, max: 3 });

  const cdnScore = data.performance.cdnDetected ? 3 : 0;
  perfItems.push({ name: "CDN Detected", earned: cdnScore, max: 3 });

  const cachingPluginScore = data.performance.cachingPlugin ? 3 : 0;
  perfItems.push({ name: "Caching Plugin", earned: cachingPluginScore, max: 3 });

  const ttfbScore =
    data.performance.ttfb !== null
      ? data.performance.ttfb < 500
        ? 2
        : data.performance.ttfb < 1500
          ? 1
          : 0
      : 0;
  perfItems.push({ name: "TTFB < 500ms", earned: ttfbScore, max: 2 });

  const perfEarned = perfItems.reduce((s, i) => s + i.earned, 0);

  // SEO: 15 points
  const seoItems: WpScoreItem[] = [];
  seoItems.push({ name: "Robots.txt", earned: data.seo.hasRobotsTxt ? 2 : 0, max: 2 });
  seoItems.push({ name: "XML Sitemap", earned: data.seo.hasSitemap ? 3 : 0, max: 3 });
  seoItems.push({ name: "Meta Title", earned: data.seo.hasMetaTitle ? 2 : 0, max: 2 });
  seoItems.push({ name: "Meta Description", earned: data.seo.hasMetaDescription ? 2 : 0, max: 2 });
  seoItems.push({ name: "Favicon", earned: data.seo.hasFavicon ? 1 : 0, max: 1 });
  seoItems.push({ name: "Open Graph Tags", earned: data.seo.hasOpenGraph ? 2 : 0, max: 2 });
  seoItems.push({ name: "Viewport Meta", earned: data.seo.hasViewport ? 1 : 0, max: 1 });
  seoItems.push({ name: "Canonical URL", earned: data.seo.hasCanonical ? 2 : 0, max: 2 });

  const seoEarned = seoItems.reduce((s, i) => s + i.earned, 0);

  const totalScore = wpCoreEarned + pluginEarned + loginEarned + serverEarned + perfEarned + seoEarned;
  const grade = getGrade(totalScore);

  return {
    score: totalScore,
    grade,
    breakdown: {
      wpCore: { earned: wpCoreEarned, max: 15, items: wpCoreItems },
      plugins: { earned: pluginEarned, max: 20, items: pluginItems },
      loginSecurity: { earned: loginEarned, max: 20, items: loginItems },
      serverSsl: { earned: serverEarned, max: 15, items: serverItems },
      performance: { earned: perfEarned, max: 15, items: perfItems },
      seo: { earned: seoEarned, max: 15, items: seoItems },
    },
  };
}

function getGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D+";
  if (score >= 45) return "D";
  if (score >= 40) return "D-";
  return "F";
}
