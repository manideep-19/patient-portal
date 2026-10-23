"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  Clock,
  ArrowLeft,
  FileText,
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  MonitorUp,
  Stethoscope,
  Pill,
  User,
  Activity,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWebRTC } from "@/lib/use-webrtc";
import { VideoPlayer } from "@/components/telehealth/video-player";
import { VideoGrid } from "@/components/telehealth/video-grid";
import { InviteModal } from "@/components/telehealth/invite-modal";
import { NetworkIndicator } from "@/components/telehealth/network-indicator";
import { usePatient } from "@/context/patient-context";

interface PageProps {
  params: Promise<{ id: string }>;
}

const QUICK_RESPONSES = [
  "Hello! Can you hear and see me clearly?",
  "Please describe where you are experiencing symptoms.",
  "I am reviewing your latest ultrasound & lab reports.",
  "Your recovery looks right on track. Keep taking the prescribed doses.",
  "I am sending an updated e-prescription to your portal right now.",
];

export default function DoctorSimulatorPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { patient, getAppointmentById } = usePatient();
  const appointment = getAppointmentById(resolvedParams.id);

  const initialPatientPeerId =
    searchParams.get("patientPeerId") ||
    `smrko-${resolvedParams.id}-patient`;

  const [targetPeerId, setTargetPeerId] = useState(initialPatientPeerId);
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const [chatInput, setChatInput] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(
    "Patient reporting good progress. Follicular scan within normal limits. Recommended continuation of current dosage with review in 7 days."
  );
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // WebRTC hook as Doctor
  const rtc = useWebRTC(resolvedParams.id, {
    role: "doctor",
    displayName: "Dr. Sunita Sharma",
    targetPeerId: searchParams.get("patientPeerId") || undefined,
  });

  const patientName = patient?.name || "Ananya Sharma";

  // Request camera and mic on mount
  useEffect(() => {
    rtc.startLocalMedia(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-connect once local media and peer are ready if patientPeerId was in URL
  useEffect(() => {
    const urlPeerId = searchParams.get("patientPeerId");
    if (
      urlPeerId &&
      rtc.peerId &&
      rtc.localStream &&
      rtc.connectionState === "waiting" &&
      !hasAttemptedConnect
    ) {
      setHasAttemptedConnect(true);
      toast.info("Connecting to patient...", {
        description: `Target: ${urlPeerId}`,
      });
      // Small timeout to allow signaling registration
      const timer = setTimeout(() => {
        rtc.connectToPeer(urlPeerId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
    searchParams,
    rtc.peerId,
    rtc.localStream,
    rtc.connectionState,
    hasAttemptedConnect,
    rtc,
  ]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rtc.chatMessages, rtc.isRemoteTyping]);

  // Format timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleManualConnect = () => {
    if (!targetPeerId.trim()) {
      toast.error("Please enter patient Peer ID");
      return;
    }
    rtc.connectToPeer(targetPeerId.trim());
    toast.info("Connecting to patient...", {
      description: `Peer: ${targetPeerId.trim()}`,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    rtc.sendChatMessage(chatInput);
    rtc.sendTypingIndicator(false);
    setChatInput("");
  };

  const handleQuickResponse = (text: string) => {
    rtc.sendChatMessage(text);
    toast.success("Quick response sent");
  };

  const handleEndCall = () => {
    setShowEndConfirm(false);
    rtc.disconnect();
    toast.info("Consultation completed as Doctor");
    router.push(`/telehealth/${resolvedParams.id}`);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Clinical Header */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/telehealth/${resolvedParams.id}`}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Patient View"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Doctor Consultation Console</span>
                <Badge variant="primary" size="sm" className="text-[10px] py-0 px-2">
                  Dr. Sunita Sharma (MD)
                </Badge>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Patient: <strong className="text-slate-200">{patientName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand" />
                  {formatTimer(rtc.callDurationSeconds)}
                </span>
                <span>•</span>
                <NetworkIndicator quality={rtc.networkQuality} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Status */}
        <div className="flex items-center gap-2.5">
          {/* Invite / Add Participants */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsInviteModalOpen(true)}
            className="h-8 gap-1.5 bg-slate-800 border-slate-700 text-xs text-slate-200 hover:text-white"
          >
            <UserPlus className="w-3.5 h-3.5 text-brand" />
            <span>Invite / Add ({rtc.participantCount}/4)</span>
          </Button>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>HIPAA Compliant P2P WebRTC</span>
          </div>
          {rtc.connectionState === "connected" ? (
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>{rtc.participantCount > 2 ? `Group Call (${rtc.participantCount})` : "In Consultation"}</span>
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" className="text-amber-400 border-amber-400/30">
              {rtc.connectionState === "connecting"
                ? "Connecting..."
                : rtc.connectionState === "waiting"
                ? "Ready to Connect"
                : rtc.connectionState}
            </Badge>
          )}
        </div>
      </header>

      {/* Manual Connect Banner (if disconnected or not connected yet) */}
      {rtc.connectionState !== "connected" && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-brand" />
            <span>Connect to Patient Stream:</span>
            <input
              type="text"
              value={targetPeerId}
              onChange={(e) => setTargetPeerId(e.target.value)}
              placeholder="Enter Patient Peer ID..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono w-64 sm:w-80 focus:outline-hidden focus:border-brand"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleManualConnect}
              disabled={rtc.connectionState === "connecting"}
              className="text-xs h-7"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${
                  rtc.connectionState === "connecting" ? "animate-spin" : ""
                }`}
              />
              Connect
            </Button>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Doctor ID:</span>
            <code className="text-brand font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {rtc.peerId || "Initializing..."}
            </code>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Video Area */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          {/* Main Video: Multi-Party Video Grid */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950">
            {rtc.remotePeers.length > 0 ? (
              <VideoGrid
                localStream={rtc.localStream}
                localLabel="Dr. Sharma"
                localMirror={false}
                localCamOff={rtc.isCamOff}
                remotePeers={rtc.remotePeers}
                onRetry={rtc.restartConnection}
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
                  <User className="w-10 h-10 text-brand" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Waiting for {patientName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Make sure the patient has the consultation room open in another tab
                    or on their mobile device. You can also invite other specialists or family members.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualConnect}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Retry Connection
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Invite Others
                  </Button>
                  <a
                    href={`/telehealth/${resolvedParams.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Patient Tab
                  </a>
                </div>
              </div>
            )}

            {/* Doctor Self-Preview PiP — only rendered when exactly 1 remote is connected (2-person mode) */}
            {rtc.remotePeers.length === 1 && (
              <div className="absolute bottom-20 right-4 z-20 w-36 sm:w-44 aspect-video rounded-2xl border-2 border-slate-700/80 shadow-2xl overflow-hidden bg-slate-900">
                {rtc.isCamOff ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[10px]">
                    <VideoOff className="w-5 h-5 mb-1" />
                    <span>Doctor Cam Off</span>
                  </div>
                ) : (
                  <VideoPlayer
                    stream={rtc.localStream}
                    muted
                    mirror
                    className="w-full h-full"
                    label="Dr. Sharma (You)"
                    objectFit="cover"
                  />
                )}
              </div>
            )}
          </div>

          {/* Doctor Controls Dock */}
          <div className="h-16 px-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              {/* Mic Toggle */}
              <button
                onClick={rtc.toggleMic}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  rtc.isMicMuted
                    ? "bg-destructive text-white"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={rtc.isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {rtc.isMicMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={rtc.toggleCamera}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  rtc.isCamOff
                    ? "bg-destructive text-white"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={rtc.isCamOff ? "Turn On Camera" : "Turn Off Camera"}
              >
                {rtc.isCamOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </button>

              {/* Screen Share */}
              <button
                onClick={rtc.toggleScreenShare}
                className={`p-3 rounded-full transition-colors cursor-pointer ${
                  rtc.isScreenSharing
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title="Share Medical Report / Screen"
              >
                <MonitorUp className="w-4 h-4" />
              </button>

              {/* Invite / Add Participants */}
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="p-3 rounded-full transition-colors cursor-pointer bg-slate-800 text-brand hover:bg-slate-700"
                title="Add Specialists or Family Members (Up to 4 participants)"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Quick Info */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Doctor Audio & Video Active
              </span>
            </div>

            {/* End Call Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEndConfirm(true)}
                className="gap-1.5 px-4 rounded-full font-bold"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Consultation</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Clinical Drawer (Chat & Clinical Notes) */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 h-80 lg:h-auto">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "chat"
                  ? "border-brand text-brand bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Live Patient Chat</span>
              {rtc.chatMessages.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand/20 text-brand text-[10px]">
                  {rtc.chatMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === "notes"
                  ? "border-brand text-brand bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Doctor Notes & Rx</span>
            </button>
          </div>

          {/* Tab 1: Live Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Quick Responses */}
              <div className="p-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
                {QUICK_RESPONSES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickResponse(qr)}
                    className="whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-brand/20 hover:text-brand text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {rtc.chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                    <MessageSquare className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                    <span>Live encrypted chat channel</span>
                    <span className="text-[10px] text-slate-600 mt-1">
                      Messages sent here are delivered instantly via WebRTC P2P DataChannel.
                    </span>
                  </div>
                ) : (
                  rtc.chatMessages.map((msg) => {
                    const isDoctor = msg.sender === "local";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isDoctor ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {isDoctor ? "Dr. Sunita Sharma (You)" : patientName} • {msg.timestamp}
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            isDoctor
                              ? "bg-brand text-white rounded-tr-none"
                              : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Patient Typing Indicator */}
                {rtc.isRemoteTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 p-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                    <span className="text-[11px]">{patientName} is typing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    rtc.sendTypingIndicator(e.target.value.length > 0);
                  }}
                  onBlur={() => rtc.sendTypingIndicator(false)}
                  placeholder="Type message to patient..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand-dark transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Clinical Notes */}
          {activeTab === "notes" && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-brand" />
                  <span>Clinical Observations & Plan</span>
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-brand resize-none leading-relaxed"
                />
              </div>

              {/* Vitals Summary Card */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Patient Health Vitals</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">BP</span>
                    <strong className="text-slate-200 text-xs">118/76</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Pulse</span>
                    <strong className="text-slate-200 text-xs">72 bpm</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">SpO2</span>
                    <strong className="text-slate-200 text-xs">99%</strong>
                  </div>
                </div>
              </div>

              {/* Prescriptions */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Prescriptions</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Folic Acid 5mg</span>
                    <span className="text-slate-400">1x daily</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Progesterone 200mg</span>
                    <span className="text-slate-400">Nightly</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  onClick={() => toast.success("Prescription updated in portal")}
                  className="text-xs mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-brand" />
                  Issue Updated e-Prescription
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* End Call Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive mx-auto flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">End Consultation Session?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Conclude the video session with {patientName}? Clinical notes will be saved.
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
                End Consultation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
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
