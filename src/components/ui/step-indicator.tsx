import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-indexed
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex items-center justify-between relative">
        {/* Connecting bar background */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-border/60 -z-0" />
        {/* Active connecting bar */}
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-brand transition-all duration-300 -z-0"
          style={{
            width: `${(currentStep / Math.max(steps.length - 1, 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 border-2",
                  isDone
                    ? "bg-brand border-brand text-white shadow-xs"
                    : isCurrent
                    ? "bg-card border-brand text-brand ring-4 ring-brand/15 font-bold scale-105"
                    : "bg-card border-border/80 text-ink-soft"
                )}
              >
                {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-medium mt-1.5 text-center hidden xs:block max-w-[70px] truncate",
                  isCurrent ? "text-brand font-semibold" : "text-ink-soft"
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
