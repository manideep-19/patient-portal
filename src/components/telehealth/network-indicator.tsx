"use client";

import React from "react";
import { Signal, WifiOff, Volume2 } from "lucide-react";
import type { NetworkQuality } from "@/lib/use-webrtc";

interface NetworkIndicatorProps {
  quality: NetworkQuality;
  isAudioOnlyFallback?: boolean;
  onToggleSimulate?: () => void;
  className?: string;
}

const QUALITY_CONFIG: Record<
  NetworkQuality,
  { label: string; color: string; bars: number }
> = {
  excellent: { label: "HD", color: "text-emerald-400", bars: 4 },
  good: { label: "Good", color: "text-emerald-400", bars: 3 },
  fair: { label: "Fair", color: "text-amber-400", bars: 2 },
  poor: { label: "Poor (Audio Only)", color: "text-amber-400", bars: 1 },
  unknown: { label: "...", color: "text-white/50", bars: 0 },
};

export function NetworkIndicator({
  quality,
  isAudioOnlyFallback = false,
  onToggleSimulate,
  className = "",
}: NetworkIndicatorProps) {
  const isPoor = isAudioOnlyFallback || quality === "poor";
  const config = QUALITY_CONFIG[quality] || QUALITY_CONFIG.unknown;

  if (isPoor) {
    return (
      <button
        onClick={onToggleSimulate}
        type="button"
        title={
          onToggleSimulate
            ? "Network unstable: Video paused to preserve clear voice. Click to toggle network test mode."
            : "Network unstable: Video paused to preserve audio quality."
        }
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-[11px] font-semibold animate-pulse hover:bg-amber-500/30 transition-all cursor-pointer ${className}`}
      >
        <WifiOff className="w-3 h-3 text-amber-400" />
        <span>Weak Signal • Audio Only</span>
        <Volume2 className="w-3 h-3 text-emerald-400 animate-bounce" />
      </button>
    );
  }

  return (
    <button
      onClick={onToggleSimulate}
      type="button"
      title={
        onToggleSimulate
          ? "Network stable. Click to simulate weak network (Audio-Only fallback test)."
          : "Network connection is strong."
      }
      className={`flex items-center gap-1 ${config.color} ${
        onToggleSimulate ? "hover:opacity-80 transition-opacity cursor-pointer" : ""
      } ${className}`}
    >
      <Signal className="w-3 h-3" />
      <span className="text-[11px] font-medium">{config.label}</span>
    </button>
  );
}
