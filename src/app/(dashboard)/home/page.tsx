"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Video,
  MapPin,
  Clock,
  ArrowRight,
  HeartPulse,
  FileText,
  UserCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  Phone,
  PhoneCall,
  Search,
  Mic,
  RotateCcw,
  Star,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Modal } from "@/components/ui/modal";
import { StartCallModal } from "@/components/telehealth/start-call-modal";

export default function HomePage() {
  const router = useRouter();
  const {
    patient,
    nextAppointment,
    pendingCareTasks,
    toggleCareTask,
    records,
    doctors,
    updateAiPreCallStatus,
  } = usePatient();

  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any | null>(null);
  const [showDoctorPreviewModal, setShowDoctorPreviewModal] = useState(false);
  const [isStartCallModalOpen, setIsStartCallModalOpen] = useState(false);
  const [startCallRoomId, setStartCallRoomId] = useState<string | undefined>(undefined);
  const [startCallDoctorName, setStartCallDoctorName] = useState<string | undefined>(undefined);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  };

  const topCareTasks = pendingCareTasks.slice(0, 3);
  const recentRecords = records.slice(0, 3);
  const popularDoctors = doctors.slice(0, 3);

  // AI Pre-Appointment Call data linked to next appointment
  const aiPreCall = nextAppointment?.aiPreCall;
  const isPreCallActive = aiPreCall?.enabled && aiPreCall.status !== "cancelled";

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Header (Matching Reference Image 1 & 2) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <Avatar
            name={patient.name}
            src={patient.avatarUrl}
            size="md"
            className="ring-2 ring-brand/30 shadow-xs"
          />
          <div>
            <div className="text-xs text-ink-soft font-medium leading-none">
              {getGreeting()}
            </div>
            <div className="text-base sm:text-lg font-bold text-ink mt-0.5">
              {patient.name}
            </div>
          </div>
        </div>

        <Link
          href="/doctors"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </Link>
      </div>

      {/* 2. Headline & Search Bar (Reference Image 1) */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight">
          How are you feeling today?
        </h1>

        <div className="relative">
          <Search className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            onFocus={() => router.push("/doctors")}
            placeholder="Search a doctor, medicine, symptom..."
            className="w-full bg-card rounded-full border border-border/80 pl-11 pr-11 py-3 text-xs sm:text-sm font-medium text-ink placeholder:text-ink-soft/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all cursor-pointer"
          />
          <button
            onClick={() => router.push("/ai-consultation")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand hover:text-brand-dark cursor-pointer p-1 rounded-full hover:bg-lavender transition-colors"
            title="Start voice consultation"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Priority 1: Next Appointment Hero Card (Reference Image 1 Gradient Card) */}
      {nextAppointment ? (
        <div className="relative rounded-3xl p-5 sm:p-6 text-white overflow-hidden shadow-lift bg-gradient-to-br from-brand via-brand-dark to-purple-950">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar inside Card */}
          <div className="flex items-center justify-between pb-3 border-b border-white/15 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Upcoming Appointment
              </span>
            </div>

            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1">
              {nextAppointment.mode === "video" ? (
                <>
                  <Video className="w-3 h-3" /> Video Consult
                </>
              ) : (
                <>
                  <MapPin className="w-3 h-3" /> In-Clinic
                </>
              )}
            </span>
          </div>

          {/* Doctor Info */}
          <div className="flex items-start gap-4 my-4">
            <Avatar
              name={nextAppointment.doctorName}
              src={nextAppointment.doctorAvatar}
              size="lg"
              className="ring-2 ring-white/30 shadow-md shrink-0"
            />
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {nextAppointment.doctorName}
              </h3>
              <p className="text-xs text-brand-soft font-medium mt-0.5">
                {nextAppointment.doctorSpecialty}
              </p>
              <p className="text-[11px] text-white/70 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-brand-soft shrink-0" />
                <span>{nextAppointment.clinicBranch}</span>
              </p>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-soft shrink-0" />
              <div>
                <span className="text-[10px] text-white/70 block">Date</span>
                <span className="font-bold text-white">{nextAppointment.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-soft shrink-0" />
              <div>
                <span className="text-[10px] text-white/70 block">Time</span>
                <span className="font-bold text-white">{nextAppointment.timeSlot}</span>
              </div>
            </div>
          </div>

          {/* Action Pills (White Pill Buttons from Reference Image 1) */}
          <div className="flex items-center gap-2.5 pt-4">
            <Link
              href="/appointments"
              className="flex-1 py-2.5 rounded-full bg-white text-brand-dark font-bold text-xs text-center shadow-xs hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Re-Schedule
            </Link>

            {nextAppointment.canJoinVideo ? (
              <button
                onClick={() => {
                  setStartCallRoomId(nextAppointment.id);
                  setStartCallDoctorName(nextAppointment.doctorName);
                  setIsStartCallModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs text-center hover:bg-white/30 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Start Call</span>
              </button>
            ) : (
              <button
                onClick={() => setSelectedAppointmentDetails(nextAppointment)}
                className="flex-1 py-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs text-center hover:bg-white/30 active:scale-[0.98] transition-all"
              >
                View Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="p-6 text-center">
            <Calendar className="w-10 h-10 text-brand mx-auto mb-2 opacity-70" />
            <h3 className="text-base font-bold text-ink">No Upcoming Appointments</h3>
            <p className="text-xs text-ink-soft max-w-sm mx-auto mt-1 mb-4">
              Schedule your consultation with top fertility specialists in Bengaluru.
            </p>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand text-white text-xs font-semibold shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 4. Priority 2: MODULE 1 — Dedicated AI Pre-Appointment Call Card */}
      {isPreCallActive && aiPreCall && (
        <Card
          className={`overflow-hidden border transition-all ${
            aiPreCall.status === "completed"
              ? "bg-gradient-to-r from-success/5 via-card to-card border-success/30 shadow-xs"
              : aiPreCall.status === "missed"
              ? "bg-gradient-to-r from-amber-500/10 via-card to-card border-amber-500/30 shadow-xs"
              : "bg-gradient-to-r from-brand-soft/50 via-card to-lavender-soft/40 border-brand/30 shadow-soft"
          }`}
        >
          <CardContent className="p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs shadow-xs">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    AI Pre-Appointment Call
                  </h3>
                  <span className="text-[11px] text-brand-dark font-medium">
                    Scheduled for {aiPreCall.scheduledTime} (5 mins before {aiPreCall.appointmentTime})
                  </span>
                </div>
              </div>

              <Badge
                variant={
                  aiPreCall.status === "ready_to_start"
                    ? "primary"
                    : aiPreCall.status === "completed"
                    ? "success"
                    : aiPreCall.status === "missed"
                    ? "warning"
                    : "secondary"
                }
                size="sm"
              >
                {aiPreCall.status === "ready_to_start"
                  ? "Ready to Start"
                  : aiPreCall.status === "completed"
                  ? "Completed"
                  : aiPreCall.status === "missed"
                  ? "Missed"
                  : aiPreCall.status === "skipped"
                  ? "Skipped"
                  : "Scheduled"}
              </Badge>
            </div>

            {/* Description Text */}
            <p className="text-xs text-ink-soft leading-relaxed">
              {aiPreCall.status === "completed" ? (
                <span>
                  ✅ <strong>Information prepared for {nextAppointment?.doctorName}:</strong> Your 5-minute pre-call responses have been synthesized into a clinical handoff brief.
                </span>
              ) : aiPreCall.status === "missed" ? (
                <span>
                  ⚠️ <strong>Pre-call missed at {aiPreCall.scheduledTime}:</strong> Your main consultation with {nextAppointment?.doctorName} is confirmed. You can start the pre-call now or attend the appointment directly.
                </span>
              ) : (
                <span>
                  <strong>Get ready for your consultation:</strong> Takes approximately five minutes to understand your main concern, symptoms, and medications so your doctor is prepared before you enter the room.
                </span>
              )}
            </p>

            {/* Actions for AI Pre-Call */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {aiPreCall.status === "completed" ? (
                <>
                  <Link
                    href={`/ai-call/${nextAppointment?.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-soft text-brand-dark text-xs font-semibold hover:bg-lavender transition-colors"
                  >
                    <span>View Prepared Summary</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setShowDoctorPreviewModal(true)}
                    className="px-3.5 py-2 rounded-xl border border-border text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
                  >
                    Doctor-Side Preview
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/ai-call/${nextAppointment?.id}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark active:scale-[0.98] transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Join 5-Min AI Pre-Call</span>
                  </Link>

                  <button
                    onClick={() => updateAiPreCallStatus(nextAppointment!.id, "skipped")}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-ink-soft hover:text-ink hover:bg-lavender transition-colors cursor-pointer"
                  >
                    Skip Call
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Priority 4: MODULE 2 — Standalone AI Consultation Entry Card */}
      <Card className="border-brand/20 bg-gradient-to-r from-purple-900/10 via-brand-soft/30 to-lavender-soft/40 shadow-soft overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-soft">
              <Sparkles className="w-6 h-6 animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-ink">
                  SmrkoMed AI Consultation
                </h3>
                <Badge variant="primary" size="sm">
                  Available 24/7
                </Badge>
              </div>
              <p className="text-xs text-ink-soft mt-0.5 leading-relaxed max-w-md">
                Private, self-directed conversation to explore symptoms, understand lab reports, and prepare questions for your doctor.
              </p>
            </div>
          </div>

          <Link
            href="/ai-consultation"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all text-center flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Start AI Consultation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Online Video Telemedicine Card */}
      <Card className="border-brand/20 bg-gradient-to-r from-brand/10 via-card to-lavender-soft/40 shadow-soft overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-soft">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-ink">
                  Live Doctor Video Telehealth
                </h3>
                <Badge variant="success" size="sm">
                  Live Calls
                </Badge>
              </div>
              <p className="text-xs text-ink-soft mt-0.5 leading-relaxed max-w-md">
                Launch an instant consultation room, invite your doctor via shareable link, and talk in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setStartCallRoomId(`live-${Date.now().toString(36).slice(2, 7)}`);
                setStartCallDoctorName("Dr. Sunita Sharma");
                setIsStartCallModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start Online Call</span>
            </button>

            <Link
              href="/telehealth"
              className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-ink text-xs font-semibold hover:bg-muted transition-colors text-center"
            >
              Hub
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 6. Popular Doctors Carousel (Reference Image 1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft">
            Popular Doctors
          </h2>
          <Link
            href="/doctors"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {popularDoctors.map((doc) => (
            <Link
              key={doc.id}
              href={`/doctors/${doc.id}`}
              className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-brand/40 hover:shadow-soft transition-all flex items-center gap-3 group"
            >
              <Avatar
                name={doc.name}
                src={doc.avatarUrl}
                size="md"
                className="ring-1 ring-brand/20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-xs sm:text-sm text-ink truncate group-hover:text-brand transition-colors">
                  {doc.prefix} {doc.name}
                </h4>
                <p className="text-[11px] text-ink-soft truncate">{doc.specialty}</p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 mt-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{doc.rating}</span>
                  <span className="text-[10px] text-ink-soft font-normal">
                    ({doc.reviewCount})
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 7. Today's Care Tasks (Care Loop) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-ink">Today's Care Tasks</h3>
            </div>
            <Link
              href="/care"
              className="text-xs text-brand font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>View Care Loop</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topCareTasks.length > 0 ? (
            <div className="space-y-2.5 mt-3">
              {topCareTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl border border-border/70 bg-lavender-soft/30 hover:bg-lavender-soft/60 transition-colors flex items-start gap-3"
                >
                  <button
                    onClick={() => toggleCareTask(task.id)}
                    className="mt-0.5 w-5 h-5 rounded-lg border-2 border-brand/50 hover:border-brand hover:bg-brand/10 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label="Mark task done"
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4 text-brand" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-semibold text-ink truncate">
                        {task.title}
                      </span>
                      <span className="text-[10px] font-semibold text-ink-soft shrink-0">
                        {task.dueTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-ink-soft">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2 opacity-80" />
              <span>All care tasks for today are completed!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Recent Medical Records Carousel */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-ink">Recent Medical Records</h3>
            </div>
            <Link
              href="/records"
              className="text-xs text-brand font-semibold hover:underline flex items-center gap-0.5"
            >
              <span>All Records</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 mt-3">
            {recentRecords.map((rec) => (
              <Link
                key={rec.id}
                href="/records"
                className="p-3 rounded-xl border border-border/70 hover:border-brand/40 bg-card hover:bg-lavender-soft/40 transition-all flex items-center justify-between gap-3 block group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0 font-bold text-xs">
                    {rec.fileType === "lab" ? "LAB" : "PDF"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-ink truncate group-hover:text-brand transition-colors">
                      {rec.title}
                    </h4>
                    <p className="text-[11px] text-ink-soft truncate">
                      {rec.doctorName} • {rec.date}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-soft/60 group-hover:text-brand shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Bottom Sheet */}
      {selectedAppointmentDetails && (
        <BottomSheet
          isOpen={!!selectedAppointmentDetails}
          onClose={() => setSelectedAppointmentDetails(null)}
          title="Appointment Details"
          description={`Booking Reference: ${selectedAppointmentDetails.bookingRef}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-lavender-soft border border-border flex items-center gap-3">
              <Avatar
                name={selectedAppointmentDetails.doctorName}
                src={selectedAppointmentDetails.doctorAvatar}
                size="md"
              />
              <div>
                <h4 className="font-bold text-sm text-ink">
                  {selectedAppointmentDetails.doctorName}
                </h4>
                <p className="text-xs text-brand-dark">
                  {selectedAppointmentDetails.doctorSpecialty}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <span className="text-ink-soft">Clinic Location</span>
              <p className="font-semibold text-ink mt-0.5">
                {selectedAppointmentDetails.clinicName}
              </p>
              <p className="text-ink-soft mt-0.5">
                {selectedAppointmentDetails.clinicAddress}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setSelectedAppointmentDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Doctor-Side Preview Modal from Home */}
      <Modal
        isOpen={showDoctorPreviewModal}
        onClose={() => setShowDoctorPreviewModal(false)}
        title="Doctor Pre-Consultation Summary Card"
        description="Demo preview — structured handoff visible on the clinician's review tray"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-card border border-border space-y-2">
            <div className="font-bold text-brand uppercase tracking-wider text-[11px]">
              Pre-Consultation Brief for {nextAppointment?.doctorName}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-lavender-soft/40">
                <span className="text-ink-soft">Appointment Time:</span>
                <p className="font-bold text-ink">{nextAppointment?.timeSlot}</p>
              </div>
              <div className="p-2 rounded-lg bg-lavender-soft/40">
                <span className="text-ink-soft">Interview Duration:</span>
                <p className="font-bold text-ink">5 min AI Call</p>
              </div>
            </div>

            <div>
              <span className="font-bold text-ink">Chief Concern:</span>
              <p className="text-ink-soft mt-0.5">
                Cycle Day 9 Follicular Study & Estradiol correlation for trigger decision.
              </p>
            </div>

            <div>
              <span className="font-bold text-ink">Self-Reported Medications:</span>
              <p className="text-ink-soft mt-0.5">
                Gonal-F 225 IU subcutaneous taken 8:30 PM, Cetrotide 0.25 mg at 7:00 AM.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setShowDoctorPreviewModal(false)}
          >
            Close Preview
          </Button>
        </div>
      </Modal>

      {/* Start Call Modal */}
      <StartCallModal
        isOpen={isStartCallModalOpen}
        onClose={() => setIsStartCallModalOpen(false)}
        roomId={startCallRoomId}
        doctorName={startCallDoctorName}
        patientName={patient.name}
      />
    </div>
  );
}
