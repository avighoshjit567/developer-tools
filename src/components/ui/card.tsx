import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  headerAction?: ReactNode;
  noPadding?: boolean;
}

export function Card({
  children,
  className,
  header,
  headerAction,
  noPadding,
}: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-[var(--border-primary)] bg-[var(--bg-primary)]",
        className
      )}
    >
      {header && (
        <div className="flex items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-5 py-3.5">
          <div className="text-[0.875rem] font-semibold text-[var(--text-primary)]">
            {header}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
