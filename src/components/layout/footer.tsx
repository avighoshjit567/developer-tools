import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] py-8">
      <div className="mx-auto max-w-[1210px] px-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[0.8125rem] text-[var(--text-tertiary)]">
          <Link
            href="/"
            className="font-medium text-[var(--text-secondary)] hover:text-brand transition-colors"
          >
            xCloud Tool Hub
          </Link>
          <span className="hidden sm:inline">&middot;</span>
          <span>Privacy Policy</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>Terms of Service</span>
        </div>
        <p className="mt-3 text-[0.75rem] text-[var(--text-tertiary)]">
          Domains submitted are logged for 30 days to help monitor usage,
          performance, and bugs.
        </p>
      </div>
    </footer>
  );
}
