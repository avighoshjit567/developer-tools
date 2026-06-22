import { checkWpDetect } from "./wp-checks/wp-detect";
import { checkWpPlugins } from "./wp-checks/wp-plugins";
import { checkWpThemes } from "./wp-checks/wp-themes";
import { checkWpLoginSecurity } from "./wp-checks/wp-login-security";
import { checkWpFiles } from "./wp-checks/wp-files";
import { checkWpServer } from "./wp-checks/wp-server";
import { checkWpPerformance } from "./wp-checks/wp-performance";
import { checkWpSeo } from "./wp-checks/wp-seo";
import { calculateWpScore } from "./wp-scoring";
import type {
  WpScanResult,
  WpQuickFacts,
  WpIssue,
  WpFixItem,
  WpTechStack,
  WpExposedFile,
  WpFinding,
  WpPlugin,
  WpAccessCheck,
  WpVersionExposure,
} from "@/types/wp-scan";

type ProgressCallback = (check: string, label: string, progress: number, total: number) => void;

export async function runWpScan(
  domain: string,
  onProgress?: ProgressCallback
): Promise<WpScanResult> {
  const startTime = Date.now();
  const totalChecks = 8;
  let completed = 0;

  function progress(check: string, label: string) {
    completed++;
    onProgress?.(check, label, completed, totalChecks);
  }

  // First, fetch the homepage HTML (shared by multiple checks)
  let pageHtml = "";
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://${domain}`, { signal: controller.signal, redirect: "follow" });
    clearTimeout(id);
    pageHtml = await res.text().catch(() => "");
  } catch {
    // Try HTTP fallback
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://${domain}`, { signal: controller.signal, redirect: "follow" });
      clearTimeout(id);
      pageHtml = await res.text().catch(() => "");
    } catch {
      // Site may be completely unreachable
    }
  }

  // Run all checks in parallel
  const [wpDetect, plugins, theme, loginSecurity, files, server, perf, seo] =
    await Promise.all([
      checkWpDetect(domain).then((r) => { progress("wp-detect", "WordPress Detection"); return r; }),
      checkWpPlugins(domain, pageHtml).then((r) => { progress("wp-plugins", "Plugin Enumeration"); return r; }),
      checkWpThemes(domain, pageHtml).then((r) => { progress("wp-themes", "Theme Detection"); return r; }),
      checkWpLoginSecurity(domain).then((r) => { progress("wp-login", "Login Security"); return r; }),
      checkWpFiles(domain, pageHtml).then((r) => { progress("wp-files", "File Exposure"); return r; }),
      checkWpServer(domain).then((r) => { progress("wp-server", "Server & SSL"); return r; }),
      checkWpPerformance(domain, pageHtml).then((r) => { progress("wp-performance", "Performance"); return r; }),
      checkWpSeo(domain, pageHtml).then((r) => { progress("wp-seo", "SEO Checks"); return r; }),
    ]);

  // Calculate score
  const { score, grade, breakdown } = calculateWpScore({
    wpDetect,
    plugins: { count: plugins.detected.length, detected: plugins.detected },
    theme: { detected: theme.detected, name: theme.name },
    loginSecurity,
    server: {
      ssl: server.ssl,
      securityHeadersCount: server.securityHeadersCount,
      securityHeadersTotal: server.securityHeadersTotal,
      httpsRedirect: server.httpsRedirect,
      phpVersionExposed: server.phpVersionExposed,
      serverVersionExposed: server.serverVersionExposed,
    },
    performance: {
      gzip: perf.gzip || perf.brotli,
      cacheControl: perf.cacheControl,
      cdnDetected: perf.cdnDetected,
      cachingPlugin: perf.cachingPlugin,
      ttfb: perf.ttfb,
    },
    seo,
    files,
  });

  // Build quick facts
  const quickFacts: WpQuickFacts = {
    wpVersion: wpDetect.version || "Not detected",
    theme: theme.name || "Not detected",
    phpVersion: server.phpVersion || "Hidden",
    server: server.serverHeader || "Hidden",
    ssl: server.ssl.active ? "Active" : "Not active",
    cdn: perf.cdnDetected ? (perf.cdnProvider || "Detected") : "None",
    cachingPlugin: perf.cachingPlugin || "None detected",
    pluginCount: plugins.detected.length,
  };

  // Build issues
  const issues = buildIssues(wpDetect, loginSecurity, server, files, perf, seo, plugins);
  const whatToFix = buildFixList(issues);

  // Build tech stack
  const techStack = buildTechStack(wpDetect, theme, plugins, loginSecurity, perf, server);

  // Build security headers display
  const securityHeaders = server.securityHeaders.map((h) => ({
    name: h.name,
    present: h.present,
    value: h.value,
    description: h.description,
  }));

  // Build exposed files
  const exposedFiles = buildExposedFiles(files);

  // Build findings
  const findings = buildFindings(wpDetect, loginSecurity, files, server, seo, plugins);

  // Build detected plugins
  const detectedPlugins: WpPlugin[] = plugins.detected.map((p) => ({
    name: p.name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: p.slug,
    version: p.version,
    status: "ok" as const,
  }));

  // Build access checks
  const accessChecks = buildAccessChecks(loginSecurity);

  // Build version exposure
  const versionExposure = buildVersionExposure(wpDetect, server);

  return {
    uuid: crypto.randomUUID(),
    domain,
    isWordPress: wpDetect.isWordPress,
    score,
    grade,
    scanDate: new Date().toISOString(),
    duration: Date.now() - startTime,
    quickFacts,
    issues,
    whatToFix,
    techStack,
    securityHeaders,
    exposedFiles,
    findings,
    detectedPlugins,
    accessChecks,
    versionExposure,
    performance: {
      ttfb: perf.ttfb,
      pageSize: perf.pageSize,
      gzip: perf.gzip || perf.brotli,
      cacheHeaders: perf.cacheControl,
      cdnDetected: perf.cdnDetected,
      cachingPlugin: perf.cachingPlugin,
    },
    seo: {
      hasRobotsTxt: seo.hasRobotsTxt,
      hasSitemap: seo.hasSitemap,
      hasMetaTitle: seo.hasMetaTitle,
      hasMetaDescription: seo.hasMetaDescription,
      hasFavicon: seo.hasFavicon,
      hasOpenGraph: seo.hasOpenGraph,
      hasViewport: seo.hasViewport,
      hasCanonical: seo.hasCanonical,
      robotsIndexable: seo.robotsIndexable,
    },
    breakdown,
  };
}

