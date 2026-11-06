"use client";

import React, { useState, useEffect } from "react";
import { X, Mic, Video, Check, SlidersHorizontal, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDevices: DeviceInfo[];
  currentAudioDeviceId: string | null;
  currentVideoDeviceId: string | null;
  currentOutputDeviceId?: string | null;
  onSelectMicrophone: (deviceId: string) => Promise<void>;
  onSelectCamera: (deviceId: string) => Promise<void>;
  onSelectSpeaker?: (deviceId: string) => Promise<void>;
}

export function DeviceSettingsModal({
  isOpen,
  onClose,
  availableDevices,
  currentAudioDeviceId,
  currentVideoDeviceId,
  currentOutputDeviceId,
  onSelectMicrophone,
  onSelectCamera,
  onSelectSpeaker,
}: DeviceSettingsModalProps) {
  const [selectedMic, setSelectedMic] = useState<string>(currentAudioDeviceId || "");
  const [selectedCam, setSelectedCam] = useState<string>(currentVideoDeviceId || "");
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (currentAudioDeviceId) setSelectedMic(currentAudioDeviceId);
    if (currentVideoDeviceId) setSelectedCam(currentVideoDeviceId);
  }, [currentAudioDeviceId, currentVideoDeviceId]);

  if (!isOpen) return null;

  const audioDevices = availableDevices.filter((d) => d.kind === "audioinput");
  const videoDevices = availableDevices.filter((d) => d.kind === "videoinput");
  // Speaker selection needs HTMLMediaElement.setSinkId (Chrome / Edge / Firefox)
  const supportsSinkId =
    typeof window !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  const outputDevices = supportsSinkId
    ? availableDevices.filter((d) => d.kind === "audiooutput")
    : [];

  const handleMicChange = async (deviceId: string) => {
    setSelectedMic(deviceId);
    setIsSwitching(true);
    try {
      await onSelectMicrophone(deviceId);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCamChange = async (deviceId: string) => {
    setSelectedCam(deviceId);
    setIsSwitching(true);
    try {
      await onSelectCamera(deviceId);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Audio & Video Settings</h3>
              <p className="text-[11px] text-slate-400">Switch microphone and camera in real time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Microphone (Audio Input)</span>
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {audioDevices.length === 0 ? (
              <div className="text-xs text-slate-500 p-2">Default Microphone</div>
            ) : (
              audioDevices.map((dev) => {
                const isSelected = selectedMic === dev.deviceId || (!selectedMic && dev === audioDevices[0]);
                return (
                  <button
                    key={dev.deviceId}
                    onClick={() => handleMicChange(dev.deviceId)}
                    disabled={isSwitching}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-brand/20 border-brand/50 text-white font-medium"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="truncate pr-2">{dev.label || "Microphone"}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Camera Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Video className="w-4 h-4 text-brand" />
            <span>Camera (Video Input)</span>
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {videoDevices.length === 0 ? (
              <div className="text-xs text-slate-500 p-2">Default Camera</div>
            ) : (
              videoDevices.map((dev) => {
                const isSelected = selectedCam === dev.deviceId || (!selectedCam && dev === videoDevices[0]);
                return (
                  <button
                    key={dev.deviceId}
                    onClick={() => handleCamChange(dev.deviceId)}
                    disabled={isSwitching}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-brand/20 border-brand/50 text-white font-medium"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="truncate pr-2">{dev.label || "Camera"}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Speaker Selection */}
        {onSelectSpeaker && outputDevices.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-sky-400" />
              <span>Speaker (Audio Output)</span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {outputDevices.map((dev) => {
                const isSelected =
                  currentOutputDeviceId === dev.deviceId ||
                  (!currentOutputDeviceId && dev === outputDevices[0]);
                return (
                  <button
                    key={dev.deviceId}
                    onClick={() => onSelectSpeaker(dev.deviceId)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-brand/20 border-brand/50 text-white font-medium"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="truncate pr-2">{dev.label || "Speaker"}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose} className="px-5">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

