# Domain Inspector — Architecture Document

## Overview

The Domain Inspector is a comprehensive domain diagnostic tool that performs 8 parallel checks across DNS, SSL, hosting, security headers, WHOIS, and blacklists. It streams results in real-time via Server-Sent Events (SSE) and produces a 100-point health score with letter grades.

---

## File Tree

```
src/
├── app/
│   ├── domain-inspector/
│   │   └── page.tsx              # Main page with hero, scan input, progress, results
│   └── api/
│       └── scan/
│           └── route.ts          # POST SSE endpoint — orchestrates scanner
├── components/
│   └── domain-inspector/
│       ├── scan-input.tsx        # Domain input with validation & submit
│       ├── scan-progress.tsx     # 8-step progress ring animation
│       ├── score-circle.tsx      # Animated SVG score gauge (0-100)
│       ├── quick-facts.tsx       # 2-column fact grid + Cloudflare banner
│       ├── score-breakdown.tsx   # 4 category expandable score bars
│       ├── what-to-fix.tsx       # Priority fix list with severity badges
│       ├── dns-records.tsx       # A, AAAA, MX, NS, TXT records table
│       ├── ssl-info.tsx          # Certificate details card
│       ├── security-headers.tsx  # Header presence/absence table
│       └── blacklist-status.tsx  # Clean/listed status per DNSBL
├── hooks/
│   └── use-scanner.ts            # React hook consuming SSE stream
├── lib/
│   ├── scanner.ts                # Orchestrator — runs 8 checks, streams events
│   ├── scoring.ts                # 100-point scoring engine + grade calc
│   ├── domain-utils.ts           # sanitizeDomain(), isValidHostname()
│   └── checks/
│       ├── whois.ts              # WHOIS + RDAP fallback, registrar referral
│       ├── dns.ts                # dig-based DNS + DNSSEC (DS + DNSKEY)
│       ├── ssl.ts                # OpenSSL s_client certificate parsing
│       ├── http-probe.ts         # HTTP status, redirects, robots.txt
│       ├── headers.ts            # Security headers analysis
│       ├── blacklist.ts          # 20 DNSBL servers via DNS lookup
│       ├── hosting.ts            # IP geolocation + provider detection
│       └── cloudflare.ts         # Cloudflare proxy detection (cf-ray header)
└── types/
    └── scan.ts                   # All TypeScript interfaces
```

---

## Data Flow

```
User enters domain
      │
      ▼
page.tsx → useScanner hook
      │
      ▼
POST /api/scan  (SSE stream opens)
      │
      ▼
route.ts → scanner.runScan(domain)
      │
      ├──► whois.ts      ──► SSE event: { step: "whois", data: {...} }
      ├──► dns.ts         ──► SSE event: { step: "dns", data: {...} }
      ├──► ssl.ts         ──► SSE event: { step: "ssl", data: {...} }
      ├──► http-probe.ts  ──► SSE event: { step: "http", data: {...} }
      ├──► headers.ts     ──► SSE event: { step: "headers", data: {...} }
      ├──► blacklist.ts   ──► SSE event: { step: "blacklist", data: {...} }
      ├──► hosting.ts     ──► SSE event: { step: "hosting", data: {...} }
      └──► cloudflare.ts  ──► SSE event: { step: "cloudflare", data: {...} }
      │
      ▼
scoring.ts → calculates score + grade
      │
      ▼
SSE event: { step: "complete", data: { score, grade, quickFacts, ... } }
      │
      ▼
useScanner updates React state → UI renders results
```

---

## Check Modules

### 1. WHOIS (`checks/whois.ts`)
- **Method**: `execFile("whois", [domain])` with registrar referral for .com/.net
- **Fallback**: RDAP via `fetch("https://rdap.org/domain/{domain}")`
- **Detects**: TLD-level IANA responses via `isTldLevelResponse()`
- **Outputs**: registrar, creation/expiry dates, domain age (day-based calculation)
- **Security**: `sanitizeDomain()` + `isValidHostname()` validation, `execFile()` (no shell)

