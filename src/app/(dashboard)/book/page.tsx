"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Video,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Receipt,
  FileText,
  User,
  Phone,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StepIndicator } from "@/components/ui/step-indicator";
import { formatCurrency } from "@/lib/utils";

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { doctors, patient, bookAppointment } = usePatient();

  const doctorIdParam = searchParams.get("doctorId") || doctors[0]?.id || "doc-1";
  const initialMode = (searchParams.get("mode") as "video" | "in_clinic") || "video";
  const initialDate = searchParams.get("date") || "";
  const initialSlot = searchParams.get("slot") || "";

  const [selectedDoctor, setSelectedDoctor] = useState(
    doctors.find((d) => d.id === doctorIdParam) || doctors[0]!
  );

  const [currentStep, setCurrentStep] = useState(0); // 0: Mode & Slot, 1: Details, 2: Payment, 3: Confirmed
  const [mode, setMode] = useState<"video" | "in_clinic">(initialMode);
  const [selectedDate, setSelectedDate] = useState(
    initialDate || selectedDoctor.availableDates[0]?.date || "2026-10-15"
  );
  const [selectedSlot, setSelectedSlot] = useState(
    initialSlot || selectedDoctor.availableDates[0]?.morningSlots[0] || "10:00 AM"
  );
  const [reasonForVisit, setReasonForVisit] = useState(
    "Follicular monitoring review & cycle progression guidance"
  );
  const [patientNotes, setPatientNotes] = useState("");
  const [enableAiPreCall, setEnableAiPreCall] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("UPI (Google Pay / PhonePe)");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  const steps = ["Slot", "Details", "Payment", "Confirmed"];

  const fee = mode === "video" ? selectedDoctor.videoFee : selectedDoctor.inClinicFee;
  const platformFee = 50;
  const totalAmount = fee + platformFee;

  // Handle successful booking
  const handleSimulatePayment = (success: boolean) => {
    if (!success) {
      setPaymentFailed(true);
      return;
    }
    setPaymentFailed(false);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const created = bookAppointment({
        doctorId: selectedDoctor.id,
        doctorName: `${selectedDoctor.prefix} ${selectedDoctor.name}`,
        doctorSpecialty: selectedDoctor.specialty,
        doctorAvatar: selectedDoctor.avatarUrl,
        clinicName: selectedDoctor.clinicName,
        clinicBranch: selectedDoctor.clinicBranch,
        clinicAddress: selectedDoctor.clinicAddress,
        mode,
        date: selectedDate,
        timeSlot: selectedSlot,
        feePaid: totalAmount,
        paymentMethod,
        reasonForVisit,
        enableAiPreCall,
      });

      setConfirmedBooking(created);
      setCurrentStep(3);
    }, 700);
  };

  const currentDateObj =
    selectedDoctor.availableDates.find((d) => d.date === selectedDate) ||
    selectedDoctor.availableDates[0]!;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top back button */}
      {currentStep < 3 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentStep > 0) setCurrentStep(currentStep - 1);
              else router.back();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentStep === 0 ? "Back" : "Previous step"}</span>
          </button>
          <span className="text-xs text-ink-soft font-semibold">
            Step {currentStep + 1} of 3
          </span>
        </div>
      )}

      {/* Step Indicator */}
      {currentStep < 3 && (
        <StepIndicator steps={["Select Slot", "Patient Details", "Payment"]} currentStep={currentStep} />
      )}

      {/* Step 0: Doctor, Mode & Slot */}
      {currentStep === 0 && (
        <div className="space-y-5">
          {/* Doctor Header Pill */}
          <Card className="border-brand/20 bg-card">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selectedDoctor.name}
                  src={selectedDoctor.avatarUrl}
                  size="md"
                />
                <div>
                  <h3 className="font-bold text-sm text-ink">
                    {selectedDoctor.prefix} {selectedDoctor.name}
                  </h3>
                  <p className="text-xs text-brand-dark">{selectedDoctor.specialty}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-ink-soft">Branch</span>
                <p className="text-xs font-semibold text-ink">
                  {selectedDoctor.clinicBranch.split(",")[0]}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mode Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Choose Consultation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("video")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === "video"
                    ? "border-brand bg-brand-soft/40 shadow-xs"
                    : "border-border bg-card hover:bg-lavender-soft"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Video className="w-4 h-4 text-brand" />
                    <span>Video Consultation</span>
                  </div>
                  {mode === "video" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                </div>
                <div className="text-xs font-bold text-ink mt-2">
                  {formatCurrency(selectedDoctor.videoFee)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("in_clinic")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === "in_clinic"
                    ? "border-brand bg-brand-soft/40 shadow-xs"
                    : "border-border bg-card hover:bg-lavender-soft"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <MapPin className="w-4 h-4 text-brand" />
                    <span>In-Clinic Visit</span>
                  </div>
                  {mode === "in_clinic" && <CheckCircle2 className="w-4 h-4 text-brand" />}
                </div>
                <div className="text-xs font-bold text-ink mt-2">
                  {formatCurrency(selectedDoctor.inClinicFee)}
                </div>
              </button>
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Select Appointment Date
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {selectedDoctor.availableDates.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`px-4 py-2.5 rounded-2xl border flex flex-col items-center min-w-[76px] transition-all cursor-pointer shrink-0 ${
                    selectedDate === d.date
                      ? "border-brand bg-brand text-white shadow-soft font-bold"
                      : "border-border bg-card text-ink-soft hover:text-ink hover:border-brand/30"
                  }`}
                >
                  <span className="text-[11px] font-medium opacity-90">{d.dayName}</span>
                  <span className="text-sm font-bold mt-0.5">{d.displayDate}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
              Select Time Slot
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ...currentDateObj.morningSlots,
                ...currentDateObj.afternoonSlots,
                ...currentDateObj.eveningSlots,
              ].map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand text-white shadow-xs scale-105"
                        : "bg-card border border-border text-ink hover:border-brand/40"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedSlot}
              onClick={() => setCurrentStep(1)}
            >
              <span>Continue to Patient Details</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Patient Details & Reason */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-ink">Patient Information</h3>
              <div className="p-3.5 rounded-2xl bg-lavender-soft/60 border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={patient.name} src={patient.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-xs font-bold text-ink">{patient.name}</h4>
                    <p className="text-[11px] text-ink-soft">
                      {patient.age} yrs • {patient.gender} • UHID: {patient.uhid}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">
                  Primary Patient
                </Badge>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                  Primary Reason for Consultation
                </label>
                <textarea
                  rows={2}
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full bg-lavender-soft/40 rounded-2xl border border-border p-3 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="Describe symptoms, questions, or cycle update..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                  Additional Notes for Doctor (Optional)
                </label>
                <textarea
                  rows={2}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  className="w-full bg-lavender-soft/40 rounded-2xl border border-border p-3 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="e.g., Reports from Day 9 already uploaded to portal."
                />
              </div>

              {/* Module 1: AI Pre-Appointment Call Option */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-soft/60 to-lavender-soft border border-brand/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enablePreCall"
                  checked={enableAiPreCall}
                  onChange={(e) => setEnableAiPreCall(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-brand cursor-pointer shrink-0"
                />
                <label htmlFor="enablePreCall" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <span className="font-bold text-xs text-ink">
                      Enable 5-Minute AI Pre-Appointment Call
                    </span>
                    <Badge variant="primary" size="sm" className="ml-auto">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-ink-soft mt-1 leading-relaxed">
                    Our AI assistant will call you 5 minutes before your consultation (e.g., at 10:15 AM for a 10:20 AM visit) to collect your main concerns, symptoms, and medications for Dr. {selectedDoctor.name.split(" ")[1]}.
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(0)}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setCurrentStep(2)}
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Simulated Payment */}
      {currentStep === 2 && (
        <div className="space-y-5">
          {/* Booking Summary Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Consultation Summary
                </span>
                <Badge variant={mode === "video" ? "primary" : "secondary"}>
                  {mode === "video" ? "Video Consult" : "In-Clinic Visit"}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Avatar name={selectedDoctor.name} src={selectedDoctor.avatarUrl} size="md" />
                <div>
                  <h4 className="font-bold text-sm text-ink">
                    {selectedDoctor.prefix} {selectedDoctor.name}
                  </h4>
                  <p className="text-xs text-brand-dark">{selectedDoctor.specialty}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-lavender-soft/50 border border-border">
                  <span className="text-ink-soft">Date</span>
                  <p className="font-bold text-ink mt-0.5">{selectedDate}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-lavender-soft/50 border border-border">
                  <span className="text-ink-soft">Slot</span>
                  <p className="font-bold text-ink mt-0.5">{selectedSlot}</p>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="pt-3 border-t border-border/50 space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-soft">
                  <span>Consultation Fee</span>
                  <span>{formatCurrency(fee)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Platform & Telehealth Technology Fee</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Taxes (GST)</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-ink pt-2 border-t border-border/50">
                  <span>Total Amount</span>
                  <span className="text-brand font-extrabold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selector */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink mb-2">
                Simulated Payment Method
              </h3>

              {[
                "UPI (Google Pay / PhonePe / Paytm)",
                "Credit / Debit Card (Visa, Mastercard, RuPay)",
                "Pay at Clinic Counter on Arrival",
              ].map((pm) => (
                <label
                  key={pm}
                  onClick={() => setPaymentMethod(pm)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === pm
                      ? "border-brand bg-brand-soft/30 font-semibold"
                      : "border-border bg-card text-ink-soft"
                  }`}
                >
                  <span className="text-xs text-ink">{pm}</span>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === pm}
                    onChange={() => setPaymentMethod(pm)}
                    className="accent-brand"
                  />
                </label>
              ))}

              {paymentFailed && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Simulated payment was declined. Please try again or select another method.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Action Buttons */}
          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              onClick={() => handleSimulatePayment(true)}
            >
              <span>Pay & Confirm Booking ({formatCurrency(totalAmount)})</span>
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleSimulatePayment(false)}
                className="text-[11px] text-destructive hover:underline cursor-pointer"
              >
                Test Payment Failure Simulation
              </button>
              <div className="flex items-center gap-1 text-[11px] text-ink-soft">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span>Simulated Demo Gateway</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation Screen */}
      {currentStep === 3 && confirmedBooking && (
        <Card className="border-success/30 shadow-lift overflow-hidden">
          <CardContent className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center animate-bounce-subtle">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <Badge variant="success" size="md">
                Booking Confirmed
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-ink mt-2">
                Appointment Scheduled!
              </h2>
              <p className="text-xs text-ink-soft mt-1">
                Booking Reference: <strong className="text-brand">{confirmedBooking.bookingRef}</strong>
              </p>
            </div>

            {/* Confirmed Details Pill */}
            <div className="p-4 rounded-2xl bg-lavender-soft/60 border border-border text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-soft">Doctor</span>
                <span className="font-bold text-ink">{confirmedBooking.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Date & Time</span>
                <span className="font-bold text-ink">
                  {confirmedBooking.date} at {confirmedBooking.timeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Consultation Mode</span>
                <span className="font-bold text-ink capitalize">
                  {confirmedBooking.mode === "video" ? "Video Consultation" : "In-Clinic Visit"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Clinic Branch</span>
                <span className="font-bold text-ink">{confirmedBooking.clinicBranch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Amount Paid</span>
                <span className="font-bold text-success">
                  {formatCurrency(confirmedBooking.feePaid)} ({confirmedBooking.paymentMethod})
                </span>
              </div>
              {confirmedBooking.aiPreCall?.enabled && (
                <div className="flex justify-between pt-2 border-t border-border/50 text-brand-dark">
                  <span className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    AI Pre-Call:
                  </span>
                  <span className="font-bold">
                    {confirmedBooking.aiPreCall.scheduledTime} (5 mins duration)
                  </span>
                </div>
              )}
            </div>

            {/* AI Pre-Appointment Call Callout */}
            {confirmedBooking.aiPreCall?.enabled && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-soft/80 via-lavender-soft to-card border border-brand/30 text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-brand-dark">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <span>AI Pre-Appointment Call Scheduled</span>
                  </div>
                  <Badge variant="primary" size="sm">
                    {confirmedBooking.aiPreCall.scheduledTime}
                  </Badge>
                </div>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  Your 5-minute pre-call will start at <strong>{confirmedBooking.aiPreCall.scheduledTime}</strong> before your appointment with {confirmedBooking.doctorName}. You can also test or join the call anytime.
                </p>
                <div className="mt-3">
                  <Link
                    href={`/ai-call/${confirmedBooking.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all"
                  >
                    <span>Open 5-Min AI Pre-Call</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 via-brand-soft/40 to-lavender border border-brand/20 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-brand" />
                <h4 className="text-xs font-bold text-brand-dark">
                  Recommended: AI Pre-Consultation Intake
                </h4>
              </div>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Save 10 minutes during your visit. Answer a few guided questions so Dr. {confirmedBooking.doctorName.split(" ")[1]} has a full clinical summary ready.
              </p>
              <div className="mt-3">
                <Link
                  href={`/ai-intake/${confirmedBooking.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark transition-all"
                >
                  <span>Start 2-Minute AI Intake</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href="/appointments"
                className="flex-1 py-2.5 rounded-xl border border-border bg-card text-ink text-xs font-semibold hover:bg-lavender-soft transition-colors text-center"
              >
                View in My Appointments
              </Link>
              <Link
                href="/home"
                className="flex-1 py-2.5 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft hover:bg-brand-dark transition-colors text-center"
              >
                Back to Patient Home
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
