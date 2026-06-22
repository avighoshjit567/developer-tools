"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import type { WpPlugin } from "@/types/wp-scan";

interface Props {
  plugins: WpPlugin[];
}

const statusVariant: Record<string, "verified" | "attention" | "issue" | "info"> = {
  ok: "verified",
  outdated: "attention",
  vulnerable: "issue",
  unknown: "info",
};

export function WpDetectedPlugins({ plugins }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? plugins : plugins.slice(0, 6);

  return (
    <Card
      header={`Detected Plugins (${plugins.length})`}
      headerAction={
        plugins.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[0.8125rem] font-medium text-brand hover:text-brand-hover transition-colors"
          >
            {expanded ? "Show less" : `Show all ${plugins.length}`}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )
      }
    >
      {plugins.length === 0 ? (
        <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
          No plugins detected externally. This may mean the site hides plugin paths.
        </p>
      ) : (
        <div className="space-y-1">
          {shown.map((plugin) => (
            <div
              key={plugin.slug}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5"
            >
              <Package className="h-4 w-4 shrink-0 text-[var(--icon-secondary)]" />
              <div className="min-w-0 flex-1">
                <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                  {plugin.name}
                </span>
                {plugin.version && (
                  <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">
                    v{plugin.version}
                  </span>
                )}
              </div>
              <Badge variant={statusVariant[plugin.status] || "info"} className="shrink-0" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
