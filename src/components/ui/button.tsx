"use client";

import React, { forwardRef, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-white shadow-soft hover:bg-brand-dark active:bg-brand-dark font-semibold",
        secondary:
          "bg-brand-soft text-brand-dark hover:bg-lavender active:bg-lavender font-medium",
        outline:
          "border border-border bg-card text-foreground hover:bg-lavender-soft hover:border-brand/30 active:bg-lavender",
        ghost:
          "text-ink-soft hover:text-foreground hover:bg-lavender-soft active:bg-lavender",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/90",
        success:
          "bg-success text-white hover:bg-success/90 active:bg-success/90",
        lavender:
          "bg-lavender text-brand-dark hover:bg-brand-soft border border-brand/10",
      },
      size: {
        sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
        md: "h-11 px-4 text-sm rounded-xl gap-2 min-h-[44px]", // 44px touch target
        lg: "h-13 px-6 text-base rounded-2xl gap-2.5 min-h-[48px]",
        icon: "h-10 w-10 rounded-xl min-h-[40px] min-w-[40px] p-0",
        iconSm: "h-8 w-8 rounded-lg min-h-[32px] min-w-[32px] p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
