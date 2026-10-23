"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Stethoscope,
  User,
  ShieldCheck,
  Sparkles,
  X,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StartCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  doctorName?: string;
  patientName?: string;
}

export function StartCallModal({
  isOpen,
  onClose,
  roomId: customRoomId,
  doctorName = "Dr. Sunita Sharma",
  patientName = "Ananya Sharma",
}: StartCallModalProps) {
  const router = useRouter();

  // If no room ID provided, create a deterministic or timestamped one
  const [activeRoomId] = useState<string>(() => {
    return customRoomId || `room-${Date.now().toString(36).slice(2, 8)}`;
  });

  const [copiedDoctor, setCopiedDoctor] = useState(false);
  const [copiedPatient, setCopiedPatient] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const doctorLink = `${origin}/telehealth/${activeRoomId}/doctor`;
  const patientLink = `${origin}/telehealth/${activeRoomId}?role=patient`;

  const copyToClipboard = (text: string, type: "doctor" | "patient") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "doctor") {
        setCopiedDoctor(true);
        setTimeout(() => setCopiedDoctor(false), 2000);
        toast.success("Doctor join link copied!", {
          description: "Share this link with your doctor or open in another tab.",
        });
      } else {
        setCopiedPatient(true);
        setTimeout(() => setCopiedPatient(false), 2000);
        toast.success("Patient join link copied!");
      }
    });
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${doctorName}, please join our secure video consultation on SmrkoMed: ${doctorLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleJoinAsPatient = () => {
    onClose();
    router.push(`/telehealth/${activeRoomId}?role=patient`);
  };

  const handleOpenDoctorTab = () => {
    window.open(doctorLink, "_blank");
    toast.info("Doctor console opened in new tab");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-lift text-foreground p-6 sm:p-7 space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand via-lavender to-peach" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-xs">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
                Start Live Video Call
              </h2>
              <span className="text-[10px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded-full border border-success/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live WebRTC
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              Encrypted peer-to-peer telemedicine session with{" "}
              <strong className="text-ink">{doctorName}</strong>.
            </p>
          </div>
        </div>

        {/* Room Code Badge */}
        <div className="p-3 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
              Consultation Room Code
            </span>
            <code className="text-xs sm:text-sm font-bold text-brand font-mono">
              {activeRoomId}
            </code>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>P2P Encrypted</span>
          </div>
        </div>

        {/* Shareable Links Section */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-ink flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-brand" />
            <span>Join Links for Doctor & Patient</span>
          </div>

          {/* Doctor Link Card */}
          <div className="p-3.5 rounded-2xl bg-lavender/30 border border-brand/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-dark flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-brand" />
                <span>Doctor Join Link</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                For doctor or 2nd browser tab
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={doctorLink}
                className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono truncate select-all focus:outline-hidden"
              />
              <button
                onClick={() => copyToClipboard(doctorLink, "doctor")}
                className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
              >
                {copiedDoctor ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button
                onClick={handleShareWhatsApp}
                className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Share via WhatsApp</span>
              </button>
              <button
                onClick={handleOpenDoctorTab}
                className="text-brand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Test in New Tab</span>
              </button>
            </div>
          </div>

          {/* Patient Link Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-ink-soft" />
                <span>Patient Join Link</span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                For patient device
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={patientLink}
                className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono truncate select-all focus:outline-hidden"
              />
              <button
                onClick={() => copyToClipboard(patientLink, "patient")}
                className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedPatient ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleJoinAsPatient}
            className="text-sm font-bold shadow-soft flex items-center justify-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>Start Call Now (Join as Patient)</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleOpenDoctorTab}
            className="text-xs font-semibold text-ink flex items-center justify-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4 text-brand" />
            <span>Launch Doctor Console (2-Way Demo)</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Both patient and doctor can join from any phone, tablet, or laptop browser.
        </p>
      </div>
    </div>
  );
}
