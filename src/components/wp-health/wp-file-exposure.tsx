import { Card } from "@/components/ui/card";
import { FileText, FileWarning, FileX, FileCheck } from "lucide-react";
import type { WpExposedFile } from "@/types/wp-scan";
import { cn } from "@/lib/utils";

interface Props {
  files: WpExposedFile[];
}

const statusConfig = {
  hidden: { icon: FileCheck, color: "text-icon-success", bg: "bg-surface-success-light dark:bg-surface-success-dark", label: "Hidden" },
  "not-found": { icon: FileX, color: "text-icon-success", bg: "bg-surface-success-light dark:bg-surface-success-dark", label: "Not Found" },
  exposed: { icon: FileWarning, color: "text-icon-warning", bg: "bg-surface-warning-light dark:bg-surface-warning-dark", label: "Exposed" },
  accessible: { icon: FileText, color: "text-icon-error", bg: "bg-surface-error-light dark:bg-surface-error-dark", label: "Accessible" },
};

export function WpFileExposure({ files }: Props) {
  if (files.length === 0) return null;

  const exposed = files.filter((f) => f.status === "exposed" || f.status === "accessible");
  const safe = files.filter((f) => f.status === "hidden" || f.status === "not-found");

  return (
    <Card header="Sensitive File Exposure">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {files.map((file) => {
          const config = statusConfig[file.status];
          const Icon = config.icon;
          return (
            <div
              key={file.path}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-3 text-center",
                file.status === "accessible"
                  ? "border-icon-error/20"
                  : file.status === "exposed"
                    ? "border-icon-warning/20"
                    : "border-[var(--border-secondary)]",
                config.bg
              )}
            >
              <Icon className={cn("h-6 w-6", config.color)} />
              <span className="text-[0.6875rem] font-medium text-[var(--text-primary)] truncate w-full">
                {file.name}
              </span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
                file.status === "accessible"
                  ? "bg-text-error/10 text-text-error"
                  : file.status === "exposed"
                    ? "bg-text-warning/10 text-text-warning"
                    : "bg-text-success/10 text-text-success"
              )}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-[0.75rem] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-icon-success" /> Hidden / Safe
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-icon-warning" /> Exposed — fix recommended
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-icon-error" /> Accessible — review recommended
        </span>
      </div>
    </Card>
  );
}
