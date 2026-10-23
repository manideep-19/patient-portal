"use client";

import React, { useState } from "react";
import { VideoPlayer } from "./video-player";
import {
  VideoOff,
  Mic,
  MicOff,
  Pin,
  PinOff,
  Maximize2,
  Grid,
  Users,
} from "lucide-react";
import type { RemotePeer } from "@/lib/use-webrtc";

interface VideoGridProps {
  localStream: MediaStream | null;
  localLabel: string;
  localMirror?: boolean;
  localCamOff?: boolean;
  localMicMuted?: boolean;
  remotePeers: RemotePeer[];
  /** Called when user taps the Reconnect button */
  onRetry?: () => void;
  className?: string;
}

interface ParticipantTileData {
  id: string;
  name: string;
  stream: MediaStream | null;
  isCamOff: boolean;
  isMicMuted: boolean;
  isSelf: boolean;
  mirror?: boolean;
}

/**
 * Extracts initials for the Google Meet / Zoom style camera-off avatar
 */
function getInitials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, "").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Dynamic background gradient for avatars based on name hash (like Google Meet)
 */
function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-blue-600 via-indigo-600 to-purple-700",
    "from-emerald-600 via-teal-600 to-cyan-700",
    "from-rose-600 via-pink-600 to-amber-700",
    "from-violet-600 via-purple-600 to-fuchsia-700",
    "from-amber-600 via-orange-600 to-red-700",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

/**
 * World-Class Google Meet & Zoom Adaptive Video Grid
 *
 * Supports:
 * - 1 Person: Centered prominent tile
 * - 2 People: 2 equal side-by-side tiles (stacked on mobile)
 * - 3 People: Google Meet 2-top + 1-bottom centered layout
 * - 4 People: 2x2 quad gallery grid
 * - Spotlight / Pin: Pin any participant to maximize them with side filmstrip
 * - Camera Off: Google Meet circular initials avatar with pulsing aura
 * - Live mic mute/unmute indicators on every tile
 */
