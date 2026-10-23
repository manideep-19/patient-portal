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
    <div className="relative z-20 p-4 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-3 sm:gap-4 safe-bottom">
      {/* Mic Toggle */}
      <ControlButton
        active={isMicMuted}
        icon={isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        label="Toggle Microphone"
        onClick={onToggleMic}
        activeClass="bg-destructive text-white shadow-soft"
      />

      {/* Camera Toggle */}
      <ControlButton
        active={isCamOff}
        icon={isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        label="Toggle Camera"
        onClick={onToggleCamera}
        activeClass="bg-destructive text-white shadow-soft"
      />

      {/* Screen Share */}
      <ControlButton
        active={isScreenSharing}
        icon={
          isScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <MonitorUp className="w-5 h-5" />
          )
        }
        label="Screen Share"
        onClick={onToggleScreenShare}
        activeClass="bg-amber-500 text-ink"
      />

      {/* Switch Camera */}
      <ControlButton
        active={false}
        icon={<SwitchCamera className="w-5 h-5" />}
        label="Switch Camera"
        onClick={onSwitchCamera}
      />

      {/* Chat Toggle */}
      <div className="relative">
        <ControlButton
          active={isChatOpen}
          icon={<MessageSquare className="w-5 h-5" />}
          label="Toggle Chat"
          onClick={onToggleChat}
          activeClass="bg-brand text-white"
        />
        {unreadChatCount > 0 && !isChatOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadChatCount > 9 ? "9+" : unreadChatCount}
          </span>
        )}
      </div>

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        className="w-13 h-13 rounded-full bg-destructive text-white flex items-center justify-center shadow-lift hover:bg-destructive/90 transition-all cursor-pointer active:scale-95 ml-2"
        aria-label="End Consultation"
      >
        <PhoneOff className="w-6 h-6" />
      </button>
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
  onClick,
  activeClass = "bg-brand text-white",
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
        active ? activeClass : "bg-white/20 text-white hover:bg-white/30"
      }`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
