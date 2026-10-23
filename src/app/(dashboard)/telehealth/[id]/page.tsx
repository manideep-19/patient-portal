"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Copy,
  Loader2,
  AlertTriangle,
  MonitorUp,
  ExternalLink,
  Share2,
  MessageSquare,
  X,
  ArrowRight,
  UserPlus,
  Users,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWebRTC, type ConnectionState, type ChatMessage } from "@/lib/use-webrtc";
import { VideoPlayer } from "@/components/telehealth/video-player";
import { VideoGrid } from "@/components/telehealth/video-grid";
import { InviteModal } from "@/components/telehealth/invite-modal";
import { CallControls } from "@/components/telehealth/call-controls";
import { ChatPanel } from "@/components/telehealth/chat-panel";
import { NetworkIndicator } from "@/components/telehealth/network-indicator";
import { DeviceSelector } from "@/components/telehealth/device-selector";
import { StartCallModal } from "@/components/telehealth/start-call-modal";

interface PageProps {
  params: Promise<{ id: string }>;
}

type PageState = "prejoin" | "in_call" | "ended";

export default function TelehealthRoomPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getAppointmentById, patient } = usePatient();

  const appointment = getAppointmentById(resolvedParams.id);

  // If role is doctor, redirect to doctor console immediately
  useEffect(() => {
    if (searchParams.get("role") === "doctor") {
      router.replace(`/telehealth/${resolvedParams.id}/doctor`);
    }
  }, [searchParams, resolvedParams.id, router]);

  // Page-level state
  const [pageState, setPageState] = useState<PageState>("prejoin");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [latestDoctorMessage, setLatestDoctorMessage] = useState<ChatMessage | null>(null);
  const prevMessagesCountRef = useRef(0);

  // Check if joining as a guest / specialist / family member
  const roleParam = searchParams.get("role");
  const isGuest = roleParam === "guest" || searchParams.get("guest") === "true";
  const guestName = searchParams.get("name") || (isGuest ? "Guest Participant" : patient.name);
  const currentDisplayName = isGuest ? guestName : patient.name;
  const currentRole: "patient" | "guest" = isGuest ? "guest" : "patient";

  // WebRTC hook
  const rtc = useWebRTC(resolvedParams.id, {
    role: currentRole,
    displayName: currentDisplayName,
  });

  const doctorName = appointment?.doctorName || "Dr. Sunita Sharma";
  const doctorSpecialty = appointment?.doctorSpecialty || "Fertility & IVF Specialist";
  const doctorAvatar = appointment?.doctorAvatar || "/branding/spec-fertility.jpg";

  // Doctor peer ID for this room
  const doctorPeerId = rtc.peerId
    ? rtc.peerId.replace("-patient-", "-doctor-").replace(/-.{5}$/, "")
    : null;

  // Format timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Request camera/mic on mount
  useEffect(() => {
    rtc.startLocalMedia(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transition to in_call when connected
  useEffect(() => {
    if (rtc.connectionState === "connected" && pageState === "prejoin") {
      setPageState("in_call");
      toast.success(`Connected — ${rtc.participantCount} in call`, {
        description: "Encrypted HD teleconsultation active.",
      });
    }
  }, [rtc.connectionState, pageState, rtc.participantCount]);

  // Track unread chat messages & alert on incoming doctor messages
  useEffect(() => {
    if (rtc.chatMessages.length > prevMessagesCountRef.current) {
      const lastMsg = rtc.chatMessages[rtc.chatMessages.length - 1];
      if (lastMsg && lastMsg.sender === "remote") {
        if (!isChatOpen) {
          setLatestDoctorMessage(lastMsg);
          toast.info(`${doctorName}: "${lastMsg.text}"`, {
            description: "Click to open chat & reply",
            action: {
              label: "Open Chat",
              onClick: () => {
                setIsChatOpen(true);
                setLatestDoctorMessage(null);
                setUnreadChatCount(0);
              },
            },
            duration: 6000,
          });
        }
      }
    }
    prevMessagesCountRef.current = rtc.chatMessages.length;

    if (!isChatOpen) {
      const remoteMessages = rtc.chatMessages.filter((m) => m.sender === "remote");
      setUnreadChatCount(remoteMessages.length);
    } else {
      setUnreadChatCount(0);
    }
  }, [rtc.chatMessages, isChatOpen, doctorName]);

  // Handle end call
  const handleEndCall = () => {
    setShowEndConfirm(false);
    rtc.disconnect();
    setPageState("ended");
    toast.info("Consultation completed", {
      description: "Session summary is being generated.",
    });
  };

  const doctorUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/telehealth/${resolvedParams.id}/doctor${
          rtc.peerId ? `?patientPeerId=${encodeURIComponent(rtc.peerId)}` : ""
        }`
      : `/telehealth/${resolvedParams.id}/doctor`;

  // Handle join call
  const handleJoinCall = () => {
    setPageState("in_call");
    toast.info("Entered Consultation Room", {
      description: "Waiting for doctor to connect...",
    });
  };

  // Copy room ID
  const handleCopyRoomId = () => {
    if (rtc.peerId) {
      navigator.clipboard.writeText(rtc.peerId).then(() => {
        toast.success("Room ID copied to clipboard");
      });
    }
  };

  // Copy doctor link
  const handleCopyDoctorLink = () => {
    if (doctorUrl) {
      navigator.clipboard.writeText(doctorUrl).then(() => {
        toast.success("Doctor link copied!", {
          description: "Open this link in another tab to simulate the doctor joining.",
        });
      });
    }
  };

  // Handle camera switch (front/back camera on phones and tablets)
  const handleSwitchCamera = async () => {
    try {
      await rtc.switchCamera();
      toast.info(
        `Switched to ${rtc.facingMode === "user" ? "rear" : "front"} camera`
      );
    } catch {
      toast.info("Camera view switched");
    }
  };

  // Handle screen share with mobile device fallback
  const handleToggleScreenShare = async () => {
    try {
      await rtc.toggleScreenShare();
    } catch (err: any) {
      toast.error(
        err?.message || "Screen sharing is not supported on this device"
      );
    }
  };

  // -----------------------------------------------------------------
  // PRE-JOIN SCREEN
  // -----------------------------------------------------------------
  if (pageState === "prejoin") {
    const isMediaReady =
      rtc.connectionState !== "requesting_media" && rtc.localStream !== null;
    const isWaiting =
      rtc.connectionState === "waiting" || rtc.connectionState === "idle";
    const isConnecting = rtc.connectionState === "connecting";

    return (
      <div className="min-h-screen bg-ink text-white flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Waiting Room</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-brand-soft hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full border border-white/20 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-brand" />
              <span>Share Links</span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-success bg-success/20 px-2.5 py-1 rounded-full border border-success/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Room</span>
            </div>
          </div>
        </div>

        {/* Self-preview section */}
        <div className="my-auto py-6 space-y-5">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Ready to Join Teleconsultation?
            </h1>
            <p className="text-xs text-white/70 mt-1">
              Consulting with <strong className="text-white">{doctorName}</strong>
            </p>
          </div>

          {/* Live camera preview */}
          <div className="relative w-full aspect-video rounded-3xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
            {rtc.error ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/50 p-4 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <span className="text-xs text-amber-300">{rtc.error}</span>
                <button
                  onClick={() => rtc.startLocalMedia(true, true)}
                  className="mt-2 text-xs text-brand underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : rtc.isCamOff ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/50">
                <VideoOff className="w-12 h-12 stroke-1" />
                <span className="text-xs">Camera is switched off</span>
              </div>
            ) : (
              <VideoPlayer
                stream={rtc.localStream}
                muted
                mirror={rtc.facingMode === "user"}
                className="w-full h-full"
                label={`${patient.name} (You)`}
                objectFit="cover"
              />
            )}

            {/* In-preview toggles */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={rtc.toggleMic}
                className={`p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                  rtc.isMicMuted
                    ? "bg-destructive text-white"
                    : "bg-black/50 text-white hover:bg-black/80"
                }`}
                aria-label="Toggle Microphone"
              >
                {rtc.isMicMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={rtc.toggleCamera}
                className={`p-2.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                  rtc.isCamOff
                    ? "bg-destructive text-white"
                    : "bg-black/50 text-white hover:bg-black/80"
                }`}
                aria-label="Toggle Camera"
              >
                {rtc.isCamOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Device status checks */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isMediaReady ? "bg-success animate-pulse" : "bg-amber-400"
                }`}
              />
              <div>
                <div className="font-semibold text-white">Microphone</div>
                <div className="text-[11px] text-white/60">
                  {rtc.isMicMuted
                    ? "Muted"
                    : isMediaReady
                    ? "Active (Good audio)"
                    : "Requesting access..."}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  rtc.connectionState === "waiting" ? "bg-success" : "bg-amber-400"
                }`}
              />
              <div>
                <div className="font-semibold text-white">Network</div>
                <div className="text-[11px] text-white/60">
                  {rtc.connectionState === "waiting"
                    ? "Ready"
                    : rtc.connectionState === "requesting_media"
                    ? "Setting up..."
                    : "Connecting..."}
                </div>
              </div>
            </div>
          </div>

          {/* Room ID & Doctor Link */}
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[11px] text-white/50 mb-1">Room ID (for testing)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-brand-soft font-mono truncate">
                  {rtc.peerId || `smrko-${resolvedParams.id}-patient (connecting...)`}
                </code>
                <button
                  onClick={handleCopyRoomId}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
                  title="Copy Room ID"
                >
                  <Copy className="w-3.5 h-3.5 text-white/70" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={doctorUrl}
                className="flex-1 py-2 px-3 rounded-xl bg-brand/20 hover:bg-brand/30 text-brand-soft border border-brand/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Join as Doctor / Provider</span>
              </a>
              <button
                onClick={handleCopyDoctorLink}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-xs transition-colors cursor-pointer"
                title="Copy Doctor Invite Link"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Join button */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleJoinCall}
            className="text-base font-bold shadow-lift"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-1 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5 mr-1" />
                <span>Enter Consultation Room</span>
              </>
            )}
          </Button>
          <p className="text-[11px] text-center text-white/50">
            Click to enter your secure consultation room.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // POST-CALL SUMMARY SCREEN
  // -----------------------------------------------------------------
  if (pageState === "ended") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center max-w-md mx-auto p-6 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-ink">Consultation Ended</h2>
          <p className="text-xs text-ink-soft mt-1">
            Duration: {formatTimer(rtc.callDurationSeconds || 0)} with {doctorName}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border text-left text-xs space-y-3 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-ink">
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Session Summary</span>
          </div>
          <p className="text-ink-soft leading-relaxed">
            1. Your video consultation with {doctorName} lasted {formatTimer(rtc.callDurationSeconds || 0)}.
          </p>
          <p className="text-ink-soft leading-relaxed">
            2. {rtc.chatMessages.length > 0
              ? `${rtc.chatMessages.length} messages were exchanged during the session.`
              : "No chat messages were exchanged."}
          </p>
          <p className="text-ink-soft leading-relaxed">
            3. Consultation notes and prescriptions will be updated by your doctor.
          </p>
        </div>

        <div className="space-y-2">
          <Link
            href="/appointments"
            className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-xs block text-center shadow-soft"
          >
            View Appointments
          </Link>
          <Link
            href="/home"
            className="w-full py-3 rounded-xl border border-border bg-card text-ink font-semibold text-xs block text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // IN-CALL SCREEN
  // -----------------------------------------------------------------
  return (
    <div className="relative h-[100dvh] w-full bg-ink text-white overflow-hidden select-none">
      {/* 1. Main Video Area — Multi-Party Grid */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950">
        {rtc.remotePeers.length > 0 ? (
          <VideoGrid
            localStream={rtc.localStream}
            localLabel={patient.name}
            localMirror={rtc.facingMode === "user"}
            localCamOff={rtc.isCamOff}
            remotePeers={rtc.remotePeers}
            onRetry={rtc.restartConnection}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-ink gap-3 text-center p-6">
            <Avatar
              name={doctorName}
              src={doctorAvatar}
              size="xl"
              className="ring-4 ring-brand/40 animate-pulse-subtle"
            />
            <h3 className="text-lg font-bold">{doctorName}</h3>
            <p className="text-xs text-white/60">Waiting for others to join...</p>
            <div className="pt-2 flex flex-col items-center gap-2">
              <a
                href={doctorUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-xs font-semibold text-white shadow-soft transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Doctor Tab to Connect</span>
              </a>
              <button
                onClick={handleCopyDoctorLink}
                className="text-[11px] text-white/50 hover:text-white underline cursor-pointer"
              >
                Copy Doctor Join Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <Avatar name={doctorName} src={doctorAvatar} size="sm" className="ring-2 ring-brand" />
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>{rtc.participantCount > 2 ? `Group Call` : doctorName}</span>
              <Badge variant="success" size="sm" className="text-[10px] py-0 px-1.5">
                {rtc.participantCount} in call
              </Badge>
            </div>
            <div className="text-[11px] text-white/70 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-brand" />
                {formatTimer(rtc.callDurationSeconds)}
              </span>
              <span>•</span>
              <NetworkIndicator quality={rtc.networkQuality} />
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {rtc.isScreenSharing && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
              <MonitorUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sharing Screen</span>
            </div>
          )}

          {/* Invite / Add Participant Button */}
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/10"
            title="Invite Specialist or Family Member (Up to 4 participants)"
          >
            <UserPlus className="w-3.5 h-3.5 text-brand" />
            <span>Invite ({rtc.participantCount}/4)</span>
          </button>

          {/* Quick Chat Button in Top Bar */}
          <button
            onClick={() => {
              const next = !isChatOpen;
              setIsChatOpen(next);
              if (next) {
                setUnreadChatCount(0);
                setLatestDoctorMessage(null);
              }
            }}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer ${
              isChatOpen
                ? "bg-brand text-white border-brand shadow-soft"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
            title={isChatOpen ? "Close Chat" : "Open Chat with Doctor"}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="min-w-[18px] h-4 px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-brand-soft" />
            <span className="hidden sm:inline">Invite / Share Link</span>
          </button>
        </div>
      </div>

      {/* 3. Reconnecting Banner with 1-click active recovery */}
      {rtc.connectionState === "reconnecting" && (
        <div className="absolute top-16 left-4 right-4 z-35 p-3 rounded-2xl bg-amber-500/95 text-slate-950 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Connection temporarily interrupted. Reconnecting stream...</span>
          </div>
          <button
            onClick={rtc.restartConnection}
            className="px-3 py-1 rounded-xl bg-slate-950 text-white text-[11px] font-bold hover:bg-slate-900 transition-colors shrink-0 cursor-pointer shadow-soft"
          >
            Reconnect Now
          </button>
        </div>
      )}

      {/* 4. Floating Incoming Message Alert Toast/Banner */}
      {!isChatOpen && latestDoctorMessage && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-35 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-brand/40 shadow-2xl backdrop-blur-2xl flex items-start gap-3 text-white ring-1 ring-white/10">
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center shrink-0 text-brand-soft">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-brand-soft truncate">{doctorName}</span>
                <span className="text-[10px] text-white/50">{latestDoctorMessage.timestamp}</span>
              </div>
              <p className="text-xs text-white/90 mt-0.5 line-clamp-2 leading-snug">
                {latestDoctorMessage.text}
              </p>
              <button
                onClick={() => {
                  setIsChatOpen(true);
                  setLatestDoctorMessage(null);
                  setUnreadChatCount(0);
                }}
                className="mt-2 text-[11px] font-semibold text-brand-soft hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Open Chat to Reply</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setLatestDoctorMessage(null)}
              className="p-1 rounded-full text-white/40 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Patient Self-View PiP — only show in 2-person mode (VideoGrid handles 3-4 person layout) */}
      {rtc.remotePeers.length === 1 && (
        <div className="absolute bottom-28 right-4 sm:bottom-28 sm:right-6 z-30 w-36 sm:w-48 aspect-video rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden bg-black/85 backdrop-blur-md group">
          {rtc.isCamOff ? (
            <div className="w-full h-full bg-black/80 flex flex-col items-center justify-center text-white/50 text-[10px]">
              <VideoOff className="w-5 h-5 mb-0.5 text-destructive" />
              <span>Cam Off</span>
            </div>
          ) : (
            <VideoPlayer
              stream={rtc.localStream}
              muted
              mirror={rtc.facingMode === "user"}
              className="w-full h-full"
              label="You"
              objectFit="cover"
            />
          )}

          {/* Quick PiP action controls */}
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 z-10">
            <button
              onClick={rtc.toggleMic}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                rtc.isMicMuted ? "bg-destructive text-white" : "bg-black/60 text-white/90 hover:bg-black/80"
              }`}
              title={rtc.isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {rtc.isMicMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-emerald-400" />}
            </button>
            <button
              onClick={rtc.toggleCamera}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                rtc.isCamOff ? "bg-destructive text-white" : "bg-black/60 text-white/90 hover:bg-black/80"
              }`}
              title={rtc.isCamOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {rtc.isCamOff ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3 text-emerald-400" />}
            </button>
          </div>
        </div>
      )}

      {/* 6. Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        messages={rtc.chatMessages}
        isRemoteTyping={rtc.isRemoteTyping}
        localLabel="You"
        remoteLabel={doctorName.split(" ").slice(0, 2).join(" ")}
        onClose={() => {
          setIsChatOpen(false);
          setUnreadChatCount(0);
          setLatestDoctorMessage(null);
        }}
        onSend={rtc.sendChatMessage}
        onTyping={rtc.sendTypingIndicator}
      />

      {/* 7. Floating Bottom Controls Dock */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <CallControls
          isMicMuted={rtc.isMicMuted}
          isCamOff={rtc.isCamOff}
          isScreenSharing={rtc.isScreenSharing}
          isChatOpen={isChatOpen}
          unreadChatCount={unreadChatCount}
          onToggleMic={rtc.toggleMic}
          onToggleCamera={rtc.toggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={() => {
            const next = !isChatOpen;
            setIsChatOpen(next);
            if (next) {
              setUnreadChatCount(0);
              setLatestDoctorMessage(null);
            }
          }}
          onSwitchCamera={handleSwitchCamera}
          onInvite={() => setIsInviteModalOpen(true)}
          onEndCall={() => setShowEndConfirm(true)}
        />
      </div>

      {/* 8. End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-card text-ink p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive mx-auto flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">End Consultation?</h3>
              <p className="text-xs text-ink-soft mt-1">
                Are you sure you want to conclude this session with {doctorName}?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowEndConfirm(false)}
              >
                Continue Call
              </Button>
              <Button variant="destructive" size="md" fullWidth onClick={handleEndCall}>
                End Call
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Start Call / Share Modal */}
      <StartCallModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={resolvedParams.id}
        doctorName={doctorName}
        patientName={patient.name}
      />

      {/* 10. Multi-Party Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        roomId={resolvedParams.id}
        participantCount={rtc.participantCount}
        maxParticipants={4}
      />
    </div>
  );
}
