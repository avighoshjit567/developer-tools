# xCloud Tools — Project Rules

@AGENTS.md

## Project Overview

xCloud Tools is a standalone domain diagnostic toolkit for web agencies and developers. It provides instant, scored analysis of domain health, WordPress security, and email authentication — all free, no signup required.

**Live URL:** https://tools.xcloud.host
**Repo:** git@github.com:avighoshjit567/developer-tools.git

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 with CSS custom properties for theming
- **Icons:** Lucide React
- **Streaming:** Server-Sent Events (SSE) for real-time scan progress
- **Storage:** localStorage for recent domains (no database yet)

## Architecture

### Tools
1. **Quick Scan** (`/quick-scan`) — Runs all 3 tools in parallel, tabbed results
2. **Domain Inspector** (`/domain-inspector`) — 8 parallel checks: WHOIS, DNS, SSL, HTTP, headers, blacklist, hosting, Cloudflare
3. **WP Health Checker** (`/wp-health-checker`) — WordPress-specific: version detection (7 sources), plugins, login security, exposed files, performance, SEO
4. **Email DNS Checker** (`/email-dns-checker`) — MX, SPF, DKIM (15 selectors), DMARC, blacklist (20 DNSBL servers)

### Data Flow Pattern (all tools follow this)
```
Page → Hook (useScanner/useWpScanner/useEmailScanner)
  → POST /api/{scan,wp-scan,email-scan} (SSE stream)
    → Orchestrator (scanner.ts/wp-scanner.ts/email-scanner.ts)
      → Individual check modules (lib/checks/ or lib/wp-checks/)
    → Scoring engine → Final result streamed back
  → Hook updates React state → UI renders
```

### Key Directories
```
src/app/              → Pages and API routes
src/components/       → UI components (per-tool subdirectories)
src/hooks/            → SSE consumer hooks
src/lib/              → Scanners, scoring engines, check modules
src/lib/checks/       → Domain/email check modules (whois, dns, ssl, etc.)
src/lib/wp-checks/    → WordPress-specific check modules
src/types/            → TypeScript interfaces (scan.ts, wp-scan.ts, email-scan.ts)
docs/                 → Architecture documentation
```

## Conventions

### Code Style
- Use CSS custom properties (`var(--text-primary)`, `var(--bg-secondary)`) for all colors — never hardcode colors except brand-specific ones
- Use precise font sizes: `text-[0.8125rem]`, `text-[0.9375rem]` etc. (not Tailwind defaults)
- Border radius: `rounded-[10px]` for cards, `rounded-lg` for buttons/inputs
- Max content width: `max-w-[1210px]` with `px-6` padding
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Icons: always from `lucide-react`, sized with `h-5 w-5` or explicit `h-[18px] w-[18px]`

### Security Rules (CRITICAL)
- **NEVER use `exec()`** — always use `execFile()` with array arguments to prevent command injection
- **ALWAYS validate domains** with `sanitizeDomain()` and `isValidHostname()` before any operation
- **NEVER pass user input into template strings** for shell commands
- Use `encodeURIComponent()` for URL construction with user input

### SSE Streaming Pattern
- Domain Inspector uses named events: `event: check_complete\ndata: {...}\n\n`
- WP and Email use data-only events: `data: {"type": "check_complete", ...}\n\n`
- Always include AbortController support in hooks

### Scoring System
- All tools use 100-point scoring with letter grades (A+ through F)
- Critical issues gate A-tier grades (A+, A, A-) — caps at B+ max
- Each tool has its own scoring engine in `src/lib/{scoring,wp-scoring,email-scoring}.ts`

### Component Patterns
- Shared `ScanInput` component across all tools
- Shared `HealthScore` and `ScoreCircle` components
- Shared `Card` component for result sections
- Shared `CopyMarkdownButton` for markdown export
- Each tool has its own component directory under `src/components/`

## Common Pitfalls
- `wp-config.php` HEAD check always returns 200 (PHP executes) — don't check it
- WHOIS for some TLDs (.dev, etc.) fails — always have RDAP fallback
- WP version "6.7" vs "6.7.0" needs `normalizeVersion()` to avoid false outdated warnings
- robots.txt 404 means "no restrictions" (indexable = true), not "blocked"
- DNSSEC requires both DS AND DNSKEY records to be "enabled"
- Tailwind v4 doesn't support `h-4.5` — use `h-[18px]` instead

## Build & Deploy
```bash
npm install
npm run dev        # Development
npm run build      # Production build
npm run start      # Production server
npm run migrate    # No-op (no database yet)
```

Deploy target uses `npm run build && npm run migrate` — the migrate script is a no-op placeholder.
