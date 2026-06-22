import { Card } from "@/components/ui/card";
import type { WpQuickFacts as WpQuickFactsType } from "@/types/wp-scan";

interface Props {
  facts: WpQuickFactsType;
}

const rows: { left: { label: string; key: keyof WpQuickFactsType }; right: { label: string; key: keyof WpQuickFactsType } }[] = [
  { left: { label: "WP VERSION", key: "wpVersion" }, right: { label: "THEME", key: "theme" } },
  { left: { label: "PHP VERSION", key: "phpVersion" }, right: { label: "SERVER", key: "server" } },
  { left: { label: "SSL", key: "ssl" }, right: { label: "CDN", key: "cdn" } },
  { left: { label: "CACHING", key: "cachingPlugin" }, right: { label: "PLUGINS", key: "pluginCount" } },
];

export function WpQuickFacts({ facts }: Props) {
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
