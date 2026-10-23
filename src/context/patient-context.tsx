"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { Doctor, MOCK_DOCTORS } from "@/data/mock-doctors";
import { PatientProfile, MOCK_PRIMARY_PATIENT, MOCK_ALTERNATE_PATIENTS } from "@/data/mock-patient";
import { Appointment, INITIAL_APPOINTMENTS, AiPreCallStatus } from "@/data/mock-appointments";
import { HealthRecord, INITIAL_HEALTH_RECORDS } from "@/data/mock-records";
import { CareTask, INITIAL_CARE_TASKS } from "@/data/mock-care-tasks";
import { PatientNotification, INITIAL_NOTIFICATIONS } from "@/data/mock-notifications";
import {
  AiConsultationSession,
  AiConsultationSummary,
  INITIAL_AI_CONSULTATION_SESSIONS,
  AI_CONSULTATION_TOPICS,
} from "@/data/mock-ai-consultation";

interface BookingRequest {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  clinicName: string;
  clinicBranch: string;
  clinicAddress: string;
  mode: "video" | "in_clinic";
  date: string;
  timeSlot: string;
  feePaid: number;
  paymentMethod: string;
  reasonForVisit: string;
  enableAiPreCall?: boolean;
}

interface PatientContextType {
  // Auth
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => boolean;
  logout: () => void;

  // Patient profile
  patient: PatientProfile;
  switchPatient: (patientId: string) => void;
  isEmptyState: boolean;
  toggleEmptyState: () => void;

  // Doctors
  doctors: Doctor[];
  getDoctorById: (id: string) => Doctor | undefined;

  // Appointments
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  completedAppointments: Appointment[];
  cancelledAppointments: Appointment[];
  nextAppointment: Appointment | undefined;
  getAppointmentById: (id: string) => Appointment | undefined;
  bookAppointment: (data: BookingRequest) => Appointment;
  rescheduleAppointment: (appointmentId: string, newDate: string, newSlot: string) => void;
  cancelAppointment: (appointmentId: string, reason: string) => void;

  // Module 1: AI Pre-Appointment Call Actions
  updateAiPreCallStatus: (
    appointmentId: string,
    status: AiPreCallStatus,
    summary?: any
  ) => void;

  // Module 2: Standalone AI Consultation
  aiConsultationSessions: AiConsultationSession[];
  getSessionById: (id: string) => AiConsultationSession | undefined;
  createAiConsultationSession: (topicId: string, userMessage?: string) => AiConsultationSession;
  sendAiConsultationMessage: (
    sessionId: string,
    text: string,
    suggestedReplyChosen?: boolean
  ) => void;
  completeAiConsultation: (sessionId: string, summary: AiConsultationSummary) => void;
  deleteAiConsultationSession: (sessionId: string) => void;

  // Records
  records: HealthRecord[];
  getRecordById: (id: string) => HealthRecord | undefined;
  uploadRecord: (newRecord: Omit<HealthRecord, "id" | "date">) => void;

  // Care Loop
  careTasks: CareTask[];
  pendingCareTasks: CareTask[];
  completedCareTasks: CareTask[];
  toggleCareTask: (taskId: string) => void;
  addCareTask: (task: Omit<CareTask, "id" | "completed">) => void;

  // Notifications
  notifications: PatientNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // AI Intake
  saveIntakeSummary: (appointmentId: string, summary: any) => void;
  getIntakeSummary: (appointmentId: string) => any | null;

