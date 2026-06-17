"use client";

import { useState, type FormEvent } from "react";
import { Globe, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanInputProps {
  onScan: (domain: string) => void;
  loading?: boolean;
  className?: string;
  placeholder?: string;
}

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  // Remove protocol
  d = d.replace(/^https?:\/\//, "");
  // Remove path
  d = d.replace(/\/.*$/, "");
  // Remove www.
  d = d.replace(/^www\./, "");
  return d;
}

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(
    domain
  );
}

export function ScanInput({
  onScan,
  loading,
  className,
  placeholder = "Enter any domain...",
}: ScanInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const domain = normalizeDomain(input);
    if (!domain) {
      setError("Please enter a domain");
      return;
    }
    if (!isValidDomain(domain)) {
      setError("Please enter a valid domain (e.g., example.com)");
      return;
    }
    setError("");
    onScan(domain);
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative flex items-center overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-sm transition-shadow focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <Globe className="ml-4 h-5 w-5 shrink-0 text-[var(--icon-secondary)]" />
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError("");
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-3.5 text-[0.9375rem] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="m-1.5 flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          Analyze
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[0.8125rem] text-text-error">{error}</p>
      )}
    </form>
  );
}
