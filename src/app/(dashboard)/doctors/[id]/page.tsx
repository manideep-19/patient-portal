"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  MapPin,
  Video,
  Clock,
  Calendar,
  Languages,
  Award,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getDoctorById } = usePatient();

  const doctor = getDoctorById(resolvedParams.id);

  const [selectedMode, setSelectedMode] = useState<"video" | "in_clinic">("video");
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  if (!doctor) {
    return (
      <div className="text-center py-12 p-6">
        <h2 className="text-lg font-bold text-ink">Doctor Not Found</h2>
        <p className="text-xs text-ink-soft mt-1 mb-4">
          The requested specialist could not be located in our directory.
        </p>
        <Link href="/doctors" className="text-xs text-brand font-semibold underline">
          Return to Doctors list
        </Link>
      </div>
    );
  }

  const currentDateObj = doctor.availableDates[selectedDateIndex] || doctor.availableDates[0]!;

  const handleBookNow = () => {
    if (!selectedSlot) return;
    router.push(
      `/book?doctorId=${doctor.id}&mode=${selectedMode}&date=${currentDateObj.date}&slot=${encodeURIComponent(
        selectedSlot
      )}`
    );
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Back button */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all doctors</span>
        </Link>
      </div>

      {/* Doctor Hero Card */}
      <Card className="border-brand/20 bg-card overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar
              name={doctor.name}
              src={doctor.avatarUrl}
              size="xl"
              className="ring-4 ring-brand/20 shadow-md shrink-0"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-ink">
                  {doctor.prefix} {doctor.name}
                </h1>
                <Badge variant="primary" size="sm">
                  Verified Specialist
                </Badge>
              </div>

              <p className="text-sm font-semibold text-brand-dark mt-1">
                {doctor.specialty}
              </p>
              <p className="text-xs text-ink-soft font-medium mt-0.5">
                {doctor.subSpecialty}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-ink-soft">
                <div className="flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{doctor.rating}</span>
                  <span className="font-normal text-[11px] text-ink-soft">
                    ({doctor.reviewCount} verified reviews)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-brand" />
                  <span>{doctor.experienceYears} Years Clinical Experience</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-brand" />
                  <span>{doctor.languages.join(", ")}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Doctor Bio & Consultation Mode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bio & Clinic Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                  About the Doctor
                </h3>
                <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                  {doctor.about}
                </p>
              </div>

              <div className="pt-3 border-t border-border/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                  Qualifications & Training
                </h3>
                <div className="flex items-start gap-2 text-xs text-ink">
                  <GraduationCap className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>{doctor.qualifications}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                  Clinic Location
                </h3>
                <div className="text-xs text-ink">
                  <p className="font-semibold">{doctor.clinicName}</p>
                  <p className="text-ink-soft mt-0.5">{doctor.clinicAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Interactive Slot Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Consultation Type Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2.5">
                  Select Consultation Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMode("video")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedMode === "video"
                        ? "border-brand bg-brand-soft/40 shadow-xs"
                        : "border-border bg-card hover:bg-lavender-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Video className={`w-4 h-4 ${selectedMode === "video" ? "text-brand" : "text-ink-soft"}`} />
                        <span className="text-xs font-bold text-ink">Video Consultation</span>
                      </div>
                      {selectedMode === "video" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    </div>
                    <p className="text-[11px] text-ink-soft">Join from home via secure teleconsult</p>
                    <div className="text-sm font-bold text-ink mt-2">
                      {formatCurrency(doctor.videoFee)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode("in_clinic")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedMode === "in_clinic"
                        ? "border-brand bg-brand-soft/40 shadow-xs"
                        : "border-border bg-card hover:bg-lavender-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${selectedMode === "in_clinic" ? "text-brand" : "text-ink-soft"}`} />
                        <span className="text-xs font-bold text-ink">In-Clinic Visit</span>
                      </div>
                      {selectedMode === "in_clinic" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    </div>
                    <p className="text-[11px] text-ink-soft">Physical visit at {doctor.clinicBranch.split(",")[0]}</p>
                    <div className="text-sm font-bold text-ink mt-2">
                      {formatCurrency(doctor.inClinicFee)}
                    </div>
                  </button>
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2.5">
                  Select Date
                </label>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {doctor.availableDates.map((dateObj, idx) => {
                    const isSelected = selectedDateIndex === idx;
                    return (
                      <button
                        key={dateObj.date}
                        onClick={() => {
                          setSelectedDateIndex(idx);
                          setSelectedSlot("");
                        }}
                        className={`px-4 py-2.5 rounded-2xl border flex flex-col items-center min-w-[76px] transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "border-brand bg-brand text-white shadow-soft font-bold"
                            : "border-border bg-card text-ink-soft hover:text-ink hover:border-brand/30"
                        }`}
                      >
                        <span className="text-[11px] font-semibold opacity-90">{dateObj.dayName}</span>
                        <span className="text-sm font-bold mt-0.5">{dateObj.displayDate}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Groups */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2.5">
                  Available Time Slots ({currentDateObj.dayName}, {currentDateObj.displayDate})
                </label>

                <div className="space-y-3">
                  {/* Morning */}
                  {currentDateObj.morningSlots.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-ink-soft block mb-1.5">
                        Morning
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentDateObj.morningSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-brand text-white shadow-xs scale-105"
                                  : "bg-lavender-soft/70 border border-border text-ink hover:border-brand/40"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon */}
                  {currentDateObj.afternoonSlots.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-ink-soft block mb-1.5">
                        Afternoon
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentDateObj.afternoonSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-brand text-white shadow-xs scale-105"
                                  : "bg-lavender-soft/70 border border-border text-ink hover:border-brand/40"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening */}
                  {currentDateObj.eveningSlots.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-ink-soft block mb-1.5">
                        Evening
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {currentDateObj.eveningSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-brand text-white shadow-xs scale-105"
                                  : "bg-lavender-soft/70 border border-border text-ink hover:border-brand/40"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking CTA Summary */}
              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <span className="text-xs text-ink-soft font-medium">Selected Slot:</span>
                  <div className="text-sm font-bold text-ink">
                    {selectedSlot ? (
                      `${currentDateObj.displayDate} at ${selectedSlot} (${
                        selectedMode === "video" ? "Video" : "In-Clinic"
                      })`
                    ) : (
                      <span className="text-ink-soft font-normal italic">
                        Please choose a time slot above
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedSlot}
                  onClick={handleBookNow}
                  className="w-full sm:w-auto"
                >
                  <span>Proceed to Booking</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
