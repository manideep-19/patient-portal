export interface AiConsultationTopic {
  id: string;
  title: string;
  description: string;
  iconName: string;
  starterPrompt: string;
  badge?: string;
}

export interface ChatMessage {
  id: string;
  sender: "ai" | "user" | "system";
  text: string;
  timestamp: string;
  suggestedReplies?: string[];
  isEmergencyAlert?: boolean;
}

export interface AiConsultationSummary {
  statedConcern: string;
  keyInformation: string[];
  questionsForDoctor: string[];
  relevantContext: string;
  suggestedNextStep: string;
  generatedAt: string;
}

export interface AiConsultationSession {
  id: string;
  title: string;
  topicId: string;
  startedAt: string;
  lastMessageAt: string;
  status: "active" | "completed";
  messages: ChatMessage[];
  summary?: AiConsultationSummary;
}

export const AI_CONSULTATION_TOPICS: AiConsultationTopic[] = [
  {
    id: "symptoms",
    title: "Understand My Symptoms",
    description: "Discuss how you're feeling and identify questions to ask your specialist.",
    iconName: "Activity",
    starterPrompt: "I'd like to understand what my symptoms might indicate and how to describe them clearly to my doctor.",
    badge: "Popular",
  },
  {
    id: "prepare_visit",
    title: "Prepare for Doctor Visit",
    description: "Structure your medical history, chief complaints, and consultation agenda.",
    iconName: "ClipboardCheck",
    starterPrompt: "I have an upcoming doctor consultation and want to prepare my key questions and symptom timeline.",
  },
  {
    id: "discuss_report",
    title: "Discuss a Recent Report",
    description: "Walk through lab test or ultrasound terms before your doctor review.",
    iconName: "FileText",
    starterPrompt: "I received a diagnostic report (like AMH or ultrasound) and want help understanding the medical terms before my visit.",
  },
  {
    id: "health_concerns",
    title: "Review Health Concerns",
    description: "Explore fertility, menstrual cycle variations, or general wellness queries.",
    iconName: "HeartPulse",
    starterPrompt: "I have some fertility and cycle concerns I'd like to explore in a private, guided conversation.",
  },
  {
    id: "prepare_questions",
    title: "Prepare Questions for Doctor",
    description: "Build an organized list of high-priority questions for your clinician.",
    iconName: "HelpCircle",
    starterPrompt: "Help me create an organized checklist of important questions for my fertility doctor.",
  },
  {
    id: "followup_instructions",
    title: "Understand Follow-up Instructions",
    description: "Review discharge advice, medication schedules, and next cycle steps.",
    iconName: "Clock",
    starterPrompt: "I want to review my post-consultation instructions and understand my medication schedule.",
  },
];

export const INITIAL_AI_CONSULTATION_SESSIONS: AiConsultationSession[] = [
  {
    id: "session-1",
    title: "Follicular Study & Antagonist Injections Query",
    topicId: "discuss_report",
    startedAt: "2026-10-13T16:30:00Z",
    lastMessageAt: "2026-10-13T16:42:00Z",
    status: "completed",
    messages: [
      {
        id: "m-1",
        sender: "ai",
        text: "Hello, I am SmrkoMed's standalone AI Clinical Assistant. I can help you understand medical terminology and organize your thoughts for your doctor. What would you like to discuss today?",
        timestamp: "04:30 PM",
      },
      {
        id: "m-2",
        sender: "user",
        text: "I want to understand what 'trilaminar endometrium 8.6mm' means on my Day 9 ultrasound report.",
        timestamp: "04:32 PM",
      },
      {
        id: "m-3",
        sender: "ai",
        text: "In reproductive medicine, a 'trilaminar' or triple-line endometrium refers to a multi-layered appearance of the uterine lining seen on ultrasound during ovarian stimulation. It typically indicates healthy estrogen exposure. A thickness of 8.6 mm is widely considered receptive for embryo transfer (clinicians generally look for > 7-8 mm).\n\nWould you like to prepare a question about whether your team prefers a fresh transfer or freeze-all strategy?",
        timestamp: "04:33 PM",
        suggestedReplies: [
          "Yes, help me draft that question for Dr. Sunita",
          "What about the follicle sizes?",
          "I'm all set with this answer",
        ],
      },
      {
        id: "m-4",
        sender: "user",
        text: "Yes, help me draft that question for Dr. Sunita",
        timestamp: "04:35 PM",
      },
      {
        id: "m-5",
        sender: "ai",
        text: "Here is a clear question you can ask: 'Doctor, given my Day 9 endometrial lining is 8.6 mm trilaminar and my estradiol is rising, do you recommend planning for a fresh embryo transfer or freezing all embryos for a subsequent cycle?'",
        timestamp: "04:36 PM",
      },
    ],
    summary: {
      statedConcern: "Understanding TVS ultrasound terms: 8.6mm trilaminar endometrium and its clinical significance.",
      keyInformation: [
        "Patient reviewed Day 9 ultrasound report.",
        "Endometrial pattern is triple-line (receptive marker).",
        "Target thickness achieved for stimulation protocol.",
      ],
      questionsForDoctor: [
        "Given the 8.6 mm trilaminar endometrium, is a fresh transfer or freeze-all protocol recommended?",
        "Do I need any additional progesterone support before trigger?",
      ],
      relevantContext: "Patient is on Day 9 of GnRH antagonist protocol with Dr. Sunita Sharma.",
      suggestedNextStep: "Discuss fresh vs. frozen embryo transfer criteria during your scheduled consultation.",
      generatedAt: "2026-10-13T16:42:00Z",
    },
  },
  {
    id: "session-2",
    title: "Injection Timing & Mild Fullness Query",
    topicId: "symptoms",
    startedAt: "2026-10-11T19:15:00Z",
    lastMessageAt: "2026-10-11T19:28:00Z",
    status: "completed",
    messages: [
      {
        id: "m-201",
        sender: "ai",
        text: "Welcome to SmrkoMed AI Consultation. How can I assist you with your health symptoms or questions today?",
        timestamp: "07:15 PM",
      },
      {
        id: "m-202",
        sender: "user",
        text: "I am having mild pelvic heaviness after my evening Gonal-F dose. Is this normal?",
        timestamp: "07:16 PM",
      },
      {
        id: "m-203",
        sender: "ai",
        text: "Mild pelvic fullness or heaviness is a common physical sensation as multiple ovarian follicles expand in response to gonadotropins.\n\nHowever, it is crucial to monitor for red flags: severe sharp pain, rapid weight gain, severe nausea, or shortness of breath. If you ever experience any of those, you must contact emergency services or clinic on-call staff immediately.\n\nAre you able to drink plenty of fluids and electrolytes tonight?",
        timestamp: "07:18 PM",
        suggestedReplies: [
          "Yes, drinking electrolytes now",
          "No severe pain, just bloating",
          "How much water should I drink?",
        ],
      },
    ],
    summary: {
      statedConcern: "Mild pelvic heaviness following gonadotropin stimulation injections.",
      keyInformation: [
        "Heaviness is mild and associated with bilateral follicular growth.",
        "Zero acute distress, no severe pain, normal breathing.",
        "Advised on oral hydration and OHSS awareness.",
      ],
      questionsForDoctor: [
        "Should I continue normal daily walking or restrict exercise until egg retrieval?",
      ],
      relevantContext: "Stimulation Day 6 protocol.",
      suggestedNextStep: "Maintain 2.5L daily fluids and log any changes in the Care Loop.",
      generatedAt: "2026-10-11T19:28:00Z",
    },
  },
];
