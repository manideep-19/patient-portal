"use client";

import React, { useRef, useEffect, useState } from "react";
import { Mic, VideoOff, Volume2, Wifi } from "lucide-react";

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
  // Adaptive 240p quality drop
  is240pQuality?: boolean;
  // Backwards compatibility props
  isAudioOnlyFallback?: boolean;
  fallbackName?: string;
  fallbackAvatar?: string;
  fallbackRole?: "Doctor" | "Patient";
}

function getInitial(name: string): string {
  if (!name) return "?";
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
  is240pQuality = false,
  fallbackName,
  fallbackAvatar,
  fallbackRole,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    // Set muted property directly on DOM element
    video.muted = muted;

    const safePlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setAutoplayBlocked(false);
          })
          .catch((err) => {
            console.log("[VideoPlayer] Autoplay blocked by browser:", err.message);
            if (!muted) {
              setAutoplayBlocked(true);
            }
          });
      }
    };

    safePlay();

    // Auto-resume audio when remote audio track un-mutes
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const handleAudioUnmute = () => {
        safePlay();
      };
      audioTrack.addEventListener("unmute", handleAudioUnmute);
      return () => {
        audioTrack.removeEventListener("unmute", handleAudioUnmute);
      };
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safePlay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stream, muted]);

  const handleUnblockAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current
        .play()
        .then(() => setAutoplayBlocked(false))
        .catch(() => {});
    }
  };

  const displayName = fallbackName || label || "Participant";
  const initial = getInitial(displayName);
  const isCameraOff = Boolean(isCamOff);

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
        This guarantees remote audio is NEVER cut off even when camera is off.
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} ${
          mirror ? "scale-x-[-1]" : ""
        } ${
          isCameraOff
            ? "opacity-0 pointer-events-none"
            : "opacity-100 transition-opacity duration-300"
        }`}
      />

      {/* 1. Google Meet / WhatsApp Style Letter Avatar Screen (Only when camera is manually off) */}
      {isCameraOff && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-center select-none animate-in fade-in duration-300">
          <div className="relative mb-4 flex items-center justify-center">
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

          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
            {displayName}
          </h3>

          <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-white/70 text-xs shadow-md">
            <VideoOff className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Camera is off</span>
          </div>
        </div>
      )}

      {/* 2. 240p Quality Badge (Video stays fully visible, resolution drops smoothly) */}
      {is240pQuality && !isCameraOff && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 border border-amber-400 text-slate-950 font-bold text-[10px] shadow-lg backdrop-blur-md">
          <Wifi className="w-3 h-3 text-slate-950" />
          <span>240p Low Bandwidth Mode</span>
        </div>
      )}

      {/* 3. Autoplay Unblock Button (If browser autoplay blocks remote audio) */}
      {autoplayBlocked && !muted && (
        <div className="absolute inset-x-4 top-4 z-30 flex justify-center">
          <button
            onClick={handleUnblockAudio}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand text-white text-xs font-semibold shadow-lift animate-bounce border border-white/20"
          >
            <Volume2 className="w-4 h-4" />
            <span>Click to Enable Audio</span>
          </button>
        </div>
      )}

      {showLabel && label && !isCameraOff && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-white/90 font-medium z-10">
          {label}
        </div>
      )}
    </div>
  );
}
