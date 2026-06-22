export interface WpScanResult {
  uuid: string;
  domain: string;
  isWordPress: boolean;
  score: number;
  grade: string;
  scanDate: string;
  duration: number;
  quickFacts: WpQuickFacts;
  issues: WpIssue[];
  whatToFix: WpFixItem[];
  techStack: WpTechStack;
  securityHeaders: WpSecurityHeaderResult[];
  exposedFiles: WpExposedFile[];
  findings: WpFinding[];
  detectedPlugins: WpPlugin[];
  accessChecks: WpAccessCheck[];
  versionExposure: WpVersionExposure[];
  performance: WpPerformanceInfo;
  seo: WpSeoInfo;
  breakdown: WpScoreBreakdown;
  rawHeaders?: { request: string; response: string };
}

export interface WpQuickFacts {
  wpVersion: string;
  theme: string;
  phpVersion: string;
  server: string;
  ssl: string;
  cdn: string;
  cachingPlugin: string;
  pluginCount: number;
}

export interface WpIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category: string;
}

export interface WpFixItem {
  priority: number;
  title: string;
  description: string;
  category: string;
}

export interface WpTechStack {
  wpVersion: { value: string; status: "ok" | "outdated" | "unknown" };
  phpVersion: { value: string; status: "ok" | "outdated" | "hidden" };
  plugins: { count: number; status: "ok" | "warning" | "unknown" };
  themes: { active: string; status: "ok" | "unknown" };
  loginPage: { value: string; status: "ok" | "exposed" | "protected" };
  caching: { value: string; status: "ok" | "none" };
  analytics: { value: string; status: "ok" | "none" };
  frontendLibs: { value: string; status: "ok" | "none" };
  waf: { value: string; status: "ok" | "none" };
  cdn: { value: string; status: "ok" | "none" };
}

export interface WpSecurityHeaderResult {
  name: string;
  present: boolean;
  value: string | null;
  description: string;
}

export interface WpExposedFile {
  name: string;
  path: string;
  status: "hidden" | "exposed" | "accessible" | "not-found";
}

export interface WpFinding {
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "info";
  status: "verified" | "attention" | "issue" | "info";
}

export interface WpPlugin {
  name: string;
  slug: string;
  version: string | null;
  status: "ok" | "outdated" | "vulnerable" | "unknown";
}

export interface WpAccessCheck {
  title: string;
  detail: string;
  category: "access" | "background";
  status: "verified" | "attention" | "issue" | "info";
}

export interface WpVersionExposure {
  title: string;
  detail: string;
  status: "hidden" | "exposed";
}

export interface WpPerformanceInfo {
  ttfb: number | null;
  pageSize: number | null;
  gzip: boolean;
  cacheHeaders: boolean;
  cdnDetected: boolean;
  cachingPlugin: string | null;
}

export interface WpSeoInfo {
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasFavicon: boolean;
  hasOpenGraph: boolean;
  hasViewport: boolean;
  hasCanonical: boolean;
  robotsIndexable: boolean;
}

export interface WpScoreBreakdown {
  wpCore: { earned: number; max: number; items: WpScoreItem[] };
  plugins: { earned: number; max: number; items: WpScoreItem[] };
  loginSecurity: { earned: number; max: number; items: WpScoreItem[] };
  serverSsl: { earned: number; max: number; items: WpScoreItem[] };
  performance: { earned: number; max: number; items: WpScoreItem[] };
  seo: { earned: number; max: number; items: WpScoreItem[] };
}

export interface WpScoreItem {
  name: string;
  earned: number;
  max: number;
}

export interface WpScanProgress {
  check: string;
  label: string;
  progress: number;
  total: number;
}
