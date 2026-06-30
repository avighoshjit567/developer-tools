# Agent Rules — xCloud Tools

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Context

This is **xCloud Tools** — a domain diagnostic toolkit with 4 tools (Quick Scan, Domain Inspector, WP Health Checker, Email DNS Checker). All tools stream results via Server-Sent Events (SSE).

## Rules for All Agents

### Before Writing Code
1. Read the relevant existing files first — understand patterns before modifying
2. Check `src/types/` for the data structures you'll be working with
3. Follow the established SSE streaming pattern (see hooks in `src/hooks/`)

### Security (Non-Negotiable)
- Use `execFile()` with array args — NEVER `exec()` with template strings
- Validate all domains with `sanitizeDomain()` + `isValidHostname()` from `src/lib/domain-utils.ts`
- Use `encodeURIComponent()` when constructing URLs with user input

### Styling
- Use CSS custom properties for colors: `var(--text-primary)`, `var(--bg-secondary)`, etc.
- Use exact rem sizes: `text-[0.8125rem]` not `text-sm`
- Cards use `rounded-[10px]`, buttons use `rounded-lg`
- Max width `max-w-[1210px]` with `px-6`
- Icons from `lucide-react` only

### Code Patterns
- Scanner orchestrators live in `src/lib/{scanner,wp-scanner,email-scanner}.ts`
- Check modules live in `src/lib/checks/` (shared) and `src/lib/wp-checks/` (WP-specific)
- Scoring engines in `src/lib/{scoring,wp-scoring,email-scoring}.ts`
- All scoring: 100 points, A+ to F grades, critical issues cap at B+
- Hooks consume SSE streams with AbortController support
- Reuse shared components: `ScanInput`, `HealthScore`, `ScoreCircle`, `Card`, `CopyMarkdownButton`

### File Organization
- New tool components go in `src/components/{tool-name}/`
- New API routes go in `src/app/api/{endpoint}/route.ts`
- New pages go in `src/app/{tool-name}/page.tsx`
- Types go in `src/types/{tool-name}.ts`

### Testing Changes
- Always run `npm run build` to verify TypeScript and build pass
- Test with real domains to verify scan results are accurate
- Check both light and dark themes for UI changes
