import { Card } from "@/components/ui/card";
import type { QuickFacts as QuickFactsType } from "@/types/scan";

interface QuickFactsProps {
  facts: QuickFactsType;
}

const rows: { left: { label: string; key: keyof QuickFactsType }; right: { label: string; key: keyof QuickFactsType } }[] = [
  { left: { label: "REGISTRAR", key: "registrar" }, right: { label: "EXPIRES", key: "expires" } },
  { left: { label: "NS PROVIDER", key: "nsProvider" }, right: { label: "DOMAIN AGE", key: "domainAge" } },
  { left: { label: "IP ADDRESS", key: "ipAddress" }, right: { label: "HOSTING", key: "hosting" } },
  { left: { label: "MAIL", key: "mail" }, right: { label: "SSL EXPIRES", key: "sslExpires" } },
  { left: { label: "DMARC", key: "dmarc" }, right: { label: "PLATFORM", key: "platform" } },
];

export function QuickFacts({ facts }: QuickFactsProps) {
  return (
    <Card header="Quick Facts">
      <div className="space-y-3.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-x-6">
            <FactRow label={row.left.label} value={facts[row.left.key]} />
            <FactRow label={row.right.label} value={facts[row.right.key]} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-right text-[0.8125rem] font-medium text-[var(--text-primary)] truncate">
        {value}
      </span>
    </div>
  );
}
