export type CareTaskPriority = "urgent" | "high" | "normal";
export type CareTaskCategory = "medication" | "diagnostic" | "appointment" | "wellness" | "upload";

export interface CareTask {
  id: string;
  title: string;
  description: string;
  category: CareTaskCategory;
  categoryLabel: string;
  priority: CareTaskPriority;
  dueDate: string;
  dueTime: string;
  isOverdue?: boolean;
  completed: boolean;
  completedAt?: string;
  doctorName?: string;
  actionType: "complete" | "upload" | "join_video" | "view_directions";
  actionTarget?: string;
  cycleStage?: string;
}

export const INITIAL_CARE_TASKS: CareTask[] = [
  {
    id: "task-1",
    title: "Take Evening Injection: Gonal-F 225 IU",
    description: "Subcutaneous abdominal injection. Take out of fridge 10 mins prior. Rotate injection site.",
    category: "medication",
    categoryLabel: "Medication Dose",
    priority: "urgent",
    dueDate: "2026-10-14",
    dueTime: "08:30 PM",
    isOverdue: false,
    completed: false,
    doctorName: "Dr. Sunita Sharma",
    actionType: "complete",
    cycleStage: "Ovarian Stimulation (Day 9)",
  },
  {
    id: "task-2",
    title: "Attend Video Consultation with Dr. Sunita",
    description: "Review today's follicular study and plan trigger timing for ovum pick-up.",
    category: "appointment",
    categoryLabel: "Doctor Consultation",
    priority: "high",
    dueDate: "2026-10-14",
    dueTime: "04:30 PM",
    isOverdue: false,
    completed: false,
    doctorName: "Dr. Sunita Sharma",
    actionType: "join_video",
    actionTarget: "apt-101",
    cycleStage: "Ovarian Stimulation (Day 9)",
  },
  {
    id: "task-3",
    title: "Daily Hydration Target: 2.5 Litres Fluids",
    description: "Drink plenty of water and oral electrolytes (ORS / tender coconut) to protect against OHSS.",
    category: "wellness",
    categoryLabel: "Wellness Target",
    priority: "normal",
    dueDate: "2026-10-14",
    dueTime: "09:00 PM",
    isOverdue: false,
    completed: false,
    actionType: "complete",
    cycleStage: "Ovarian Stimulation (Day 9)",
  },
  {
    id: "task-4",
    title: "Morning Dose: Cetrotide 0.25 mg Injection",
    description: "Administer subcutaneously at 07:00 AM sharp to suppress spontaneous LH surge.",
    category: "medication",
    categoryLabel: "Medication Dose",
    priority: "urgent",
    dueDate: "2026-10-15",
    dueTime: "07:00 AM",
    isOverdue: false,
    completed: false,
    doctorName: "Dr. Sunita Sharma",
    actionType: "complete",
    cycleStage: "Ovarian Stimulation (Day 10)",
  },
  {
    id: "task-5",
    title: "Upload Prior Thyroid / TSH Report (if done outside)",
    description: "Please share any outside diagnostic reports taken in the last 30 days.",
    category: "upload",
    categoryLabel: "Report Upload",
    priority: "normal",
    dueDate: "2026-10-15",
    dueTime: "06:00 PM",
    isOverdue: false,
    completed: false,
    actionType: "upload",
    cycleStage: "Pre-OPU Preparation",
  },
  {
    id: "task-6",
    title: "Morning Ultrasound: Day 9 Follicular Study",
    description: "Transvaginal scan performed at Indiranagar SmrkoMed Imaging Center.",
    category: "diagnostic",
    categoryLabel: "Ultrasound Scan",
    priority: "high",
    dueDate: "2026-10-14",
    dueTime: "09:15 AM",
    isOverdue: false,
    completed: true,
    completedAt: "2026-10-14T09:40:00Z",
    doctorName: "Dr. Sunita Sharma",
    actionType: "complete",
    cycleStage: "Ovarian Stimulation (Day 9)",
  },
  {
    id: "task-7",
    title: "Morning Blood Draw for E2 & Progesterone",
    description: "Fasting sample collected for peak estradiol and baseline progesterone check.",
    category: "diagnostic",
    categoryLabel: "Lab Blood Test",
    priority: "high",
    dueDate: "2026-10-14",
    dueTime: "08:00 AM",
    isOverdue: false,
    completed: true,
    completedAt: "2026-10-14T08:20:00Z",
    doctorName: "Dr. Sunita Sharma",
    actionType: "complete",
    cycleStage: "Ovarian Stimulation (Day 9)",
  },
];
