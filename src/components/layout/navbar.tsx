"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const tools = [
  { name: "Quick Scan", href: "/quick-scan", badge: null },
  { name: "Domain Inspector", href: "/domain-inspector", badge: null },
  { name: "Email DNS Checker", href: "/email-dns-checker", badge: null },
  { name: "WP Health Checker", href: "/wp-health-checker", badge: null },
  { name: "DNS Propagation", href: "/dns-propagation", badge: "Soon" },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 h-[70px] border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex h-full max-w-[1210px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          {mounted ? (
            <Image
              src={theme === "dark" ? "/xcloud-logo-white.svg" : "/xcloud-logo.svg"}
              alt="xCloud"
              width={100}
              height={39}
              className="h-[28px] w-auto"
              priority
            />
          ) : (
            <Image
              src="/xcloud-logo.svg"
              alt="xCloud"
              width={100}
              height={39}
              className="h-[28px] w-auto"
              priority
            />
          )}
          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand">
            Tools
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.badge ? "#" : tool.href}
              className={cn(
                "relative rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                pathname === tool.href
                  ? "bg-brand/10 text-brand"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                tool.badge && "cursor-default opacity-50"
              )}
              onClick={tool.badge ? (e) => e.preventDefault() : undefined}
            >
              {tool.name}
              {tool.badge && (
                <span className="ml-1.5 rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[0.625rem] font-medium text-[var(--text-tertiary)]">
                  {tool.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--icon-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--icon-primary)]"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--icon-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-3 md:hidden">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.badge ? "#" : tool.href}
              onClick={() => {
                if (!tool.badge) setMobileOpen(false);
              }}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-[0.875rem] font-medium transition-colors",
                pathname === tool.href
                  ? "bg-brand/10 text-brand"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
                tool.badge && "cursor-default opacity-50"
              )}
            >
              {tool.name}
              {tool.badge && (
                <span className="ml-1.5 rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[0.625rem]">
                  {tool.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
