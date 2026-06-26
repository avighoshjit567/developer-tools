import { Card } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { BlacklistInfo } from "@/types/email-scan";
import { cn } from "@/lib/utils";

interface Props {
  blacklist: BlacklistInfo;
}

export function BlacklistStatus({ blacklist }: Props) {
  const isClean = blacklist.clean;

  return (
    <Card header="Blacklist Status">
      <div className="space-y-4">
        {/* Overall status */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isClean ? "bg-icon-success/10" : "bg-icon-error/10"
            )}
          >
            {isClean ? (
              <ShieldCheck className="h-5 w-5 text-icon-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-icon-error" />
            )}
          </div>
          <div>
            <p
              className={cn(
                "text-[0.9375rem] font-semibold",
                isClean ? "text-text-success" : "text-text-error"
              )}
            >
              {isClean ? "Clean" : "Listed"}
            </p>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {blacklist.listsChecked} lists checked
              {blacklist.ipChecked && ` for ${blacklist.ipChecked}`}
            </p>
          </div>
        </div>

        {/* Blacklisted entries */}
        {blacklist.blacklistedOn.length > 0 && (
          <div>
            <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Listed On
            </p>
            <div className="flex flex-wrap gap-2">
              {blacklist.blacklistedOn.map((list) => (
                <span
                  key={list}
                  className="rounded-full bg-surface-error-light px-2.5 py-0.5 text-[0.75rem] font-medium text-text-error dark:bg-surface-error-dark"
                >
                  {list}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