export function VideoGrid({
  localStream,
  localLabel,
  localMirror = true,
  localCamOff = false,
  localMicMuted = false,
  remotePeers,
  onRetry,
  className = "",
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Combine self + all active remote peers into unified list
  const selfParticipant: ParticipantTileData = {
    id: "self",
    name: localLabel,
    stream: localStream,
    isCamOff: localCamOff,
    isMicMuted: localMicMuted,
    isSelf: true,
    mirror: localMirror,
  };

  const remoteParticipants: ParticipantTileData[] = remotePeers.map((p) => ({
    id: p.peerId,
    name: p.displayName,
    stream: p.stream,
    isCamOff: p.isCamOff,
    isMicMuted: p.isMicMuted,
    isSelf: false,
    mirror: false,
  }));

  const allParticipants = [selfParticipant, ...remoteParticipants];
  const total = allParticipants.length;

  // Toggle pin/spotlight
  const handleTogglePin = (id: string) => {
    setPinnedId((prev) => (prev === id ? null : id));
  };

  // If a pinned participant exists, show Spotlight View
  if (pinnedId) {
    const pinned = allParticipants.find((p) => p.id === pinnedId) || allParticipants[0];
    const filmstrip = allParticipants.filter((p) => p.id !== pinned.id);

    return (
      <div className={`relative w-full h-full bg-slate-950 p-2 sm:p-3 flex flex-col md:flex-row gap-2.5 overflow-hidden ${className}`}>
        {/* Main Stage (Pinned Participant) */}
        <div className="flex-1 h-full min-h-0 min-w-0 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
          <ParticipantTile
            participant={pinned}
            isPinned={true}
            onTogglePin={() => handleTogglePin(pinned.id)}
            onRetry={onRetry}
            size="large"
          />
        </div>

        {/* Filmstrip (Other Participants) */}
        {filmstrip.length > 0 && (
          <div className="w-full md:w-56 lg:w-64 shrink-0 flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto scrollbar-none h-32 md:h-full">
            {filmstrip.map((p) => (
              <div
                key={p.id}
                className="w-44 md:w-full aspect-video shrink-0 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg relative group cursor-pointer"
                onClick={() => setPinnedId(p.id)}
              >
                <ParticipantTile
                  participant={p}
                  isPinned={false}
                  onTogglePin={() => handleTogglePin(p.id)}
                  onRetry={onRetry}
                  size="compact"
                />
              </div>
            ))}
          </div>
        )}

        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setPinnedId(null)}
            className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Switch to Grid View</span>
          </button>
        </div>
      </div>
    );
  }

  // =================================================================
  // EQUAL GRID LAYOUTS (Google Meet / Zoom style)
  // =================================================================

  return (
    <div className={`relative w-full h-full bg-slate-950 p-2 sm:p-3 overflow-hidden select-none ${className}`}>
      {/* 1 Participant: Centered prominent tile */}
      {total === 1 && (
        <div className="w-full h-full flex items-center justify-center p-2">
          <div className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl relative">
            <ParticipantTile
              participant={allParticipants[0]}
              isPinned={false}
              onTogglePin={() => handleTogglePin(allParticipants[0].id)}
              onRetry={onRetry}
              size="large"
            />
          </div>
        </div>
      )}

      {/* 2 Participants: Side-by-side equal split (Google Meet standard) */}
      {total === 2 && (
        <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 p-1">
          {allParticipants.map((p) => (
            <div
              key={p.id}
              className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl relative"
            >
              <ParticipantTile
                participant={p}
                isPinned={false}
                onTogglePin={() => handleTogglePin(p.id)}
                onRetry={onRetry}
                size="medium"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 Participants: Google Meet 2-top + 1-bottom centered */}
      {total === 3 && (
        <div className="w-full h-full flex flex-col gap-2.5 sm:gap-3 p-1">
          {/* Top row: 2 tiles */}
          <div className="flex-1 grid grid-cols-2 gap-2.5 sm:gap-3 min-h-0">
            {allParticipants.slice(0, 2).map((p) => (
              <div
                key={p.id}
                className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl relative"
              >
                <ParticipantTile
                  participant={p}
                  isPinned={false}
                  onTogglePin={() => handleTogglePin(p.id)}
                  onRetry={onRetry}
                  size="medium"
                />
              </div>
            ))}
          </div>

          {/* Bottom row: 1 tile centered */}
          <div className="flex-1 flex justify-center min-h-0">
            <div className="w-full md:w-1/2 h-full min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl relative">
              <ParticipantTile
                participant={allParticipants[2]}
                isPinned={false}
                onTogglePin={() => handleTogglePin(allParticipants[2].id)}
                onRetry={onRetry}
                size="medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4 Participants: 2x2 Quad Grid (Zoom / Google Meet Grid) */}
      {total >= 4 && (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3 p-1">
          {allParticipants.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl relative"
            >
              <ParticipantTile
                participant={p}
                isPinned={false}
                onTogglePin={() => handleTogglePin(p.id)}
                onRetry={onRetry}
                size="compact"
              />
            </div>
          ))}
        </div>
      )}

      {/* Active participant count floating badge in top-right */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-white/90 font-semibold flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{total} in call</span>
        </div>
      </div>
    </div>
  );
}

// =================================================================
// PARTICIPANT TILE COMPONENT (Individual video / avatar card)
// =================================================================

function ParticipantTile({
  participant,
  isPinned,
  onTogglePin,
  onRetry,
  size = "medium",
}: {
  participant: ParticipantTileData;
  isPinned: boolean;
  onTogglePin: () => void;
  onRetry?: () => void;
  size?: "compact" | "medium" | "large";
}) {
  const { name, stream, isCamOff, isMicMuted, isSelf, mirror } = participant;
  const initials = getInitials(name);
  const gradient = getAvatarGradient(name);

  // Audio-reactive border
  const borderRing = !isMicMuted
    ? "ring-2 ring-emerald-500/70"
    : "border border-white/10";

  return (
    <div className={`relative w-full h-full bg-slate-900 overflow-hidden group select-none ${borderRing}`}>
      {/* 1. Video Player (when camera is on and stream exists) */}
      {!isCamOff && stream ? (
        <VideoPlayer
          stream={stream}
          muted={isSelf} // Self MUST be muted to prevent audio feedback
          mirror={mirror}
          className="w-full h-full"
          label=""
          showLabel={false}
          objectFit="cover"
          onRetry={onRetry}
        />
      ) : (
        /* 2. Google Meet Camera-Off Avatar (Deep gradient aura + initials) */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 text-center">
          <div
            className={`rounded-full bg-gradient-to-tr ${gradient} text-white font-bold flex items-center justify-center shadow-2xl ring-4 ring-white/10 animate-fade-in ${
              size === "large"
                ? "w-28 h-28 text-3xl"
                : size === "medium"
                ? "w-20 h-20 text-xl"
                : "w-14 h-14 text-base"
            }`}
          >
            {initials}
          </div>
          <div className="mt-3 text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[80%]">
            {name}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 flex items-center gap-1">
            <VideoOff className="w-3 h-3 text-slate-500" />
            <span>Camera switched off</span>
          </div>
        </div>
      )}

      {/* 3. Name Pill Overlay (Bottom Left) */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-white shadow-lg pointer-events-none">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            !isMicMuted ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
          }`}
        />
        <span className="text-[11px] sm:text-xs font-semibold truncate max-w-[140px] sm:max-w-[200px]">
          {isSelf ? "You" : name}
        </span>
      </div>

      {/* 4. Mic Status Indicator (Top Right) */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {isMicMuted ? (
          <div
            className="p-1.5 rounded-full bg-destructive/90 text-white backdrop-blur-md shadow-lg border border-destructive/40"
            title="Microphone Muted"
          >
            <MicOff className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div
            className="p-1.5 rounded-full bg-black/60 text-emerald-400 backdrop-blur-md shadow-lg border border-white/10"
            title="Microphone Active"
          >
            <Mic className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* 5. Pin / Spotlight Action (Hover on top-left) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={`absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${
          isPinned
            ? "bg-brand text-white opacity-100 shadow-lift"
            : "bg-black/60 text-white/80 hover:bg-black/80 hover:text-white border border-white/10"
        }`}
        title={isPinned ? "Unpin participant" : "Pin participant to focus"}
      >
        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
