import React, { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-brand/10 text-brand border border-brand/20",
        primary: "bg-brand text-white",
        secondary: "bg-lavender text-brand-dark border border-brand/10",
        outline: "border border-border text-ink-soft bg-transparent",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/15 text-amber-700 border border-warning/30",
        danger: "bg-danger/10 text-danger border border-danger/20",
        neutral: "bg-muted text-ink-soft",
        peach: "bg-peach-soft text-amber-900 border border-peach/30",
        blue: "bg-blue-soft text-blue-700 border border-blue-accent/20",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5 rounded-full font-semibold",
        md: "text-xs px-2.5 py-1 rounded-full font-medium",
        lg: "text-sm px-3 py-1.5 rounded-full font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}
