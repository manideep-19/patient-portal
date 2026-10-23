export interface Doctor {
  id: string;
  name: string;
  prefix: string;
  specialty: string;
  subSpecialty: string;
  qualifications: string;
  experienceYears: number;
  clinicName: string;
  clinicBranch: string;
  clinicAddress: string;
  languages: string[];
  rating: number;
  reviewCount: number;
  avatarUrl: string;
  videoFee: number;
  inClinicFee: number;
  nextAvailable: string;
  about: string;
  availableModes: ("video" | "in_clinic")[];
  availableDates: {
    date: string;
    displayDate: string;
    dayName: string;
    morningSlots: string[];
    afternoonSlots: string[];
    eveningSlots: string[];
  }[];
}

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "Sunita Sharma",
    prefix: "Dr.",
    specialty: "Fertility & IVF Specialist",
    subSpecialty: "Reproductive Medicine & Advanced Laparoscopy",
    qualifications: "MBBS, MS (OBG), Fellowship in Reproductive Medicine (FRM)",
    experienceYears: 14,
    clinicName: "SmrkoMed Fertility & Women's Hospital",
    clinicBranch: "Indiranagar, Bengaluru",
    clinicAddress: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038",
    languages: ["English", "Hindi", "Kannada"],
    rating: 4.9,
    reviewCount: 342,
    avatarUrl: "/branding/spec-fertility.jpg",
    videoFee: 800,
    inClinicFee: 1200,
    nextAvailable: "Today, 4:30 PM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Sunita Sharma is a leading reproductive medicine specialist with over 14 years of dedicated clinical experience in assisted reproductive technologies (ART), recurrent implantation failure, PCOS management, and personalized ovarian stimulation protocols.",
    availableDates: [
      {
        date: "2026-10-14",
        displayDate: "14 Oct",
        dayName: "Today",
        morningSlots: ["09:30 AM", "10:15 AM", "11:30 AM"],
        afternoonSlots: ["02:30 PM", "03:15 PM"],
        eveningSlots: ["04:30 PM", "05:15 PM", "06:00 PM"],
      },
      {
        date: "2026-10-15",
        displayDate: "15 Oct",
        dayName: "Tomorrow",
        morningSlots: ["09:00 AM", "10:00 AM", "11:00 AM", "11:45 AM"],
        afternoonSlots: ["02:00 PM", "03:00 PM"],
        eveningSlots: ["05:00 PM", "05:45 PM", "06:30 PM"],
      },
      {
        date: "2026-10-16",
        displayDate: "16 Oct",
        dayName: "Fri",
        morningSlots: ["10:00 AM", "11:15 AM"],
        afternoonSlots: ["02:30 PM", "03:45 PM"],
        eveningSlots: ["04:45 PM", "06:00 PM"],
      },
      {
        date: "2026-10-17",
        displayDate: "17 Oct",
        dayName: "Sat",
        morningSlots: ["09:30 AM", "10:30 AM", "11:30 AM"],
        afternoonSlots: ["01:30 PM", "02:30 PM"],
        eveningSlots: [],
      },
    ],
  },
  {
    id: "doc-2",
    name: "Rajesh Kulkarni",
    prefix: "Dr.",
    specialty: "Reproductive Endocrinologist & Andrology",
    subSpecialty: "Male Factor Infertility & Micro-TESE",
    qualifications: "MBBS, MD, DNB (Urology), FECSM (Oxford)",
    experienceYears: 18,
    clinicName: "SmrkoMed Center for Andrology & Urology",
    clinicBranch: "Koramangala, Bengaluru",
    clinicAddress: "80 Feet Road, 4th Block, Koramangala, Bengaluru - 560034",
    languages: ["English", "Hindi", "Marathi", "Kannada"],
    rating: 4.85,
    reviewCount: 288,
    avatarUrl: "/branding/careloop-doctor.jpg",
    videoFee: 900,
    inClinicFee: 1500,
    nextAvailable: "Tomorrow, 10:00 AM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Rajesh Kulkarni is an internationally certified clinical andrologist and urologist specializing in comprehensive male reproductive evaluation, severe oligospermia, DNA fragmentation analysis, and microsurgical sperm retrieval.",
    availableDates: [
      {
        date: "2026-10-15",
        displayDate: "15 Oct",
        dayName: "Tomorrow",
        morningSlots: ["10:00 AM", "11:00 AM", "11:45 AM"],
        afternoonSlots: ["02:15 PM", "03:30 PM"],
        eveningSlots: ["05:15 PM", "06:30 PM"],
      },
      {
        date: "2026-10-16",
        displayDate: "16 Oct",
        dayName: "Fri",
        morningSlots: ["09:30 AM", "10:30 AM"],
        afternoonSlots: ["02:00 PM", "03:15 PM"],
        eveningSlots: ["05:00 PM", "06:00 PM"],
      },
    ],
  },
  {
    id: "doc-3",
    name: "Priya Srinivasan",
    prefix: "Dr.",
    specialty: "High-Risk Obstetrics & Gynaecology",
    subSpecialty: "Fetal Medicine & Maternal Health",
    qualifications: "MBBS, DGO, DNB (OBG), MRCOG (UK)",
    experienceYears: 12,
    clinicName: "SmrkoMed Mother & Child Care",
    clinicBranch: "Whitefield, Bengaluru",
    clinicAddress: "ITPL Main Road, Whitefield, Bengaluru - 560066",
    languages: ["English", "Tamil", "Kannada", "Hindi"],
    rating: 4.95,
    reviewCount: 412,
    avatarUrl: "/branding/spec-maternity.jpg",
    videoFee: 750,
    inClinicFee: 1100,
    nextAvailable: "Today, 6:00 PM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Priya Srinivasan is a senior consultant obstetrician with specialized training in high-risk pregnancies, post-ART antenatal care, early anomaly screening, and compassionate maternal health.",
    availableDates: [
      {
        date: "2026-10-14",
        displayDate: "14 Oct",
        dayName: "Today",
        morningSlots: ["11:00 AM"],
        afternoonSlots: ["03:00 PM", "03:45 PM"],
        eveningSlots: ["06:00 PM", "06:45 PM"],
      },
      {
        date: "2026-10-15",
        displayDate: "15 Oct",
        dayName: "Tomorrow",
        morningSlots: ["09:45 AM", "10:45 AM", "11:30 AM"],
        afternoonSlots: ["02:30 PM", "03:15 PM"],
        eveningSlots: ["05:30 PM", "06:15 PM"],
      },
    ],
  },
  {
    id: "doc-4",
    name: "Meera Chandrasekhar",
    prefix: "Dr.",
    specialty: "Reproductive Genetics & Embryology",
    subSpecialty: "Preimplantation Genetic Testing (PGT-A/M)",
    qualifications: "MBBS, MD (Genetics), PhD (Reproductive Biology)",
    experienceYears: 16,
    clinicName: "SmrkoMed Genomics & Advanced IVF",
    clinicBranch: "Indiranagar, Bengaluru",
    clinicAddress: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038",
    languages: ["English", "Hindi", "Telugu", "Kannada"],
    rating: 4.88,
    reviewCount: 195,
    avatarUrl: "/branding/hero-doctor.jpg",
    videoFee: 1200,
    inClinicFee: 1800,
    nextAvailable: "Tomorrow, 2:30 PM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Meera Chandrasekhar provides pre-IVF genetic counselling, karyotype interpretation, monogenic disorder screening (PGT-M), and aneuploidy assessment to maximize healthy singleton pregnancy rates.",
    availableDates: [
      {
        date: "2026-10-15",
        displayDate: "15 Oct",
        dayName: "Tomorrow",
        morningSlots: ["11:30 AM"],
        afternoonSlots: ["02:30 PM", "03:30 PM", "04:15 PM"],
        eveningSlots: ["05:30 PM"],
      },
    ],
  },
  {
    id: "doc-5",
    name: "Anand Verma",
    prefix: "Dr.",
    specialty: "General Physician & Internal Medicine",
    subSpecialty: "Endocrine Disorders, Thyroid & Metabolic Health",
    qualifications: "MBBS, MD (Internal Medicine)",
    experienceYears: 15,
    clinicName: "SmrkoMed Integrated Health",
    clinicBranch: "Koramangala, Bengaluru",
    clinicAddress: "80 Feet Road, Koramangala 4th Block, Bengaluru - 560034",
    languages: ["English", "Hindi", "Punjabi"],
    rating: 4.79,
    reviewCount: 220,
    avatarUrl: "/branding/clinic-team.jpg",
    videoFee: 600,
    inClinicFee: 900,
    nextAvailable: "Today, 5:00 PM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Anand Verma focuses on systemic pre-pregnancy medical optimization, thyroid regulation, insulin resistance, gestational diabetes prevention, and overall metabolic wellness.",
    availableDates: [
      {
        date: "2026-10-14",
        displayDate: "14 Oct",
        dayName: "Today",
        morningSlots: ["10:30 AM"],
        afternoonSlots: ["02:30 PM"],
        eveningSlots: ["05:00 PM", "05:45 PM", "06:30 PM"],
      },
    ],
  },
  {
    id: "doc-6",
    name: "Rhea Sen",
    prefix: "Dr.",
    specialty: "Clinical Dermatology & Trichology",
    subSpecialty: "Hormonal Acne & Pregnancy Dermatoses",
    qualifications: "MBBS, MD (Dermatology, Venereology & Leprosy)",
    experienceYears: 10,
    clinicName: "SmrkoMed Wellness Clinic",
    clinicBranch: "Indiranagar, Bengaluru",
    clinicAddress: "100 Feet Road, Indiranagar, Bengaluru - 560038",
    languages: ["English", "Hindi", "Bengali"],
    rating: 4.86,
    reviewCount: 164,
    avatarUrl: "/branding/spec-derm.jpg",
    videoFee: 700,
    inClinicFee: 1000,
    nextAvailable: "Fri, 11:00 AM",
    availableModes: ["video", "in_clinic"],
    about:
      "Dr. Rhea Sen manages hormone-related skin and hair conditions including PCOS-related hirsutism, cystic acne during fertility therapies, and pregnancy-safe dermatological skincare.",
    availableDates: [
      {
        date: "2026-10-16",
        displayDate: "16 Oct",
        dayName: "Fri",
        morningSlots: ["11:00 AM", "11:45 AM"],
        afternoonSlots: ["03:00 PM", "04:00 PM"],
        eveningSlots: ["05:30 PM"],
      },
    ],
  },
];
