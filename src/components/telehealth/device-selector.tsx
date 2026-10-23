"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getAvailableDevices, type MediaDeviceInfo } from "@/lib/media-utils";

interface DeviceSelectorProps {
  kind: "audioinput" | "videoinput";
  label: string;
  currentDeviceId?: string;
  onSelect: (deviceId: string) => void;
  className?: string;
}

export function DeviceSelector({
  kind,
  label,
  currentDeviceId,
  onSelect,
  className = "",
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    getAvailableDevices().then((all) => {
      setDevices(all.filter((d) => d.kind === kind));
    });
  }, [kind]);

  const selectedDevice = devices.find((d) => d.deviceId === currentDeviceId) || devices[0];

  if (devices.length <= 1) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs text-white/80 hover:bg-white/15 transition-colors cursor-pointer"
      >
        <span className="truncate">{selectedDevice?.label || label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-ink/95 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden z-50 shadow-lg">
          {devices.map((d) => (
            <button
              key={d.deviceId}
              onClick={() => {
                onSelect(d.deviceId);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                d.deviceId === currentDeviceId
                  ? "bg-brand/20 text-brand-soft font-semibold"
                  : "text-white/70 hover:bg-white/10"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
