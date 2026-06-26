# Email DNS Checker — Architecture Document

## Overview

The Email DNS Checker analyzes email authentication configuration for any domain. It checks MX records, SPF, DKIM (15 selectors), DMARC policies, and blacklist status across 20 DNSBL servers. Results stream via SSE and produce a 100-point email health score.

---

## File Tree

```
src/
├── app/
│   ├── email-dns-checker/
│   │   └── page.tsx               # Main page with hero, scan input, progress, results
│   └── api/
│       └── email-scan/
│           └── route.ts           # POST SSE endpoint — orchestrates email scanner
├── components/
│   └── email-dns/
│       ├── email-quick-facts.tsx   # 8 facts in 2-column grid
│       ├── email-scan-progress.tsx # 5-step progress ring
│       ├── email-score-breakdown.tsx # 5 category expandable bars
│       ├── email-what-to-fix.tsx   # Priority fix list with guide URLs
│       ├── mx-records.tsx          # MX records with priority, IP, provider
│       ├── spf-details.tsx         # SPF record analysis
│       ├── dkim-details.tsx        # Selector grid (15 selectors)
│       ├── dmarc-details.tsx       # Policy, reporting, subdomain policy
│       └── blacklist-status.tsx    # Clean/listed status per DNSBL
├── hooks/
│   └── use-email-scanner.ts       # React hook consuming SSE stream
├── lib/
│   ├── email-scanner.ts           # Orchestrator — runs checks, streams events
│   ├── email-scoring.ts           # 100-point email scoring engine
│   └── checks/
│       ├── dns.ts                 # Shared — MX, TXT record lookups
│       ├── blacklist.ts           # Shared — DNSBL checking
│       └── (email-specific logic is in email-scanner.ts)
└── types/
    └── email-scan.ts              # All email-specific TypeScript interfaces
```

---

## Data Flow

```
User enters domain
      │
      ▼
page.tsx → useEmailScanner hook
      │
      ▼
POST /api/email-scan  (SSE stream opens)
      │
      ▼
route.ts → emailScanner.runScan(domain)
      │
      ├──► MX Records     ──► SSE: { step: "mx", data: {...} }
      ├──► SPF Check       ──► SSE: { step: "spf", data: {...} }
      ├──► DKIM Check      ──► SSE: { step: "dkim", data: {...} }
      ├──► DMARC Check     ──► SSE: { step: "dmarc", data: {...} }
      └──► Blacklist Check ──► SSE: { step: "blacklist", data: {...} }
      │
      ▼
email-scoring.ts → calculates score + grade
      │
      ▼
SSE: { step: "complete", data: { score, grade, quickFacts, ... } }
```

---

## Check Modules

### 1. MX Records
- **Method**: DNS TXT/MX lookup via `dns.resolveMx()`
- **Detection**: Mail provider identified from 17 known providers
- **Outputs**: records with priority, IP resolution, provider name

#### Mail Provider Detection (17 Providers)

| Provider          | MX Pattern                          |
|-------------------|--------------------------------------|
| Google Workspace  | `*.google.com`, `*.googlemail.com`   |
| Microsoft 365     | `*.outlook.com`, `*.microsoft.com`   |
| Zoho Mail         | `*.zoho.com`, `*.zoho.eu`           |
| ProtonMail        | `*.protonmail.ch`                    |
| Fastmail          | `*.fastmail.com`                     |
| Rackspace         | `*.emailsrvr.com`                    |
| Mimecast          | `*.mimecast.com`                     |
| Barracuda         | `*.barracudanetworks.com`            |
| ImprovMX          | `*.improvmx.com`                     |
| Migadu            | `*.migadu.com`                       |
| Postmark          | `*.postmarkapp.com`                  |
| SendGrid          | `*.sendgrid.net`                     |
| Mailgun           | `*.mailgun.org`                      |
| Amazon SES        | `*.amazonaws.com`                    |
| OVH               | `*.ovh.net`                          |
| Namecheap         | `*.privateemail.com`                 |
| Titan             | `*.titan.email`                      |

### 2. SPF (Sender Policy Framework)
- **Method**: DNS TXT lookup for `v=spf1` record
- **Analysis**:
  - Record presence and validity
  - `include:` mechanism parsing (shows which services are authorized)
  - DNS lookup count (SPF allows max 10 lookups)
  - Terminal mechanism (`-all` vs `~all` vs `?all`)
- **Outputs**: raw record, includes list, lookup count, mechanism, validity

### 3. DKIM (DomainKeys Identified Mail)
- **Method**: DNS TXT lookup for `{selector}._domainkey.{domain}`
- **Selectors checked** (15):
  - `default`, `google`, `google2`, `selector1`, `selector2`
  - `k1`, `k2`, `k3`, `mail`, `smtp`
  - `dkim`, `dkim1`, `dkim2`, `s1`, `s2`
- **Outputs**: found selectors with record presence, key type

