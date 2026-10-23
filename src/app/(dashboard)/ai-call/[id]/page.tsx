"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  Clock,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  User,
  ShieldCheck,
  Edit2,
  Eye,
  Calendar,
  X,
  FileText,
  CornerDownLeft,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

const FIVE_MIN_SCRIPT = [
  {
    step: 0,
    title: "Opening & Purpose",
    aiText:
      "Hello Ananya! I am SmrkoMed's automated AI assistant. I'm calling for your 5-minute pre-appointment check-in before your 10:20 AM consultation with Dr. Sunita Sharma. My goal is to capture your main concern so Dr. Sunita can be fully prepared.",
    question: "Are you ready to begin our 5-minute pre-consultation interview?",
    expectedFocus: "Consent & readiness",
    samplePatientAnswers: [
      "Yes, I am ready.",
      "Yes, let's start.",
    ],
  },
  {
    step: 1,
    title: "Question 1 — Main Concern",
    aiText:
      "Thank you. Let's start with your primary focus today: What is the main concern or reason you are consulting Dr. Sunita?",
    question: "What is the main reason for your visit today?",
    expectedFocus: "Chief complaint & primary objective",
    samplePatientAnswers: [
      "I want to review my Cycle Day 9 ultrasound and estradiol levels for trigger timing.",
      "I'm here for a routine stimulation review.",
    ],
  },
  {
    step: 2,
    title: "Question 2 — Timeline & Duration",
    aiText:
      "Got it. When did this current symptom or cycle phase begin?",
    question: "When did this concern or cycle stage begin?",
    expectedFocus: "Onset & duration",
    samplePatientAnswers: [
      "I am on Cycle Day 9 today, stimulation started 8 days ago.",
      "Just started feeling pelvic heaviness yesterday afternoon.",
    ],
  },
  {
    step: 3,
    title: "Question 3 — How It's Affecting You",
    aiText:
      "Understood. Can you briefly describe how it has been affecting you physically or in your daily routine?",
    question: "How has this been affecting your daily routine or comfort?",
    expectedFocus: "Daily impact & physical sensations",
    samplePatientAnswers: [
      "Mild lower pelvic heaviness and slight bloating after meals, but no sharp pain.",
      "Feeling comfortable overall, just moving slightly slower due to ovary fullness.",
    ],
  },
  {
    step: 4,
    title: "Question 4 — Relevant History & Medications",
    aiText:
      "That's very helpful. Is there any relevant medication, injection, allergy, or outside test result you want Dr. Sunita to be aware of before entering the room?",
    question: "Any medications, allergies, or recent reports to note?",
    expectedFocus: "Medications, allergies, and reports",
    samplePatientAnswers: [
      "Took Gonal-F 225 IU last night and Cetrotide 0.25 mg at 7:00 AM. No drug allergies.",
      "Taking prenatal vitamins, CoQ10 300mg, and stimulation injections as scheduled.",
    ],
  },
  {
    step: 5,
    title: "Question 5 — Additional Concerns for Doctor",
    aiText:
      "Lastly, is there anything specific you want to ensure Dr. Sunita answers during the appointment?",
    question: "Any specific questions you want the doctor to answer?",
    expectedFocus: "Patient priorities for the doctor",
    samplePatientAnswers: [
      "Will the egg retrieval be Saturday or Sunday, and should Vikram freeze an extra backup sample?",
      "Do I need to continue Gonal-F tonight if the trigger shot is given?",
    ],
  },
];

