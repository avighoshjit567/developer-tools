import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-text-on-brand border-brand hover:bg-brand-hover active:bg-brand-surface-hover",
  secondary:
    "bg-transparent text-brand border-brand hover:bg-surface-info-light dark:hover:bg-surface-info-dark",
  danger:
    "bg-surface-error-light dark:bg-surface-error-dark text-text-error border-transparent hover:opacity-80",
  ghost:
    "bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
};

export function Button({
  variant = "primary",
  loading,
  disabled,
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-[0.875rem] font-medium transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
