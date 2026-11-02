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
  Users,
  Activity,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWebRTC, type ParticipantRole } from "@/lib/use-webrtc";
import { VideoGrid } from "@/components/telehealth/video-grid";
import { ParticipantsDrawer } from "@/components/telehealth/participants-drawer";
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

  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const [chatInput, setChatInput] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState(
    "Patient reporting good progress. Follicular scan within normal limits. Recommended continuation of current dosage with review in 7 days."
  );
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

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

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rtc.chatMessages, rtc.isRemoteTyping]);

  // Format timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    rtc.sendChatMessage(chatInput.trim());
    setChatInput("");
    rtc.sendTypingIndicator(false);
  };

  const handleQuickResponse = (text: string) => {
    rtc.sendChatMessage(text);
  };

  const handleEndCall = () => {
    setShowEndConfirm(false);
    rtc.disconnect();
    toast.success("Consultation finalized", {
      description: "Clinical notes have been saved to the patient record.",
    });
    router.push("/appointments");
  };

  const totalAttendees = 1 + rtc.remoteParticipants.length;

  const getRolePill = (role?: ParticipantRole | string) => {
    switch (role) {
      case "doctor":
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Doctor</span>;
      case "family":
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">Spouse</span>;
      case "coordinator":
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Care Team</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-brand/20 text-brand-soft border border-brand/30">Patient</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Clinical Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/appointments"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Back to Appointments"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm shadow-soft">
              DR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">
                  Doctor Clinical Console
                </span>
                <Badge variant="outline" size="sm" className="text-brand border-brand/30">
                  Room: {resolvedParams.id}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Dr. Sunita Sharma • SmrkoMed Fertility & Women&apos;s Hospital
              </p>
            </div>
          </div>
        </div>

        {/* Right Info & Attendees button */}
        <div className="flex items-center gap-3">
          <NetworkIndicator quality={rtc.networkQuality} />

          <button
            onClick={() => setIsParticipantsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-brand" />
            <span>{totalAttendees} in Call</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-brand" />
            <span>{formatTimer(rtc.callDurationSeconds)}</span>
          </div>

          {rtc.connectionState === "connected" ? (
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Live Consultation</span>
            </Badge>
          ) : (
            <Badge variant="outline" size="sm" className="text-amber-400 border-amber-400/30">
              {rtc.connectionState === "connecting" ? "Connecting..." : "Waiting for attendees"}
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Multi-Party Video Area */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">
          <div className="relative flex-1 w-full h-full overflow-hidden">
            <VideoGrid
              localStream={rtc.localStream}
              localDisplayName="Dr. Sunita Sharma"
              localRole="doctor"
              isLocalMicMuted={rtc.isMicMuted}
              isLocalCamOff={rtc.isCamOff}
              isLocalScreenSharing={rtc.isScreenSharing}
              remoteParticipants={rtc.remoteParticipants}
              emptyStateAction={
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`/telehealth/${resolvedParams.id}?role=patient`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-xs text-white shadow-soft transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Patient Tab</span>
                  </a>
                  <a
                    href={`/telehealth/${resolvedParams.id}?role=family&name=Vikram%20Sharma`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs text-white shadow-soft transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Spouse Tab</span>
                  </a>
                </div>
              }
            />
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
                {rtc.isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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
                {rtc.isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
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
            </div>

            {/* Middle Quick Info */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Doctor HD Video & Audio Connected</span>
              </span>
            </div>

            {/* End Call Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowEndConfirm(true)}
                className="gap-1.5 px-4 rounded-full font-bold cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Consultation</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Clinical Sidebar (Chat & Clinical Notes) */}
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
              <span>Multi-Party Chat</span>
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
                    <span>Group Consultation Chat</span>
                    <span className="text-[10px] text-slate-600 mt-1">
                      Messages sent here are broadcasted to all connected attendees.
                    </span>
                  </div>
                ) : (
                  rtc.chatMessages.map((msg) => {
                    const isDoctor = msg.sender === "local";
                    const senderLabel = msg.senderName || (isDoctor ? "Dr. Sunita Sharma" : patientName);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isDoctor ? "items-end" : "items-start"}`}
                      >
                        <div className="text-[10px] text-slate-400 mb-0.5 px-1 flex items-center gap-1.5">
                          <span className="font-semibold text-slate-300">{senderLabel}</span>
                          {getRolePill(msg.senderRole)}
                          <span className="text-[9px] text-slate-500">• {msg.timestamp}</span>
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
                    <span className="text-[11px]">{rtc.remoteTypingName || patientName} is typing...</span>
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
                  placeholder="Send message to all attendees..."
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
                    <strong className="text-slate-200 text-xs">74 bpm</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">SpO2</span>
                    <strong className="text-slate-200 text-xs">99%</strong>
                  </div>
                </div>
              </div>

              {/* Active IVF Cycle Context */}
              {patient?.activeCarePlan && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>Ongoing Care Protocol</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {patient.activeCarePlan.title}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Stage {patient.activeCarePlan.currentStageNumber} of {patient.activeCarePlan.totalStages}:{" "}
                    {patient.activeCarePlan.currentStageName}
                  </p>
                </div>
              )}

              {/* Active Prescriptions */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Cycle Medications</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>Gonal-F 300 IU Inj</span>
                    <span className="text-slate-500">Day 9 (Daily)</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Cetrotide 0.25mg Inj</span>
                    <span className="text-slate-500">Morning</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Folvite 5mg Tablet</span>
                    <span className="text-slate-500">1-0-0</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participants Drawer */}
      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        roomId={resolvedParams.id}
        localName="Dr. Sunita Sharma"
        localRole="doctor"
        isLocalMicMuted={rtc.isMicMuted}
        isLocalCamOff={rtc.isCamOff}
        remoteParticipants={rtc.remoteParticipants}
      />

      {/* End Call Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-destructive/15 text-destructive mx-auto flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">End Consultation?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Clinical observations will be attached to {patientName}&apos;s visit record.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setShowEndConfirm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                fullWidth
                onClick={handleEndCall}
                className="text-xs"
              >
                Save & End
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
