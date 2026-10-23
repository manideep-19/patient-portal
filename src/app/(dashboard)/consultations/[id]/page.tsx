"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Pill,
  Sparkles,
  Download,
  Share2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ConsultationDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getAppointmentById } = usePatient();

  const appointment = getAppointmentById(resolvedParams.id);

  if (!appointment) {
    return (
      <div className="text-center py-12 p-6">
        <h2 className="text-lg font-bold text-ink">Consultation Record Not Found</h2>
        <p className="text-xs text-ink-soft mt-1 mb-4">
          The requested clinical visit could not be loaded.
        </p>
        <Link href="/appointments" className="text-xs text-brand font-semibold underline">
          Back to appointments
        </Link>
      </div>
    );
  }

  const handleDownloadSummary = () => {
    toast.success("Downloading Clinical Summary PDF", {
      description: `Summary_${appointment.bookingRef}.pdf`,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top back */}
      <div>
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to appointments</span>
        </Link>
      </div>

      {/* Main Clinical Visit Card */}
      <Card className="border-brand/20 overflow-hidden shadow-soft">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  Completed Visit
                </Badge>
                <span className="text-xs text-ink-soft font-mono">
                  Ref: {appointment.bookingRef}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-ink mt-1">
                Consultation Summary & Care Plan
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadSummary}>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>

          {/* Doctor & Patient Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-lavender-soft/60 border border-border/70 text-xs">
            <div className="flex items-center gap-3">
              <Avatar
                name={appointment.doctorName}
                src={appointment.doctorAvatar}
                size="md"
              />
              <div>
                <p className="font-bold text-ink text-sm">{appointment.doctorName}</p>
                <p className="text-brand-dark font-medium">{appointment.doctorSpecialty}</p>
                <p className="text-ink-soft text-[11px] mt-0.5">{appointment.clinicBranch}</p>
              </div>
            </div>

            <div className="sm:border-l sm:border-border/60 sm:pl-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-ink-soft">Consultation Date:</span>
                <span className="font-bold text-ink">{appointment.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Session Mode:</span>
                <span className="font-bold text-ink capitalize">
                  {appointment.mode === "video" ? "Video Consultation" : "In-Clinic Visit"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Payment:</span>
                <span className="font-bold text-success">
                  ₹{appointment.feePaid} ({appointment.paymentMethod})
                </span>
              </div>
            </div>
          </div>

          {/* Chief Complaint & Clinical Diagnosis */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                Primary Reason / Chief Complaint
              </h3>
              <p className="text-xs sm:text-sm text-ink font-medium bg-card p-3 rounded-xl border border-border">
                {appointment.reasonForVisit}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                Doctor's Clinical Notes & Assessment
              </h3>
              <div className="p-3.5 rounded-xl bg-card border border-border text-xs sm:text-sm text-ink leading-relaxed space-y-2">
                <p>
                  Patient reviewed on Cycle Day 9 of antagonist stimulation protocol. TVS ultrasound findings demonstrate progressive cohort expansion with 7 dominant follicles ranging between 13mm and 16.4mm. Endometrial thickness receptive at 8.6mm trilaminar.
                </p>
                <p>
                  Serum estradiol levels (1,420 pg/mL) align appropriately with follicular volume. Progesterone is quiet (0.45 ng/mL). Advised continuing Inj Cetrotide 0.25 mg to protect against spontaneous surge.
                </p>
              </div>
            </div>
          </div>

          {/* Prescribed Medications */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              <Pill className="w-4 h-4 text-brand" />
              <span>Doctor-Approved Prescriptions</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex justify-between font-bold text-brand-dark">
                  <span>Inj Gonal-F (Recombinant FSH) 225 IU</span>
                  <Badge variant="secondary" size="sm">
                    Subcutaneous
                  </Badge>
                </div>
                <p className="text-ink-soft mt-0.5">
                  Once daily at 08:30 PM • 3 days remaining • Keep refrigerated
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card">
                <div className="flex justify-between font-bold text-brand-dark">
                  <span>Inj Cetrotide 0.25 mg</span>
                  <Badge variant="secondary" size="sm">
                    Subcutaneous
                  </Badge>
                </div>
                <p className="text-ink-soft mt-0.5">
                  Once daily morning at 07:00 AM sharp • Prevents premature LH surge
                </p>
              </div>
            </div>
          </div>

          {/* AI-Assisted Clinical Brief Badge (Clearly Distinguished) */}
          <div className="p-4 rounded-2xl bg-brand-soft/40 border border-brand/20 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand shrink-0" />
              <h4 className="text-xs font-bold text-brand-dark">
                AI Intake & Pre-Consultation Summary (Prototype Preview)
              </h4>
              <Badge variant="outline" size="sm" className="ml-auto text-[10px]">
                Assisted Draft
              </Badge>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              Patient reported mild lower abdominal fullness and zero fever or pain. Confirmed 100% medication adherence over the last 8 stimulation days. No drug allergies noted.
            </p>
            <div className="text-[10px] text-ink-soft/80 italic pt-1 border-t border-brand/10">
              Note: This AI-assisted intake draft is intended for doctor reference and is not a clinical diagnosis.
            </div>
          </div>

          {/* Follow-up CTA */}
          <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-ink-soft">
              <span className="font-semibold text-ink">Recommended Follow-up:</span>{" "}
              In 2 days for final trigger decision & OPU scheduling.
            </div>

            <Link
              href={`/book?doctorId=${appointment.doctorId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark transition-all shrink-0"
            >
              <span>Book Follow-up Session</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
