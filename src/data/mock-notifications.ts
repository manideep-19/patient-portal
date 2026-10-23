export type NotificationType = "appointment" | "medication" | "lab" | "care_loop" | "system";

export interface PatientNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeAgo: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export const INITIAL_NOTIFICATIONS: PatientNotification[] = [
  {
    id: "notif-1",
    type: "appointment",
    title: "Upcoming Video Consultation Today",
    message: "Your appointment with Dr. Sunita Sharma starts at 4:30 PM. Complete your AI intake now.",
    timeAgo: "25m ago",
    timestamp: "2026-10-14T16:05:00Z",
    read: false,
    actionUrl: "/telehealth/apt-101",
  },
  {
    id: "notif-2",
    type: "lab",
    title: "New Lab & Ultrasound Report Ready",
    message: "Day 9 Follicular Study & Serum Estradiol reports have been signed off and added to your records.",
    timeAgo: "2h ago",
    timestamp: "2026-10-14T14:30:00Z",
    read: false,
    actionUrl: "/records",
  },
  {
    id: "notif-3",
    type: "medication",
    title: "Medication Reminder: Evening Injection",
    message: "Inj Gonal-F 225 IU is due tonight at 8:30 PM. Remember to rotate your subcutaneous site.",
    timeAgo: "4h ago",
    timestamp: "2026-10-14T12:00:00Z",
    read: false,
    actionUrl: "/care",
  },
  {
    id: "notif-4",
    type: "appointment",
    title: "Appointment Confirmed",
    message: "Your in-clinic appointment with Dr. Rajesh Kulkarni for Friday 11:00 AM has been confirmed.",
    timeAgo: "Yesterday",
    timestamp: "2026-10-13T10:30:00Z",
    read: true,
    actionUrl: "/appointments",
  },
  {
    id: "notif-5",
    type: "care_loop",
    title: "Care Loop Stage Update",
    message: "You have completed Stage 5. Stage 6: Ovarian Stimulation is now active in your IVF journey.",
    timeAgo: "2 days ago",
    timestamp: "2026-10-12T09:00:00Z",
    read: true,
    actionUrl: "/care",
  },
];
