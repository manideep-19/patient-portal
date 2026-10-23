"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  MessageSquare,
  Activity,
  FileText,
  HeartPulse,
  HelpCircle,
  Clock,
  ClipboardCheck,
  Plus,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { AI_CONSULTATION_TOPICS, AiConsultationTopic } from "@/data/mock-ai-consultation";
import { toast } from "sonner";

export default function AiConsultationLandingPage() {
  const router = useRouter();
  const {
    aiConsultationSessions,
    createAiConsultationSession,
    deleteAiConsultationSession,
  } = usePatient();

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleStartTopic = (topic: AiConsultationTopic) => {
    const session = createAiConsultationSession(topic.id, topic.starterPrompt);
    router.push(`/ai-consultation/${session.id}`);
  };

  const handleStartBlank = () => {
    const session = createAiConsultationSession("symptoms");
    router.push(`/ai-consultation/${session.id}`);
  };

  const getTopicIcon = (iconName: string) => {
    switch (iconName) {
      case "Activity":
        return <Activity className="w-5 h-5 text-brand" />;
      case "ClipboardCheck":
        return <ClipboardCheck className="w-5 h-5 text-brand" />;
      case "FileText":
        return <FileText className="w-5 h-5 text-brand" />;
      case "HeartPulse":
        return <HeartPulse className="w-5 h-5 text-brand" />;
      case "HelpCircle":
        return <HelpCircle className="w-5 h-5 text-brand" />;
      default:
        return <Clock className="w-5 h-5 text-brand" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              SmrkoMed AI Consultation
            </h1>
            <Badge variant="primary" size="sm">
              Standalone AI
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Private, patient-initiated guided conversations to explore symptoms and prepare for doctor visits.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleStartBlank}
          className="shrink-0 shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>New AI Conversation</span>
        </Button>
      </div>

      {/* Mandatory Clinical Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-lavender-soft border border-brand/20 text-ink flex items-start gap-2.5 text-xs">
        <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Clinical Safety Notice:</strong> SmrkoMed AI is a supportive preparation assistant. It does <strong>not</strong> provide diagnostic medical determinations, prescribe medications, or replace direct evaluation by your qualified clinician.
        </p>
      </div>

      {/* Suggested Topic Grid (Inspired by Reference Images) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Explore Topics & Start a Guided Conversation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {AI_CONSULTATION_TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => handleStartTopic(topic)}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:border-brand/40 hover:shadow-soft transition-all text-left flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand-dark flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getTopicIcon(topic.iconName)}
                  </div>
                  {topic.badge && (
                    <Badge variant="primary" size="sm">
                      {topic.badge}
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-sm text-ink group-hover:text-brand transition-colors">
                  {topic.title}
                </h3>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  {topic.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-brand mt-4 pt-2 border-t border-border/40">
                <span>Start conversation</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Past AI Consultations Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Your Previous AI Conversations ({aiConsultationSessions.length})
          </h2>
        </div>

        {aiConsultationSessions.length > 0 ? (
          <div className="space-y-3">
            {aiConsultationSessions.map((session) => (
              <Card
                key={session.id}
                className="hover:border-brand/40 hover:shadow-soft transition-all"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-ink">{session.title}</h4>
                        <Badge
                          variant={session.status === "completed" ? "success" : "secondary"}
                          size="sm"
                        >
                          {session.status === "completed" ? "Completed" : "In Progress"}
                        </Badge>
                      </div>

                      <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">
                        Last message: {session.messages[session.messages.length - 1]?.text}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-ink-soft mt-1">
                        <span>{new Date(session.lastMessageAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{session.messages.length} messages</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 self-end sm:self-center">
                    <Link
                      href={`/ai-consultation/${session.id}`}
                      className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark transition-all flex items-center gap-1"
                    >
                      <span>{session.status === "completed" ? "View Conversation" : "Continue"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => setSessionToDelete(session.id)}
                      className="p-2 rounded-xl text-ink-soft hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl border border-dashed border-border bg-lavender-soft/40 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-brand mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-ink">No Saved Conversations</h4>
            <p className="text-xs text-ink-soft">
              Start a new guided conversation above to discuss symptoms or prep questions.
            </p>
          </div>
        )}
      </div>

      {/* Book Doctor Callout */}
      <Card className="border-brand/20 bg-gradient-to-r from-card to-brand-soft/30 overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-ink">Ready to speak with a physician?</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Book a video or in-clinic visit with our verified reproductive medicine specialists.
            </p>
          </div>
          <Link
            href="/doctors"
            className="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all shrink-0"
          >
            Find Doctors & Book
          </Link>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <Modal
          isOpen={!!sessionToDelete}
          onClose={() => setSessionToDelete(null)}
          title="Delete Conversation?"
          description="Are you sure you want to permanently delete this AI consultation history?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-soft">
              This demo conversation and any generated summaries will be removed from your profile.
            </p>
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSessionToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="md"
                fullWidth
                onClick={() => {
                  deleteAiConsultationSession(sessionToDelete);
                  setSessionToDelete(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
