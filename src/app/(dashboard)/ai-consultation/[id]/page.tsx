"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  RotateCcw,
  Edit2,
  ShieldCheck,
  User,
  Plus,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { AiConsultationSummary } from "@/data/mock-ai-consultation";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AiConsultationChatPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const {
    getSessionById,
    sendAiConsultationMessage,
    completeAiConsultation,
    patient,
  } = usePatient();

  const session = getSessionById(resolvedParams.id);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Editable summary state
  const [summaryDraft, setSummaryDraft] = useState<AiConsultationSummary>({
    statedConcern: "Ovarian stimulation symptoms & medication timing review",
    keyInformation: [
      "Patient noted mild pelvic fullness on Cycle Day 9.",
      "Gonal-F and Cetrotide doses taken on schedule.",
      "No fever, vomiting, or acute sharp pain.",
    ],
    questionsForDoctor: [
      "Should I continue Gonal-F 225 IU on the night of hCG trigger?",
      "What is the expected egg retrieval date based on today's cohort?",
    ],
    relevantContext: "Patient undergoing self oocyte ICSI antagonist stimulation cycle.",
    suggestedNextStep: "Discuss fresh embryo transfer suitability with Dr. Sunita Sharma.",
    generatedAt: new Date().toISOString(),
  });

  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isTyping]);

  if (!session) {
    return (
      <div className="max-w-md mx-auto text-center py-12 p-6 space-y-4">
        <h2 className="text-lg font-bold text-ink">Session Not Found</h2>
        <p className="text-xs text-ink-soft">
          This AI consultation conversation could not be loaded.
        </p>
        <Link href="/ai-consultation" className="text-xs text-brand font-semibold underline">
          Return to AI Consultation landing
        </Link>
      </div>
    );
  }

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    setInputMessage("");
    sendAiConsultationMessage(session.id, text);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
    }, 1200);
  };

  const handleSimulateVoice = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info("Listening to your voice input...", {
        description: "Simulating neural speech recognition.",
      });
      setTimeout(() => {
        setIsRecording(false);
        handleSendMessage("I want to know if mild bloating is normal during stimulation day 9.");
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  const handleEndAndGenerateSummary = () => {
    // Populate draft with real captured content
    const lastUserMsgs = session.messages.filter((m) => m.sender === "user");
    const primaryConcern = lastUserMsgs[0]?.text || session.title;

    setSummaryDraft({
      statedConcern: primaryConcern,
      keyInformation: [
        "Patient discussed cycle symptoms and preparation questions.",
        "Medications self-reported as compliant.",
        "Zero acute emergency distress indicators reported.",
      ],
      questionsForDoctor: [
        "What is the timeline for ovum pick-up procedure?",
        "Do I continue tonight's gonadotropin dose?",
      ],
      relevantContext: `Active session on ${new Date(session.startedAt).toLocaleDateString()}`,
      suggestedNextStep: "Review questions with your doctor during your consultation.",
      generatedAt: new Date().toISOString(),
    });

    completeAiConsultation(session.id, summaryDraft);
    setShowSummaryModal(true);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[82dvh] sm:h-[86dvh] justify-between pb-2">
      {/* Top Header Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between gap-3 shrink-0 mb-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/ai-consultation"
            className="p-1.5 rounded-xl hover:bg-lavender text-ink-soft hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-xs shadow-soft">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-ink leading-tight">
              {session.title}
            </h2>
            <p className="text-[10px] text-ink-soft flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span>SmrkoMed AI Assistant • Private Guided Session</span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleEndAndGenerateSummary}
          className="text-xs font-semibold shrink-0"
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          <span>Generate Summary</span>
        </Button>
      </div>

      {/* Safety Notice Strip */}
      <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-ink text-[11px] flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>AI health assistant for visit preparation • Not a clinical doctor.</span>
        </div>
        <button
          onClick={() =>
            handleSendMessage("Emergency test: I have severe acute chest pain and difficulty breathing.")
          }
          className="text-[10px] text-amber-700 hover:underline shrink-0 cursor-pointer"
          title="Demonstrate emergency detection"
        >
          Test Emergency Alert
        </button>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3.5 overscroll-contain">
        {session.messages.map((msg) => {
          const isAi = msg.sender === "ai";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAi ? "items-start" : "items-end"} space-y-1.5`}
            >
              <div
                className={`flex items-start gap-2 max-w-[88%] sm:max-w-[80%] ${
                  isAi ? "flex-row" : "flex-row-reverse"
                }`}
              >
                {isAi ? (
                  <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs shrink-0 shadow-xs mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <Avatar name={patient.name} src={patient.avatarUrl} size="sm" className="mt-0.5" />
                )}

                {/* Message Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.isEmergencyAlert
                      ? "bg-destructive text-white border border-destructive shadow-md"
                      : isAi
                      ? "bg-card text-ink border border-border shadow-xs"
                      : "bg-brand text-white shadow-soft"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>

              {/* Timestamp */}
              <span
                className={`text-[10px] text-ink-soft px-9 ${
                  isAi ? "text-left" : "text-right"
                }`}
              >
                {msg.timestamp}
              </span>

              {/* Dynamic Suggested Reply Chips */}
              {isAi && msg.suggestedReplies && (
                <div className="flex flex-wrap gap-1.5 pl-9 pt-1">
                  {msg.suggestedReplies.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      className="px-3 py-1.5 rounded-xl bg-lavender-soft hover:bg-brand-soft border border-border hover:border-brand/30 text-[11px] font-medium text-brand-dark transition-all cursor-pointer text-left active:scale-[0.98]"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 pl-9 py-1 text-xs text-ink-soft animate-pulse">
            <div className="w-2 h-2 rounded-full bg-brand animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
            <span>AI Assistant is analyzing context...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Controls */}
      <div className="pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border border-border/80 shadow-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all"
        >
          <button
            type="button"
            onClick={handleSimulateVoice}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isRecording
                ? "bg-destructive text-white animate-pulse"
                : "text-ink-soft hover:text-brand hover:bg-lavender-soft"
            }`}
            title="Simulate speech-to-text"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your health concern, question, or symptom..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 px-1"
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!inputMessage.trim()}
            className="rounded-xl px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Conversation Summary Modal */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="AI Consultation Summary"
        description="Patient-reviewed conversation brief for your personal health records"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="font-bold text-brand uppercase tracking-wider text-[11px]">
              Summary Draft
            </span>
            <button
              onClick={() => setIsEditingDraft(!isEditingDraft)}
              className="text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingDraft ? "Done" : "Edit Summary"}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="font-bold text-ink">Stated Concern:</span>
              {isEditingDraft ? (
                <input
                  type="text"
                  value={summaryDraft.statedConcern}
                  onChange={(e) =>
                    setSummaryDraft({ ...summaryDraft, statedConcern: e.target.value })
                  }
                  className="w-full p-2 mt-1 rounded-xl border border-border text-xs"
                />
              ) : (
                <p className="text-ink-soft mt-0.5">{summaryDraft.statedConcern}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-ink">Key Shared Information:</span>
              <ul className="list-disc pl-4 space-y-1 text-ink-soft mt-1">
                {summaryDraft.keyInformation.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-bold text-ink">Questions to Ask Your Doctor:</span>
              <ul className="list-disc pl-4 space-y-1 text-brand-dark font-medium mt-1">
                {summaryDraft.questionsForDoctor.map((q, idx) => (
                  <li key={idx}>"{q}"</li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-brand-soft/50 border border-brand/20">
              <span className="font-bold text-brand-dark">Suggested Next Clinical Step:</span>
              <p className="text-ink mt-0.5">{summaryDraft.suggestedNextStep}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-lavender-soft/60 text-[11px] text-ink-soft">
            Note: This summary is a self-care draft. It has not been transmitted to your doctor or entered into official clinical charts.
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              href="/doctors"
              className="flex-1 py-2.5 rounded-xl bg-brand text-white font-bold text-xs text-center shadow-soft hover:bg-brand-dark transition-all flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Doctor Appointment</span>
            </Link>

            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setShowSummaryModal(false);
                router.push("/ai-consultation");
              }}
            >
              Save & Back to AI History
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