export default function AiPreCallPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getAppointmentById, updateAiPreCallStatus, patient } = usePatient();

  const appointment = getAppointmentById(resolvedParams.id);

  // States: "active_call" | "after_call_summary" | "missed_state" | "skipped_state"
  const [callScreenState, setCallScreenState] = useState<
    "active_call" | "after_call_summary" | "missed_state" | "skipped_state"
  >("active_call");

  const [currentStep, setCurrentStep] = useState(0);
  const [callSeconds, setCallSeconds] = useState(12);
  const [isAiSpeaking, setIsAiSpeaking] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [textFallbackInput, setTextFallbackInput] = useState("");
  const [isDoctorPreviewOpen, setIsDoctorPreviewOpen] = useState(false);

  // Patient answers for the 5 questions
  const [capturedAnswers, setCapturedAnswers] = useState({
    mainConcern: "Cycle Day 9 Follicular Study & Estradiol correlation for trigger decision.",
    duration: "Cycle Day 9 (Stimulation protocol Day 8).",
    context: "Mild bilateral pelvic heaviness and bloating after dinner. No acute pain or fever.",
    relevantHistory: "Gonal-F 225 IU subcutaneous taken 8:30 PM, Cetrotide 0.25 mg at 7:00 AM. No drug allergies.",
    additionalQuestions: "Confirm egg retrieval (OPU) date and whether to inject Gonal-F tonight.",
  });

  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Call timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callScreenState === "active_call") {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callScreenState]);

  // AI voice speaking animation toggle
  useEffect(() => {
    if (callScreenState === "active_call") {
      setIsAiSpeaking(true);
      const timer = setTimeout(() => {
        setIsAiSpeaking(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, callScreenState]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQObj = FIVE_MIN_SCRIPT[currentStep] || FIVE_MIN_SCRIPT[0]!;

  const handleNextQuestion = (chosenAnswer?: string) => {
    if (chosenAnswer) {
      if (currentStep === 1) setCapturedAnswers((prev) => ({ ...prev, mainConcern: chosenAnswer }));
      if (currentStep === 2) setCapturedAnswers((prev) => ({ ...prev, duration: chosenAnswer }));
      if (currentStep === 3) setCapturedAnswers((prev) => ({ ...prev, context: chosenAnswer }));
      if (currentStep === 4) setCapturedAnswers((prev) => ({ ...prev, relevantHistory: chosenAnswer }));
      if (currentStep === 5) setCapturedAnswers((prev) => ({ ...prev, additionalQuestions: chosenAnswer }));
    }

    if (currentStep < FIVE_MIN_SCRIPT.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setTextFallbackInput("");
    } else {
      handleCompleteCall();
    }
  };

  const handleCompleteCall = () => {
    setCallScreenState("after_call_summary");
    if (appointment) {
      updateAiPreCallStatus(appointment.id, "completed", {
        ...capturedAnswers,
        doctorReviewStatus: "prepared",
      });
    }
  };

  const handleSkipCall = () => {
    if (appointment) {
      updateAiPreCallStatus(appointment.id, "skipped");
    }
    setCallScreenState("skipped_state");
  };

  const handleSimulateMissed = () => {
    if (appointment) {
      updateAiPreCallStatus(appointment.id, "missed");
    }
    setCallScreenState("missed_state");
  };

  const doctorName = appointment?.doctorName || "Dr. Sunita Sharma";
  const appointmentTime = appointment?.aiPreCall?.appointmentTime || "10:20 AM";
  const scheduledCallTime = appointment?.aiPreCall?.scheduledTime || "10:15 AM";

  // SKIPPED STATE VIEW
  if (callScreenState === "skipped_state") {
    return (
      <div className="max-w-md mx-auto min-h-[75vh] flex flex-col justify-center text-center p-6 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-lavender text-ink-soft mx-auto flex items-center justify-center">
          <PhoneOff className="w-8 h-8 text-ink-soft" />
        </div>
        <div>
          <Badge variant="secondary" size="md">
            AI Call Skipped
          </Badge>
          <h2 className="text-xl font-bold text-ink mt-2">
            You Skipped the Pre-Appointment Call
          </h2>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-sm mx-auto">
            No worries! Your main consultation with <strong>{doctorName}</strong> at <strong>{appointmentTime}</strong> is 100% confirmed.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border text-xs text-left space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span>Doctor Consultation Confirmed</span>
          </div>
          <p className="text-ink-soft">
            You can join {doctorName}'s session directly at {appointmentTime}. Skipping the preparation call does not affect your appointment status.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setCallScreenState("active_call")}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            <span>Re-open 5-Minute AI Call</span>
          </Button>
          <Link
            href="/appointments"
            className="w-full py-2.5 rounded-xl border border-border bg-card text-ink font-semibold text-xs block"
          >
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  // MISSED STATE VIEW
  if (callScreenState === "missed_state") {
    return (
      <div className="max-w-md mx-auto min-h-[75vh] flex flex-col justify-center text-center p-6 space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <Badge variant="warning" size="md">
            Call Window Missed
          </Badge>
          <h2 className="text-xl font-bold text-ink mt-2">
            AI Pre-Call Window Missed ({scheduledCallTime})
          </h2>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-sm mx-auto">
            You were unavailable for the 5-minute pre-call. Your appointment with <strong>{doctorName}</strong> is still confirmed for <strong>{appointmentTime}</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-lavender-soft/60 border border-border text-xs text-left space-y-1.5">
          <span className="font-semibold text-ink">Important Note:</span>
          <p className="text-ink-soft">
            The AI call is an optional preparation convenience. You can provide your background information directly to {doctorName} during your live consultation.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setCallScreenState("active_call")}
          >
            <span>Start AI Pre-Call Now</span>
          </Button>
          <Link
            href="/home"
            className="w-full py-2.5 rounded-xl border border-border bg-card text-ink font-semibold text-xs block"
          >
            Back to Patient Home
          </Link>
        </div>
      </div>
    );
  }

  // AFTER-CALL SUMMARY VIEW
  if (callScreenState === "after_call_summary") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-success/15 text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <Badge variant="success" size="md">
            Pre-Appointment Interview Complete
          </Badge>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Your Information is Prepared for Your Doctor
          </h1>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Summary prepared for <strong>{doctorName}</strong> before your <strong>{appointmentTime}</strong> consultation.
          </p>
        </div>

        {/* Structured Patient Reported Summary Card */}
        <Card className="border-brand/20 shadow-soft overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Patient-Reported Context Summary
              </span>
              <button
                onClick={() => setIsEditingSummary(!isEditingSummary)}
                className="text-xs text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditingSummary ? "Done Editing" : "Edit Details"}</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-ink">1. Main Concern & Objective:</span>
                {isEditingSummary ? (
                  <input
                    type="text"
                    value={capturedAnswers.mainConcern}
                    onChange={(e) =>
                      setCapturedAnswers({ ...capturedAnswers, mainConcern: e.target.value })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-border text-xs text-ink"
                  />
                ) : (
                  <p className="text-ink-soft mt-0.5">{capturedAnswers.mainConcern}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-ink">2. Timeline & Duration:</span>
                {isEditingSummary ? (
                  <input
                    type="text"
                    value={capturedAnswers.duration}
                    onChange={(e) =>
                      setCapturedAnswers({ ...capturedAnswers, duration: e.target.value })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-border text-xs text-ink"
                  />
                ) : (
                  <p className="text-ink-soft mt-0.5">{capturedAnswers.duration}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-ink">3. Physical Comfort / Daily Impact:</span>
                {isEditingSummary ? (
                  <textarea
                    rows={2}
                    value={capturedAnswers.context}
                    onChange={(e) =>
                      setCapturedAnswers({ ...capturedAnswers, context: e.target.value })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-border text-xs text-ink"
                  />
                ) : (
                  <p className="text-ink-soft mt-0.5">{capturedAnswers.context}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-ink">4. Reported Injections, Meds & History:</span>
                {isEditingSummary ? (
                  <textarea
                    rows={2}
                    value={capturedAnswers.relevantHistory}
                    onChange={(e) =>
                      setCapturedAnswers({ ...capturedAnswers, relevantHistory: e.target.value })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-border text-xs text-ink"
                  />
                ) : (
                  <p className="text-ink-soft mt-0.5">{capturedAnswers.relevantHistory}</p>
                )}
              </div>

              <div>
                <span className="font-bold text-ink">5. Priority Questions for Doctor:</span>
                {isEditingSummary ? (
                  <textarea
                    rows={2}
                    value={capturedAnswers.additionalQuestions}
                    onChange={(e) =>
                      setCapturedAnswers({ ...capturedAnswers, additionalQuestions: e.target.value })
                    }
                    className="w-full p-2 mt-1 rounded-xl border border-border text-xs text-ink"
                  />
                ) : (
                  <p className="text-ink-soft mt-0.5">{capturedAnswers.additionalQuestions}</p>
                )}
              </div>
            </div>

            {/* Disclaimer & Doctor Preview Button */}
            <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-ink-soft italic">
                Status: Prepared for Dr. {doctorName.split(" ")[1]}'s review.
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDoctorPreviewOpen(true)}
                className="w-full sm:w-auto"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>View Doctor Preview</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action to proceed to consultation */}
        <div className="flex flex-col sm:flex-row gap-3">
          {appointment?.canJoinVideo && (
            <Link
              href={`/telehealth/${appointment.id}`}
              className="flex-1 py-3.5 rounded-xl bg-brand text-white font-bold text-xs text-center shadow-soft hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
            >
              <span>Join Doctor Consultation ({appointmentTime})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/appointments"
            className="flex-1 py-3.5 rounded-xl border border-border bg-card text-ink font-semibold text-xs text-center"
          >
            Back to Appointments
          </Link>
        </div>

        {/* Doctor-Side Preview Modal */}
        <Modal
          isOpen={isDoctorPreviewOpen}
          onClose={() => setIsDoctorPreviewOpen(false)}
          title="Doctor Pre-Consultation Summary Card"
          description="Demo preview — structured handoff visible on the clinician's review tray"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-lavender-soft border border-border flex justify-between items-center">
              <div>
                <p className="font-bold text-ink">
                  Patient: {patient.name} ({patient.uhid})
                </p>
                <p className="text-[11px] text-ink-soft">
                  Age: {patient.age} yrs • Gender: {patient.gender} • Blood Group: {patient.bloodGroup}
                </p>
              </div>
              <Badge variant="primary" size="sm">
                5-Min Pre-Call Verified
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border space-y-2">
              <div className="font-bold text-brand uppercase tracking-wider text-[11px]">
                Pre-Consultation Brief for {doctorName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-lavender-soft/40">
                  <span className="text-ink-soft">Appointment Time:</span>
                  <p className="font-bold text-ink">{appointmentTime}</p>
                </div>
                <div className="p-2 rounded-lg bg-lavender-soft/40">
                  <span className="text-ink-soft">Interview Duration:</span>
                  <p className="font-bold text-ink">4m 48s (Pre-call)</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-ink">Chief Concern:</span>
                <p className="text-ink-soft mt-0.5">{capturedAnswers.mainConcern}</p>
              </div>

              <div>
                <span className="font-bold text-ink">Onset & Cycle Timeline:</span>
                <p className="text-ink-soft mt-0.5">{capturedAnswers.duration}</p>
              </div>

              <div>
                <span className="font-bold text-ink">Current Physical Sensations:</span>
                <p className="text-ink-soft mt-0.5">{capturedAnswers.context}</p>
              </div>

              <div>
                <span className="font-bold text-ink">Self-Reported Medications:</span>
                <p className="text-ink-soft mt-0.5">{capturedAnswers.relevantHistory}</p>
              </div>

              <div>
                <span className="font-bold text-ink">Patient's Questions for You:</span>
                <p className="text-ink-soft mt-0.5">{capturedAnswers.additionalQuestions}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-lavender-soft/50 border border-border text-[11px] text-ink-soft">
              <strong>Notice for Clinical Review:</strong> All data above is self-reported by the patient during the automated 5-minute pre-call. Clinical evaluation and diagnosis remain at doctor discretion.
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setIsDoctorPreviewOpen(false)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ACTIVE 5-MINUTE AI CALL SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-b from-ink via-slate-950 to-purple-950 text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto rounded-3xl select-none relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-brand-soft">
            AI Pre-Appointment Call
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-white/90">
            <Clock className="w-3.5 h-3.5 text-brand" />
            <span>{formatTimer(callSeconds)} / 05:00</span>
          </div>

          <button
            onClick={handleSkipCall}
            className="text-[11px] text-white/60 hover:text-white underline cursor-pointer"
          >
            Skip Call
          </button>
        </div>
      </div>

      {/* Appointment Context Pill */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs my-2 z-10">
        <div className="flex items-center gap-2.5">
          <Avatar name={doctorName} size="sm" className="ring-1 ring-white/20" />
          <div>
            <p className="font-bold text-white leading-tight">{doctorName}</p>
            <p className="text-[11px] text-white/60">
              Appointment at {appointmentTime} ({scheduledCallTime} pre-call)
            </p>
          </div>
        </div>
        <Badge variant="primary" size="sm">
          5 Min Briefing
        </Badge>
      </div>

      {/* Central Visual: Animated Voice Waveform & AI Status */}
      <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-6 z-10">
        {/* Pulsing AI Assistant Orb */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand to-brand-dark flex items-center justify-center shadow-2xl animate-glow">
            <Sparkles className="w-10 h-10 text-white animate-pulse-subtle" />
          </div>

          {/* Concentric subtle waves */}
          <div className="absolute inset-0 rounded-full border-2 border-brand/40 animate-ping pointer-events-none" />
        </div>

        {/* State label */}
        <div>
          <Badge
            variant={isAiSpeaking ? "primary" : "success"}
            size="md"
            className="text-xs font-semibold px-3 py-1"
          >
            {isAiSpeaking ? (
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                SmrkoMed AI Speaking...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-success animate-pulse" />
                Listening to your answer...
              </span>
            )}
          </Badge>
          <h2 className="text-lg font-bold text-white mt-3 px-4 leading-relaxed">
            "{currentQObj.aiText}"
          </h2>
        </div>

        {/* Animated Waveform Visualization (16 dynamic bars) */}
        <div className="flex items-center gap-1.5 h-12 py-1">
          {[40, 75, 90, 50, 30, 80, 100, 60, 45, 95, 70, 35, 65, 85, 45, 25].map(
            (val, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-brand to-brand-soft transition-all"
                style={{
                  height: isAiSpeaking ? `${val}%` : `${Math.max(val * 0.4, 15)}%`,
                  animationDuration: `${0.8 + (i % 5) * 0.15}s`,
                  opacity: isAiSpeaking ? 0.9 : 0.5,
                }}
              />
            )
          )}
        </div>

        {/* Suggested Quick Answers Chips */}
        <div className="w-full space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">
            Tap to Answer Quickly:
          </span>
          <div className="space-y-1.5">
            {currentQObj.samplePatientAnswers.map((ans, idx) => (
              <button
                key={idx}
                onClick={() => handleNextQuestion(ans)}
                className="w-full p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white/90 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98]"
              >
                <span>"{ans}"</span>
                <CornerDownLeft className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
              </button>
            ))}
          </div>
        </div>

        {/* Optional Text Fallback Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textFallbackInput.trim()) handleNextQuestion(textFallbackInput.trim());
          }}
          className="w-full flex gap-2"
        >
          <input
            type="text"
            value={textFallbackInput}
            onChange={(e) => setTextFallbackInput(e.target.value)}
            placeholder="Or type custom response..."
            className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none border border-white/10 focus:border-brand"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark cursor-pointer shrink-0"
          >
            Submit
          </button>
        </form>
      </div>

      {/* Bottom Call Controls Dock */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between z-10">
        {/* Repeat Question */}
        <button
          onClick={() => {
            setIsAiSpeaking(true);
            setTimeout(() => setIsAiSpeaking(false), 3000);
            toast.info("Repeating question...");
          }}
          className="flex flex-col items-center gap-1 text-white/70 hover:text-white cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </div>
          <span className="text-[10px]">Repeat</span>
        </button>

        {/* Mute Mic Simulation */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isMuted ? "bg-destructive text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}
          aria-label="Mute mic"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Next Question / Finish */}
        <button
          onClick={() => handleNextQuestion()}
          className="px-4 py-2.5 rounded-xl bg-brand text-white font-semibold text-xs flex items-center gap-1.5 shadow-soft hover:bg-brand-dark cursor-pointer"
        >
          <span>{currentStep === FIVE_MIN_SCRIPT.length - 1 ? "Finish" : "Skip/Next"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* End Call / Skip */}
        <button
          onClick={handleSkipCall}
          className="w-11 h-11 rounded-full bg-destructive/80 text-white hover:bg-destructive flex items-center justify-center cursor-pointer"
          title="End pre-call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
