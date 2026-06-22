import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import type { WpVersionExposure as WpVersionExposureType } from "@/types/wp-scan";
import { cn } from "@/lib/utils";

interface Props {
  items: WpVersionExposureType[];
}

export function WpVersionExposure({ items }: Props) {
  return (
    <Card header="Version Header Exposure">
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-secondary)] px-3 py-2.5">
            {item.status === "hidden" ? (
              <EyeOff className="h-4 w-4 shrink-0 text-icon-success" />
            ) : (
              <Eye className="h-4 w-4 shrink-0 text-icon-warning" />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">
                {item.title}
              </span>
              <span className="ml-2 text-[0.75rem] text-[var(--text-tertiary)]">
                {item.detail}
              </span>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
              item.status === "hidden"
                ? "bg-text-success/10 text-text-success"
                : "bg-text-warning/10 text-text-warning"
            )}>
              {item.status === "hidden" ? "Hidden" : "Exposed"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
