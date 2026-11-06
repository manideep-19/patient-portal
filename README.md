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

## 🧪 Testing a 3-Person Call (Meet / Zoom style)

1. Patient: open `http://localhost:3002/telehealth/<room-id>` → camera preview → **Join**.
2. Doctor: open `http://localhost:3002/telehealth/<room-id>/doctor` → camera preview → **Join now**.
3. Family member: open `http://localhost:3002/telehealth/<room-id>?role=family&name=Vikram` — the lobby shows who is already in the call — then **Join**.

Use three different browsers / devices (or one normal + incognito windows). Behaviour:
mute & camera-off are shown on every tile, the active speaker gets a blue ring, a screen
share is spotlighted automatically, and anyone who hangs up, closes the tab or loses
the network disappears from the others' screens within a few seconds. People who join late
see the chat so far, and a room is capped at 4 people (a 5th visitor sees "This call is full").

### Production networking (important)

Only STUN is configured by default, which works on most home/office networks. Users
behind strict corporate firewalls or some mobile carriers need a **TURN relay** (Meet
and Zoom always have one). Add to `.env.local`:

```
NEXT_PUBLIC_TURN_URL=turn:turn.example.com:3478,turns:turn.example.com:5349
NEXT_PUBLIC_TURN_USERNAME=...
NEXT_PUBLIC_TURN_CREDENTIAL=...
# Optional: self-hosted PeerJS signaling instead of the public 0.peerjs.com cloud
NEXT_PUBLIC_PEERJS_HOST=peer.example.com
NEXT_PUBLIC_PEERJS_PORT=443
NEXT_PUBLIC_PEERJS_PATH=/
```

Room presence (`/api/telehealth/rooms/[id]`) is kept in server memory, so run a single
server instance or move it to Redis before deploying to serverless / multiple instances.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Realtime / Media**: WebRTC, PeerJS
- **Icons**: Lucide React
- **Notifications**: Sonner
