"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  ChevronRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Filter,
  Plus,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { StartCallModal } from "@/components/telehealth/start-call-modal";

export default function AppointmentsPage() {
  const {
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    rescheduleAppointment,
    cancelAppointment,
    updateAiPreCallStatus,
    doctors,
  } = usePatient();

  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  // Modals state
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isStartCallOpen, setIsStartCallOpen] = useState(false);
  const [startCallRoomId, setStartCallRoomId] = useState<string | undefined>(undefined);
  const [startCallDoctorName, setStartCallDoctorName] = useState<string | undefined>(undefined);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState("2026-10-17");
  const [rescheduleSlot, setRescheduleSlot] = useState("11:30 AM");
  const [cancelReason, setCancelReason] = useState("Change in work schedule");

  const currentList =
    activeTab === "upcoming"
      ? upcomingAppointments
      : activeTab === "completed"
      ? completedAppointments
      : cancelledAppointments;

  const handleConfirmReschedule = () => {
    if (!selectedAppointment) return;
    rescheduleAppointment(selectedAppointment.id, rescheduleDate, rescheduleSlot);
    setIsRescheduleOpen(false);
  };

  const handleConfirmCancel = () => {
    if (!selectedAppointment) return;
    cancelAppointment(selectedAppointment.id, cancelReason);
    setIsCancelOpen(false);
    setIsDetailsOpen(false);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            My Appointments
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Manage your teleconsultations, hospital visits, and clinical reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStartCallRoomId(`live-${Date.now().toString(36).slice(2, 7)}`);
              setStartCallDoctorName("Dr. Sunita Sharma");
              setIsStartCallOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>Start Online Call</span>
          </button>

          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-ink text-xs font-semibold hover:bg-muted transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-lavender/70 border border-border/60 max-w-md">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "upcoming"
              ? "bg-card text-brand shadow-xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <span>Upcoming</span>
          {upcomingAppointments.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] flex items-center justify-center font-bold">
              {upcomingAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "completed"
              ? "bg-card text-brand shadow-xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <span>Completed</span>
          {completedAppointments.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-ink-soft/20 text-ink text-[10px] flex items-center justify-center font-semibold">
              {completedAppointments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("cancelled")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "cancelled"
              ? "bg-card text-brand shadow-xs"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <span>Cancelled</span>
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {currentList.length > 0 ? (
          currentList.map((apt) => (
            <Card
              key={apt.id}
              className="hover:border-brand/40 hover:shadow-soft transition-all overflow-hidden"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/50 gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        apt.status === "confirmed"
                          ? "primary"
                          : apt.status === "completed"
                          ? "success"
                          : "danger"
                      }
                    >
                      {apt.status === "confirmed"
                        ? "Confirmed"
                        : apt.status === "completed"
                        ? "Completed"
                        : "Cancelled"}
                    </Badge>
                    <span className="text-[11px] text-ink-soft font-mono font-medium">
                      Ref: {apt.bookingRef}
                    </span>
                  </div>

                  <Badge variant={apt.mode === "video" ? "blue" : "secondary"}>
                    {apt.mode === "video" ? (
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video Consult
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> In-Clinic Visit
                      </span>
                    )}
                  </Badge>
                </div>

                {/* Doctor & Appointment info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={apt.doctorName}
                      src={apt.doctorAvatar}
                      size="md"
                      className="ring-2 ring-brand/20 shrink-0"
                    />
                    <div>
                      <h3 className="text-base font-bold text-ink leading-tight">
                        {apt.doctorName}
                      </h3>
                      <p className="text-xs font-semibold text-brand-dark mt-0.5">
                        {apt.doctorSpecialty}
                      </p>
                      <p className="text-[11px] text-ink-soft flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-ink-soft/70 shrink-0" />
                        <span>{apt.clinicBranch}</span>
                      </p>
                    </div>
                  </div>

                  {/* Date & Time block */}
                  <div className="flex items-center gap-3 bg-lavender-soft/60 px-3.5 py-2.5 rounded-2xl border border-border/60 shrink-0 sm:text-right">
                    <Calendar className="w-4 h-4 text-brand shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-ink">{apt.date}</div>
                      <div className="text-[11px] text-ink-soft font-medium">{apt.timeSlot}</div>
                    </div>
                  </div>
                </div>

                {/* Reason for visit snippet */}
                {apt.reasonForVisit && (
                  <p className="text-xs text-ink-soft bg-card/60 p-2.5 rounded-xl border border-border/40 mt-1 line-clamp-1">
                    <span className="font-semibold text-ink">Reason: </span>
                    {apt.reasonForVisit}
                  </p>
                )}

                {/* AI Pre-Appointment Call Card */}
                {apt.status === "confirmed" && apt.aiPreCall?.enabled && (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-brand-soft/70 via-lavender/50 to-brand-soft/40 border border-brand/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                            <Sparkles className="w-3.5 h-3.5 text-brand" />
                            AI Pre-Appointment Call
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.aiPreCall.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : apt.aiPreCall.status === "ready_to_start"
                              ? "bg-amber-100 text-amber-700 animate-pulse"
                              : apt.aiPreCall.status === "skipped" || apt.aiPreCall.status === "missed"
                              ? "bg-ink-soft/10 text-ink-soft"
                              : "bg-brand/10 text-brand-dark"
                          }`}>
                            {apt.aiPreCall.status === "completed"
                              ? "✓ Brief Prepared"
                              : apt.aiPreCall.status === "ready_to_start"
                              ? "● Ready to Start"
                              : apt.aiPreCall.status === "skipped"
                              ? "Skipped"
                              : apt.aiPreCall.status === "missed"
                              ? "Missed"
                              : `Scheduled: ${apt.aiPreCall.scheduledTime}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft">
                          {apt.aiPreCall.status === "completed"
                            ? `Pre-consultation summary prepared for ${apt.doctorName}.`
                            : apt.aiPreCall.status === "skipped" || apt.aiPreCall.status === "missed"
                            ? `Optional pre-call was ${apt.aiPreCall.status}. Your appointment at ${apt.timeSlot} remains fully confirmed.`
                            : `5-minute guided voice interview to brief ${apt.doctorName} on your main concerns.`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {apt.aiPreCall.status !== "completed" ? (
                          <>
                            <Link
                              href={`/ai-call/${apt.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white font-semibold text-xs shadow-soft hover:bg-brand-dark transition-all"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{apt.aiPreCall.status === "ready_to_start" ? "Start Call Now" : "Open AI Call"}</span>
                            </Link>
                            {apt.aiPreCall.status !== "skipped" && (
                              <button
                                type="button"
                                onClick={() => updateAiPreCallStatus(apt.id, "skipped")}
                                className="px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-lavender-soft text-ink-soft text-xs transition-colors cursor-pointer"
                              >
                                Skip
                              </button>
                            )}
                          </>
                        ) : (
                          <Link
                            href={`/ai-call/${apt.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-brand/30 text-brand-dark font-semibold text-xs hover:bg-brand-soft/50 transition-colors"
                          >
                            <span>View Prepared Summary</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-border/50">
                  {apt.status === "confirmed" && apt.canJoinVideo && (
                    <button
                      onClick={() => {
                        setStartCallRoomId(apt.id);
                        setStartCallDoctorName(apt.doctorName);
                        setIsStartCallOpen(true);
                      }}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-all cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Call</span>
                    </button>
                  )}

                  {apt.status === "completed" && (
                    <Link
                      href={`/consultations/${apt.id}`}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-soft text-brand-dark text-xs font-semibold hover:bg-lavender transition-colors"
                    >
                      <span>View Consultation Summary</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setSelectedAppointment(apt);
                      setIsDetailsOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
                  >
                    View Details
                  </button>

                  {apt.status === "confirmed" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsRescheduleOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-medium text-ink hover:bg-lavender-soft transition-colors cursor-pointer"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsCancelOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors ml-auto cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<Calendar className="w-8 h-8 text-brand" />}
            title={
              activeTab === "upcoming"
                ? "No Upcoming Appointments"
                : activeTab === "completed"
                ? "No Completed Consultations"
                : "No Cancelled Appointments"
            }
            description={
              activeTab === "upcoming"
                ? "Schedule your next consultation with one of our certified specialists."
                : "Your past consultation summaries and prescriptions will appear here."
            }
            actionText={activeTab === "upcoming" ? "Book an Appointment" : undefined}
            onAction={() => (window.location.href = "/doctors")}
          />
        )}
      </div>

      {/* Appointment Details Modal / Drawer */}
      {selectedAppointment && (
        <BottomSheet
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          title="Appointment Details"
          description={`Booking Ref: ${selectedAppointment.bookingRef}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-lavender-soft border border-border flex items-center gap-3">
              <Avatar
                name={selectedAppointment.doctorName}
                src={selectedAppointment.doctorAvatar}
                size="md"
              />
              <div>
                <h4 className="font-bold text-sm text-ink">{selectedAppointment.doctorName}</h4>
                <p className="text-brand-dark font-medium">{selectedAppointment.doctorSpecialty}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Date & Time</span>
                <p className="font-bold text-ink mt-0.5">
                  {selectedAppointment.date} at {selectedAppointment.timeSlot}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Status</span>
                <p className="font-bold text-ink capitalize mt-0.5">
                  {selectedAppointment.status}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <span className="text-ink-soft">Clinic Location</span>
              <p className="font-bold text-ink mt-0.5">{selectedAppointment.clinicName}</p>
              <p className="text-ink-soft mt-0.5">{selectedAppointment.clinicAddress}</p>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border">
              <span className="text-ink-soft">Payment Breakdown</span>
              <p className="font-bold text-ink mt-0.5">
                Paid ₹{selectedAppointment.feePaid} via {selectedAppointment.paymentMethod}
              </p>
            </div>

            {selectedAppointment.notes && (
              <div className="p-3 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Clinical / Preparation Notes</span>
                <p className="text-ink mt-0.5 leading-relaxed">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              {selectedAppointment.canJoinVideo && (
                <Link
                  href={`/telehealth/${selectedAppointment.id}`}
                  className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold text-center shadow-soft"
                >
                  Join Video Call
                </Link>
              )}
              <Button variant="outline" size="md" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Reschedule Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          title="Reschedule Appointment"
          description={`Change appointment slot with ${selectedAppointment.doctorName}`}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                Select New Date
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {["2026-10-16", "2026-10-17", "2026-10-18"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRescheduleDate(d)}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-colors ${
                      rescheduleDate === d
                        ? "border-brand bg-brand-soft/50 font-bold text-brand-dark"
                        : "border-border bg-card text-ink-soft"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-2">
                Select New Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {["10:00 AM", "11:30 AM", "02:30 PM", "04:30 PM", "05:45 PM"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRescheduleSlot(s)}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-colors ${
                      rescheduleSlot === s
                        ? "border-brand bg-brand text-white font-bold"
                        : "border-border bg-card text-ink-soft"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsRescheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleConfirmReschedule}
              >
                Confirm Reschedule ({rescheduleDate} at {rescheduleSlot})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
          title="Cancel Appointment"
          description="Are you sure you want to cancel this scheduled consultation?"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive leading-relaxed">
              <strong>Cancellation Policy:</strong> A 100% refund of ₹{selectedAppointment.feePaid} will be initiated to your original payment method within 2-3 business days.
            </div>

            <div>
              <label className="font-bold text-ink block mb-1.5">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-card text-ink text-xs focus:ring-2 focus:ring-brand/30 outline-none"
              >
                <option>Change in work schedule</option>
                <option>Need to consult another specialty</option>
                <option>Symptoms resolved</option>
                <option>Doctor recommended postponing</option>
                <option>Other personal reason</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border flex gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCancelOpen(false)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                size="md"
                fullWidth
                onClick={handleConfirmCancel}
              >
                Cancel Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Start Call Modal */}
      <StartCallModal
        isOpen={isStartCallOpen}
        onClose={() => setIsStartCallOpen(false)}
        roomId={startCallRoomId}
        doctorName={startCallDoctorName}
      />
    </div>
  );
}
