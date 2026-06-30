# xCloud Tools

Instant domain diagnostics for agencies and developers. One scan gives you registration, DNS, SSL, email authentication, WordPress security, and more — scored, graded, and ready to share with clients.

Built with Next.js 16, TypeScript, and Tailwind CSS v4.

## Tools

### Quick Scan
All tools in one scan. Enter a domain and three parallel checks run simultaneously — results appear in a tabbed layout as each finishes. Shows an overall health grade plus per-tool scores. Combined "Copy as Markdown" exports all reports at once.

### Domain Inspector
Deep-dive analysis covering 8 checks in parallel:
- **WHOIS & Registration** — Registrar, expiry, domain age (WHOIS + RDAP fallback)
- **DNS Records** — A, AAAA, MX, NS, TXT, SPF, DKIM, DMARC, CAA, DNSSEC
- **SSL Certificate** — Issuer, validity, expiry, SANs
- **HTTP Probe** — Status codes, redirects, robots.txt
- **Security Headers** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Blacklist Check** — 20 DNSBL servers
- **Hosting & Geolocation** — IP, provider, country
- **Cloudflare Detection** — DNS and proxy status

100-point scoring system with letter grades (A+ to F).

### WP Health Checker
WordPress-specific security and health audit:
- WordPress version detection (7 sources including asset `?ver=` params)
- Plugin enumeration and vulnerability scanning
- Login security (wp-login.php, XML-RPC, user enumeration)
- Sensitive file exposure (.env, install.php, wp-content listing)
- Security headers, SSL, performance (TTFB, GZIP, CDN), and SEO checks
- Authorization checkbox and force-fresh scan option
- Non-WordPress detection with graceful handling

### Email DNS Checker
Email authentication and deliverability analysis:
- **MX Records** — Priority, IP resolution, provider detection (17 providers)
- **SPF** — Record parsing, include analysis, DNS lookup counting (max 10)
- **DKIM** — 15 common selectors scanned
- **DMARC** — Policy, subdomain policy, reporting (RUA/RUF), percentage
- **Blacklist** — MX IP checked against 20 DNSBL servers

### DNS Propagation (Coming Soon)
Global DNS spread monitoring with interactive world map.

## Features

- **Real-time streaming** — Server-Sent Events (SSE) for live progress updates
- **Copy as Markdown** — Export scan results as AI-ready markdown for ChatGPT, Claude, Cursor, etc.
- **Recent domains** — localStorage-persisted scan history
- **Dark/light mode** — System-aware theme switching
- **No signup required** — All tools are free and instant
- **Security-first** — `execFile()` for shell commands (no injection), domain validation, input sanitization

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Streaming:** Server-Sent Events (SSE)
- **Storage:** localStorage (recent domains)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── quick-scan/               # Quick Scan (all tools)
│   ├── domain-inspector/         # Domain Inspector
│   ├── wp-health-checker/        # WP Health Checker
│   ├── email-dns-checker/        # Email DNS Checker
│   └── api/
│       ├── scan/                 # Domain Inspector API (SSE)
│       ├── wp-scan/              # WP Health Checker API (SSE)
│       └── email-scan/           # Email DNS Checker API (SSE)
├── components/
│   ├── domain-inspector/         # Domain Inspector UI
│   ├── wp-health/                # WP Health Checker UI
│   ├── email-dns/                # Email DNS Checker UI
│   ├── quick-scan/               # Quick Scan UI (tabs, summary)
│   ├── layout/                   # Navbar, Footer
│   └── ui/                       # Shared components (Card, CopyButton, etc.)
├── hooks/                        # Scanner hooks (SSE consumers)
├── lib/
│   ├── scanner.ts                # Domain scan orchestrator
│   ├── wp-scanner.ts             # WP scan orchestrator
│   ├── email-scanner.ts          # Email scan orchestrator
│   ├── scoring.ts                # Domain scoring engine
│   ├── wp-scoring.ts             # WP scoring engine
│   ├── email-scoring.ts          # Email scoring engine
│   ├── markdown-export.ts        # Markdown formatters (all 3 tools)
│   └── checks/                   # Individual check modules
│       ├── whois.ts              # WHOIS + RDAP
│       ├── dns.ts                # DNS records + DNSSEC
│       ├── ssl.ts                # SSL certificate
│       ├── http-probe.ts         # HTTP status, redirects
│       ├── headers.ts            # Security headers
│       ├── blacklist.ts          # DNSBL checking
│       ├── hosting.ts            # IP geolocation
│       └── cloudflare.ts         # Cloudflare detection
├── types/                        # TypeScript interfaces
└── docs/                         # Architecture documentation
```

## Architecture Docs

Detailed architecture documentation is available in the `docs/` directory:
- [Domain Inspector Architecture](docs/architecture-domain-inspector.md)
- [WP Health Checker Architecture](docs/architecture-wp-health-checker.md)
- [Email DNS Checker Architecture](docs/architecture-email-dns-checker.md)

## Scoring

All tools use a 100-point scoring system with letter grades:

| Grade | Score | Condition |
|-------|-------|-----------|
| A+ | 95-100 | No critical issues |
| A | 90-94 | No critical issues |
| A- | 85-89 | No critical issues |
| B+ | 80-84 | |
| B | 70-79 | |
| C | 60-69 | |
| D | 50-59 | |
| F | 0-49 | |

Critical issues (blacklisted, SSL expired, known vulnerabilities) cap the grade at B+ regardless of score.
