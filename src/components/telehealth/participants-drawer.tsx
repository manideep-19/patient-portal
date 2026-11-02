"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Copy,
  Check,
  Share2,
  Stethoscope,
  Heart,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { RemoteParticipant, ParticipantRole } from "@/lib/use-webrtc";

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  localName: string;
  localRole: ParticipantRole;
  isLocalMicMuted: boolean;
  isLocalCamOff: boolean;
  remoteParticipants: RemoteParticipant[];
}

export function ParticipantsDrawer({
  isOpen,
  onClose,
  roomId,
  localName,
  localRole,
  isLocalMicMuted,
  isLocalCamOff,
  remoteParticipants,
}: ParticipantsDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const inviteLinks = [
    {
      key: "doctor",
      label: "Doctor Console",
      sub: "Clinical view with EHR notes & vitals",
      url: `${origin}/telehealth/${roomId}/doctor`,
      icon: Stethoscope,
      badge: "Doctor",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      key: "patient",
      label: "Patient Link",
      sub: "Primary patient join link",
      url: `${origin}/telehealth/${roomId}?role=patient`,
      icon: Users,
      badge: "Patient",
      badgeColor: "bg-brand/20 text-brand-soft border-brand/30",
    },
    {
      key: "spouse",
      label: "Spouse / Family Link",
      sub: "Partner / family attendant join link",
      url: `${origin}/telehealth/${roomId}?role=family&name=Vikram%20Sharma`,
      icon: Heart,
      badge: "Family/Spouse",
      badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    },
    {
      key: "coordinator",
      label: "Care Coordinator",
      sub: "Nurse / IVF coordinator join link",
      url: `${origin}/telehealth/${roomId}?role=coordinator&name=Nurse%20Priya`,
      icon: ShieldCheck,
      badge: "Care Team",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
  ];

  const handleCopy = (key: string, url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const getRolePill = (role: ParticipantRole) => {
    switch (role) {
      case "doctor":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Doctor</span>;
      case "family":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">Family/Spouse</span>;
      case "coordinator":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Care Team</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand/20 text-brand-soft border border-brand/30">Patient</span>;
    }
  };

  const totalAttendees = 1 + remoteParticipants.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm h-full bg-slate-950 border-l border-white/15 text-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            <h3 className="font-bold text-sm">Consultation Attendees ({totalAttendees})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Attendees List */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Connected in Room
            </h4>

            {/* Local attendee */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={localName} size="sm" className="ring-1 ring-brand" />
                <div className="truncate">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="truncate">{localName}</span>
                    <span className="text-[10px] text-white/50 font-normal">(You)</span>
                  </div>
                  <div className="mt-0.5">{getRolePill(localRole)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/60 shrink-0">
                {isLocalMicMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {isLocalCamOff ? (
                  <VideoOff className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Remote attendees */}
            {remoteParticipants.map((p) => (
              <div
                key={p.peerId}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={p.displayName} size="sm" className="ring-1 ring-white/20" />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white truncate">
                      {p.displayName}
                    </div>
                    <div className="mt-0.5">{getRolePill(p.role)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60 shrink-0">
                  {p.isMicMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {p.isCamOff ? (
                    <VideoOff className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Invite Links */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Multiple People</span>
            </div>

            <div className="space-y-2">
              {inviteLinks.map((item) => {
                const isCopied = copiedKey === item.key;
                return (
                  <div
                    key={item.key}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <item.icon className="w-3.5 h-3.5 text-brand" />
                        <span className="text-xs font-semibold text-white">{item.label}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/60 leading-tight">{item.sub}</p>
                    <button
                      onClick={() => handleCopy(item.key, item.url, item.label)}
                      className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white/70" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