### 2. DNS (`checks/dns.ts`)
- **Method**: `execFile("dig", ["+short", domain, type])` for A, AAAA, MX, NS, TXT
- **DNSSEC**: Requires both DS AND DNSKEY records to report "enabled"
- **Security**: `execFile()` with array arguments, domain validation

### 3. SSL (`checks/ssl.ts`)
- **Method**: `execFile("openssl", ["s_client", "-connect", ...])` + x509 parsing
- **Outputs**: issuer, subject, validity dates, days remaining, SANs
- **Status**: "verified" (>14 days), "warning" (7-14 days), "critical" (<7 days), "expired"

### 4. HTTP Probe (`checks/http-probe.ts`)
- **Method**: `fetch()` with redirect following
- **Outputs**: status code, redirect chain, final URL, robots.txt indexability
- **Fix**: 404 robots.txt = indexable (no restrictions)

### 5. Security Headers (`checks/headers.ts`)
- **Checks**: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Outputs**: present/absent status per header with recommendations

### 6. Blacklist (`checks/blacklist.ts`)
- **Method**: Reverse IP DNS lookup against 20 DNSBL servers
- **Servers**: Spamhaus, Barracuda, SORBS, SpamCop, etc.
- **Outputs**: listed/clean status per server

### 7. Hosting (`checks/hosting.ts`)
- **Method**: IP geolocation API lookup
- **Outputs**: hosting provider, country, city, ASN

### 8. Cloudflare (`checks/cloudflare.ts`)
- **Method**: HTTP response header inspection for `cf-ray`
- **Outputs**: `isCloudflare` boolean
- **UI**: Orange banner in Quick Facts showing DNS Active / Proxy On|Off

---

## Scoring System (100 Points)

| Category       | Weight | What's Scored                                        |
|----------------|--------|------------------------------------------------------|
| Registration   | 10     | Valid WHOIS, not expired, >30 days until expiry       |
| DNS            | 20     | Records resolve, DNSSEC enabled, no misconfigs        |
| Hosting        | 20     | SSL valid, HTTPS redirect, proper status codes        |
| Security       | 50     | All 6 headers present, not blacklisted, robots OK     |

### Grade Calculation

| Grade | Score Range | Condition                    |
|-------|-------------|------------------------------|
| A+    | 95-100      | No critical issues           |
| A     | 90-94       | No critical issues           |
| A-    | 85-89       | No critical issues           |
| B+    | 80-84       |                              |
| B     | 70-79       |                              |
| C     | 60-69       |                              |
| D     | 50-59       |                              |
| F     | 0-49        |                              |

**Critical gate**: Any critical issue (blacklisted, SSL expired, etc.) caps the grade at B+ regardless of score.

---

## Key Types (`types/scan.ts`)

```typescript
interface ScanResult {
  domain: string;
  score: number;
  grade: string;
  quickFacts: QuickFacts;
  checks: ScanCheck[];
  scoreBreakdown: ScoreBreakdown;
}

interface QuickFacts {
  registrar: string;
  expires: string;
  nsProvider: string;
  domainAge: string;
  ipAddress: string;
  hosting: string;
  mail: string;
  sslExpires: string;
  dmarc: string;
  platform: string;
  cloudflareDns: boolean;
  cloudflareProxy: boolean;
}

interface ScanCheck {
  name: string;
  status: "verified" | "warning" | "critical" | "info";
  title: string;
  details: string[];
}
```

---

## SSE Protocol

Each event is a JSON object sent as `data: {...}\n\n`:

```json
{ "step": "whois",     "status": "running" }
{ "step": "whois",     "status": "done", "data": { ... } }
{ "step": "dns",       "status": "running" }
{ "step": "dns",       "status": "done", "data": { ... } }
...
{ "step": "complete",  "data": { "score": 87, "grade": "A-", ... } }
```

The `useScanner` hook processes these events sequentially, updating progress UI and accumulating results until the "complete" event triggers final render.
