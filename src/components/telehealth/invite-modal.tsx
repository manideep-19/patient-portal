"use client";

import React, { useState } from "react";
import {
  UserPlus,
  Copy,
  Check,
  ExternalLink,
  Users,
  Stethoscope,
  Heart,
  Share2,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  participantCount: number;
  maxParticipants?: number;
}

export function InviteModal({
  isOpen,
  onClose,
  roomId,
  participantCount,
  maxParticipants = 4,
}: InviteModalProps) {
  const [customName, setCustomName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "http://localhost:3002";

  const inviteOptions = [
    {
      key: "specialist",
      title: "Specialist / Second Opinion",
      roleLabel: "Specialist",
      subtitle: "Invite another physician, cardiologist, or surgeon into this consultation",
      defaultName: "Dr. Rajesh Mehta (Specialist)",
      icon: Stethoscope,
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      key: "family",
      title: "Family Member / Attendant",
      roleLabel: "Family",
      subtitle: "Allow spouse, parent, or caregiver to join the patient's consultation",
      defaultName: "Family Member",
      icon: Heart,
      accent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      key: "nurse",
      title: "Nurse / Clinical Assistant",
      roleLabel: "Clinical Assistant",
      subtitle: "Invite nursing coordinator for vitals review or triage",
      defaultName: "Nurse Coordinator",
      icon: Users,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  const buildUrl = (name: string) => {
    const encoded = encodeURIComponent(name.trim() || "Guest Participant");
    return `${origin}/telehealth/${roomId}?role=guest&name=${encoded}`;
  };

  const handleCopy = (url: string, key: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedKey(key);
      toast.success(`${label} link copied to clipboard!`, {
        description: "Anyone with this link can join this secure session.",
      });
      setTimeout(() => setCopiedKey(null), 2500);
    } else {
      toast.info("Please copy link manually", { description: url });
    }
  };

  const handleOpenTab = (url: string) => {
    window.open(url, "_blank");
    toast.info("Opened in new tab", {
      description: "You can now test multi-party video directly on this device.",
    });
  };

  const customUrl = buildUrl(customName || "Guest");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Add People to Consultation
                </h3>
                <Badge variant="outline" size="sm" className="text-emerald-400 border-emerald-500/30">
                  {participantCount}/{maxParticipants} in call
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Up to {maxParticipants} participants can join this encrypted P2P teleconsultation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick presets */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Quick Invite Links
            </div>

            {inviteOptions.map((opt) => {
              const url = buildUrl(opt.defaultName);
              const isCopied = copiedKey === opt.key;
              const Icon = opt.icon;

              return (
                <div
                  key={opt.key}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${opt.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-200">
                          {opt.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({opt.defaultName})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {opt.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(url, opt.key, opt.roleLabel)}
                      className="text-xs h-8 gap-1.5 bg-slate-900 border-slate-700 hover:bg-slate-800"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleOpenTab(url)}
                      className="text-xs h-8 gap-1.5"
                      title="Open guest view in another browser tab to test immediately"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Tab</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Name Generator */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2">
              Custom Participant Name
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter name (e.g. Ramesh Kumar - Brother)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-brand"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(customUrl, "custom", customName || "Guest")}
                  className="text-xs h-9 gap-1.5 bg-slate-900 border-slate-700 shrink-0"
                >
                  {copiedKey === "custom" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenTab(customUrl)}
                  className="text-xs h-9 gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Join</span>
                </Button>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All connections use end-to-end encrypted WebRTC peer mesh with STUN/TURN fallback.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Room Code: <code className="font-mono text-brand font-bold">{roomId}</code></span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-300">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
