"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  PhoneCall,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Copy,
  ExternalLink,
  Plus,
  ArrowRight,
  Share2,
  Stethoscope,
  Laptop,
  Check,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { StartCallModal } from "@/components/telehealth/start-call-modal";

export default function TelehealthHubPage() {
  const router = useRouter();
  const { upcomingAppointments, patient } = usePatient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [selectedDoctorName, setSelectedDoctorName] = useState<string | undefined>(undefined);
  const [joinInput, setJoinInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Online video appointments
  const videoAppointments = upcomingAppointments.filter(
    (apt) => apt.mode === "video" || apt.canJoinVideo
  );

  const handleStartInstantCall = () => {
    const instantId = `live-${Date.now().toString(36).slice(2, 7)}`;
    setSelectedRoomId(instantId);
    setSelectedDoctorName("Dr. Sunita Sharma");
    setIsModalOpen(true);
  };

  const handleStartAppointmentCall = (aptId: string, doctorName: string) => {
    setSelectedRoomId(aptId);
    setSelectedDoctorName(doctorName);
    setIsModalOpen(true);
  };

  const handleJoinByInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;

    let target = joinInput.trim();
    // If user pasted a full URL, extract path
    if (target.includes("/telehealth/")) {
      const parts = target.split("/telehealth/");
      target = parts[1].split("?")[0].replace("/doctor", "");
    }

    router.push(`/telehealth/${target}`);
  };

  const handleCopyLink = (aptId: string) => {
    const link = `${window.location.origin}/telehealth/${aptId}/doctor`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(aptId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Doctor join link copied!");
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-lift overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-brand-soft/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-brand-soft">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted HD Peer-to-Peer Telemedicine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Live Online Doctor Video Consultations
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed">
            Start a live video call immediately or share the consultation link with
            your doctor. Connect seamlessly from your smartphone, tablet, or laptop.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleStartInstantCall}
              className="px-5 py-3 rounded-full bg-white text-brand-dark font-bold text-sm shadow-lift hover:bg-white/95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4 text-brand" />
              <span>Start Instant Online Call</span>
            </button>

            <a
              href="#join-box"
              className="px-5 py-3 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Join via Room Code / Link</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick Launch & Scheduled Video Appointments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              <span>Your Scheduled Video Consultations</span>
            </h2>
            <p className="text-xs text-ink-soft">
              Click Start Call to initiate the room and invite your specialist.
            </p>
          </div>
          <button
            onClick={handleStartInstantCall}
            className="text-xs font-semibold text-brand hover:text-brand-dark flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Instant Room</span>
          </button>
        </div>

        {videoAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoAppointments.map((apt) => (
              <Card
                key={apt.id}
                className="hover:border-brand/40 transition-all border-border shadow-xs hover:shadow-soft"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={apt.doctorName}
                        src={apt.doctorAvatar}
                        size="md"
                        className="ring-2 ring-brand/20"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-ink">{apt.doctorName}</h3>
                        <p className="text-xs text-ink-soft">{apt.doctorSpecialty}</p>
                      </div>
                    </div>
                    <Badge variant="success" size="sm" className="shrink-0">
                      Live Enabled
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/40 text-xs">
                    <div className="flex items-center gap-1.5 text-ink-soft">
                      <Calendar className="w-3.5 h-3.5 text-brand" />
                      <span>{apt.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-soft">
                      <Clock className="w-3.5 h-3.5 text-brand" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => handleStartAppointmentCall(apt.id, apt.doctorName)}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Call</span>
                    </Button>

                    <button
                      onClick={() => handleCopyLink(apt.id)}
                      className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-ink text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      title="Copy Doctor Join Link"
                    >
                      {copiedId === apt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          <span className="hidden sm:inline">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Doctor Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/telehealth/${apt.id}/doctor`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-brand transition-colors cursor-pointer"
                      title="Open Doctor Console in New Tab (Test)"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border p-6 text-center">
            <Video className="w-10 h-10 text-brand/60 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-ink">No Scheduled Video Calls</h3>
            <p className="text-xs text-ink-soft max-w-sm mx-auto mt-1 mb-4">
              You can start an instant consultation room right now and share the link.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartInstantCall}
              className="gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Start Instant Call</span>
            </Button>
          </Card>
        )}
      </div>

      {/* Join via Room Code or Link */}
      <div id="join-box" className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Join by Room ID or Invitation Link</h3>
            <p className="text-xs text-ink-soft">
              Received a consultation link from your doctor or patient? Paste it here to join.
            </p>
          </div>
        </div>

        <form onSubmit={handleJoinByInput} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="Paste room link or enter code (e.g. apt-101)..."
            className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-xs text-ink placeholder:text-muted-foreground focus:outline-hidden focus:border-brand font-mono"
          />
          <Button type="submit" variant="primary" size="md" className="gap-1.5 shrink-0 font-bold">
            <PhoneCall className="w-4 h-4" />
            <span>Join Call</span>
          </Button>
        </form>
      </div>

      {/* 2-Way Testing Guide */}
      <div className="p-5 rounded-3xl bg-lavender/30 border border-brand/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-soft">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-brand-dark">
              Want to test the 2-way call right now?
            </h4>
            <p className="text-[11px] text-ink-soft">
              Open Tab 1 as Patient and Tab 2 as Doctor. You will immediately see 2-way video and chat!
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartInstantCall}
          className="text-xs font-semibold text-brand-dark shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1 text-brand" />
          Open Demo Launcher
        </Button>
      </div>

      {/* Start Call Modal */}
      <StartCallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomId={selectedRoomId}
        doctorName={selectedDoctorName}
        patientName={patient.name}
      />
    </div>
  );
}