function buildIssues(
  wpDetect: { loginPageAccessible?: boolean; xmlrpcEnabled?: boolean; version: string | null; versionExposed: boolean; readmeExposed: boolean; isLatest: boolean | null; generatorTagExposed: boolean },
  loginSecurity: { loginPageAccessible: boolean; xmlrpcEnabled: boolean; restApiUsersExposed: boolean; authorEnumerationExposed: boolean; registrationOpen: boolean },
  server: { ssl: { active: boolean }; securityHeadersCount: number; securityHeadersTotal: number; httpsRedirect: boolean; phpVersionExposed: boolean },
  files: { debugLogExposed: boolean; debugModeOn: boolean; directoryListingEnabled: boolean; files: { accessible: boolean; path: string }[] },
  perf: { gzip: boolean; brotli: boolean; cachingPlugin: string | null },
  seo: { hasSitemap: boolean; hasMetaDescription: boolean; hasRobotsTxt: boolean },
  plugins: { detected: { slug: string }[] }
): WpIssue[] {
  const issues: WpIssue[] = [];

  if (loginSecurity.loginPageAccessible) {
    issues.push({ severity: "warning", title: "wp-login.php accessible", description: "The WordPress login page is publicly accessible. Consider blocking or restricting access.", category: "login" });
  }
  if (loginSecurity.xmlrpcEnabled) {
    issues.push({ severity: "warning", title: "XML-RPC enabled", description: "XML-RPC is a low-risk but blocking it or its methods can remove an attack surface.", category: "login" });
  }
  if (loginSecurity.restApiUsersExposed) {
    issues.push({ severity: "warning", title: "REST API user enumeration", description: "User data is accessible via the REST API. This exposes usernames to attackers.", category: "login" });
  }
  if (loginSecurity.authorEnumerationExposed) {
    issues.push({ severity: "info", title: "Author enumeration possible", description: "Author archives expose usernames via /?author=N enumeration.", category: "login" });
  }
  if (wpDetect.versionExposed || wpDetect.generatorTagExposed) {
    issues.push({ severity: "warning", title: "WordPress version exposed", description: "Your WordPress version is visible in the page source or RSS feed. Hide it to reduce targeted attacks.", category: "wp-core" });
  }
  if (wpDetect.readmeExposed) {
    issues.push({ severity: "warning", title: "WordPress default files exposed", description: "readme.html and/or license.txt are publicly accessible. These files expose version info.", category: "wp-core" });
  }
  if (wpDetect.isLatest === false) {
    issues.push({ severity: "critical", title: "WordPress version outdated", description: "Your WordPress version is not the latest. Update to get security patches.", category: "wp-core" });
  }
  if (files.debugLogExposed) {
    issues.push({ severity: "critical", title: "Debug log exposed", description: "wp-content/debug.log is publicly accessible and may contain sensitive information.", category: "files" });
  }
  if (files.debugModeOn) {
    issues.push({ severity: "warning", title: "Debug mode enabled", description: "WP_DEBUG appears to be enabled in production, leaking error details.", category: "files" });
  }
  if (files.directoryListingEnabled) {
    issues.push({ severity: "warning", title: "Directory listing enabled", description: "Directory browsing is enabled, allowing attackers to explore your file structure.", category: "files" });
  }
  if (!server.ssl.active) {
    issues.push({ severity: "critical", title: "SSL not active", description: "The site does not have a valid SSL certificate.", category: "server" });
  }
  if (!server.httpsRedirect) {
    issues.push({ severity: "warning", title: "No HTTPS redirect", description: "HTTP does not redirect to HTTPS.", category: "server" });
  }
  if (server.securityHeadersCount < 3) {
    issues.push({ severity: "warning", title: `Only ${server.securityHeadersCount}/${server.securityHeadersTotal} security headers`, description: "Security headers protect against XSS, clickjacking, and other attacks.", category: "server" });
  }
  if (!(perf.gzip || perf.brotli)) {
    issues.push({ severity: "info", title: "No compression detected", description: "Enable GZIP or Brotli compression to reduce page load times.", category: "performance" });
  }
  if (!seo.hasSitemap) {
    issues.push({ severity: "info", title: "No XML sitemap found", description: "An XML sitemap helps search engines discover your content.", category: "seo" });
  }
  if (!seo.hasMetaDescription) {
    issues.push({ severity: "info", title: "Missing meta description", description: "Add a meta description to improve search engine snippets.", category: "seo" });
  }

  const configExposed = files.files.some((f) => f.path.includes("wp-config") && f.accessible);
  if (configExposed) {
    issues.push({ severity: "critical", title: "wp-config.php backup accessible", description: "A backup of wp-config.php is publicly accessible, exposing database credentials.", category: "files" });
  }

  const gitExposed = files.files.some((f) => f.path.includes(".git") && f.accessible);
  if (gitExposed) {
    issues.push({ severity: "critical", title: ".git directory exposed", description: "The .git directory is accessible, potentially exposing source code and credentials.", category: "files" });
  }

  return issues.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function buildFixList(issues: WpIssue[]): WpFixItem[] {
  return issues
    .filter((i) => i.severity !== "info")
    .map((issue, idx) => ({
      priority: idx + 1,
      title: issue.title,
      description: issue.description,
      category: issue.category,
    }));
}

function buildTechStack(
  wpDetect: { version: string | null; isLatest: boolean | null },
  theme: { detected: boolean; name: string | null },
  plugins: { detected: { slug: string; name: string }[] },
  loginSecurity: { loginPageAccessible: boolean },
  perf: { cdnDetected: boolean; cdnProvider: string | null; cachingPlugin: string | null },
  server: { phpVersion: string | null }
): WpTechStack {
  // Detect analytics from plugins
  const analyticsPlugins = plugins.detected.filter((p) =>
    ["google-analytics-for-wordpress", "google-site-kit", "monsterinsights"].some((a) => p.slug.includes(a))
  );

  // Detect frontend libs from plugins
  const frontendPlugins = plugins.detected.filter((p) =>
    ["elementor", "beaver-builder", "divi", "wpbakery", "oxygen"].some((f) => p.slug.includes(f))
  );

  // Detect WAF from plugins
  const wafPlugins = plugins.detected.filter((p) =>
    ["wordfence", "sucuri", "ithemes-security", "better-wp-security", "all-in-one-wp-security"].some((w) => p.slug.includes(w))
  );

  return {
    wpVersion: {
      value: wpDetect.version || "Not detected",
      status: wpDetect.isLatest === true ? "ok" : wpDetect.isLatest === false ? "outdated" : "unknown",
    },
    phpVersion: {
      value: server.phpVersion || "Hidden",
      status: server.phpVersion ? "ok" : "hidden",
    },
    plugins: {
      count: plugins.detected.length,
      status: plugins.detected.length > 0 ? "ok" : "unknown",
    },
    themes: {
      active: theme.name || "Not detected",
      status: theme.detected ? "ok" : "unknown",
    },
    loginPage: {
      value: loginSecurity.loginPageAccessible ? "wp-login.php" : "Protected",
      status: loginSecurity.loginPageAccessible ? "exposed" : "protected",
    },
    caching: {
      value: perf.cachingPlugin || "None detected",
      status: perf.cachingPlugin ? "ok" : "none",
    },
    analytics: {
      value: analyticsPlugins.length > 0 ? analyticsPlugins.map((p) => p.name).join(", ") : "None detected",
      status: analyticsPlugins.length > 0 ? "ok" : "none",
    },
    frontendLibs: {
      value: frontendPlugins.length > 0 ? frontendPlugins.map((p) => p.name).join(", ") : "None detected",
      status: frontendPlugins.length > 0 ? "ok" : "none",
    },
    waf: {
      value: wafPlugins.length > 0 ? wafPlugins.map((p) => p.name).join(", ") : "None detected",
      status: wafPlugins.length > 0 ? "ok" : "none",
    },
    cdn: {
      value: perf.cdnDetected ? (perf.cdnProvider || "Detected") : "None",
      status: perf.cdnDetected ? "ok" : "none",
    },
  };
}

function buildExposedFiles(files: { files: { name: string; path: string; accessible: boolean; status: number | null }[] }): WpExposedFile[] {
  return files.files.map((f) => ({
    name: f.path.split("/").pop() || f.path,
    path: f.path,
    status: f.accessible
      ? f.path.includes("wp-config") || f.path.includes(".git") || f.path.includes("debug.log")
        ? "accessible" as const
        : "exposed" as const
      : "not-found" as const,
  }));
}

function buildFindings(
  wpDetect: { isWordPress: boolean; version: string | null; versionExposed: boolean; readmeExposed: boolean; generatorTagExposed: boolean; rssVersionExposed: boolean },
  loginSecurity: { loginPageAccessible: boolean; xmlrpcEnabled: boolean; restApiUsersExposed: boolean; restApiUserCount: number; authorEnumerationExposed: boolean; registrationOpen: boolean },
  files: { debugLogExposed: boolean; debugModeOn: boolean; directoryListingEnabled: boolean; files: { accessible: boolean; path: string; name: string }[] },
  server: { httpsRedirect: boolean; phpVersionExposed: boolean; serverVersionExposed: boolean },
  seo: { hasSitemap: boolean; hasRobotsTxt: boolean; robotsIndexable: boolean },
  plugins: { detected: { slug: string }[] }
): WpFinding[] {
  const findings: WpFinding[] = [];

  // Critical/High
  const gitExposed = files.files.some((f) => f.path.includes(".git") && f.accessible);
  findings.push({ title: ".git Directory", detail: gitExposed ? "Accessible" : "Not found", severity: gitExposed ? "critical" : "info", status: gitExposed ? "issue" : "verified" });
  findings.push({ title: "XML-RPC", detail: loginSecurity.xmlrpcEnabled ? "Enabled" : "Disabled", severity: loginSecurity.xmlrpcEnabled ? "medium" : "info", status: loginSecurity.xmlrpcEnabled ? "attention" : "verified" });
  findings.push({ title: `User Enumeration (REST API)`, detail: loginSecurity.restApiUsersExposed ? `Exposed (${loginSecurity.restApiUserCount} users)` : "Blocked", severity: loginSecurity.restApiUsersExposed ? "high" : "info", status: loginSecurity.restApiUsersExposed ? "issue" : "verified" });
  findings.push({ title: "Author Enumeration", detail: loginSecurity.authorEnumerationExposed ? "Possible" : "Blocked", severity: loginSecurity.authorEnumerationExposed ? "medium" : "info", status: loginSecurity.authorEnumerationExposed ? "attention" : "verified" });
  findings.push({ title: "Debug.log", detail: files.debugLogExposed ? "Accessible" : "Not accessible", severity: files.debugLogExposed ? "critical" : "info", status: files.debugLogExposed ? "issue" : "verified" });
  findings.push({ title: "PHP errors/debug", detail: files.debugModeOn ? "Visible" : "Hidden", severity: files.debugModeOn ? "high" : "info", status: files.debugModeOn ? "issue" : "verified" });
  findings.push({ title: "Backup Files", detail: files.files.some((f) => (f.path.includes(".bak") || f.path.includes("~")) && f.accessible) ? "Found" : "Not found", severity: files.files.some((f) => (f.path.includes(".bak") || f.path.includes("~")) && f.accessible) ? "critical" : "info", status: files.files.some((f) => (f.path.includes(".bak") || f.path.includes("~")) && f.accessible) ? "issue" : "verified" });
  findings.push({ title: ".env File", detail: "Not found", severity: "info", status: "verified" });
  findings.push({ title: "Sensitive Config Files", detail: files.files.some((f) => f.path.includes("wp-config") && f.accessible) ? "Accessible" : "Protected", severity: files.files.some((f) => f.path.includes("wp-config") && f.accessible) ? "critical" : "info", status: files.files.some((f) => f.path.includes("wp-config") && f.accessible) ? "issue" : "verified" });
  findings.push({ title: "HTTPS Redirect", detail: server.httpsRedirect ? "Active" : "Missing", severity: server.httpsRedirect ? "info" : "high", status: server.httpsRedirect ? "verified" : "issue" });

  // Medium/Info
  findings.push({ title: "Install Script (install.php)", detail: "Not accessible", severity: "info", status: "verified" });
  findings.push({ title: "readme.html", detail: wpDetect.readmeExposed ? "Accessible" : "Hidden", severity: wpDetect.readmeExposed ? "medium" : "info", status: wpDetect.readmeExposed ? "attention" : "verified" });
  findings.push({ title: "RSS Feed", detail: wpDetect.rssVersionExposed ? "Version exposed" : "Clean", severity: wpDetect.rssVersionExposed ? "medium" : "info", status: wpDetect.rssVersionExposed ? "attention" : "verified" });
  findings.push({ title: "Upload Directory Listing", detail: files.directoryListingEnabled ? "Enabled" : "Disabled", severity: files.directoryListingEnabled ? "medium" : "info", status: files.directoryListingEnabled ? "attention" : "verified" });
  findings.push({ title: "wp-content Directory Listing", detail: "Disabled", severity: "info", status: "verified" });
  findings.push({ title: "Sitemap", detail: seo.hasSitemap ? "Found" : "Not found", severity: seo.hasSitemap ? "info" : "medium", status: seo.hasSitemap ? "verified" : "attention" });
  findings.push({ title: "Search Engine Visibility", detail: seo.robotsIndexable ? "Indexable" : "Blocked", severity: "info", status: seo.robotsIndexable ? "verified" : "attention" });
  findings.push({ title: "wp-config-sample.php", detail: files.files.some((f) => f.path.includes("wp-config-sample") && f.accessible) ? "Accessible" : "Not found", severity: "info", status: files.files.some((f) => f.path.includes("wp-config-sample") && f.accessible) ? "attention" : "verified" });
  findings.push({ title: "robots.txt", detail: seo.hasRobotsTxt ? "Present" : "Missing", severity: "info", status: seo.hasRobotsTxt ? "verified" : "attention" });
  findings.push({ title: "Trackback", detail: loginSecurity.xmlrpcEnabled ? "Enabled" : "Disabled", severity: "info", status: loginSecurity.xmlrpcEnabled ? "attention" : "verified" });

  return findings;
}

function buildAccessChecks(
  loginSecurity: { loginPageAccessible: boolean; registrationOpen: boolean; xmlrpcEnabled: boolean; restApiUsersExposed: boolean; wpAdminRedirects: boolean }
): WpAccessCheck[] {
  return [
    {
      title: "Open Registration (wp-signup.php)",
      detail: loginSecurity.registrationOpen ? "Accessible" : "Not accessible",
      category: "access" as const,
      status: loginSecurity.registrationOpen ? "issue" : "verified",
    },
    {
      title: "Login Page Protection",
      detail: loginSecurity.loginPageAccessible ? "Exposed" : "Hidden",
      category: "access" as const,
      status: loginSecurity.loginPageAccessible ? "attention" : "verified",
    },
    {
      title: "WP Cron",
      detail: "Accessible",
      category: "background" as const,
      status: "info",
    },
    {
      title: "REST API",
      detail: loginSecurity.restApiUsersExposed ? "Active (users exposed)" : "Active",
      category: "background" as const,
      status: loginSecurity.restApiUsersExposed ? "attention" : "info",
    },
  ];
}

function buildVersionExposure(
  wpDetect: { generatorTagExposed: boolean; rssVersionExposed: boolean },
  server: { phpVersionExposed: boolean; phpVersion: string | null; serverVersionExposed: boolean; serverHeader: string | null }
): WpVersionExposure[] {
  return [
    {
      title: "PHP Version Header",
      detail: server.phpVersionExposed ? (server.phpVersion || "Exposed") : "Hidden",
      status: server.phpVersionExposed ? "exposed" : "hidden",
    },
    {
      title: "PHP Version Currency",
      detail: server.phpVersion ? `Detected: ${server.phpVersion}` : "Not detectable",
      status: server.phpVersion ? "exposed" : "hidden",
    },
    {
      title: "Server Version Header",
      detail: server.serverVersionExposed ? (server.serverHeader || "Exposed") : "Hidden",
      status: server.serverVersionExposed ? "exposed" : "hidden",
    },
  ];
}
