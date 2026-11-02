"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  Maximize2,
  Sparkles,
  Wifi,
} from "lucide-react";
import { VideoPlayer } from "@/components/telehealth/video-player";
import { Avatar } from "@/components/ui/avatar";
import type { RemoteParticipant, ParticipantRole, NetworkQuality } from "@/lib/use-webrtc";

interface VideoGridProps {
  localStream: MediaStream | null;
  localDisplayName: string;
  localRole: ParticipantRole;
  isLocalMicMuted: boolean;
  isLocalCamOff: boolean;
  isLocalScreenSharing?: boolean;
  remoteParticipants: RemoteParticipant[];
  className?: string;
  emptyStateAction?: React.ReactNode;
}

export function VideoGrid({
  localStream,
  localDisplayName,
  localRole,
  isLocalMicMuted,
  isLocalCamOff,
  isLocalScreenSharing = false,
  remoteParticipants,
  className = "",
  emptyStateAction,
}: VideoGridProps) {
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);

  const getRoleBadge = (role: ParticipantRole) => {
    switch (role) {
      case "doctor":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
            Doctor
          </span>
        );
      case "family":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/25 text-violet-300 border border-violet-500/40">
            Family / Spouse
          </span>
        );
      case "coordinator":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
            Care Team
          </span>
        );
      case "patient":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand/30 text-brand-soft border border-brand/40">
            Patient
          </span>
        );
    }
  };

  const totalTiles = 1 + remoteParticipants.length;

  // Grid layout classes based on total tiles when unpinned
  const getGridClasses = () => {
    if (pinnedPeerId) return "flex flex-col md:flex-row gap-2 sm:gap-3";
    switch (totalTiles) {
      case 1:
        return "grid grid-cols-1";
      case 2:
        return "grid grid-cols-1 md:grid-cols-2";
      case 3:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid grid-cols-2 grid-rows-2";
      default:
        return "grid grid-cols-2 md:grid-cols-3";
    }
  };

  // Render individual participant tile
  const renderTile = (
    key: string,
    isLocal: boolean,
    name: string,
    role: ParticipantRole,
    stream: MediaStream | null,
    isMicMuted: boolean,
    isCamOff: boolean,
    peerId?: string
  ) => {
    const isPinned = pinnedPeerId === (isLocal ? "local" : peerId);

    return (
      <div
        key={key}
        className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg flex items-center justify-center transition-all duration-200 group ${
          isPinned
            ? "flex-1 min-h-[300px] md:min-h-[440px] ring-2 ring-brand"
            : totalTiles === 1
            ? "w-full h-full min-h-[360px]"
            : "w-full h-full min-h-[200px] sm:min-h-[260px]"
        }`}
      >
        {/* Live Video or Camera Off Fallback */}
        {stream && !isCamOff ? (
          <VideoPlayer
            stream={stream}
            mirror={isLocal && !isLocalScreenSharing}
            className="w-full h-full object-cover"
            showLabel={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-ink p-4 text-center">
            <div className="relative">
              <Avatar
                name={name}
                size="lg"
                className="ring-2 ring-white/10 shadow-lift"
              />
              {isMicMuted && (
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-destructive text-white shadow-soft">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-white/90">{name}</p>
            <p className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5">
              <VideoOff className="w-3 h-3" />
              <span>Camera switched off</span>
            </p>
          </div>
        )}

        {/* Top Floating Controls on Hover */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
          {/* Mute badge */}
          {isMicMuted ? (
            <div className="px-2 py-1 rounded-lg bg-destructive/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-soft">
              <MicOff className="w-3 h-3" />
              <span>Muted</span>
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-lg bg-black/50 backdrop-blur-xs text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
              <Mic className="w-3 h-3" />
              <span>Active</span>
            </div>
          )}

          {/* Pin toggle */}
          <button
            onClick={() => setPinnedPeerId(isPinned ? null : isLocal ? "local" : peerId || null)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white cursor-pointer"
            title={isPinned ? "Unpin view" : "Pin participant to spotlight"}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5 text-brand" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Bottom Label & Role Tag */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/10 max-w-[85%] truncate">
            <span className="text-xs font-bold text-white truncate">
              {name} {isLocal && <span className="text-white/60 font-normal">(You)</span>}
            </span>
            {getRoleBadge(role)}
          </div>
        </div>
      </div>
    );
  };

  // If no remote participants have joined yet and caller is alone
  if (remoteParticipants.length === 0) {
    return (
      <div className={`relative w-full h-full flex flex-col justify-center items-center p-3 sm:p-5 ${className}`}>
        {/* Local Stream Main View */}
        <div className="w-full h-full max-w-4xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden bg-slate-900/90 border border-white/10 relative shadow-2xl">
          {renderTile(
            "local-solo",
            true,
            localDisplayName,
            localRole,
            localStream,
            isLocalMicMuted,
            isLocalCamOff
          )}

          {/* Floating Waiting Card Overlay */}
          <div className="absolute inset-x-4 bottom-20 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-white">Waiting for Others to Join</span>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed">
              Your audio and camera are connected. You can invite the doctor, spouse/family member, or clinical team to this room.
            </p>
            {emptyStateAction && <div className="pt-1">{emptyStateAction}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Multi-party Grid Layout
  return (
    <div className={`w-full h-full p-2 sm:p-4 overflow-y-auto ${className}`}>
      <div className={`w-full h-full ${getGridClasses()} gap-2.5 sm:gap-3.5`}>
        {/* Remote Participants */}
        {remoteParticipants.map((p) =>
          renderTile(
            p.peerId,
            false,
            p.displayName,
            p.role,
            p.stream,
            p.isMicMuted ?? false,
            p.isCamOff ?? false,
            p.peerId
          )
        )}

        {/* Local Participant Tile */}
        {renderTile(
          "local",
          true,
          localDisplayName,
          localRole,
          localStream,
          isLocalMicMuted,
          isLocalCamOff
        )}
      </div>
    </div>
  );
}

