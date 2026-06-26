# WP Health Checker — Architecture Document

## Overview

The WP Health Checker scans WordPress sites for security vulnerabilities, outdated software, exposed files, performance issues, and SEO configuration. It requires explicit authorization before scanning, supports force-fresh (cache-busting) scans, and maintains a recent domains history in localStorage.

---

## File Tree

```
src/
├── app/
│   ├── wp-health-checker/
│   │   └── page.tsx              # Main page with auth checkbox, scan options, results
│   └── api/
│       └── wp-scan/
│           └── route.ts          # POST SSE endpoint — orchestrates WP scanner
├── components/
│   └── wp-health/
│       ├── wp-scan-progress.tsx   # 8-step progress ring
│       ├── wp-score-circle.tsx    # Animated SVG score gauge
│       ├── wp-quick-facts.tsx     # WordPress-specific fact grid
│       ├── wp-score-breakdown.tsx # 6 category expandable bars
│       ├── wp-what-to-fix.tsx     # Priority fix list
│       ├── wp-plugins.tsx         # Detected plugins with vulnerability status
│       ├── wp-files.tsx           # Exposed files check results
│       └── wp-performance.tsx     # Performance metrics
├── hooks/
│   └── use-wp-scanner.ts         # React hook consuming SSE, accepts forceFresh
├── lib/
│   ├── wp-scanner.ts             # Orchestrator — runs all WP checks, streams events
│   ├── wp-scoring.ts             # 100-point WP scoring engine
│   └── wp-checks/
│       ├── wp-detect.ts          # WordPress detection + version (7 sources)
│       ├── wp-plugins.ts         # Plugin enumeration + vulnerability lookup
│       ├── wp-login.ts           # Login page security checks
│       ├── wp-files.ts           # Exposed file detection (.env, install.php, etc.)
│       ├── wp-headers.ts         # Security headers for WP context
│       ├── wp-ssl.ts             # SSL certificate checks
│       ├── wp-performance.ts     # Page load, TTFB, resource analysis
│       └── wp-seo.ts             # Meta tags, sitemap, robots.txt
└── types/
    └── wp-scan.ts                # All WP-specific TypeScript interfaces
```

---

## Data Flow

```
User enters domain + checks authorization box
      │
      ▼
page.tsx → useWpScanner hook (forceFresh flag)
      │
      ▼
POST /api/wp-scan  { domain, forceFresh }  (SSE stream opens)
      │
      ▼
route.ts → wpScanner.runScan(domain, { forceFresh })
      │
      ├──► wp-detect.ts     ──► Is it WordPress? + version detection
      │    (if not WP) ────────► SSE: { step: "complete", isWordPress: false }
      │                          └── UI shows "Not a WordPress Site" card
      │
      ├──► wp-plugins.ts    ──► SSE event: plugin data
      ├──► wp-login.ts      ──► SSE event: login security
      ├──► wp-files.ts      ──► SSE event: exposed files
      ├──► wp-headers.ts    ──► SSE event: security headers
      ├──► wp-ssl.ts        ──► SSE event: SSL status
      ├──► wp-performance.ts──► SSE event: performance metrics
      └──► wp-seo.ts        ──► SSE event: SEO analysis
      │
      ▼
wp-scoring.ts → calculates score + grade
      │
      ▼
SSE: { step: "complete", data: { score, grade, ... } }
```

---

## WordPress Detection (`wp-checks/wp-detect.ts`)

Detects WordPress and extracts version from 7 sources (in priority order):

| # | Source                     | Method                                              |
|---|----------------------------|------------------------------------------------------|
| 1 | Generator meta tag         | `<meta name="generator" content="WordPress X.X.X">` |
| 2 | Asset `?ver=` parameters   | Parse `wp-includes/` and `wp-content/` URLs          |
| 3 | readme.html                | Fetch `/readme.html`, parse "Version X.X.X"          |
| 4 | RSS feed                   | `<generator>` tag in `/feed/`                        |
| 5 | wp-links-opml.php          | Generator attribute in OPML output                   |
| 6 | wp-login.php assets        | Version from login page CSS/JS URLs                  |
| 7 | REST API (`/wp-json/`)     | Confirms WordPress but no version                    |

