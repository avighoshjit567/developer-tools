import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "verified"
  | "info"
  | "attention"
  | "issue"
  | "disabled"
  | "missing"
  | "not-found";

const variantStyles: Record<BadgeVariant, string> = {
  verified:
    "bg-surface-success-light dark:bg-surface-success-dark text-text-success",
  info: "bg-surface-info-light dark:bg-surface-info-dark text-text-info",
  attention:
    "bg-surface-warning-light dark:bg-surface-warning-dark text-text-warning",
  issue: "bg-surface-error-light dark:bg-surface-error-dark text-text-error",
  disabled:
    "bg-surface-warning-light dark:bg-surface-warning-dark text-text-warning",
  missing:
    "bg-surface-error-light dark:bg-surface-error-dark text-text-error",
  "not-found":
    "bg-surface-error-light dark:bg-surface-error-dark text-text-error",
};

const variantLabels: Record<BadgeVariant, string> = {
  verified: "VERIFIED",
  info: "INFO",
  attention: "ATTENTION",
  issue: "ISSUE",
  disabled: "DISABLED",
  missing: "MISSING",
  "not-found": "Not Found",
};

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export function Badge({ variant, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold leading-none",
        variantStyles[variant],
        className
      )}
    >
      {label ?? variantLabels[variant]}
    </span>
  );
}
