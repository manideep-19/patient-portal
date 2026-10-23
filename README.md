# 🏥 SmrkoMed Patient Portal

Modern, responsive patient portal and real-time telemedicine system built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **WebRTC (PeerJS)**.

---

## ✨ Features

- **Real-Time Telemedicine Video & Audio Calls**:
  - Live peer-to-peer WebRTC video and audio consultations with doctors.
  - Multi-STUN clustering (Google, Mozilla, Twilio) for rock-solid connection stability.
  - Automatic ICE recovery and 15s disconnect grace period to prevent dropped calls.
  - Bidirectional in-call chat with typing indicators via WebRTC DataChannel.
  - In-call screen sharing (`getDisplayMedia`) with auto-restoration.
  - Real-time connection quality monitor (`getStats`).
- **Doctor Consultation Console (`/telehealth/[id]/doctor`)**:
  - Clinical console with patient details, vitals, active prescriptions, and editable notes.
  - 1-click clinical quick response macros.
- **Smart Call Launchpad & Universal Links**:
  - 1-click **Start Online Call** button across the header, homepage, and appointments.
  - Instant room generation with shareable Doctor & Patient join links.
  - Direct 1-click WhatsApp share and multi-tab testing.
- **Appointments Management**:
  - Upcoming, completed, and cancelled consultations.
  - Rescheduling and booking workflows.
- **AI-Powered Pre-Call & Consultation**:
  - Pre-appointment health triage with AI synthesis.
  - 24/7 AI-guided fertility and symptom advisor.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/manideep-19/patient-portal.git

# Navigate to project directory
cd patient-portal

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## 🧪 Testing Live 2-Way Video Calls

1. Open [http://localhost:3002/home](http://localhost:3002/home) and click **"Start Call"**.
2. Click **"Start Call Now (Join as Patient)"** (opens Tab 1).
3. In the modal or top bar, click **"Launch Doctor Console"** or open the Doctor Link in Tab 2.
4. Both tabs will automatically connect with live 2-way video, audio, screen share, and real-time chat.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Realtime / Media**: WebRTC, PeerJS
- **Icons**: Lucide React
- **Notifications**: Sonner
