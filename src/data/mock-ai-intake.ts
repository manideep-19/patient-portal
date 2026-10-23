export interface IntakeQuestion {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  type: "text" | "chips_multi" | "chips_single" | "slider" | "composite";
  options?: string[];
  placeholder?: string;
  defaultSuggestions?: string[];
  helpNote?: string;
}

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "q_chief_complaint",
    number: 1,
    title: "Primary Reason for Consultation",
    subtitle: "What would you like to discuss with the doctor during today's session?",
    type: "composite",
    defaultSuggestions: [
      "Review Day 9 Follicular Study & Estradiol levels",
      "Discuss hCG / GnRH trigger shot timing for OPU",
      "Mild abdominal fullness & injection site questions",
      "Confirm egg retrieval procedure schedule",
    ],
    placeholder: "e.g., I'd like to check if my follicles are ready for the trigger injection tonight and review the scan results.",
  },
  {
    id: "q_duration_cycle",
    number: 2,
    title: "Current Cycle Timeline",
    subtitle: "Which day of your menstrual cycle or stimulation protocol are you currently on?",
    type: "chips_single",
    options: [
      "Cycle Day 9 (Stimulation Day 8)",
      "Cycle Day 10 (Stimulation Day 9)",
      "Cycle Day 2-3 (Baseline period)",
      "Post-Trigger (Awaiting OPU)",
      "Other / Pre-cycle planning",
    ],
  },
  {
    id: "q_symptoms",
    number: 3,
    title: "Symptoms & Physical Sensations",
    subtitle: "Are you experiencing any discomfort or notable symptoms today?",
    type: "chips_multi",
    options: [
      "Mild pelvic fullness / heaviness",
      "Bloating after meals",
      "Mild lower back ache",
      "Injection site redness / tenderness",
      "Mild nausea",
      "Fatigue / drowsiness",
      "Headache",
      "No discomfort / feeling fine",
    ],
    helpNote: "Select all that apply. If you experience severe abdominal pain, difficulty breathing, or dizziness, notify clinic staff immediately.",
  },
  {
    id: "q_medications",
    number: 4,
    title: "Current Medications & Supplements",
    subtitle: "Confirm what medications or injections you have taken in the last 24 hours.",
    type: "text",
    placeholder: "e.g., Gonal-F 225 IU subcutaneous last night, Cetrotide 0.25 mg at 7 AM, CoQ10 300mg, Folic acid 5mg.",
    defaultSuggestions: [
      "Gonal-F 225 IU (8:30 PM) + Cetrotide 0.25 mg (7:00 AM) + CoQ10 + Folic Acid",
      "Standard stimulation injections taken as scheduled with no missed doses",
      "Took morning supplements and morning antagonist on time",
    ],
  },
  {
    id: "q_allergies",
    number: 5,
    title: "Known Allergies & Drug Reactions",
    subtitle: "Do you have any drug or substance allergies the clinical team should be aware of?",
    type: "chips_single",
    options: [
      "No known drug allergies (NKDA)",
      "Penicillin / Amoxicillin",
      "NSAIDs / Paracetamol",
      "Sulfa drugs",
      "Latex / Adhesive tape",
      "Other allergy",
    ],
  },
  {
    id: "q_doctor_questions",
    number: 6,
    title: "Questions You Have for the Doctor",
    subtitle: "What specific decisions or guidance do you want answered in this consult?",
    type: "text",
    placeholder: "e.g., Will my ovum pick-up be scheduled on Saturday or Sunday? Do I need to continue Gonal-F tonight?",
    defaultSuggestions: [
      "Is my endometrial thickness (8.6mm) good enough for fresh transfer or should we freeze all?",
      "What time should I expect the trigger injection if scheduled today?",
      "When does Vikram need to provide the semen sample on retrieval day?",
    ],
  },
];
