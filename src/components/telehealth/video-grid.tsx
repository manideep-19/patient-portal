"use client";

import React from "react";
import { VideoPlayer } from "./video-player";
import { VideoOff } from "lucide-react";
import type { RemotePeer } from "@/lib/use-webrtc";

interface VideoGridProps {
  localStream: MediaStream | null;
  localLabel: string;
  localMirror?: boolean;
  localCamOff?: boolean;
  remotePeers: RemotePeer[];
  /** Called when user taps the Reconnect button (shown on reconnecting state) */
  onRetry?: () => void;
  className?: string;
  /** Whether to render self PiP in 2-person mode (defaults to false so parent page can render its own interactive PiP) */
  showSelfPip?: boolean;
}

/**
 * Adaptive video grid layout for 1-4 participants.
 *
 * - 1 participant (self only): Full screen self view
 * - 2 participants: Main remote full screen (+ optional PiP self)
 * - 3-4 participants: Responsive multi-tile grid
 */
export function VideoGrid({
  localStream,
  localLabel,
  localMirror = true,
  localCamOff = false,
  remotePeers,
  onRetry,
  className = "",
  showSelfPip = false,
}: VideoGridProps) {
  const total = 1 + remotePeers.length; // self + remotes

  // ---- Layout: 1 person (only self) ----
  if (remotePeers.length === 0) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {localCamOff ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white/50 gap-2">
            <VideoOff className="w-12 h-12 stroke-1" />
            <span className="text-xs">Camera is off</span>
          </div>
        ) : (
          <VideoPlayer
            stream={localStream}
            muted
            mirror={localMirror}
            className="w-full h-full"
            label={localLabel}
            objectFit="cover"
          />
        )}
      </div>
    );
  }

  // ---- Layout: 2 people (1 remote + self PiP) — classic view ----
  if (total === 2) {
    const remote = remotePeers[0];
    return (
      <div className={`relative w-full h-full ${className}`}>
        {/* Main: Remote video */}
        <VideoPlayer
          stream={remote.stream}
          isCamOff={remote.isCamOff}
          className="w-full h-full"
          label={remote.displayName}
          objectFit="cover"
          onRetry={onRetry}
        />

        {/* PiP: Self (only rendered if showSelfPip requested) */}
        {showSelfPip && (
          <div className="absolute bottom-28 right-4 sm:bottom-28 sm:right-6 z-30 w-36 sm:w-48 aspect-video rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden bg-black/85 backdrop-blur-md">
            {localCamOff ? (
              <div className="w-full h-full bg-black/80 flex flex-col items-center justify-center text-white/50 text-[10px]">
                <VideoOff className="w-5 h-5 mb-0.5 text-destructive" />
                <span>Cam Off</span>
              </div>
            ) : (
              <VideoPlayer
                stream={localStream}
                muted
                mirror={localMirror}
                className="w-full h-full"
                label="You"
                objectFit="cover"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- Layout: 3-4 people — adaptive grid ----
  return (
    <div className={`relative w-full h-full bg-slate-950 ${className}`}>
      <div
        className={`w-full h-full grid gap-1.5 p-1.5 ${
          total === 3
            ? "grid-cols-2 grid-rows-2"
            : "grid-cols-2 grid-rows-2"
        }`}
      >
        {/* Remote peers */}
        {remotePeers.map((remote, idx) => (
          <div
            key={remote.peerId}
            className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg ${
              // For 3 participants: third tile spans full bottom row
              total === 3 && idx === remotePeers.length - 1
                ? "col-span-1"
                : ""
            }`}
          >
            <VideoPlayer
              stream={remote.stream}
              isCamOff={remote.isCamOff}
              className="w-full h-full"
              label={remote.displayName}
              objectFit="cover"
              onRetry={onRetry}
            />
            {/* Remote mic muted indicator */}
            {remote.isMicMuted && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 flex items-center justify-center z-10">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Self tile */}
        <div
          className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-brand/30 shadow-lg ring-2 ring-brand/20 ${
            total === 3 ? "col-span-1" : ""
          }`}
        >
          {localCamOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 gap-1 bg-gradient-to-br from-slate-950 to-slate-900">
              <VideoOff className="w-8 h-8 stroke-1" />
              <span className="text-[10px]">Camera Off</span>
            </div>
          ) : (
            <VideoPlayer
              stream={localStream}
              muted
              mirror={localMirror}
              className="w-full h-full"
              label={`${localLabel} (You)`}
              objectFit="cover"
            />
          )}
          {/* "You" badge */}
          <div className="absolute top-2 left-2 text-[9px] bg-brand/80 backdrop-blur-md px-2 py-0.5 rounded-full text-white font-bold border border-brand/40 z-10">
            You
          </div>
        </div>
      </div>

      {/* Participant count badge */}
      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-900/90 border border-white/10 backdrop-blur-md text-[10px] text-white/80 font-semibold flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{total} participants</span>
      </div>
    </div>
  );
}
