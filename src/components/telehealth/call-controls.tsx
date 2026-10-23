"use client";

import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  MonitorUp,
  MonitorOff,
  MessageSquare,
} from "lucide-react";

interface CallControlsProps {
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  unreadChatCount: number;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isMicMuted,
  isCamOff,
  isScreenSharing,
  isChatOpen,
  unreadChatCount,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="w-full p-2 sm:p-4 pb-4 sm:pb-6 bg-gradient-to-t from-black via-black/85 to-transparent flex items-center justify-center safe-bottom pointer-events-auto select-none">
      <div className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 px-2.5 sm:px-4 rounded-full bg-slate-950/90 border border-white/20 backdrop-blur-2xl shadow-2xl max-w-[96vw] overflow-x-auto scrollbar-none">
        {/* Mic Toggle */}
        <ControlButton
          active={isMicMuted}
          icon={
            isMicMuted ? (
              <MicOff className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />
            )
          }
          label="Toggle Microphone"
          title={isMicMuted ? "Microphone Muted (Click to Unmute)" : "Microphone Active (Click to Mute)"}
          onClick={onToggleMic}
          activeClass="bg-destructive text-white shadow-soft ring-2 ring-destructive/40"
        />

        {/* Camera Toggle */}
        <ControlButton
          active={isCamOff}
          icon={
            isCamOff ? (
              <VideoOff className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            ) : (
              <Video className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />
            )
          }
          label="Toggle Camera"
          title={isCamOff ? "Camera Switched Off (Click to Turn On)" : "Camera Active (Click to Turn Off)"}
          onClick={onToggleCamera}
          activeClass="bg-destructive text-white shadow-soft ring-2 ring-destructive/40"
        />

        {/* Screen Share */}
        <ControlButton
          active={isScreenSharing}
          icon={
            isScreenSharing ? (
              <MonitorOff className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-ink" />
            ) : (
              <MonitorUp className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white/90" />
            )
          }
          label="Screen Share"
          title={isScreenSharing ? "Sharing Screen (Click to Stop)" : "Share Your Screen"}
          onClick={onToggleScreenShare}
          activeClass="bg-amber-400 text-ink shadow-soft"
        />

        {/* Switch Camera */}
        <ControlButton
          active={false}
          icon={<SwitchCamera className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white/90" />}
          label="Switch Camera"
          title="Switch Camera (Front/Rear)"
          onClick={onSwitchCamera}
        />

        {/* Chat Toggle */}
        <div className="relative">
          <ControlButton
            active={isChatOpen}
            icon={<MessageSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5" />}
            label="Toggle Chat"
            title={isChatOpen ? "Close In-Call Chat" : "Open In-Call Chat"}
            onClick={onToggleChat}
            activeClass="bg-brand text-white shadow-soft"
          />
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 min-w-[18px] sm:min-w-[20px] h-4.5 sm:h-5 px-1 bg-destructive text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="w-[1px] h-6 sm:h-7 bg-white/20 mx-0.5" />

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive text-white flex items-center justify-center shadow-lift hover:bg-destructive/90 transition-all cursor-pointer active:scale-95 group shrink-0"
          aria-label="End Consultation"
          title="End Consultation"
        >
          <PhoneOff className="w-4.5 h-4.5 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Control Button (shared)                                            */
/* ------------------------------------------------------------------ */

function ControlButton({
  active,
  icon,
  label,
  title,
  onClick,
  activeClass = "bg-brand text-white",
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  title?: string;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
        active
          ? activeClass
          : "bg-white/15 text-white hover:bg-white/25 active:scale-95 border border-white/10"
      }`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
