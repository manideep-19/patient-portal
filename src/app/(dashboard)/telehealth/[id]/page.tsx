"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Copy,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Share2,
  X,
  Users,
  User,
  Heart,
  Stethoscope,
  Video,
  PhoneOff,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useWebRTC,
  type ConnectionState,
  type ChatMessage,
  type ParticipantRole,
} from "@/lib/use-webrtc";
import { VideoPlayer } from "@/components/telehealth/video-player";
import { VideoGrid } from "@/components/telehealth/video-grid";
import { CallControls } from "@/components/telehealth/call-controls";
import { ChatPanel } from "@/components/telehealth/chat-panel";
import { ParticipantsDrawer } from "@/components/telehealth/participants-drawer";
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

  // If role is explicitly doctor, route to doctor clinical console
  useEffect(() => {
    if (searchParams.get("role") === "doctor") {
      router.replace(`/telehealth/${resolvedParams.id}/doctor`);
    }
  }, [searchParams, resolvedParams.id, router]);

  // Determine attendee role & default name from URL or patient profile
  const roleParam = (searchParams.get("role") as ParticipantRole) || "patient";
  const initialNameParam =
    searchParams.get("name") ||
    (roleParam === "family"
      ? "Vikram Sharma (Spouse)"
      : roleParam === "coordinator"
      ? "Nurse Coordinator"
      : patient.name);

  // Page-level state
  const [displayName, setDisplayName] = useState(initialNameParam);
  const [pageState, setPageState] = useState<PageState>("prejoin");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const prevMessagesCountRef = useRef(0);

  // WebRTC multi-party hook
  const rtc = useWebRTC(resolvedParams.id, {
    role: roleParam,
    displayName,
  });

  const doctorName = appointment?.doctorName || "Dr. Sunita Sharma";
  const doctorSpecialty = appointment?.doctorSpecialty || "Fertility & IVF Specialist";
  const doctorAvatar = appointment?.doctorAvatar || "/branding/spec-fertility.jpg";

  // Format call timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Request camera and microphone on mount
  useEffect(() => {
    rtc.startLocalMedia(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Transition to in_call automatically when remote participants connect while in prejoin
  useEffect(() => {
    if (rtc.remoteParticipants.length > 0 && pageState === "prejoin") {
      setPageState("in_call");
      toast.success("Joined Consultation", {
        description: `${rtc.remoteParticipants[0]?.displayName} is in the room.`,
      });
    }
  }, [rtc.remoteParticipants, pageState]);

  // Track unread chat messages & notifications
  useEffect(() => {
    if (rtc.chatMessages.length > prevMessagesCountRef.current) {
      const lastMsg = rtc.chatMessages[rtc.chatMessages.length - 1];
      if (lastMsg && lastMsg.sender === "remote") {
        if (!isChatOpen) {
          toast.info(`${lastMsg.senderName || "New message"}: "${lastMsg.text}"`, {
            description: "Click to open group chat",
            action: {
              label: "Open Chat",
              onClick: () => {
                setIsChatOpen(true);
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
  }, [rtc.chatMessages, isChatOpen]);

  // Handle end call
  const handleEndCall = () => {
    setShowEndConfirm(false);
    rtc.disconnect();
    setPageState("ended");
    toast.info("Consultation completed", {
      description: "Session summary is being generated.",
    });
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const doctorUrl = `${origin}/telehealth/${resolvedParams.id}/doctor`;
  const spouseUrl = `${origin}/telehealth/${resolvedParams.id}?role=family&name=Vikram%20Sharma`;

  // Handle join call button
  const handleJoinCall = () => {
    setPageState("in_call");
    toast.info("Entered Consultation Room", {
      description: "Connecting with attendees...",
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
    navigator.clipboard.writeText(doctorUrl).then(() => {
      toast.success("Doctor link copied!", {
        description: "Open in another tab to test doctor perspective.",
      });
    });
  };

  // -----------------------------------------------------------------
  // PRE-JOIN SCREEN
  // -----------------------------------------------------------------
  if (pageState === "prejoin") {
    const isMediaReady =
      rtc.connectionState !== "requesting_media" && rtc.localStream !== null;
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
              <span>Invite Links</span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-success bg-success/20 px-2.5 py-1 rounded-full border border-success/30">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>Multi-Party Enabled</span>
            </div>
          </div>
        </div>

        {/* Doctor & Appointment Card */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={doctorName} src={doctorAvatar} size="lg" className="ring-2 ring-brand" />
            <div>
              <div className="text-xs text-brand-soft font-semibold">{doctorSpecialty}</div>
              <h2 className="text-sm sm:text-base font-bold text-white">{doctorName}</h2>
              <p className="text-[11px] text-white/60">
                SmrkoMed Fertility & Women&apos;s Hospital, Indiranagar
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="primary" size="sm" className="text-[10px]">
              {roleParam === "family" ? "Spouse Attendance" : roleParam === "coordinator" ? "Care Team" : "Video Visit"}
            </Badge>
          </div>
        </div>

        {/* Camera Preview Tile */}
        <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-lift flex items-center justify-center">
          {rtc.localStream && !rtc.isCamOff ? (
            <VideoPlayer
              stream={rtc.localStream}
              mirror
              className="w-full h-full object-cover"
              label="Your Video Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Avatar name={displayName} size="xl" className="ring-2 ring-white/20" />
              <p className="text-xs text-white/70">
                {rtc.isCamOff ? "Camera switched off" : "Requesting camera & microphone access..."}
              </p>
            </div>
          )}

          {/* Floating Pre-join Controls */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 pointer-events-auto">
            <button
              onClick={rtc.toggleMic}
              className={`p-3 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer ${
                rtc.isMicMuted
                  ? "bg-destructive text-white ring-2 ring-destructive/40"
                  : "bg-white/20 hover:bg-white/30 text-emerald-400 backdrop-blur-md"
              }`}
              title={rtc.isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {rtc.isMicMuted ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </button>
            <button
              onClick={rtc.toggleCamera}
              className={`p-3 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer ${
                rtc.isCamOff
                  ? "bg-destructive text-white ring-2 ring-destructive/40"
                  : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
              }`}
              title={rtc.isCamOff ? "Turn Cam On" : "Turn Cam Off"}
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Attendee Name & Settings */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <label className="text-[11px] font-semibold text-white/70 block">
              Your Display Name in Consultation:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-brand/20 text-brand-soft border border-brand/30">
                {roleParam.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Multi-Party Test Links */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span>Test Multi-Person Calling:</span>
              <span className="text-brand-soft font-mono text-[10px]">Room: {resolvedParams.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={doctorUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Open Doctor Tab</span>
              </a>
              <a
                href={spouseUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Open Spouse Tab</span>
              </a>
            </div>
          </div>
        </div>

        {/* Enter Button */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleJoinCall}
            className="text-base font-bold shadow-lift cursor-pointer"
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
            Encrypted WebRTC HD call. Supports multi-participant video mesh.
          </p>
        </div>

        {/* Invite Links Modal */}
        <StartCallModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          roomId={resolvedParams.id}
          doctorName={doctorName}
          patientName={patient.name}
        />
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
            1. Your consultation lasted {formatTimer(rtc.callDurationSeconds || 0)}.
          </p>
          <p className="text-ink-soft leading-relaxed">
            2. {rtc.chatMessages.length > 0
              ? `${rtc.chatMessages.length} messages exchanged across attendees.`
              : "No chat messages exchanged."}
          </p>
          <p className="text-ink-soft leading-relaxed">
            3. Clinical notes and prescriptions will be updated in your records.
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
  // IN-CALL MULTI-PARTY SCREEN
  // -----------------------------------------------------------------
  const totalAttendees = 1 + rtc.remoteParticipants.length;

  return (
    <div className="relative h-[100dvh] w-full bg-ink text-white overflow-hidden select-none flex flex-col">
      {/* 1. Top Header Bar */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent border-b border-white/10 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Avatar name={doctorName} src={doctorAvatar} size="sm" className="ring-2 ring-brand" />
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>{doctorName}</span>
              <Badge variant="success" size="sm" className="text-[10px] py-0 px-1.5">
                Live
              </Badge>
            </div>
            <div className="text-[11px] text-white/70 flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-brand-soft" />
                <span>{formatTimer(rtc.callDurationSeconds)}</span>
              </span>
              <span>•</span>
              <button
                onClick={() => setIsParticipantsOpen(true)}
                className="hover:text-white flex items-center gap-1 text-[11px] text-white/80 bg-white/10 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              >
                <Users className="w-3 h-3 text-brand" />
                <span>{totalAttendees} in call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          <NetworkIndicator quality={rtc.networkQuality} />
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
            title="Invite Participants"
          >
            <Share2 className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </div>

      {/* 2. Main Adaptive Video Grid */}
      <div className="flex-1 w-full overflow-hidden relative">
        <VideoGrid
          localStream={rtc.localStream}
          localDisplayName={displayName}
          localRole={roleParam}
          isLocalMicMuted={rtc.isMicMuted}
          isLocalCamOff={rtc.isCamOff}
          isLocalScreenSharing={rtc.isScreenSharing}
          remoteParticipants={rtc.remoteParticipants}
          emptyStateAction={
            <div className="flex gap-2">
              <a
                href={doctorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-soft"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Doctor Tab</span>
              </a>
              <a
                href={spouseUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-soft"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Spouse Tab</span>
              </a>
            </div>
          }
        />
      </div>

      {/* 3. Bottom Controls */}
      <CallControls
        isMicMuted={rtc.isMicMuted}
        isCamOff={rtc.isCamOff}
        isScreenSharing={rtc.isScreenSharing}
        isChatOpen={isChatOpen}
        unreadChatCount={unreadChatCount}
        participantsCount={totalAttendees}
        isParticipantsOpen={isParticipantsOpen}
        onToggleMic={rtc.toggleMic}
        onToggleCamera={rtc.toggleCamera}
        onToggleScreenShare={rtc.toggleScreenShare}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        onSwitchCamera={() => toast.info("Camera angle switched")}
        onEndCall={() => setShowEndConfirm(true)}
      />

      {/* 4. Chat Panel */}
      <ChatPanel
        isOpen={isChatOpen}
        messages={rtc.chatMessages}
        isRemoteTyping={rtc.isRemoteTyping}
        remoteTypingName={rtc.remoteTypingName}
        localLabel={displayName}
        remoteLabel={doctorName}
        onClose={() => setIsChatOpen(false)}
        onSend={rtc.sendChatMessage}
        onTyping={rtc.sendTypingIndicator}
      />

      {/* 5. Participants Drawer */}
      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        roomId={resolvedParams.id}
        localName={displayName}
        localRole={roleParam}
        isLocalMicMuted={rtc.isMicMuted}
        isLocalCamOff={rtc.isCamOff}
        remoteParticipants={rtc.remoteParticipants}
      />

      {/* 6. Invite / Share Modal */}
      <StartCallModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={resolvedParams.id}
        doctorName={doctorName}
        patientName={patient.name}
      />

      {/* 7. End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 text-center space-y-4 shadow-lift text-foreground">
            <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive mx-auto flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-ink">End Consultation?</h3>
              <p className="text-xs text-ink-soft mt-1">
                Are you sure you want to leave this multi-party consultation?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowEndConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                fullWidth
                onClick={handleEndCall}
              >
                End Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
