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
  Users,
  Heart,
  ShieldCheck,
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

  const [activeRoomId] = useState<string>(() => {
    return customRoomId || `room-${Date.now().toString(36).slice(2, 8)}`;
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const doctorLink = `${origin}/telehealth/${activeRoomId}/doctor`;
  const patientLink = `${origin}/telehealth/${activeRoomId}?role=patient`;
  const spouseLink = `${origin}/telehealth/${activeRoomId}?role=family&name=Vikram%20Sharma`;
  const coordinatorLink = `${origin}/telehealth/${activeRoomId}?role=coordinator&name=Nurse%20Priya`;

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success(`${label} copied!`, {
        description: "Ready to share or open in a new tab.",
      });
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleShareWhatsApp = (url: string, roleName: string) => {
    const text = encodeURIComponent(
      `Hello ${roleName}, please join our secure video consultation on SmrkoMed: ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleJoinAsPatient = () => {
    onClose();
    router.push(`/telehealth/${activeRoomId}?role=patient`);
  };

  const handleOpenTab = (url: string, label: string) => {
    window.open(url, "_blank");
    toast.info(`${label} opened in a new tab`);
  };

  const links = [
    {
      key: "doctor",
      label: "Doctor Console",
      sub: "Clinical view with EHR notes & vitals",
      url: doctorLink,
      icon: Stethoscope,
      badge: "Doctor",
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      key: "patient",
      label: "Patient Link",
      sub: "Primary patient video room",
      url: patientLink,
      icon: User,
      badge: "Patient",
      badgeColor: "bg-brand/15 text-brand border-brand/20",
    },
    {
      key: "spouse",
      label: "Spouse / Family Link",
      sub: "Allows partner (e.g. Vikram) to join remotely",
      url: spouseLink,
      icon: Heart,
      badge: "Family / Spouse",
      badgeColor: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
    },
    {
      key: "coordinator",
      label: "Care Coordinator",
      sub: "Nurse / IVF care manager attendance",
      url: coordinatorLink,
      icon: ShieldCheck,
      badge: "Care Team",
      badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-lift text-foreground p-5 sm:p-7 space-y-5 relative overflow-hidden max-h-[90vh] overflow-y-auto">
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
          <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 shadow-xs">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
                Multi-Party Consultation
              </h2>
              <span className="text-[10px] bg-success/15 text-success font-semibold px-2 py-0.5 rounded-full border border-success/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Multi-Peer Mesh
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Doctor, patient, spouse, and clinical coordinator can all join this room simultaneously.
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
            <Users className="w-3.5 h-3.5" />
            <span>Up to 4+ Attendees</span>
          </div>
        </div>

        {/* Shareable Links Section */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-ink flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-brand" />
            <span>Join Links for All Participants</span>
          </div>

          <div className="space-y-2">
            {links.map((item) => {
              const isCopied = copiedKey === item.key;
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-2xl bg-muted/40 border border-border hover:border-border/80 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-brand" />
                      <span>{item.label}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={item.url}
                      className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono truncate select-all focus:outline-hidden"
                    />
                    <button
                      onClick={() => copyToClipboard(item.url, item.key, item.label)}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      {isCopied ? (
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
                    <button
                      onClick={() => handleOpenTab(item.url, item.label)}
                      className="p-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleJoinAsPatient}
            className="text-sm font-bold shadow-soft flex items-center justify-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Join as Primary Patient</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => handleOpenTab(doctorLink, "Doctor Console")}
            className="text-xs font-semibold text-ink flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Stethoscope className="w-4 h-4 text-brand" />
            <span>Launch Doctor Console (Simulate Doctor Tab)</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Multiple people can join from any phone, tablet, or computer browser simultaneously.
        </p>
      </div>
    </div>
  );
}
