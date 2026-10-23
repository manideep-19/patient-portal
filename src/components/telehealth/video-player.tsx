"use client";

import React, { useRef, useEffect } from "react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  label?: string;
  showLabel?: boolean;
  objectFit?: "cover" | "contain";
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
  onClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
          // Normal when browser policy requires user gesture or tab is backgrounded
          console.log("[VideoPlayer] Autoplay notice:", err.message);
        });
      }
    };

    safePlay();

    // Auto-resume video playback when tab becomes visible again
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
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"} ${
          mirror ? "scale-x-[-1]" : ""
        }`}
      />
      {showLabel && label && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg text-white/90 font-medium">
          {label}
        </div>
      )}
    </div>
  );
}
