"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Mic, WifiOff, VideoOff, VolumeX, Volume2 } from "lucide-react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
  objectFit?: "cover" | "contain";
  isCamOff?: boolean;
  onRetry?: () => void;
  onClick?: () => void;
  // WhatsApp-style Audio-Only fallback props:
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
  isCamOff = false,
  onRetry,
  onClick,
  isAudioOnlyFallback = false,
  fallbackName,
  fallbackAvatar,
  fallbackRole,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needUnmute, setNeedUnmute] = useState(false);
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

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started
        })
        .catch((err) => {
          console.warn("[VideoPlayer] Autoplay blocked audio:", err.message);
          if (!video.muted) {
            video.muted = true;
            setNeedUnmute(true);
            video.play().catch(() => {});
          }
        });
    }
  }, []);

  const handleUserUnmute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    setNeedUnmute(false);
    video.play().catch(() => {});
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    safePlay();

    const handleCanPlay = () => safePlay();
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [stream, safePlay]);

  const displayName = fallbackName || label || "Participant";
  const initial = getInitial(displayName);
  const isCameraOff = isCamOff || isTrackMuted;
  const isVideoHidden = isCameraOff || isAudioOnlyFallback;

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full ${
          objectFit === "contain" ? "object-contain" : "object-cover"
        } ${mirror ? "scale-x-[-1]" : ""} ${
          isVideoHidden ? "invisible opacity-0" : "visible opacity-100"
        } transition-opacity duration-300`}
      />

      {/* 1. Google Meet / WhatsApp Style Letter Avatar Screen (When Camera is Manually Off) */}
      {isCameraOff && !isAudioOnlyFallback && (
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

      {/* 2. WhatsApp-Style Low-Bandwidth Audio-Only Overlay (When Network Degrades) */}
      {isAudioOnlyFallback && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 text-center select-none animate-in fade-in duration-300">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs shadow-xl backdrop-blur-md">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold tracking-wide">Poor Connection • Video Paused</span>
          </div>

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

            <div className="absolute -bottom-1 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-lg border-2 border-slate-950">
              <Mic className="w-3 h-3 text-slate-950 animate-pulse" />
              <span>Audio Active</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {displayName}
          </h3>

          <p className="mt-3 text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
            Video was paused automatically to preserve clear, continuous audio. Video will resume as soon as the network stabilizes.
          </p>
        </div>
      )}

      {/* Autoplay blocked banner - Tap to enable audio */}
      {needUnmute && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUserUnmute();
          }}
          className="absolute inset-x-4 top-4 z-20 mx-auto max-w-xs px-3 py-2 rounded-2xl bg-brand text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xl animate-bounce border border-white/20 cursor-pointer pointer-events-auto"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tap to enable sound</span>
        </button>
      )}

      {/* Name Label */}
      {showLabel && label && !isVideoHidden && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-xl text-white/90 font-medium z-10 flex items-center gap-1.5 border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
