export type AppointmentMode = "video" | "in_clinic";
export type AppointmentStatus = "confirmed" | "completed" | "cancelled" | "in_progress";
export type AiPreCallStatus =
  | "scheduled"
  | "ready_to_start"
  | "in_progress"
  | "completed"
  | "missed"
  | "skipped"
  | "cancelled";

export interface AiPreCallData {
  enabled: boolean;
  scheduledTime: string; // e.g. "10:15 AM"
  appointmentTime: string; // e.g. "10:20 AM"
  durationMinutes: number;
  status: AiPreCallStatus;
  startedAt?: string;
  completedAt?: string;
  summary?: {
    mainConcern: string;
    duration: string;
    symptoms: string[];
    relevantHistory: string;
    additionalQuestions: string;
    patientReportedNotes: string;
    doctorReviewStatus: "prepared" | "awaiting_doctor_review";
  };
}

export interface Appointment {
  id: string;
  bookingRef: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  clinicName: string;
  clinicBranch: string;
  clinicAddress: string;
  mode: AppointmentMode;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  feePaid: number;
  paymentMethod: string;
  reasonForVisit: string;
  aiIntakeCompleted: boolean;
  canJoinVideo: boolean;
  notes?: string;
  createdAt: string;

  // Module 1: AI Pre-Appointment Call integration
  aiPreCall?: AiPreCallData;
}

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-101",
    bookingRef: "SMRKO-APT-9482",
    doctorId: "doc-1",
    doctorName: "Dr. Sunita Sharma",
    doctorSpecialty: "Fertility & IVF Specialist",
    doctorAvatar: "/branding/spec-fertility.jpg",
    clinicName: "SmrkoMed Fertility & Women's Hospital",
    clinicBranch: "Indiranagar, Bengaluru",
    clinicAddress: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038",
    mode: "video",
    date: "2026-10-15",
    timeSlot: "10:20 AM",
    status: "confirmed",
    feePaid: 800,
    paymentMethod: "UPI (Google Pay)",
    reasonForVisit: "Cycle Day 9 Estradiol & Follicular Study Review before trigger decision",
    aiIntakeCompleted: false,
    canJoinVideo: true,
    notes: "Doctor will review today's morning follicular ultrasound report and prescribe Cetrotide dosage.",
    createdAt: "2026-10-13T10:30:00Z",

    // Featured 10:15 AM AI Pre-Appointment Call for 10:20 AM consultation
    aiPreCall: {
      enabled: true,
      scheduledTime: "10:15 AM",
      appointmentTime: "10:20 AM",
      durationMinutes: 5,
      status: "ready_to_start",
      summary: undefined,
    },
  },
  {
    id: "apt-102",
    bookingRef: "SMRKO-APT-9118",
    doctorId: "doc-2",
    doctorName: "Dr. Rajesh Kulkarni",
    doctorSpecialty: "Reproductive Endocrinologist & Andrology",
    doctorAvatar: "/branding/careloop-doctor.jpg",
    clinicName: "SmrkoMed Center for Andrology & Urology",
    clinicBranch: "Koramangala, Bengaluru",
    clinicAddress: "80 Feet Road, 4th Block, Koramangala, Bengaluru - 560034",
    mode: "in_clinic",
    date: "2026-10-16",
    timeSlot: "11:00 AM",
    status: "confirmed",
    feePaid: 1500,
    paymentMethod: "Credit Card (HDFC)",
    reasonForVisit: "Pre-OPU semen sample freeze consultation & DNA fragmentation review",
    aiIntakeCompleted: true,
    canJoinVideo: false,
    notes: "Please arrive 15 minutes before the scheduled time with prior semen analysis reports.",
    createdAt: "2026-10-12T14:15:00Z",

    aiPreCall: {
      enabled: true,
      scheduledTime: "10:55 AM",
      appointmentTime: "11:00 AM",
      durationMinutes: 5,
      status: "scheduled",
    },
  },
  {
    id: "apt-103",
    bookingRef: "SMRKO-APT-8820",
    doctorId: "doc-1",
    doctorName: "Dr. Sunita Sharma",
    doctorSpecialty: "Fertility & IVF Specialist",
    doctorAvatar: "/branding/spec-fertility.jpg",
    clinicName: "SmrkoMed Fertility & Women's Hospital",
    clinicBranch: "Indiranagar, Bengaluru",
    clinicAddress: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038",
    mode: "video",
    date: "2026-10-06",
    timeSlot: "11:30 AM",
    status: "completed",
    feePaid: 800,
    paymentMethod: "UPI",
    reasonForVisit: "Cycle Day 2 Baseline Scan Review & Initiation of Antagonist Protocol",
    aiIntakeCompleted: true,
    canJoinVideo: false,
    notes: "Baseline scan cleared. Antral follicle count (AFC) was 14. Started Inj Gonal-F 225 IU from tonight.",
    createdAt: "2026-10-05T09:00:00Z",

    aiPreCall: {
      enabled: true,
      scheduledTime: "11:25 AM",
      appointmentTime: "11:30 AM",
      durationMinutes: 5,
      status: "completed",
      completedAt: "2026-10-06T11:29:00Z",
      summary: {
        mainConcern: "Baseline AFC review before starting gonadotropin injections",
        duration: "Cycle Day 2 onset yesterday",
        symptoms: ["No acute pain", "Mild cramping"],
        relevantHistory: "Previous AMH 3.42 ng/mL documented",
        additionalQuestions: "Confirm refrigerator storage temperature for Gonal-F pens",
        patientReportedNotes: "Completed on time without exceptions.",
        doctorReviewStatus: "prepared",
      },
    },
  },
  {
    id: "apt-104",
    bookingRef: "SMRKO-APT-7901",
    doctorId: "doc-3",
    doctorName: "Dr. Priya Srinivasan",
    doctorSpecialty: "High-Risk Obstetrics & Gynaecology",
    doctorAvatar: "/branding/spec-maternity.jpg",
    clinicName: "SmrkoMed Mother & Child Care",
    clinicBranch: "Whitefield, Bengaluru",
    clinicAddress: "ITPL Main Road, Whitefield, Bengaluru - 560066",
    mode: "in_clinic",
    date: "2026-09-18",
    timeSlot: "03:00 PM",
    status: "completed",
    feePaid: 1100,
    paymentMethod: "Debit Card",
    reasonForVisit: "Pre-conceptional health & uterine cavity evaluation",
    aiIntakeCompleted: true,
    canJoinVideo: false,
    notes: "Pap smear negative. Saline infusion sonography showed normal cavity contour.",
    createdAt: "2026-09-15T16:20:00Z",
  },
  {
    id: "apt-105",
    bookingRef: "SMRKO-APT-7240",
    doctorId: "doc-5",
    doctorName: "Dr. Anand Verma",
    doctorSpecialty: "General Physician & Internal Medicine",
    doctorAvatar: "/branding/clinic-team.jpg",
    clinicName: "SmrkoMed Integrated Health",
    clinicBranch: "Koramangala, Bengaluru",
    clinicAddress: "80 Feet Road, Koramangala, Bengaluru - 560034",
    mode: "video",
    date: "2026-08-22",
    timeSlot: "05:00 PM",
    status: "cancelled",
    feePaid: 600,
    paymentMethod: "UPI (Refunded)",
    reasonForVisit: "Annual thyroid profile check",
    aiIntakeCompleted: false,
    canJoinVideo: false,
    notes: "Cancelled by patient due to out-of-station travel. Full refund processed.",
    createdAt: "2026-08-20T11:00:00Z",
  },
];
