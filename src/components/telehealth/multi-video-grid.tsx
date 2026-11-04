"use client";

import React from "react";
import { VideoPlayer } from "@/components/telehealth/video-player";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Stethoscope, User, Users } from "lucide-react";
import type { RemotePeer } from "@/lib/use-webrtc";

interface MultiVideoGridProps {
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  isLocalCamOff: boolean;
  isLocalMicMuted: boolean;
  is240pQuality?: boolean;
  isVideoPausedForNetwork?: boolean;
  selfName: string;
  selfRole?: "patient" | "doctor";
  onToggleLocalMic?: () => void;
  onToggleLocalCam?: () => void;
}

export function MultiVideoGrid({
  localStream,
  remotePeers,
  isLocalCamOff,
  isLocalMicMuted,
  is240pQuality = false,
  selfName,
  selfRole = "patient",
}: MultiVideoGridProps) {
  const totalParticipants = remotePeers.length + 1; // including self

  // Dynamic Grid CSS layout classes based on total participant count
  const getGridClasses = () => {
    switch (remotePeers.length) {
      case 0:
        return "grid-cols-1 grid-rows-1";
      case 1:
        return "grid-cols-1 sm:grid-cols-2 grid-rows-1 sm:grid-rows-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      case 3:
        return "grid-cols-2 grid-rows-2";
      case 4:
      case 5:
        return "grid-cols-2 sm:grid-cols-3";
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "doctor") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
          <Stethoscope className="w-3 h-3" />
          <span>Doctor</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold bg-brand/20 text-brand-soft border border-brand/40 px-2 py-0.5 rounded-full">
        <User className="w-3 h-3" />
        <span>{role === "guest" ? "Family / Guest" : "Patient"}</span>
      </span>
    );
  };

  return (
    <div className="relative w-full h-full p-2 sm:p-4 flex flex-col justify-center">
      {/* Participant Count Pill */}
      {remotePeers.length > 1 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-white text-xs backdrop-blur-md shadow-lg">
          <Users className="w-3.5 h-3.5 text-brand" />
          <span className="font-semibold">{totalParticipants} Participants</span>
        </div>
      )}

      <div className={`grid ${getGridClasses()} gap-2 sm:gap-4 w-full h-full max-h-[calc(100vh-140px)]`}>
        {/* Remote Participants */}
        {remotePeers.map((peer) => {
          const isDoctor = peer.role === "doctor";
          const fallbackAvatar = isDoctor
            ? "/branding/spec-fertility.jpg"
            : "/branding/avatar-ananya.jpg";

          return (
            <div
              key={peer.peerId}
              className="relative w-full h-full min-h-[220px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl transition-all flex items-center justify-center"
            >
              <VideoPlayer
                stream={peer.stream}
                className="w-full h-full"
                label={peer.displayName}
                objectFit="cover"
                isCamOff={peer.isCamOff}
                is240pQuality={peer.is240p}
                fallbackName={peer.displayName}
                fallbackAvatar={fallbackAvatar}
                fallbackRole={isDoctor ? "Doctor" : "Patient"}
              />

              {/* Bottom Info Bar */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 shadow-md">
                    {peer.displayName}
                  </span>
                  {getRoleBadge(peer.role)}
                </div>

                {peer.isMicMuted && (
                  <span className="p-1 rounded-full bg-destructive text-white shadow-md">
                    <MicOff className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Self View Tile in Grid */}
        <div className="relative w-full h-full min-h-[220px] rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
          {isLocalCamOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-slate-950 p-4 text-center">
              <Avatar name={selfName} size="lg" className="mb-2 ring-2 ring-brand/40" />
              <span className="text-xs font-bold text-white">{selfName} (You)</span>
              <span className="text-[10px] text-white/40 mt-1">Camera is off</span>
            </div>
          ) : (
            <VideoPlayer
              stream={localStream}
              muted
              mirror
              className="w-full h-full"
              label={`${selfName} (You)`}
              objectFit="cover"
              is240pQuality={is240pQuality}
            />
          )}

          {/* Bottom Info Bar for Self */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 shadow-md">
                {selfName} (You)
              </span>
              {getRoleBadge(selfRole)}
            </div>

            {isLocalMicMuted && (
              <span className="p-1 rounded-full bg-destructive text-white shadow-md">
                <MicOff className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
