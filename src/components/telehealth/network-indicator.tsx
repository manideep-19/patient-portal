"use client";

import React from "react";
import { Signal } from "lucide-react";
import type { NetworkQuality } from "@/lib/use-webrtc";

interface NetworkIndicatorProps {
  quality: NetworkQuality;
  className?: string;
}

const QUALITY_CONFIG: Record<
  NetworkQuality,
  { label: string; color: string; bars: number }
> = {
  excellent: { label: "HD", color: "text-success", bars: 4 },
  good: { label: "Good", color: "text-success", bars: 3 },
  fair: { label: "Fair", color: "text-amber-400", bars: 2 },
  poor: { label: "Poor", color: "text-destructive", bars: 1 },
  unknown: { label: "...", color: "text-white/50", bars: 0 },
};

export function NetworkIndicator({ quality, className = "" }: NetworkIndicatorProps) {
  const config = QUALITY_CONFIG[quality];

  return (
    <span className={`flex items-center gap-1 ${config.color} ${className}`}>
      <Signal className="w-3 h-3" />
      <span className="text-[11px] font-medium">{config.label}</span>
    </span>
  );
}
