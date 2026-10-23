import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-dashed border-border/80 bg-lavender-soft/60 my-4",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center mb-4 shadow-sm animate-pulse-subtle">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-ink mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-ink-soft max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
