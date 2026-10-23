"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  CheckCircle2,
  Clock,
  Pill,
  Activity,
  Upload,
  Calendar,
  AlertCircle,
  MessageCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Plus,
  Send,
  X,
} from "lucide-react";
import { usePatient } from "@/context/patient-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

export default function CareLoopPage() {
  const {
    patient,
    careTasks,
    pendingCareTasks,
    completedCareTasks,
    toggleCareTask,
  } = usePatient();

  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [coordinatorMessage, setCoordinatorMessage] = useState("");

  const carePlan = patient.activeCarePlan;

  const totalTasks = careTasks.length;
  const completedCount = completedCareTasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const displayedTasks =
    activeFilter === "pending"
      ? pendingCareTasks
      : activeFilter === "completed"
      ? completedCareTasks
      : careTasks;

  const handleSendCoordinatorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinatorMessage.trim()) return;

    toast.success("Message Sent to Care Coordinator (Simulated)", {
      description: "Nurse Priya from the SmrkoMed Care Loop team will respond on WhatsApp shortly.",
    });
    setCoordinatorMessage("");
    setIsCoordinatorModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              SmrkoMed Care Loop
            </h1>
            <Badge variant="primary" size="sm">
              Active Protocol
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Your connected daily care journey, medication schedules, and clinical tasks.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsCoordinatorModalOpen(true)}
          className="shrink-0"
        >
          <MessageCircle className="w-4 h-4 text-brand" />
          <span className="hidden sm:inline">Ask Care Nurse</span>
        </Button>
      </div>

      {/* Active Care Journey Hero Card */}
      {carePlan ? (
        <Card className="border-brand/20 bg-gradient-to-br from-card via-card to-brand-soft/30 shadow-soft overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/50">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Current IVF Journey
                </span>
                <h2 className="text-base sm:text-lg font-bold text-ink mt-0.5">
                  {carePlan.title}
                </h2>
                <p className="text-xs text-ink-soft">
                  Protocol: {carePlan.protocol} • Treating Doctor: {carePlan.doctorName}
                </p>
              </div>

              <Badge variant="primary" size="md" className="self-start sm:self-center">
                Stage {carePlan.currentStageNumber} of {carePlan.totalStages}
              </Badge>
            </div>

            {/* Stage Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-ink">{carePlan.currentStageName}</span>
                <span className="font-semibold text-brand">
                  Stage {carePlan.currentStageNumber} of {carePlan.totalStages} ({Math.round(
                    (carePlan.currentStageNumber / carePlan.totalStages) * 100
                  )}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-300"
                  style={{
                    width: `${(carePlan.currentStageNumber / carePlan.totalStages) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Protocol Start</span>
                <p className="font-bold text-ink mt-0.5">{carePlan.startDate}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Expected OPU</span>
                <p className="font-bold text-brand mt-0.5">
                  {carePlan.expectedOvumPickupDate || "18 Oct 2026"}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Pending Tasks</span>
                <p className="font-bold text-amber-700 mt-0.5">{pendingCareTasks.length} due</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <span className="text-ink-soft">Tasks Adherence</span>
                <p className="font-bold text-success mt-0.5">{completionPercentage}% Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="p-6 text-center">
            <HeartPulse className="w-10 h-10 text-brand mx-auto mb-2 opacity-80" />
            <h3 className="text-base font-bold text-ink">No Active Care Journey</h3>
            <p className="text-xs text-ink-soft max-w-sm mx-auto mt-1 mb-4">
              Care plans and automated daily tasks will appear once your treating specialist prescribes a clinical pathway.
            </p>
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold shadow-soft"
            >
              <span>Schedule Consultation</span>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Task Filters Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft">
          Care Tasks ({careTasks.length})
        </h2>

        <div className="flex items-center gap-1 bg-lavender/60 p-1 rounded-xl border border-border/50 text-xs">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeFilter === "all" ? "bg-card text-brand font-bold shadow-xs" : "text-ink-soft"
            }`}
          >
            All ({totalTasks})
          </button>
          <button
            onClick={() => setActiveFilter("pending")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeFilter === "pending" ? "bg-card text-brand font-bold shadow-xs" : "text-ink-soft"
            }`}
          >
            Pending ({pendingCareTasks.length})
          </button>
          <button
            onClick={() => setActiveFilter("completed")}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeFilter === "completed" ? "bg-card text-brand font-bold shadow-xs" : "text-ink-soft"
            }`}
          >
            Done ({completedCareTasks.length})
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {displayedTasks.length > 0 ? (
          displayedTasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-all ${
                task.completed
                  ? "bg-lavender-soft/30 border-border/60 opacity-80"
                  : "bg-card hover:border-brand/40 hover:shadow-soft"
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  {/* Interactive 1-tap check button */}
                  <button
                    onClick={() => toggleCareTask(task.id)}
                    className={`mt-0.5 w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      task.completed
                        ? "bg-brand border-brand text-white shadow-xs"
                        : "border-brand/40 hover:border-brand hover:bg-brand/10 bg-card"
                    }`}
                    aria-label={task.completed ? "Mark incomplete" : "Mark completed"}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                  </button>

                  {/* Task details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3
                        className={`text-sm font-bold leading-tight ${
                          task.completed ? "line-through text-ink-soft" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </h3>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.priority === "urgent" && !task.completed && (
                          <Badge variant="danger" size="sm">
                            Urgent
                          </Badge>
                        )}
                        <Badge variant="secondary" size="sm">
                          {task.categoryLabel}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/40 text-[11px] text-ink-soft">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-semibold text-ink">
                          <Clock className="w-3.5 h-3.5 text-brand" />
                          Due: {task.dueDate === "2026-10-14" ? "Today" : task.dueDate} at {task.dueTime}
                        </span>
                        {task.doctorName && (
                          <span className="hidden sm:inline">• Prescribed by {task.doctorName}</span>
                        )}
                      </div>

                      {/* Action triggers */}
                      <div className="flex items-center gap-2">
                        {task.actionType === "join_video" && (
                          <Link
                            href={`/telehealth/${task.actionTarget || "apt-101"}`}
                            className="px-2.5 py-1 rounded-lg bg-brand text-white text-[11px] font-semibold hover:bg-brand-dark transition-colors"
                          >
                            Join Call
                          </Link>
                        )}
                        {task.actionType === "upload" && (
                          <Link
                            href="/records"
                            className="px-2.5 py-1 rounded-lg bg-brand-soft text-brand-dark text-[11px] font-semibold hover:bg-lavender transition-colors"
                          >
                            Upload File
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8 text-success" />}
            title="No Care Tasks in this View"
            description="All scheduled care tasks for this view have been completed or cleared."
          />
        )}
      </div>

      {/* WhatsApp / Care Coordinator Simulation Modal */}
      <Modal
        isOpen={isCoordinatorModalOpen}
        onClose={() => setIsCoordinatorModalOpen(false)}
        title="Message Care Coordinator"
        description="Connect with SmrkoMed's dedicated fertility care nursing team"
      >
        <form onSubmit={handleSendCoordinatorMessage} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-success/10 border border-success/20 text-ink space-y-1">
            <div className="flex items-center gap-2 font-bold text-success">
              <ShieldCheck className="w-4 h-4" />
              <span>SmrkoMed Care Loop • Nurse Desk</span>
            </div>
            <p className="text-[11px] text-ink-soft leading-relaxed">
              Our clinical care coordinator is on duty to help with injection queries, scheduling medication deliveries, and cycle guidance.
            </p>
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Your Question or Cycle Update</label>
            <textarea
              rows={3}
              required
              value={coordinatorMessage}
              onChange={(e) => setCoordinatorMessage(e.target.value)}
              placeholder="e.g., I have a quick question about injection timing tonight or mild fullness..."
              className="w-full p-3 rounded-2xl border border-border bg-card text-ink text-xs focus:ring-2 focus:ring-brand/30 outline-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCoordinatorModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" fullWidth>
              <Send className="w-4 h-4" />
              <span>Send Message to Coordinator</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