  // Demo reset
  resetAllDemoData: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

const STORAGE_KEYS = {
  AUTH: "smrko_patient_auth",
  PATIENT_ID: "smrko_patient_active_id",
  EMPTY_MODE: "smrko_patient_empty_mode",
  APPOINTMENTS: "smrko_patient_appointments_v2",
  RECORDS: "smrko_patient_records_v1",
  TASKS: "smrko_patient_tasks_v1",
  NOTIFICATIONS: "smrko_patient_notifications_v1",
  INTAKE: "smrko_patient_intake_map_v1",
  AI_SESSIONS: "smrko_patient_ai_sessions_v1",
};

export function PatientProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activePatientId, setActivePatientId] = useState(MOCK_PRIMARY_PATIENT.id);
  const [isEmptyState, setIsEmptyState] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [records, setRecords] = useState<HealthRecord[]>(INITIAL_HEALTH_RECORDS);
  const [careTasks, setCareTasks] = useState<CareTask[]>(INITIAL_CARE_TASKS);
  const [notifications, setNotifications] = useState<PatientNotification[]>(INITIAL_NOTIFICATIONS);
  const [intakeSummaries, setIntakeSummaries] = useState<Record<string, any>>({});
  const [aiSessions, setAiSessions] = useState<AiConsultationSession[]>(
    INITIAL_AI_CONSULTATION_SESSIONS
  );

  // Initialize from LocalStorage
  useEffect(() => {
    setIsClient(true);
    try {
      const storedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (storedAuth !== null) setIsAuthenticated(storedAuth === "true");

      const storedPid = localStorage.getItem(STORAGE_KEYS.PATIENT_ID);
      if (storedPid) setActivePatientId(storedPid);

      const storedEmpty = localStorage.getItem(STORAGE_KEYS.EMPTY_MODE);
      if (storedEmpty !== null) setIsEmptyState(storedEmpty === "true");

      const storedApts = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (storedApts) setAppointments(JSON.parse(storedApts));

      const storedRecs = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (storedRecs) setRecords(JSON.parse(storedRecs));

      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) setCareTasks(JSON.parse(storedTasks));

      const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifs) setNotifications(JSON.parse(storedNotifs));

      const storedIntakes = localStorage.getItem(STORAGE_KEYS.INTAKE);
      if (storedIntakes) setIntakeSummaries(JSON.parse(storedIntakes));

      const storedAi = localStorage.getItem(STORAGE_KEYS.AI_SESSIONS);
      if (storedAi) setAiSessions(JSON.parse(storedAi));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save changes to LocalStorage
  const saveAppointments = (updated: Appointment[]) => {
    setAppointments(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    }
  };

  const saveRecords = (updated: HealthRecord[]) => {
    setRecords(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
    }
  };

  const saveTasks = (updated: CareTask[]) => {
    setCareTasks(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    }
  };

  const saveNotifications = (updated: PatientNotification[]) => {
    setNotifications(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    }
  };

  const saveAiSessions = (updated: AiConsultationSession[]) => {
    setAiSessions(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AI_SESSIONS, JSON.stringify(updated));
    }
  };

  // Auth actions
  const login = (phone: string, otp: string) => {
    if (!phone || otp.length < 4) {
      toast.error("Please enter a valid 10-digit mobile number and 4-digit OTP.");
      return false;
    }
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AUTH, "true");
    }
    toast.success("Welcome to SmrkoMed Patient Portal", {
      description: "Signed in securely.",
    });
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.AUTH, "false");
    }
    toast.info("Signed out of your patient portal session.");
  };

  // Profile actions
  const currentPatient =
    MOCK_ALTERNATE_PATIENTS.find((p) => p.id === activePatientId) || MOCK_PRIMARY_PATIENT;

  const switchPatient = (patientId: string) => {
    const selected = MOCK_ALTERNATE_PATIENTS.find((p) => p.id === patientId);
    if (selected) {
      setActivePatientId(selected.id);
      setIsEmptyState(false);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.PATIENT_ID, selected.id);
        localStorage.setItem(STORAGE_KEYS.EMPTY_MODE, "false");
      }
      toast.success(`Switched patient profile to ${selected.name}`);
    }
  };

  const toggleEmptyState = () => {
    const nextVal = !isEmptyState;
    setIsEmptyState(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.EMPTY_MODE, String(nextVal));
    }
    toast.info(
      nextVal
        ? "Showing New Patient Mode (Zero appointments / records)"
        : "Showing Active Patient Mode (With full history)"
    );
  };

  // Doctors
  const doctors = MOCK_DOCTORS;
  const getDoctorById = (id: string) => doctors.find((d) => d.id === id);

  // Filtered Appointments
  const activeAppointmentsList = isEmptyState ? [] : appointments;
  const upcomingAppointments = activeAppointmentsList.filter(
    (a) => a.status === "confirmed" || a.status === "in_progress"
  );
  const completedAppointments = activeAppointmentsList.filter((a) => a.status === "completed");
  const cancelledAppointments = activeAppointmentsList.filter((a) => a.status === "cancelled");
  const nextAppointment = upcomingAppointments[0];

  const getAppointmentById = (id: string) => appointments.find((a) => a.id === id);

  // Book Appointment with optional AI Pre-Call
  const bookAppointment = (data: BookingRequest): Appointment => {
    const randomRefNum = Math.floor(1000 + Math.random() * 9000);

    // Calculate 5 minutes before scheduled slot
    const slotTimeStr = data.timeSlot; // e.g. "10:20 AM"
    let preCallTime = "10:15 AM";
    try {
      const match = slotTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1]!, 10);
        let min = parseInt(match[2]!, 10);
        const ampm = match[3]!.toUpperCase();
        min = min - 5;
        if (min < 0) {
          min = 60 + min;
          hour = hour - 1;
        }
        preCallTime = `${hour.toString().padStart(2, "0")}:${min
          .toString()
          .padStart(2, "0")} ${ampm}`;
      }
    } catch {
      preCallTime = "5 mins before";
    }

    const newApt: Appointment = {
      id: `apt-new-${Date.now()}`,
      bookingRef: `SMRKO-APT-${randomRefNum}`,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      doctorSpecialty: data.doctorSpecialty,
      doctorAvatar: data.doctorAvatar,
      clinicName: data.clinicName,
      clinicBranch: data.clinicBranch,
      clinicAddress: data.clinicAddress,
      mode: data.mode,
      date: data.date,
      timeSlot: data.timeSlot,
      status: "confirmed",
      feePaid: data.feePaid,
      paymentMethod: data.paymentMethod,
      reasonForVisit: data.reasonForVisit,
      aiIntakeCompleted: false,
      canJoinVideo: data.mode === "video",
      notes: "Booked via SmrkoMed Patient Portal.",
      createdAt: new Date().toISOString(),

      aiPreCall: data.enableAiPreCall !== false
        ? {
            enabled: true,
            scheduledTime: preCallTime,
            appointmentTime: data.timeSlot,
            durationMinutes: 5,
            status: "scheduled",
          }
        : undefined,
    };

    const updated = [newApt, ...appointments];
    saveAppointments(updated);

    // Push notification
    const newNotif: PatientNotification = {
      id: `notif-${Date.now()}`,
      type: "appointment",
      title: "Appointment Confirmed!",
      message: `Your ${
        data.mode === "video" ? "Video Consultation" : "In-Clinic Visit"
      } with ${data.doctorName} on ${data.date} at ${data.timeSlot} is confirmed. ${
        newApt.aiPreCall?.enabled
          ? `Your 5-minute AI pre-call is scheduled for ${newApt.aiPreCall.scheduledTime}.`
          : ""
      }`,
      timeAgo: "Just now",
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: "/appointments",
    };
    saveNotifications([newNotif, ...notifications]);

    toast.success("Appointment Booked Successfully!", {
      description: `Ref: ${newApt.bookingRef} • ${data.date} at ${data.timeSlot}`,
    });

    return newApt;
  };

  // Reschedule
  const rescheduleAppointment = (appointmentId: string, newDate: string, newSlot: string) => {
    const updated = appointments.map((a) => {
      if (a.id !== appointmentId) return a;
      return {
        ...a,
        date: newDate,
        timeSlot: newSlot,
        notes: `${a.notes ? a.notes + " " : ""}Rescheduled by patient to ${newDate} at ${newSlot}.`,
        aiPreCall: a.aiPreCall
          ? {
              ...a.aiPreCall,
              appointmentTime: newSlot,
              status: "scheduled" as const,
            }
          : undefined,
      };
    });
    saveAppointments(updated);

    toast.success("Appointment Rescheduled", {
      description: `New slot: ${newDate} at ${newSlot}`,
    });
  };

  // Cancel
  const cancelAppointment = (appointmentId: string, reason: string) => {
    const updated = appointments.map((a) => {
      if (a.id !== appointmentId) return a;
      return {
        ...a,
        status: "cancelled" as const,
        canJoinVideo: false,
        notes: `Cancelled by patient: "${reason}". Refund processed.`,
        aiPreCall: a.aiPreCall
          ? {
              ...a.aiPreCall,
              status: "cancelled" as const,
            }
          : undefined,
      };
    });
    saveAppointments(updated);

    toast.info("Appointment Cancelled", {
      description: "Any applicable fee refund has been initiated to your account.",
    });
  };

  // Module 1: AI Pre-Appointment Call Status Updates
  const updateAiPreCallStatus = (
    appointmentId: string,
    status: AiPreCallStatus,
    summary?: any
  ) => {
    const updated = appointments.map((a) => {
      if (a.id !== appointmentId) return a;
      if (!a.aiPreCall) return a;

      return {
        ...a,
        aiPreCall: {
          ...a.aiPreCall,
          status,
          summary: summary || a.aiPreCall.summary,
          completedAt: status === "completed" ? new Date().toISOString() : a.aiPreCall.completedAt,
        },
      };
    });
    saveAppointments(updated);

    if (status === "completed") {
      toast.success("AI Pre-Appointment Call Completed! 🎉", {
        description: "Your structured brief is prepared for the doctor's review.",
      });
    } else if (status === "skipped") {
      toast.info("AI Call Skipped", {
        description: "Your main doctor consultation remains confirmed as scheduled.",
      });
    } else if (status === "missed") {
      toast.warning("AI Call Marked as Missed", {
        description: "You can still join your doctor consultation at the scheduled time.",
      });
    }
  };

  // Module 2: Standalone AI Consultation Sessions
  const getSessionById = (id: string) => aiSessions.find((s) => s.id === id);

  const createAiConsultationSession = (
    topicId: string,
    userMessage?: string
  ): AiConsultationSession => {
    const topic = AI_CONSULTATION_TOPICS.find((t) => t.id === topicId) || AI_CONSULTATION_TOPICS[0]!;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newSession: AiConsultationSession = {
      id: `ai-session-${Date.now()}`,
      title: `${topic.title} Consultation`,
      topicId: topic.id,
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      status: "active",
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: "ai",
          text: `Hello! I am SmrkoMed's AI Health Assistant. I am here to assist you with "${topic.title}". Please remember I am an AI guidance tool, not a doctor. How can I help you explore this today?`,
          timestamp: nowTime,
          suggestedReplies: [
            "Help me understand my symptoms",
            "I have questions for my doctor",
            "What should I ask during my visit?",
          ],
        },
      ],
    };

    if (userMessage) {
      newSession.messages.push({
        id: `m-user-${Date.now()}`,
        sender: "user",
        text: userMessage,
        timestamp: nowTime,
      });
    }

    const updated = [newSession, ...aiSessions];
    saveAiSessions(updated);
    return newSession;
  };

  const sendAiConsultationMessage = (
    sessionId: string,
    text: string,
    suggestedReplyChosen?: boolean
  ) => {
    const session = aiSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Check emergency triggers
    const lower = text.toLowerCase();
    const isEmergency =
      lower.includes("chest pain") ||
      lower.includes("heavy bleeding") ||
      lower.includes("cannot breathe") ||
      lower.includes("difficulty breathing") ||
      lower.includes("unconscious") ||
      lower.includes("severe acute pain");

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user" as const,
      text,
      timestamp: nowTime,
    };

    let aiReplyText = "";
    let suggestedReplies: string[] | undefined = undefined;

    if (isEmergency) {
      aiReplyText =
        "⚠️ EMERGENCY SAFETY ALERT: The symptoms you described may require immediate medical attention. Please call emergency services (112 or local ambulance) or visit the nearest emergency hospital immediately. Do not rely on AI advice for acute emergencies.";
    } else if (lower.includes("symptom") || lower.includes("pain") || lower.includes("feel")) {
      aiReplyText =
        "Thank you for sharing. Could you tell me roughly when these sensations began and whether they are mild, moderate, or severe? Also, are you taking any prescribed supplements or medications currently?";
      suggestedReplies = [
        "Started 2 days ago, mild discomfort",
        "Ongoing for over a week",
        "Taking Gonal-F and prenatal vitamins",
      ];
    } else if (lower.includes("report") || lower.includes("ultrasound") || lower.includes("scan")) {
      aiReplyText =
        "Diagnostic scans and lab values are interpreted in context with your clinical history. What specific marker or ultrasound measurement would you like me to explain?";
      suggestedReplies = [
        "Endometrial thickness meaning",
        "Antral follicle count (AFC)",
        "Estradiol and progesterone levels",
      ];
    } else {
      aiReplyText =
        "Understood. That is very helpful context. I have noted this in your consultation brief. Would you like to review other concerns or generate your doctor consultation summary now?";
      suggestedReplies = [
        "Generate summary for doctor",
        "I have one more concern",
        "What questions should I ask?",
      ];
    }

    const aiMsg = {
      id: `msg-${Date.now() + 1}`,
      sender: "ai" as const,
      text: aiReplyText,
      timestamp: nowTime,
      suggestedReplies,
      isEmergencyAlert: isEmergency,
    };

    const updated = aiSessions.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        lastMessageAt: new Date().toISOString(),
        messages: [...s.messages, userMsg, aiMsg],
      };
    });

    saveAiSessions(updated);
  };

  const completeAiConsultation = (sessionId: string, summary: AiConsultationSummary) => {
    const updated = aiSessions.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        status: "completed" as const,
        summary,
      };
    });
    saveAiSessions(updated);
    toast.success("AI Consultation Summary Generated", {
      description: "Saved to your conversation history.",
    });
  };

  const deleteAiConsultationSession = (sessionId: string) => {
    const updated = aiSessions.filter((s) => s.id !== sessionId);
    saveAiSessions(updated);
    toast.info("Conversation deleted from history.");
  };

  // Records
  const activeRecords = isEmptyState ? [] : records;
  const getRecordById = (id: string) => records.find((r) => r.id === id);

  const uploadRecord = (newRecord: Omit<HealthRecord, "id" | "date">) => {
    const created: HealthRecord = {
      ...newRecord,
      id: `rec-usr-${Date.now()}`,
      date: new Date().toISOString().split("T")[0]!,
      isUploadedByUser: true,
    };
    const updated = [created, ...records];
    saveRecords(updated);

    toast.success("Document Uploaded Successfully", {
      description: `"${created.title}" added to your health records.`,
    });
  };

  // Care Tasks
  const activeCareTasks = isEmptyState ? [] : careTasks;
  const pendingCareTasks = activeCareTasks.filter((t) => !t.completed);
  const completedCareTasks = activeCareTasks.filter((t) => t.completed);

  const toggleCareTask = (taskId: string) => {
    const task = careTasks.find((t) => t.id === taskId);
    if (!task) return;

    const willBeCompleted = !task.completed;
    const updated = careTasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? new Date().toISOString() : undefined,
          }
        : t
    );
    saveTasks(updated);

    if (willBeCompleted) {
      toast.success("Care Task Completed! 🎉", {
        description: `Marked "${task.title}" as done.`,
      });
    } else {
      toast.info("Care task moved back to pending.");
    }
  };

  const addCareTask = (task: Omit<CareTask, "id" | "completed">) => {
    const newTask: CareTask = {
      ...task,
      id: `task-${Date.now()}`,
      completed: false,
    };
    saveTasks([newTask, ...careTasks]);
  };

  // Notifications
  const activeNotifications = isEmptyState ? [] : notifications;
  const unreadNotificationsCount = activeNotifications.filter((n) => !n.read).length;

  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
    toast.success("All notifications marked as read");
  };

  // AI Intake
  const saveIntakeSummary = (appointmentId: string, summary: any) => {
    const updatedIntakes = { ...intakeSummaries, [appointmentId]: summary };
    setIntakeSummaries(updatedIntakes);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.INTAKE, JSON.stringify(updatedIntakes));
    }

    const updatedApts = appointments.map((a) =>
      a.id === appointmentId ? { ...a, aiIntakeCompleted: true } : a
    );
    saveAppointments(updatedApts);

    toast.success("Pre-Consultation Clinical Brief Prepared", {
      description: "Shared with your doctor's clinical review dashboard.",
    });
  };

  const getIntakeSummary = (appointmentId: string) => {
    return intakeSummaries[appointmentId] || null;
  };

  // Demo Reset
  const resetAllDemoData = () => {
    if (typeof window !== "undefined") {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    }
    setIsAuthenticated(true);
    setActivePatientId(MOCK_PRIMARY_PATIENT.id);
    setIsEmptyState(false);
    setAppointments(INITIAL_APPOINTMENTS);
    setRecords(INITIAL_HEALTH_RECORDS);
    setCareTasks(INITIAL_CARE_TASKS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIntakeSummaries({});
    setAiSessions(INITIAL_AI_CONSULTATION_SESSIONS);
    toast.success("Demo data reset to default state.");
  };

  return (
    <PatientContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        patient: currentPatient,
        switchPatient,
        isEmptyState,
        toggleEmptyState,
        doctors,
        getDoctorById,
        appointments: activeAppointmentsList,
        upcomingAppointments,
        completedAppointments,
        cancelledAppointments,
        nextAppointment,
        getAppointmentById,
        bookAppointment,
        rescheduleAppointment,
        cancelAppointment,
        updateAiPreCallStatus,
        aiConsultationSessions: aiSessions,
        getSessionById,
        createAiConsultationSession,
        sendAiConsultationMessage,
        completeAiConsultation,
        deleteAiConsultationSession,
        records: activeRecords,
        getRecordById,
        uploadRecord,
        careTasks: activeCareTasks,
        pendingCareTasks,
        completedCareTasks,
        toggleCareTask,
        addCareTask,
        notifications: activeNotifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        saveIntakeSummary,
        getIntakeSummary,
        resetAllDemoData,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
}
