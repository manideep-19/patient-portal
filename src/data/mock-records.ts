export type RecordCategory = "all" | "prescription" | "lab_report" | "scan" | "summary" | "uploaded";

export interface HealthRecord {
  id: string;
  title: string;
  category: RecordCategory;
  categoryLabel: string;
  doctorName: string;
  facility: string;
  date: string;
  fileSize: string;
  fileType: "pdf" | "image" | "lab";
  tags: string[];
  findingsSummary: string;
  isUploadedByUser?: boolean;
  clinicalDetails?: {
    patientName: string;
    uhid: string;
    orderedBy: string;
    sampleDate: string;
    parameters?: {
      name: string;
      value: string;
      unit: string;
      referenceRange: string;
      status: "normal" | "abnormal" | "critical";
    }[];
    scanDetails?: {
      modality: string;
      endometrialThickness: string;
      rightOvaryFollicles: string;
      leftOvaryFollicles: string;
      impression: string;
    };
    prescriptionItems?: {
      medicineName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }[];
    notes?: string;
  };
}

export const INITIAL_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: "rec-101",
    title: "Follicular Study Ultrasound (Cycle Day 9)",
    category: "scan",
    categoryLabel: "Ultrasound & Scan",
    doctorName: "Dr. Sunita Sharma",
    facility: "SmrkoMed Diagnostic Imaging Center",
    date: "2026-10-14",
    fileSize: "2.4 MB",
    fileType: "pdf",
    tags: ["Ultrasound", "Follicular Study", "IVF Day 9", "Endometrium"],
    findingsSummary:
      "Right ovary: 4 dominant follicles (15mm, 14mm, 13mm, 11mm). Left ovary: 3 dominant follicles (16mm, 14mm, 12mm). Triple line endometrium measured at 8.6 mm.",
    clinicalDetails: {
      patientName: "Ananya Sharma",
      uhid: "SM-2026-8812",
      orderedBy: "Dr. Sunita Sharma (FRM)",
      sampleDate: "14 Oct 2026, 09:15 AM",
      scanDetails: {
        modality: "Transvaginal Ultrasound (TVS High-Res 3D/4D)",
        endometrialThickness: "8.6 mm (Trilaminar / Triple Line Pattern)",
        rightOvaryFollicles: "15.2 mm, 14.1 mm, 13.0 mm, 11.5 mm, + 4 sub-centimetric",
        leftOvaryFollicles: "16.4 mm, 14.8 mm, 12.3 mm, + 3 sub-centimetric",
        impression:
          "Good bilateral cohort response to gonadotropins on Day 9. Endometrium receptive trilaminar. Advised trigger consideration after estradiol correlation.",
      },
    },
  },
  {
    id: "rec-102",
    title: "Hormone Panel (Estradiol E2, Progesterone P4, LH)",
    category: "lab_report",
    categoryLabel: "Laboratory Report",
    doctorName: "Dr. Sunita Sharma",
    facility: "SmrkoMed Central Pathology Lab (NABL Accredited)",
    date: "2026-10-14",
    fileSize: "1.1 MB",
    fileType: "lab",
    tags: ["Blood Test", "Estradiol", "Progesterone", "Hormones"],
    findingsSummary:
      "Serum Estradiol (E2): 1,420 pg/mL (corresponds with 7-8 maturing follicles). Progesterone: 0.45 ng/mL (no premature luteinization). LH: 1.8 mIU/mL.",
    clinicalDetails: {
      patientName: "Ananya Sharma",
      uhid: "SM-2026-8812",
      orderedBy: "Dr. Sunita Sharma",
      sampleDate: "14 Oct 2026, 08:00 AM",
      parameters: [
        {
          name: "Serum 17-Beta Estradiol (E2)",
          value: "1420",
          unit: "pg/mL",
          referenceRange: "Stimulation target: 150-250 pg/mL per mature follicle",
          status: "normal",
        },
        {
          name: "Serum Progesterone (P4)",
          value: "0.45",
          unit: "ng/mL",
          referenceRange: "< 1.0 ng/mL prior to trigger",
          status: "normal",
        },
        {
          name: "Luteinizing Hormone (LH)",
          value: "1.8",
          unit: "mIU/mL",
          referenceRange: "1.0 - 12.0 mIU/mL",
          status: "normal",
        },
        {
          name: "Serum Creatinine",
          value: "0.72",
          unit: "mg/dL",
          referenceRange: "0.50 - 1.10 mg/dL",
          status: "normal",
        },
      ],
      notes: "Hormone profile indicates mature cohort progression without premature LH elevation.",
    },
  },
  {
    id: "rec-103",
    title: "IVF Ovarian Stimulation Protocol Prescription",
    category: "prescription",
    categoryLabel: "Prescription",
    doctorName: "Dr. Sunita Sharma",
    facility: "SmrkoMed Fertility Hospital",
    date: "2026-10-10",
    fileSize: "850 KB",
    fileType: "pdf",
    tags: ["Rx", "Gonal-F", "Cetrotide", "Stimulation Protocol"],
    findingsSummary:
      "Daily subcutaneous injections: Gonal-F 225 IU at 8:30 PM, Cetrotide 0.25 mg daily morning starting Cycle Day 7.",
    clinicalDetails: {
      patientName: "Ananya Sharma",
      uhid: "SM-2026-8812",
      orderedBy: "Dr. Sunita Sharma",
      sampleDate: "10 Oct 2026",
      prescriptionItems: [
        {
          medicineName: "Inj Gonal-F (Recombinant FSH) 225 IU",
          dosage: "225 IU subcutaneous",
          frequency: "Once daily (Exact time: 08:30 PM)",
          duration: "5 days (Days 6-10)",
          instructions: "Store in refrigerator (2-8°C). Rotate subcutaneous abdominal injection sites.",
        },
        {
          medicineName: "Inj Cetrotide (Cetrorelix Acetate) 0.25 mg",
          dosage: "0.25 mg subcutaneous",
          frequency: "Once daily (Morning: 07:00 AM)",
          duration: "4 days (Days 7-10)",
          instructions: "Prevents premature LH surge. Reconstitute gently before administration.",
        },
        {
          medicineName: "Tab Coenzyme Q10 (CoQ10) 300 mg",
          dosage: "1 capsule",
          frequency: "Twice daily after meals",
          duration: "Ongoing",
          instructions: "Supports oocyte mitochondrial energy metabolism.",
        },
        {
          medicineName: "Tab Folic Acid + Methylcobalamin 5 mg",
          dosage: "1 tablet",
          frequency: "Once daily morning",
          duration: "Ongoing",
          instructions: "Preconceptional neural tube protection.",
        },
      ],
    },
  },
  {
    id: "rec-104",
    title: "Anti-Mullerian Hormone (AMH) & Ovarian Reserve Assessment",
    category: "lab_report",
    categoryLabel: "Laboratory Report",
    doctorName: "Dr. Sunita Sharma",
    facility: "SmrkoMed Central Pathology Lab",
    date: "2026-09-28",
    fileSize: "1.4 MB",
    fileType: "lab",
    tags: ["AMH", "Ovarian Reserve", "AFC"],
    findingsSummary:
      "Serum AMH: 3.42 ng/mL (Optimal fertile reserve for age 32). Total Antral Follicle Count: 14.",
    clinicalDetails: {
      patientName: "Ananya Sharma",
      uhid: "SM-2026-8812",
      orderedBy: "Dr. Sunita Sharma",
      sampleDate: "28 Sep 2026",
      parameters: [
        {
          name: "Anti-Mullerian Hormone (AMH - Beckman Coulter Gen II)",
          value: "3.42",
          unit: "ng/mL",
          referenceRange: "Optimal Reserve: 2.20 - 4.00 ng/mL",
          status: "normal",
        },
        {
          name: "Thyroid Stimulating Hormone (TSH)",
          value: "1.82",
          unit: "uIU/mL",
          referenceRange: "Preconceptional Target: 0.5 - 2.5 uIU/mL",
          status: "normal",
        },
        {
          name: "Serum Prolactin",
          value: "12.4",
          unit: "ng/mL",
          referenceRange: "4.8 - 23.3 ng/mL",
          status: "normal",
        },
      ],
    },
  },
  {
    id: "rec-105",
    title: "Comprehensive Semen Analysis Report (WHO 6th Ed.)",
    category: "lab_report",
    categoryLabel: "Laboratory Report",
    doctorName: "Dr. Rajesh Kulkarni",
    facility: "SmrkoMed Andrology Diagnostics",
    date: "2026-09-20",
    fileSize: "1.8 MB",
    fileType: "pdf",
    tags: ["Semen Analysis", "Partner Report", "Andrology"],
    findingsSummary:
      "Sperm count 48 million/mL, Progressive motility 46%, Total motility 58%, Strict normal morphology 4.2%. DNA Fragmentation Index (DFI): 14% (Low risk).",
    clinicalDetails: {
      patientName: "Vikram Sharma (Partner)",
      uhid: "SM-2026-8813",
      orderedBy: "Dr. Rajesh Kulkarni",
      sampleDate: "20 Sep 2026",
      parameters: [
        {
          name: "Semen Volume",
          value: "3.2",
          unit: "mL",
          referenceRange: "≥ 1.4 mL",
          status: "normal",
        },
        {
          name: "Sperm Concentration",
          value: "48",
          unit: "million/mL",
          referenceRange: "≥ 16 million/mL",
          status: "normal",
        },
        {
          name: "Progressive Motility (PR)",
          value: "46",
          unit: "%",
          referenceRange: "≥ 30 %",
          status: "normal",
        },
        {
          name: "Strict Normal Morphology (Kruger)",
          value: "4.2",
          unit: "%",
          referenceRange: "≥ 4.0 %",
          status: "normal",
        },
        {
          name: "DNA Fragmentation Index (DFI)",
          value: "14",
          unit: "%",
          referenceRange: "< 15% Excellent Integrity",
          status: "normal",
        },
      ],
      notes: "Sample parameters are normozoospermic and highly suitable for standard ICSI fertilization.",
    },
  },
  {
    id: "rec-106",
    title: "Cycle Day 2 Consultation Summary & Pre-Stimulation Plan",
    category: "summary",
    categoryLabel: "Consultation Summary",
    doctorName: "Dr. Sunita Sharma",
    facility: "SmrkoMed Fertility Hospital",
    date: "2026-10-06",
    fileSize: "920 KB",
    fileType: "pdf",
    tags: ["Consultation Summary", "Baseline", "Antagonist Protocol"],
    findingsSummary:
      "Antral follicle count documented (Right: 7, Left: 7). Uterine cavity clean without polyps. Initiated Gonal-F 225 IU.",
    clinicalDetails: {
      patientName: "Ananya Sharma",
      uhid: "SM-2026-8812",
      orderedBy: "Dr. Sunita Sharma",
      sampleDate: "06 Oct 2026",
      notes:
        "Patient briefed on daily injection timing, injection hygiene, avoiding high impact exercise, and staying well hydrated. Contact coordinator if spotting or abdominal fullness develops.",
    },
  },
];
