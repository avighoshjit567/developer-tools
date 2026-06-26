import { Card } from "@/components/ui/card";
import type { EmailQuickFacts as EmailQuickFactsType } from "@/types/email-scan";

interface Props {
  facts: EmailQuickFactsType;
}

const rows: { left: { label: string; key: keyof EmailQuickFactsType }; right: { label: string; key: keyof EmailQuickFactsType } }[] = [
  { left: { label: "MAIL SERVER", key: "mailServer" }, right: { label: "MAIL PROVIDER", key: "mailProvider" } },
  { left: { label: "SPF STATUS", key: "spfStatus" }, right: { label: "DKIM STATUS", key: "dkimStatus" } },
  { left: { label: "DMARC POLICY", key: "dmarcPolicy" }, right: { label: "BLACKLIST", key: "blacklistStatus" } },
  { left: { label: "MX COUNT", key: "mxCount" }, right: { label: "TLS SUPPORT", key: "tlsSupport" } },
];

export function EmailQuickFacts({ facts }: Props) {
  return (
    <Card header="Quick Facts">
      <div className="space-y-3.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 gap-x-6">
            <FactRow label={row.left.label} value={String(facts[row.left.key])} />
            <FactRow label={row.right.label} value={String(facts[row.right.key])} />
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
