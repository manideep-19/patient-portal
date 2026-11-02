"use client";

import React, { useRef, useEffect, useState } from "react";
import { Mic, WifiOff, VideoOff } from "lucide-react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
  objectFit?: "cover" | "contain";
  onClick?: () => void;
  // Manual camera off state (Google Meet / WhatsApp letter avatar)
  isCamOff?: boolean;
  // WhatsApp-style Audio-Only fallback props:
  isAudioOnlyFallback?: boolean;
  fallbackName?: string;
  fallbackAvatar?: string;
  fallbackRole?: "Doctor" | "Patient";
}

function getInitial(name: string): string {
  if (!name) return "?";
  // Remove common medical or salutation prefixes so initial reflects actual name
  const clean = name.replace(/^(Dr\.|Dr|Mr\.|Mr|Mrs\.|Mrs|Ms\.|Ms)\s+/i, "").trim();
  return (clean[0] || name[0] || "?").toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-indigo-600 via-purple-600 to-indigo-800 ring-indigo-500/40",
  "from-emerald-600 via-teal-600 to-emerald-800 ring-emerald-500/40",
  "from-blue-600 via-cyan-600 to-blue-800 ring-blue-500/40",
  "from-rose-600 via-pink-600 to-rose-800 ring-rose-500/40",
  "from-amber-600 via-orange-600 to-amber-800 ring-amber-500/40",
  "from-violet-600 via-fuchsia-600 to-violet-800 ring-violet-500/40",
];

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function VideoPlayer({
  stream,
  muted = false,
  mirror = false,
  className = "",
  label,
  showLabel = true,
  objectFit = "cover",
  onClick,
  isCamOff = false,
  isAudioOnlyFallback = false,
  fallbackName,
  fallbackAvatar,
  fallbackRole,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isTrackMuted, setIsTrackMuted] = useState(false);

  // Monitor underlying WebRTC track mute state
  useEffect(() => {
    if (!stream) {
      setIsTrackMuted(false);
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      setIsTrackMuted(true);
      return;
    }

    const handleMute = () => setIsTrackMuted(true);
    const handleUnmute = () => setIsTrackMuted(false);

    videoTrack.addEventListener("mute", handleMute);
    videoTrack.addEventListener("unmute", handleUnmute);

    // Initial state check
    if (videoTrack.muted || !videoTrack.enabled) {
      setIsTrackMuted(true);
    } else {
      setIsTrackMuted(false);
    }

    return () => {
      videoTrack.removeEventListener("mute", handleMute);
      videoTrack.removeEventListener("unmute", handleUnmute);
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const safePlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log("[VideoPlayer] Autoplay notice:", err.message);
        });
      }
    };

    safePlay();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safePlay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stream]);

  const displayName = fallbackName || label || "Participant";
  const initial = getInitial(displayName);
  const isCameraOff = Boolean(isCamOff || isTrackMuted);
  const isVideoHidden = isAudioOnlyFallback || isCameraOff;

  if (!stream) {
    return (
      <div
        className={`flex items-center justify-center bg-ink/90 ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-white/40">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <span className="text-xs">No video</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* 
        CRITICAL: The HTML5 <video> element remains MOUNTED and PLAYING at all times!
        This guarantees remote audio is NEVER cut off even when video is turned off or paused.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} ${
          mirror ? "scale-x-[-1]" : ""
        } ${
          isVideoHidden
            ? "opacity-0 pointer-events-none"
            : "opacity-100 transition-opacity duration-300"
        }`}
      />

      {/* 1. Google Meet / WhatsApp Style Letter Avatar Screen (When Camera is Manually Off) */}
      {isCameraOff && !isAudioOnlyFallback && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-center select-none animate-in fade-in duration-300">
          {/* Centered Large Circular Letter Tile */}
          <div className="relative mb-4 flex items-center justify-center">
            {/* Subtle animated ambient ring */}
            <span className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-white/10 animate-pulse pointer-events-none" />

            <div
              className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${getGradientForName(
                displayName
              )} ring-4 shadow-2xl flex items-center justify-center text-white select-none transition-transform duration-300`}
            >
              <span className="text-4xl sm:text-6xl font-bold tracking-wider drop-shadow-lg font-sans">
                {initial}
              </span>
            </div>
          </div>

          {/* Participant Name */}
          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
            {displayName}
          </h3>

          {/* Camera is Off Status Pill */}
          <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-white/70 text-xs shadow-md">
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Camera is off</span>
          </div>
        </div>
      )}

      {/* 2. WhatsApp-Style Low-Bandwidth Audio-Only Overlay (When Network Degrades) */}
      {isAudioOnlyFallback && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 text-center select-none animate-in fade-in duration-300">
          {/* Top Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs shadow-xl backdrop-blur-md">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold tracking-wide">Poor Connection • Video Paused</span>
          </div>

          {/* Center Avatar with Pulsing Emerald Audio Waves */}
          <div className="relative mb-5 flex items-center justify-center">
            <span className="absolute w-36 h-36 rounded-full border border-emerald-500/30 animate-ping duration-1000 pointer-events-none" />
            <span className="absolute w-44 h-44 rounded-full border border-emerald-500/20 animate-pulse pointer-events-none" />

            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 ring-4 ring-emerald-500/60 shadow-2xl overflow-hidden flex items-center justify-center">
              {fallbackAvatar ? (
                <img
                  src={fallbackAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-brand text-white text-3xl font-bold font-sans">
                  {initial}
                </div>
              )}
            </div>

            {/* Audio Active Indicator Badge */}
            <div className="absolute -bottom-1 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-lg border-2 border-slate-950">
              <Mic className="w-3 h-3 text-slate-950 animate-pulse" />
              <span>Audio Active</span>
            </div>
          </div>

          {/* Participant Info */}
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {displayName}
          </h3>

          {/* Explanatory Message */}
          <p className="mt-3 text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
            Video was paused automatically to preserve clear, continuous audio. Video will resume as soon as the network stabilizes.
          </p>
        </div>
      )}

      {showLabel && label && !isVideoHidden && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-white/90 font-medium z-10">
          {label}
        </div>
      )}
    </div>
  );
}