### 4. DMARC (Domain-based Message Authentication)
- **Method**: DNS TXT lookup for `_dmarc.{domain}`
- **Parsing** (`parseDmarcDetails`):
  - `p=` — policy (none, quarantine, reject)
  - `sp=` — subdomain policy
  - `rua=` — aggregate report URI
  - `ruf=` — forensic report URI
  - `pct=` — percentage of messages to apply policy
  - `adkim=` — DKIM alignment (strict/relaxed)
  - `aspf=` — SPF alignment (strict/relaxed)
- **Outputs**: raw record, parsed policy details, validity

### 5. Blacklist Check
- **Method**: Reverse IP lookup against 20 DNSBL servers (shared with Domain Inspector)
- **Checks**: MX record IPs against blacklists
- **Outputs**: listed/clean status per server per MX IP

---

## Scoring System (100 Points)

| Category   | Weight | What's Scored                                               |
|------------|--------|--------------------------------------------------------------|
| MX Records | 20     | MX records exist, resolve, recognized provider               |
| SPF        | 25     | Record exists, valid syntax, <10 lookups, `-all` terminal    |
| DKIM       | 20     | At least one selector found, valid key                       |
| DMARC      | 25     | Record exists, `reject` or `quarantine` policy, reporting    |
| Blacklist  | 10     | No MX IPs listed on any DNSBL                                |

### Grade Calculation

Same A+ through F scale. Critical issues that gate A-tier grades:
- No MX records at all
- MX IPs blacklisted
- DMARC policy set to `none` (advisory only)
- No SPF record

---

## Key Types (`types/email-scan.ts`)

```typescript
interface EmailScanResult {
  domain: string;
  score: number;
  grade: string;
  quickFacts: EmailQuickFacts;
  mx: MxInfo;
  spf: SpfInfo;
  dkim: DkimInfo;
  dmarc: DmarcInfo;
  blacklist: BlacklistInfo;
  scoreBreakdown: EmailScoreBreakdown;
}

interface EmailQuickFacts {
  mailProvider: string;
  mxCount: number;
  spfRecord: boolean;
  dkimFound: boolean;
  dmarcPolicy: string;
  blacklistClean: boolean;
  spfLookups: number;
  dmarcReporting: boolean;
}

interface MxInfo {
  records: { priority: number; exchange: string; ip: string; provider: string }[];
  status: "verified" | "warning" | "critical";
}

interface SpfInfo {
  raw: string;
  exists: boolean;
  valid: boolean;
  includes: string[];
  lookupCount: number;
  mechanism: string;  // "-all", "~all", "?all", "+all"
  status: "verified" | "warning" | "critical";
}

interface DkimInfo {
  selectors: { name: string; found: boolean; record?: string }[];
  anyFound: boolean;
  status: "verified" | "warning" | "critical";
}

interface DmarcInfo {
  raw: string;
  exists: boolean;
  policy: string;        // "none" | "quarantine" | "reject"
  subdomainPolicy: string;
  rua: string;           // aggregate report URI
  ruf: string;           // forensic report URI
  pct: number;
  adkim: string;         // "r" (relaxed) | "s" (strict)
  aspf: string;
  status: "verified" | "warning" | "critical";
}

interface BlacklistInfo {
  results: { server: string; listed: boolean }[];
  allClean: boolean;
  status: "verified" | "critical";
}

interface EmailScoreBreakdown {
  mx: { score: number; max: number; details: string[] };
  spf: { score: number; max: number; details: string[] };
  dkim: { score: number; max: number; details: string[] };
  dmarc: { score: number; max: number; details: string[] };
  blacklist: { score: number; max: number; details: string[] };
}
```

---

## SPF Lookup Counting

SPF has a 10 DNS lookup limit (RFC 7208). The scanner counts:

```
include:    → 1 lookup each
a:          → 1 lookup each
mx:         → 1 lookup each
redirect=   → 1 lookup
exists:     → 1 lookup each
```

Mechanisms that do NOT count: `ip4:`, `ip6:`, `all`.

Warning at 8+ lookups, critical at 10+.

---

## DMARC Detail Parsing

```typescript
function parseDmarcDetails(record: string) {
  // Input:  "v=DMARC1; p=reject; sp=quarantine; rua=mailto:dmarc@example.com; pct=100"
  // Output: {
  //   policy: "reject",
  //   subdomainPolicy: "quarantine",
  //   rua: "mailto:dmarc@example.com",
  //   ruf: "",
  //   pct: 100,
  //   adkim: "r",  // default relaxed
  //   aspf: "r"    // default relaxed
  // }
}
```

---

## What-to-Fix Recommendations

Fixes are ordered by impact and include links to setup guides:

| Priority | Issue                    | Guide Link Category       |
|----------|--------------------------|---------------------------|
| Critical | No MX records            | DNS configuration         |
| Critical | No SPF record            | SPF setup guide           |
| Critical | DMARC policy = none      | DMARC enforcement guide   |
| High     | No DKIM found            | DKIM setup per provider   |
| High     | SPF >10 lookups          | SPF flattening guide      |
| Medium   | SPF uses `~all`          | Strict SPF guide          |
| Medium   | No DMARC reporting       | DMARC reporting setup     |
| Low      | Missing subdomain policy | DMARC `sp=` configuration |
