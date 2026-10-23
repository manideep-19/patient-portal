"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { VideoOff, VolumeX, Volume2 } from "lucide-react";

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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needUnmute, setNeedUnmute] = useState(false);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
        })
        .catch((err) => {
          console.warn("[VideoPlayer] Autoplay policy blocked audio:", err.message);
          // If unmuted playback was blocked by browser policy, play muted and let user tap to enable sound
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
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    safePlay();

    // Listen to video element metadata and canplay events
    const handleCanPlay = () => {
      safePlay();
    };

    video.addEventListener("loadedmetadata", handleCanPlay);
    video.addEventListener("canplay", handleCanPlay);

    // Listen to stream tracks becoming unmuted
    const videoTracks = stream.getVideoTracks();
    const handleTrackUnmute = () => {
      safePlay();
    };

    videoTracks.forEach((track) => {
      track.addEventListener("unmute", handleTrackUnmute);
    });

    // Auto-resume video playback when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safePlay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleCanPlay);
      video.removeEventListener("canplay", handleCanPlay);
      videoTracks.forEach((track) => {
        track.removeEventListener("unmute", handleTrackUnmute);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stream, safePlay]);

  // When camera is explicitly switched off by peer
  if (isCamOff) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-ink text-white p-6 ${className}`}
        onClick={onClick}
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-2xl mb-4 relative">
          <VideoOff className="w-9 h-9 sm:w-11 sm:h-11 text-white/70" />
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950" />
        </div>
        <h4 className="text-base sm:text-lg font-bold tracking-tight text-white">
          {label?.replace(/\s*\([^)]*\)/, "") || "Participant"}
        </h4>
        <p className="text-xs text-white/60 mt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Camera is switched off • Audio is active</span>
        </p>

        {showLabel && label && (
          <div className="absolute bottom-3 left-3 text-[10px] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white/90 font-medium border border-white/10">
            {label}
          </div>
        )}
      </div>
    );
  }

  if (!stream) {
    return (
      <div
        className={`flex items-center justify-center bg-ink/90 ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center gap-2 text-white/40">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <VideoOff className="w-6 h-6" />
          </div>
          <span className="text-xs">No video stream</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={(e) => {
        if (needUnmute) {
          handleUserUnmute();
        }
        onClick?.();
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} ${
          mirror ? "scale-x-[-1]" : ""
        }`}
      />

      {/* Floating Pill if browser autoplay required audio to start muted */}
      {needUnmute && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUserUnmute();
          }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white border border-brand/40 shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all cursor-pointer animate-pulse"
        >
          <VolumeX className="w-4 h-4 text-amber-400" />
          <span>Click to Unmute Audio</span>
        </button>
      )}

      {showLabel && label && (
        <div className="absolute bottom-3 left-3 text-[10px] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white/90 font-medium border border-white/10 z-10 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}
