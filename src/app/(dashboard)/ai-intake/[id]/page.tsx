"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Activity,
  Edit2,
  ShieldCheck,
  Send,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { INTAKE_QUESTIONS, IntakeQuestion } from "@/data/mock-ai-intake";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AIIntakePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getAppointmentById, saveIntakeSummary, patient } = usePatient();

  const appointment = getAppointmentById(resolvedParams.id);

  const [step, setStep] = useState<"intro" | "questions" | "review" | "generating" | "complete">(
    "intro"
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Answers map
  const [answers, setAnswers] = useState<Record<string, any>>({
    q_chief_complaint: "Review Day 9 Follicular Study & Estradiol levels for trigger timing.",
    q_duration_cycle: "Cycle Day 9 (Stimulation Day 8)",
    q_symptoms: ["Mild pelvic fullness / heaviness", "Bloating after meals"],
    q_medications: "Gonal-F 225 IU (8:30 PM) + Cetrotide 0.25 mg (7:00 AM) + CoQ10 + Folic Acid",
    q_allergies: "No known drug allergies (NKDA)",
    q_doctor_questions: "Will my egg retrieval be on Saturday or Sunday? Do I continue Gonal-F tonight?",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  const currentQ = INTAKE_QUESTIONS[currentQuestionIndex]!;
  const totalQuestions = INTAKE_QUESTIONS.length;

  // Voice simulation
  const handleToggleVoiceInput = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info("Listening... Speak your response clearly.", {
        description: "Simulating neural speech-to-text recognition.",
      });
      setTimeout(() => {
        setIsRecording(false);
        setAnswers((prev) => ({
          ...prev,
          [currentQ.id]: `${prev[currentQ.id] || ""} (Transcribed via voice: Patient reports feeling well and ready for procedure)`.trim(),
        }));
        toast.success("Voice transcribed successfully.");
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setStep("review");
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setStep("intro");
    }
  };

  const handleGenerateSummary = () => {
    setStep("generating");
    setTimeout(() => {
      saveIntakeSummary(appointment?.id || "apt-101", {
        completedAt: new Date().toISOString(),
        answers,
        doctorBrief: {
          chiefComplaint: answers.q_chief_complaint,
          cycleStage: answers.q_duration_cycle,
          symptoms: answers.q_symptoms,
          medications: answers.q_medications,
          allergies: answers.q_allergies,
          patientQuestions: answers.q_doctor_questions,
        },
      });
      setStep("complete");
    }, 1200);
  };

  const doctorName = appointment?.doctorName || "Dr. Sunita Sharma";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Emergency Guidance Banner (Mandatory safety notice) */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-ink flex items-start gap-2.5 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Notice:</strong> This AI intake assists Dr. {doctorName.split(" ")[1]} before your consultation. It does <strong>not</strong> provide medical diagnoses or emergency triage. For severe pain or heavy bleeding, visit the nearest emergency room immediately.
        </p>
      </div>

      {/* STEP 1: INTRO */}
      {step === "intro" && (
        <Card className="border-brand/20 shadow-soft overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-brand-soft text-brand-dark mx-auto flex items-center justify-center shadow-lift">
              <Sparkles className="w-8 h-8 text-brand animate-pulse-subtle" />
            </div>

            <div>
              <Badge variant="primary" size="sm">
                SmrkoMed Clinical AI
              </Badge>
              <h1 className="text-xl sm:text-2xl font-bold text-ink mt-2">
                Pre-Consultation Clinical Intake
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft max-w-md mx-auto mt-1 leading-relaxed">
                Answer 6 short questions so {doctorName} can review your symptoms, medications, and questions before you join the room.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-lavender-soft/60 border border-border text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Takes under 2 minutes to complete</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Voice input or typing supported</span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-ink">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Generates a structured clinical brief for the doctor</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setStep("questions")}
                className="text-base font-bold shadow-soft"
              >
                <span>Begin Intake</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: QUESTIONS FLOW */}
      {step === "questions" && (
        <div className="space-y-5">
          {/* Progress Header */}
          <div className="flex items-center justify-between text-xs text-ink-soft font-semibold">
            <button
              onClick={handlePrev}
              className="flex items-center gap-1 hover:text-ink cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-border/60 overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>

          {/* Question Card */}
          <Card className="border-brand/20 shadow-soft">
            <CardContent className="p-5 sm:p-7 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Question {currentQ.number}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
                  {currentQ.title}
                </h2>
                <p className="text-xs text-ink-soft mt-1">{currentQ.subtitle}</p>
              </div>

              {/* Input Renderers based on question type */}
              {/* Type: Chips Single */}
              {currentQ.type === "chips_single" && currentQ.options && (
                <div className="space-y-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQ.id]: opt })}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-brand bg-brand-soft/50 text-brand-dark shadow-xs"
                            : "border-border bg-card text-ink hover:bg-lavender-soft"
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type: Chips Multi (Symptoms) */}
              {currentQ.type === "chips_multi" && currentQ.options && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQ.options.map((opt) => {
                      const currentSelected: string[] = answers[currentQ.id] || [];
                      const isSelected = currentSelected.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAnswers({
                                ...answers,
                                [currentQ.id]: currentSelected.filter((item) => item !== opt),
                              });
                            } else {
                              setAnswers({
                                ...answers,
                                [currentQ.id]: [...currentSelected, opt],
                              });
                            }
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "border-brand bg-brand text-white font-semibold shadow-xs"
                              : "border-border bg-card text-ink hover:bg-lavender-soft"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                  {currentQ.helpNote && (
                    <p className="text-[11px] text-ink-soft italic pt-1">{currentQ.helpNote}</p>
                  )}
                </div>
              )}

              {/* Type: Text or Composite */}
              {(currentQ.type === "text" || currentQ.type === "composite") && (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                    placeholder={currentQ.placeholder}
                    className="w-full bg-lavender-soft/40 rounded-2xl border border-border p-3.5 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />

                  {/* Suggestions Chips */}
                  {currentQ.defaultSuggestions && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
                        Quick Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentQ.defaultSuggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setAnswers({ ...answers, [currentQ.id]: sug })}
                            className="px-2.5 py-1 rounded-lg bg-lavender-soft border border-border text-[11px] text-ink hover:bg-brand-soft hover:text-brand-dark transition-colors cursor-pointer text-left"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voice simulation control */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={handleToggleVoiceInput}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isRecording
                          ? "bg-destructive text-white animate-pulse"
                          : "bg-lavender-soft text-brand-dark hover:bg-brand-soft"
                      }`}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-brand" />}
                      <span>{isRecording ? "Listening (Stop)..." : "Simulate Voice Answer"}</span>
                    </button>
                    <span className="text-[11px] text-ink-soft">Or type answers above</span>
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="pt-3">
                <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
                  <span>
                    {currentQuestionIndex === totalQuestions - 1
                      ? "Review All Answers"
                      : "Next Question"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: REVIEW ANSWERS */}
      {step === "review" && (
        <Card className="border-brand/20 shadow-soft">
          <CardContent className="p-5 sm:p-7 space-y-5">
            <div>
              <Badge variant="primary" size="sm">
                Step 2 of 2
              </Badge>
              <h2 className="text-lg sm:text-xl font-bold text-ink mt-1">
                Review Your Clinical Intake
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Check your answers before generating the summary brief for {doctorName}.
              </p>
            </div>

            <div className="space-y-3">
              {INTAKE_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-2xl bg-lavender-soft/50 border border-border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                      {q.number}. {q.title}
                    </span>
                    <button
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setStep("questions");
                      }}
                      className="text-xs text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <p className="text-xs text-ink font-medium leading-relaxed">
                    {Array.isArray(answers[q.id])
                      ? answers[q.id].join(", ") || "None selected"
                      : answers[q.id] || "No response provided"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep("questions")}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleGenerateSummary}
              >
                <Sparkles className="w-4 h-4" />
                <span>Submit to Doctor's Dashboard</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: GENERATING STATE */}
      {step === "generating" && (
        <Card className="border-brand/20 shadow-soft text-center p-8">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-brand border-t-transparent animate-spin mx-auto" />
            <h3 className="text-base font-bold text-ink">
              Synthesizing Clinical Intake Brief...
            </h3>
            <p className="text-xs text-ink-soft max-w-sm mx-auto">
              Structuring chief complaint, current cycle day, medication adherence, and priority questions for {doctorName}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: COMPLETE & SUMMARY PREVIEW */}
      {step === "complete" && (
        <Card className="border-success/30 shadow-lift overflow-hidden">
          <CardContent className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border/50">
              <div className="w-12 h-12 rounded-2xl bg-success/15 text-success flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <Badge variant="success" size="sm">
                  Clinical Intake Ready
                </Badge>
                <h2 className="text-lg font-bold text-ink mt-0.5">
                  Brief Generated for {doctorName}
                </h2>
              </div>
            </div>

            {/* Generated Brief Card */}
            <div className="p-4 rounded-2xl bg-lavender-soft/60 border border-border text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="font-bold text-brand uppercase tracking-wider text-[11px]">
                  Doctor Pre-Visit Summary Card
                </span>
                <span className="text-[10px] text-ink-soft font-mono">
                  Patient: {patient.name} ({patient.uhid})
                </span>
              </div>

              <div>
                <span className="font-bold text-ink">Primary Agenda:</span>
                <p className="text-ink-soft mt-0.5">{answers.q_chief_complaint}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-ink">Cycle Day:</span>
                  <p className="text-ink-soft mt-0.5">{answers.q_duration_cycle}</p>
                </div>
                <div>
                  <span className="font-bold text-ink">Allergies:</span>
                  <p className="text-ink-soft mt-0.5">{answers.q_allergies}</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-ink">Active Medications:</span>
                <p className="text-ink-soft mt-0.5">{answers.q_medications}</p>
              </div>

              <div>
                <span className="font-bold text-ink">Patient's Key Questions:</span>
                <p className="text-ink-soft mt-0.5">{answers.q_doctor_questions}</p>
              </div>
            </div>

            {/* Emergency / Prototype Label */}
            <div className="text-[11px] text-ink-soft italic p-2 rounded-xl bg-card border border-border/60">
              This summary is ready on the doctor's teleconsultation screen. You can proceed directly to your appointment.
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {appointment && appointment.canJoinVideo && (
                <Link
                  href={`/telehealth/${appointment.id}`}
                  className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold text-xs text-center shadow-soft"
                >
                  Join Consultation Now
                </Link>
              )}
              <Link
                href="/appointments"
                className="flex-1 py-3 rounded-xl border border-border bg-card text-ink font-semibold text-xs text-center"
              >
                Back to Appointments
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