**Version normalization**: `normalizeVersion()` pads to 3 segments (e.g., "6.7" → "6.7.0") to prevent false outdated warnings.

---

## Scan Features

### Authorization Checkbox
- Custom `ScanOption` component with styled checkbox
- Scan button disabled until authorization is checked
- Text: "I confirm I have authorization to scan this domain"

### Force Fresh Scan
- Optional checkbox to bypass caches
- Sends `forceFresh: true` to API
- Scanner adds `Cache-Control: no-cache` headers and `?nocache={timestamp}` to requests

### Recent Domains
- Stored in `localStorage` key `wp-recent-domains`
- Max 5 entries, most recent first
- Clickable to re-scan
- Persists across sessions

### Non-WordPress Detection
- When `isWordPress: false`, shows a dedicated "Not a WordPress Site" card
- All result sections are hidden (not just showing a warning message)

---

## Check Modules

### 1. WP Detect (`wp-checks/wp-detect.ts`)
- 7-source version detection (see table above)
- Compares against latest WP version for outdated check
- Returns `isWordPress`, `version`, `isOutdated`

### 2. Plugins (`wp-checks/wp-plugins.ts`)
- Enumerates common plugin paths via HEAD requests
- Checks detected plugins against known vulnerability databases
- Reports: plugin name, version (if detectable), vulnerability status

### 3. Login Security (`wp-checks/wp-login.ts`)
- Checks `/wp-login.php` accessibility
- Detects XML-RPC enabled (`/xmlrpc.php`)
- Checks for user enumeration via `/?author=1`

### 4. Exposed Files (`wp-checks/wp-files.ts`)
- Checks: `.env`, `install.php`, `wp-content/` directory listing
- **Not checked**: `wp-config.php` (removed — PHP execution returns 200 causing false positives)

### 5. Security Headers (`wp-checks/wp-headers.ts`)
- Same headers as Domain Inspector but in WP context
- Additional WP-specific checks (e.g., `X-Powered-By: PHP` disclosure)

### 6. SSL (`wp-checks/wp-ssl.ts`)
- Certificate validity and expiration
- HTTPS redirect check

### 7. Performance (`wp-checks/wp-performance.ts`)
- Page load time, TTFB
- Resource count and size analysis

### 8. SEO (`wp-checks/wp-seo.ts`)
- Meta title/description presence
- Sitemap.xml accessibility
- Robots.txt configuration

---

## Scoring System (100 Points)

| Category        | Weight | What's Scored                                        |
|-----------------|--------|------------------------------------------------------|
| WP Core         | 15     | Version up-to-date, not exposed                      |
| Plugins         | 20     | No known vulnerabilities, up-to-date                 |
| Login Security  | 20     | Login hardened, XML-RPC disabled, no user enum        |
| Server / SSL    | 15     | Valid SSL, security headers, no info disclosure       |
| Performance     | 15     | Fast TTFB, reasonable page load                      |
| SEO             | 15     | Meta tags present, sitemap accessible, robots OK      |

### Grade Calculation

Same A+ through F scale as Domain Inspector. Critical issues (e.g., known exploited vulnerability, exposed .env file) gate all A-tier grades.

---

## Key Types (`types/wp-scan.ts`)

```typescript
interface WpScanResult {
  domain: string;
  isWordPress: boolean;
  score: number;
  grade: string;
  quickFacts: WpQuickFacts;
  checks: WpScanCheck[];
  scoreBreakdown: WpScoreBreakdown;
  findings: WpFinding[];
}

interface WpQuickFacts {
  wpVersion: string;
  isOutdated: boolean;
  phpVersion: string;
  serverType: string;
  sslStatus: string;
  pluginCount: number;
  loginExposed: boolean;
  xmlrpcEnabled: boolean;
}

interface WpFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
}
```

---

## Cache-Busting (Force Fresh)

When `forceFresh` is enabled:

```typescript
const headers = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
};

const url = `${targetUrl}?nocache=${Date.now()}`;
```

This bypasses CDN caches (Cloudflare, Varnish, etc.) to get fresh responses.
