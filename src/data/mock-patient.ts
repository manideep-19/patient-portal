export interface PatientProfile {
  id: string;
  uhid: string;
  name: string;
  firstName: string;
  gender: string;
  age: number;
  dob: string;
  bloodGroup: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  city: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  abhaId?: string;
  abhaLinked: boolean;
  activeCarePlan?: {
    id: string;
    title: string;
    cycleType: string;
    protocol: string;
    doctorName: string;
    currentStageNumber: number;
    totalStages: number;
    currentStageName: string;
    startDate: string;
    expectedOvumPickupDate?: string;
  };
  ongoingMedicationsCount: number;
}

export const MOCK_PRIMARY_PATIENT: PatientProfile = {
  id: "pat-101",
  uhid: "SM-2026-8812",
  name: "Ananya Sharma",
  firstName: "Ananya",
  gender: "Female",
  age: 32,
  dob: "1994-06-18",
  bloodGroup: "O +ve",
  phone: "+91 98450 12345",
  email: "ananya.sharma@example.com",
  avatarUrl: "/branding/patient-journey.jpg",
  city: "Bengaluru, Karnataka",
  address: "Flat 402, Oakwood Enclave, Indiranagar, Bengaluru - 560038",
  emergencyContact: {
    name: "Vikram Sharma",
    relationship: "Spouse",
    phone: "+91 98450 67890",
  },
  abhaId: "91-4432-8821-0941",
  abhaLinked: true,
  activeCarePlan: {
    id: "cp-ivf-01",
    title: "IVF Stimulation Cycle (Antagonist Protocol)",
    cycleType: "Self Oocyte + ICSI",
    protocol: "GnRH Antagonist (Gonal-F + Cetrotide)",
    doctorName: "Dr. Sunita Sharma",
    currentStageNumber: 6,
    totalStages: 15,
    currentStageName: "Ovarian Stimulation — Cycle Day 9",
    startDate: "2026-10-06",
    expectedOvumPickupDate: "2026-10-18",
  },
  ongoingMedicationsCount: 4,
};

export const MOCK_ALTERNATE_PATIENTS: PatientProfile[] = [
  MOCK_PRIMARY_PATIENT,
  {
    id: "pat-102",
    uhid: "SM-2026-9043",
    name: "Rahul Mehta",
    firstName: "Rahul",
    gender: "Male",
    age: 29,
    dob: "1997-03-24",
    bloodGroup: "B +ve",
    phone: "+91 97412 88901",
    email: "rahul.mehta@example.com",
    city: "Bengaluru, Karnataka",
    address: "HSR Layout Sector 2, Bengaluru - 560102",
    emergencyContact: {
      name: "Sneha Mehta",
      relationship: "Sister",
      phone: "+91 97412 11223",
    },
    abhaId: "91-1029-7744-3321",
    abhaLinked: true,
    ongoingMedicationsCount: 1,
  },
  {
    id: "pat-103",
    uhid: "SM-2026-9500",
    name: "Pooja Hegde",
    firstName: "Pooja",
    gender: "Female",
    age: 27,
    dob: "1999-11-04",
    bloodGroup: "A +ve",
    phone: "+91 98860 99887",
    email: "pooja.hegde@example.com",
    city: "Bengaluru, Karnataka",
    address: "Koramangala 5th Block, Bengaluru - 560095",
    emergencyContact: {
      name: "Kavita Hegde",
      relationship: "Mother",
      phone: "+91 98860 33445",
    },
    abhaLinked: false,
    ongoingMedicationsCount: 0,
  },
];
