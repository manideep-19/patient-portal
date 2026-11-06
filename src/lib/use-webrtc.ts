/**
 * SmrkoMed Telehealth — Multi-Party WebRTC Mesh Hook
 *
 * Google Meet / Zoom style behaviour for small rooms (designed for 3, works up to 4):
 *  - Pre-join lobby: camera preview + "who is already in the call" without joining.
 *  - Full mesh over PeerJS with a deterministic dialer per pair (no glare).
 *  - Presence via /api/telehealth/rooms/[id] heartbeats; instant "bye" on leave,
 *    beacon on tab close, and ICE-failure recovery (the dialer re-dials).
 *  - Every pair always negotiates one audio + one video m-line, so mic/camera can
 *    be turned on later even if the device was off or missing at join time.
 *  - Camera off really releases the camera (light goes off), like Meet.
 *  - Screen share replaces the outgoing video track and is announced to peers.
 *  - Adaptive bitrate: real RTCRtpSender encoding changes on poor networks (240p).
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ConnectionState =
  | "idle"
  | "requesting_media"
  | "waiting"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

export type ParticipantRole =
  | "patient"
  | "doctor"
  | "family"
  | "coordinator"
  | "guest";

export type PeerConnectionStatus = "connecting" | "connected" | "reconnecting";

export interface RemoteParticipant {
  peerId: string;
  displayName: string;
  role: ParticipantRole;
  stream: MediaStream | null;
  connectionStatus?: PeerConnectionStatus;
  isMicMuted?: boolean;
  isCamOff?: boolean;
  isTyping?: boolean;
  isScreenSharing?: boolean;
  networkQuality?: NetworkQuality;
  isVideoPausedForNetwork?: boolean;
  is240p?: boolean;
}

/** Backwards-compatible alias for RemoteParticipant */
export type RemotePeer = RemoteParticipant;

export interface LobbyPeer {
  peerId: string;
  displayName: string;
  role: ParticipantRole;
}

export interface ChatMessage {
  id: string;
  sender: "local" | "remote";
  text: string;
  timestamp: string;
  status: "sent" | "delivered";
  senderName?: string;
  senderRole?: ParticipantRole;
  /** Epoch ms, used to order merged chat history */
  sentAt?: number;
}

/** Mesh calls are capped so every device can upload to everyone else. */
export const MAX_PARTICIPANTS = 4;

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

interface DataPayload {
  type:
    | "chat"
    | "typing"
    | "stop_typing"
    | "media_state"
    | "participant_info"
    | "network_mode"
    | "camera_state"
    | "mic_state"
    | "chat_history"
    | "bye";
  message?: string;
  timestamp?: string;
  id?: string;
  senderName?: string;
  senderRole?: ParticipantRole;
  isMicMuted?: boolean;
  isCamOff?: boolean;
  isScreenSharing?: boolean;
  videoPausedForNetwork?: boolean;
  is240p?: boolean;
  sentAt?: number;
  history?: Array<{
    id: string;
    text: string;
    timestamp: string;
    sentAt?: number;
    senderName?: string;
    senderRole?: ParticipantRole;
  }>;
}

export interface UseWebRTCOptions {
  /** Role in the consultation */
  role: ParticipantRole;
  /** Display name shown to other participants */
  displayName: string;
  /** Optional custom peer ID */
  customPeerId?: string;
  /** Optional target peer ID to auto-connect to */
  targetPeerId?: string;
  /** Disable automatic room signaling discovery */
  disableAutoConnect?: boolean;
  /**
   * Join the room as soon as the hook mounts (default true).
   * Set to false for a Meet-style pre-join lobby and call `joinRoom()` on click.
   */
  autoJoin?: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null; // For 1:1 backwards-compatibility
  remoteParticipants: RemoteParticipant[]; // Full multi-party attendee list
  remotePeers: RemoteParticipant[]; // Backwards-compatibility alias
  remotePeersCount: number;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  isRemoteTyping: boolean;
  remoteTypingName?: string;
  isRemoteCamOff: boolean;
  isRemoteMicMuted: boolean;
  callDurationSeconds: number;
  chatMessages: ChatMessage[];
  peerId: string | null;
  remotePeerId: string | null;
  error: string | null;
  facingMode: "user" | "environment";
  participantCount: number;

  // Lobby / join flow
  hasJoined: boolean;
  isMediaReady: boolean;
  lobbyPeers: LobbyPeer[];
  isRoomFull: boolean;
  joinRoom: () => Promise<void>;

  // Adaptive 240p Quality Degradation & Resilience
  is240pQuality: boolean;
  isRemote240pQuality: boolean;
  isVideoPausedForNetwork: boolean;
  isRemoteVideoPausedForNetwork: boolean;
  isAudioOnlyFallback: boolean;
  isSimulatedPoorNetwork: boolean;
  simulatePoorNetwork: (enable?: boolean) => void;

  // Device switching
  availableDevices: DeviceInfo[];
  currentAudioDeviceId: string | null;
  currentVideoDeviceId: string | null;
  currentOutputDeviceId: string | null;
  switchCamera: (deviceId?: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  switchSpeaker: (deviceId: string) => Promise<void>;

  startLocalMedia: (video?: boolean, audio?: boolean) => Promise<void>;
  stopLocalMedia: () => void;
  connectToPeer: (
    remotePeerId: string,
    peerInfo?: { displayName?: string; role?: ParticipantRole }
  ) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  sendChatMessage: (text: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  disconnect: () => void;
  restartConnection: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                */
/* ------------------------------------------------------------------ */

const HEARTBEAT_MS = 3000;
const LOBBY_POLL_MS = 3000;
const STATS_MS = 2500;
/** A pending call that never produced media is retried after this long */
const CALL_SETUP_TIMEOUT_MS = 15000;
/** ICE "disconnected" for this long → tear down so the dialer re-dials */
const ICE_DISCONNECT_GRACE_MS = 8000;
/** Ignore a peer that said "bye" for this long (presence may still list it) */
const DEPARTED_TTL_MS = 20000;

const VIDEO_BITRATE_HD = 900_000;
const VIDEO_BITRATE_LOW = 150_000;
const VIDEO_BITRATE_SCREEN = 1_500_000;

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "");
}

function generateUniquePeerId(
  roomId: string,
  role: ParticipantRole,
  customId?: string
): string {
  if (customId) return customId;
  const rand = Math.random().toString(36).slice(2, 9);
  return `smrko-${sanitizeId(roomId)}-${role}-${rand}`;
}

/** Exactly one side of each pair dials: the lexicographically greater ID. */
function shouldInitiateCall(myId: string, theirId: string): boolean {
  return myId.localeCompare(theirId) > 0;
}

function inferRoleFromId(id: string): ParticipantRole {
  if (id.includes("-doctor-")) return "doctor";
  if (id.includes("-family-")) return "family";
  if (id.includes("-coordinator-")) return "coordinator";
  if (id.includes("-guest-")) return "guest";
  return "patient";
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: "stun:global.stun.twilio.com:3478" },
  ];
  // A TURN relay is required for users behind symmetric NAT / strict corporate
  // or mobile carrier networks (Meet and Zoom always have one). Configure via env.
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

function buildPeerServerOptions(): Record<string, unknown> {
  const host = process.env.NEXT_PUBLIC_PEERJS_HOST;
  if (!host) return {};
  return {
    host,
    port: Number(process.env.NEXT_PUBLIC_PEERJS_PORT || 443),
    path: process.env.NEXT_PUBLIC_PEERJS_PATH || "/",
    secure: (process.env.NEXT_PUBLIC_PEERJS_SECURE ?? "true") !== "false",
  };
}

function getPc(conn: MediaConnection | undefined): RTCPeerConnection | undefined {
  return (conn as unknown as { peerConnection?: RTCPeerConnection })?.peerConnection;
}

/** Find the sender for a media kind even when its track is currently null. */
function findSender(pc: RTCPeerConnection, kind: "audio" | "video"): RTCRtpSender | undefined {
  const transceiver = pc
    .getTransceivers()
    .find((t) => t.receiver.track?.kind === kind && t.currentDirection !== "stopped");
  if (transceiver) return transceiver.sender;
  return pc.getSenders().find((s) => s.track?.kind === kind);
}

function cameraConstraints(
  deviceId: string | null,
  facingMode: "user" | "environment"
): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  };
}

function micConstraints(deviceId: string | null): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

/* Placeholder tracks so the SDP always carries audio + video m-lines. */
let placeholderAudioCtx: AudioContext | null = null;
function createSilentAudioTrack(): MediaStreamTrack | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    placeholderAudioCtx = placeholderAudioCtx || new Ctx();
    const dest = placeholderAudioCtx.createMediaStreamDestination();
    const track = dest.stream.getAudioTracks()[0] || null;
    if (track) track.enabled = false;
    return track;
  } catch {
    return null;
  }
}

function createBlackVideoTrack(): MediaStreamTrack | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext("2d");
    ctx?.fillRect(0, 0, canvas.width, canvas.height);
    const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream })
      .captureStream(1);
    return stream.getVideoTracks()[0] || null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook Implementation                                                */
/* ------------------------------------------------------------------ */

export function useWebRTC(roomId: string, options: UseWebRTCOptions): UseWebRTCReturn {
  const { role, displayName, customPeerId, targetPeerId, autoJoin = true } = options;

  // Latest identity, readable from long-lived callbacks without re-binding them
  const identityRef = useRef({ displayName, role });
  identityRef.current = { displayName, role };

  // Streams & participants
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [lobbyPeers, setLobbyPeers] = useState<LobbyPeer[]>([]);

  // Connection state & quality
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Media toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [remoteTypingName, setRemoteTypingName] = useState<string | undefined>(undefined);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Adaptive network resilience state
  const [is240pQuality, setIs240pQuality] = useState(false);
  const [isSimulatedPoorNetwork, setIsSimulatedPoorNetwork] = useState(false);

  // Devices
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [currentAudioDeviceId, setCurrentAudioDeviceId] = useState<string | null>(null);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string | null>(null);
  const [currentOutputDeviceId, setCurrentOutputDeviceId] = useState<string | null>(null);

  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  chatMessagesRef.current = chatMessages;
  const onRoomFullRef = useRef<() => void>(() => {});
  const [peerId, setPeerId] = useState<string | null>(null);

  // ---- Refs: connection bookkeeping ----
  const peerRef = useRef<Peer | null>(null);
  const mediaConnsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const callStartedAtRef = useRef<Map<string, number>>(new Map());
  const dataStartedAtRef = useRef<Map<string, number>>(new Map());
  const prevLossRef = useRef<Map<string, { lost: number; received: number }>>(new Map());
  const iceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const departedRef = useRef<Map<string, number>>(new Map());
  const knownSinceRef = useRef<Map<string, number>>(new Map());

  /** Bumped on every teardown; async work from an older session aborts. */
  const sessionRef = useRef(0);
  const joinedRef = useRef(false);

  // ---- Refs: media ----
  const localStreamRef = useRef<MediaStream | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const camTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const placeholderAudioRef = useRef<MediaStreamTrack | null>(null);
  const placeholderVideoRef = useRef<MediaStreamTrack | null>(null);
  const mediaPromiseRef = useRef<Promise<void> | null>(null);
  const audioDeviceRef = useRef<string | null>(null);
  const videoDeviceRef = useRef<string | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");

  const isMicMutedRef = useRef(false);
  const isCamOffRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const is240pRef = useRef(false);
  const isSimulatedPoorNetworkRef = useRef(false);
  const stableCounterRef = useRef(0);

  // ---- Timers ----
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Small state helpers                                             */
  /* ---------------------------------------------------------------- */

  const patchParticipant = useCallback(
    (id: string, patch: Partial<RemoteParticipant>, createIfMissing = false) => {
      setRemoteParticipants((prev) => {
        const idx = prev.findIndex((p) => p.peerId === id);
        if (idx === -1) {
          if (!createIfMissing) return prev;
          const role = patch.role || inferRoleFromId(id);
          return [
            ...prev,
            {
              peerId: id,
              displayName: role === "doctor" ? "Doctor" : "Participant",
              role,
              stream: null,
              connectionStatus: "connecting",
              isMicMuted: false,
              isCamOff: false,
              ...patch,
            },
          ];
        }
        const next = [...prev];
        next[idx] = { ...next[idx]!, ...patch };
        return next;
      });
    },
    []
  );

  const publishLocalStream = useCallback(() => {
    // New MediaStream object every time the track set changes so <video> re-binds.
    const tracks: MediaStreamTrack[] = [];
    if (micTrackRef.current) tracks.push(micTrackRef.current);
    const video = screenTrackRef.current || camTrackRef.current;
    if (video) tracks.push(video);
    const stream = tracks.length ? new MediaStream(tracks) : null;
    localStreamRef.current = stream;
    setLocalStream(stream);
  }, []);

  /** The stream handed to PeerJS: always one audio + one video track. */
  const buildSendStream = useCallback((): MediaStream => {
    if (!placeholderAudioRef.current) placeholderAudioRef.current = createSilentAudioTrack();
    if (!placeholderVideoRef.current) placeholderVideoRef.current = createBlackVideoTrack();
    const tracks: MediaStreamTrack[] = [];
    const audio = micTrackRef.current || placeholderAudioRef.current;
    const video = screenTrackRef.current || camTrackRef.current || placeholderVideoRef.current;
    if (audio) tracks.push(audio);
    if (video) tracks.push(video);
    return new MediaStream(tracks);
  }, []);

  /** Track that should currently be on the wire for a kind (null = send nothing). */
  const outgoingTrack = useCallback((kind: "audio" | "video"): MediaStreamTrack | null => {
    if (kind === "audio") return micTrackRef.current;
    return screenTrackRef.current || camTrackRef.current;
  }, []);

  const applyVideoEncoding = useCallback(async (pc: RTCPeerConnection) => {
    const sender = findSender(pc, "video");
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) return; // not negotiated yet
      const sharing = isScreenSharingRef.current;
      const low = is240pRef.current;
      params.encodings = params.encodings.map((enc) => ({
        ...enc,
        maxBitrate: sharing
          ? low
            ? 400_000
            : VIDEO_BITRATE_SCREEN
          : low
          ? VIDEO_BITRATE_LOW
          : VIDEO_BITRATE_HD,
        scaleResolutionDownBy: !sharing && low ? 3 : 1,
      }));
      (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference =
        sharing ? "maintain-resolution" : "balanced";
      await sender.setParameters(params);
    } catch {
      // Some browsers reject parameter changes mid-negotiation; next tick retries.
    }
  }, []);

  /** Push the current mic/video tracks + encodings to every peer connection. */
  const syncSenders = useCallback(() => {
    mediaConnsRef.current.forEach((call) => {
      const pc = getPc(call);
      if (!pc || pc.connectionState === "closed") return;
      (["audio", "video"] as const).forEach((kind) => {
        const sender = findSender(pc, kind);
        const desired = outgoingTrack(kind);
        if (sender && sender.track !== desired) {
          sender.replaceTrack(desired).catch(() => {});
        }
      });
      applyVideoEncoding(pc);
    });
  }, [outgoingTrack, applyVideoEncoding]);

  /* ---------------------------------------------------------------- */
  /*  Devices                                                         */
  /* ---------------------------------------------------------------- */

  const loadAvailableDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const counters = { audioinput: 0, videoinput: 0, audiooutput: 0 };
      const list: DeviceInfo[] = devices
        .filter(
          (d) =>
            (d.kind === "audioinput" || d.kind === "videoinput" || d.kind === "audiooutput") &&
            d.deviceId
        )
        .map((d) => {
          const kind = d.kind as DeviceInfo["kind"];
          counters[kind] += 1;
          const fallback =
            kind === "videoinput" ? "Camera" : kind === "audioinput" ? "Microphone" : "Speaker";
          return { deviceId: d.deviceId, label: d.label || `${fallback} ${counters[kind]}`, kind };
        });
      setAvailableDevices(list);
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }
  }, []);

  useEffect(() => {
    loadAvailableDevices();
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.addEventListener) return;
    md.addEventListener("devicechange", loadAvailableDevices);
    return () => md.removeEventListener("devicechange", loadAvailableDevices);
  }, [loadAvailableDevices]);

  /* ---------------------------------------------------------------- */
  /*  Call timer                                                      */
  /* ---------------------------------------------------------------- */

  const startCallTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setCallDurationSeconds((s) => s + 1), 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Data channel helpers                                            */
  /* ---------------------------------------------------------------- */

  const sendTo = useCallback((conn: DataConnection | undefined, payload: DataPayload) => {
    if (!conn?.open) return;
    try {
      conn.send(payload);
    } catch {
      // channel closing
    }
  }, []);

  const broadcastDataPayload = useCallback(
    (payload: DataPayload) => {
      dataConnsRef.current.forEach((conn) => sendTo(conn, payload));
    },
    [sendTo]
  );

  const selfStatePayload = useCallback(
    (type: DataPayload["type"]): DataPayload => ({
      type,
      senderName: identityRef.current.displayName,
      senderRole: identityRef.current.role,
      isMicMuted: isMicMutedRef.current,
      isCamOff: isCamOffRef.current,
      isScreenSharing: isScreenSharingRef.current,
      is240p: is240pRef.current,
      videoPausedForNetwork: false,
    }),
    []
  );

  /* ---------------------------------------------------------------- */
  /*  Overall connection state                                        */
  /* ---------------------------------------------------------------- */

  const [signalingDown, setSignalingDown] = useState(false);
  // Overall state is derived from per-peer status (never set ad hoc).
  useEffect(() => {
    if (!hasJoined) return;
    const anyConnected = remoteParticipants.some((p) => p.connectionStatus === "connected");
    const anyReconnecting = remoteParticipants.some((p) => p.connectionStatus === "reconnecting");
    setConnectionState((prev) => {
      if (prev === "error" || prev === "disconnected") return prev;
      if (!peerId) return signalingDown ? "reconnecting" : "connecting";
      if (anyConnected) return "connected";
      if (anyReconnecting || (signalingDown && remoteParticipants.length > 0)) return "reconnecting";
      if (remoteParticipants.length > 0) return "connecting";
      return "waiting";
    });
  }, [remoteParticipants, hasJoined, peerId, signalingDown]);

  /* ---------------------------------------------------------------- */
  /*  Removing peers                                                  */
  /* ---------------------------------------------------------------- */

  const clearIceTimer = useCallback((id: string) => {
    const t = iceTimersRef.current.get(id);
    if (t) clearTimeout(t);
    iceTimersRef.current.delete(id);
  }, []);

  const closeMedia = useCallback(
    (id: string) => {
      const call = mediaConnsRef.current.get(id);
      mediaConnsRef.current.delete(id);
      callStartedAtRef.current.delete(id);
      clearIceTimer(id);
      try {
        call?.close();
      } catch {
        /* noop */
      }
    },
    [clearIceTimer]
  );

  const removePeer = useCallback(
    (id: string, markDeparted: boolean) => {
      if (markDeparted) departedRef.current.set(id, Date.now());
      knownSinceRef.current.delete(id);
      prevLossRef.current.delete(id);
      dataStartedAtRef.current.delete(id);
      closeMedia(id);
      const dc = dataConnsRef.current.get(id);
      dataConnsRef.current.delete(id);
      try {
        dc?.close();
      } catch {
        /* noop */
      }
      setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== id));
    },
    [closeMedia]
  );

  /* ---------------------------------------------------------------- */
  /*  Network monitor + adaptive encoding                             */
  /* ---------------------------------------------------------------- */

  const setLowQuality = useCallback(
    (low: boolean) => {
      if (is240pRef.current === low) return;
      is240pRef.current = low;
      setIs240pQuality(low);
      syncSenders();
      broadcastDataPayload({ type: "network_mode", is240p: low, videoPausedForNetwork: false });
    },
    [syncSenders, broadcastDataPayload]
  );

  const simulatePoorNetwork = useCallback(
    (enable?: boolean) => {
      const next = typeof enable === "boolean" ? enable : !isSimulatedPoorNetworkRef.current;
      isSimulatedPoorNetworkRef.current = next;
      setIsSimulatedPoorNetwork(next);
      stableCounterRef.current = next ? 0 : 2;
      setNetworkQuality(next ? "poor" : "excellent");
      setLowQuality(next);
    },
    [setLowQuality]
  );

  const startNetworkMonitor = useCallback(() => {
    if (statsRef.current) return;
    statsRef.current = setInterval(async () => {
      const entries = Array.from(mediaConnsRef.current.entries());
      if (entries.length === 0) return;
      let worst: NetworkQuality = "excellent";
      const rank: Record<NetworkQuality, number> = {
        unknown: 0,
        excellent: 0,
        good: 1,
        fair: 2,
        poor: 3,
      };

      for (const [id, call] of entries) {
        const pc = getPc(call);
        if (!pc || pc.connectionState !== "connected") continue;
        try {
          const stats = await pc.getStats();
          let rtt = 0;
          let lost = 0;
          let received = 0;
          stats.forEach((r) => {
            if (r.type === "candidate-pair" && r.nominated && r.currentRoundTripTime) {
              rtt = Math.max(rtt, r.currentRoundTripTime * 1000);
            }
            if (r.type === "inbound-rtp") {
              lost += r.packetsLost || 0;
              received += r.packetsReceived || 0;
            }
          });
          const prev = prevLossRef.current.get(id) || { lost: 0, received: 0 };
          prevLossRef.current.set(id, { lost, received });
          const dLost = Math.max(0, lost - prev.lost);
          const dRecv = Math.max(0, received - prev.received);
          const loss = dRecv + dLost > 0 ? dLost / (dLost + dRecv) : 0;
          let q: NetworkQuality = "excellent";
          if (rtt > 400 || loss > 0.1) q = "poor";
          else if (rtt > 250 || loss > 0.05) q = "fair";
          else if (rtt > 120 || loss > 0.02) q = "good";
          if (rank[q] > rank[worst]) worst = q;
          patchParticipant(id, { networkQuality: q });
          // Keep encodings applied (they reset after renegotiation)
          applyVideoEncoding(pc);
        } catch {
          // stats unavailable
        }
      }

      if (isSimulatedPoorNetworkRef.current) return;
      setNetworkQuality(worst);
      if (worst === "poor") {
        stableCounterRef.current = 0;
        setLowQuality(true);
      } else if (worst === "good" || worst === "excellent") {
        stableCounterRef.current += 1;
        if (stableCounterRef.current >= 3) setLowQuality(false);
      }
    }, STATS_MS);
  }, [patchParticipant, applyVideoEncoding, setLowQuality]);

  const stopNetworkMonitor = useCallback(() => {
    if (statsRef.current) clearInterval(statsRef.current);
    statsRef.current = null;
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Data connections (chat / presence / media state)                */
  /* ---------------------------------------------------------------- */

  const handleDataConnection = useCallback(
    (conn: DataConnection) => {
      const remoteId = conn.peer;
      if (departedRef.current.has(remoteId)) departedRef.current.delete(remoteId);

      const existing = dataConnsRef.current.get(remoteId);
      if (existing && existing !== conn) {
        try {
          existing.close();
        } catch {
          /* noop */
        }
      }
      dataConnsRef.current.set(remoteId, conn);
      dataStartedAtRef.current.set(remoteId, Date.now());

      const meta = (conn.metadata || {}) as { displayName?: string; role?: ParticipantRole };
      patchParticipant(
        remoteId,
        {
          ...(meta.displayName ? { displayName: meta.displayName } : {}),
          ...(meta.role ? { role: meta.role } : {}),
        },
        true
      );
      knownSinceRef.current.set(remoteId, knownSinceRef.current.get(remoteId) ?? Date.now());

      const onOpen = () => {
        sendTo(conn, selfStatePayload("participant_info"));
        // Late joiners get the conversation so far (everyone sends; receiver dedupes)
        const history = chatMessagesRef.current.slice(-100).map((m) => ({
          id: m.id,
          text: m.text,
          timestamp: m.timestamp,
          sentAt: m.sentAt,
          senderName: m.senderName,
          senderRole: m.senderRole,
        }));
        if (history.length) sendTo(conn, { type: "chat_history", history });
      };
      if (conn.open) onOpen();
      else conn.on("open", onOpen);

      conn.on("data", (raw: unknown) => {
        const payload = raw as DataPayload;
        if (!payload || typeof payload !== "object") return;

        switch (payload.type) {
          case "chat": {
            if (!payload.message) return;
            const msg: ChatMessage = {
              id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              sender: "remote",
              text: payload.message,
              timestamp: payload.timestamp || nowTime(),
              status: "delivered",
              senderName: payload.senderName,
              senderRole: payload.senderRole,
              sentAt: payload.sentAt ?? Date.now(),
            };
            setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            setIsRemoteTyping(false);
            patchParticipant(remoteId, { isTyping: false });
            return;
          }
          case "typing": {
            setIsRemoteTyping(true);
            setRemoteTypingName(payload.senderName);
            patchParticipant(remoteId, { isTyping: true });
            if (typingResetRef.current) clearTimeout(typingResetRef.current);
            typingResetRef.current = setTimeout(() => {
              setIsRemoteTyping(false);
              setRemoteTypingName(undefined);
              patchParticipant(remoteId, { isTyping: false });
            }, 3000);
            return;
          }
          case "stop_typing":
            setIsRemoteTyping(false);
            setRemoteTypingName(undefined);
            patchParticipant(remoteId, { isTyping: false });
            return;
          case "bye":
            removePeer(remoteId, true);
            return;
          case "chat_history": {
            const incoming = payload.history || [];
            if (!incoming.length) return;
            setChatMessages((prev) => {
              const seen = new Set(prev.map((m) => m.id));
              const added: ChatMessage[] = incoming
                .filter((h) => h && h.id && h.text && !seen.has(h.id))
                .map((h) => ({
                  id: h.id,
                  sender: "remote",
                  text: h.text,
                  timestamp: h.timestamp,
                  status: "delivered",
                  senderName: h.senderName,
                  senderRole: h.senderRole,
                  sentAt: h.sentAt,
                }));
              if (!added.length) return prev;
              return [...prev, ...added].sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0));
            });
            return;
          }
          case "network_mode":
            patchParticipant(remoteId, {
              ...(payload.is240p !== undefined ? { is240p: payload.is240p } : {}),
              ...(payload.videoPausedForNetwork !== undefined
                ? { isVideoPausedForNetwork: payload.videoPausedForNetwork }
                : {}),
            });
            return;
          case "camera_state":
            patchParticipant(remoteId, { isCamOff: payload.isCamOff ?? false });
            return;
          case "mic_state":
            patchParticipant(remoteId, { isMicMuted: payload.isMicMuted ?? false });
            return;
          case "media_state":
          case "participant_info": {
            const patch: Partial<RemoteParticipant> = {};
            if (payload.senderName) patch.displayName = payload.senderName;
            if (payload.senderRole) patch.role = payload.senderRole;
            if (payload.isMicMuted !== undefined) patch.isMicMuted = payload.isMicMuted;
            if (payload.isCamOff !== undefined) patch.isCamOff = payload.isCamOff;
            if (payload.isScreenSharing !== undefined) patch.isScreenSharing = payload.isScreenSharing;
            if (payload.is240p !== undefined) patch.is240p = payload.is240p;
            if (payload.videoPausedForNetwork !== undefined)
              patch.isVideoPausedForNetwork = payload.videoPausedForNetwork;
            patchParticipant(remoteId, patch, payload.type === "participant_info");
            return;
          }
        }
      });

      conn.on("close", () => {
        if (dataConnsRef.current.get(remoteId) === conn) {
          dataConnsRef.current.delete(remoteId);
          dataStartedAtRef.current.delete(remoteId);
        }
      });
      conn.on("error", (err) => console.warn(`[DataConnection ${remoteId}]`, err));
    },
    [patchParticipant, removePeer, selfStatePayload, sendTo]
  );

  /* ---------------------------------------------------------------- */
  /*  Media connections                                               */
  /* ---------------------------------------------------------------- */

  const handleMediaConnection = useCallback(
    (call: MediaConnection) => {
      const remoteId = call.peer;
      const existing = mediaConnsRef.current.get(remoteId);
      if (existing && existing !== call) {
        clearIceTimer(remoteId);
        try {
          existing.close();
        } catch {
          /* noop */
        }
      }
      mediaConnsRef.current.set(remoteId, call);
      callStartedAtRef.current.set(remoteId, Date.now());
      knownSinceRef.current.set(remoteId, knownSinceRef.current.get(remoteId) ?? Date.now());

      const meta = (call.metadata || {}) as { displayName?: string; role?: ParticipantRole };
      patchParticipant(
        remoteId,
        {
          ...(meta.displayName ? { displayName: meta.displayName } : {}),
          ...(meta.role ? { role: meta.role } : {}),
        },
        true
      );

      // Send nothing on muted-camera / missing-device senders (placeholders only open m-lines)
      const pc = getPc(call);
      if (pc) {
        (["audio", "video"] as const).forEach((kind) => {
          const sender = findSender(pc, kind);
          const desired = outgoingTrack(kind);
          if (sender && sender.track !== desired) sender.replaceTrack(desired).catch(() => {});
        });
      }

      call.on("stream", (stream: MediaStream) => {
        if (mediaConnsRef.current.get(remoteId) !== call) return;
        callStartedAtRef.current.delete(remoteId);
        patchParticipant(remoteId, { stream, connectionStatus: "connected" }, true);
        startCallTimer();
        startNetworkMonitor();
        const p = getPc(call);
        if (p) applyVideoEncoding(p);
      });

      call.on("iceStateChanged", (state: RTCIceConnectionState) => {
        if (mediaConnsRef.current.get(remoteId) !== call) return;
        if (state === "connected" || state === "completed") {
          clearIceTimer(remoteId);
          patchParticipant(remoteId, { connectionStatus: "connected" });
          const p = getPc(call);
          if (p) applyVideoEncoding(p);
        } else if (state === "disconnected") {
          patchParticipant(remoteId, { connectionStatus: "reconnecting" });
          clearIceTimer(remoteId);
          iceTimersRef.current.set(
            remoteId,
            setTimeout(() => {
              if (mediaConnsRef.current.get(remoteId) === call) closeMedia(remoteId);
            }, ICE_DISCONNECT_GRACE_MS)
          );
        }
      });

      call.on("close", () => {
        if (mediaConnsRef.current.get(remoteId) !== call) return;
        mediaConnsRef.current.delete(remoteId);
        callStartedAtRef.current.delete(remoteId);
        clearIceTimer(remoteId);
        // Keep the tile; the heartbeat loop re-dials or removes them if they left.
        patchParticipant(remoteId, { stream: null, connectionStatus: "reconnecting" });
      });

      call.on("error", (err) => console.warn(`[MediaConnection ${remoteId}]`, err));
    },
    [
      patchParticipant,
      outgoingTrack,
      clearIceTimer,
      closeMedia,
      startCallTimer,
      startNetworkMonitor,
      applyVideoEncoding,
    ]
  );

  /* ---------------------------------------------------------------- */
  /*  Dialing                                                         */
  /* ---------------------------------------------------------------- */

  const dial = useCallback(
    (targetId: string) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed || !peer.open || targetId === peer.id) return;
      const { displayName: name, role: myRole } = identityRef.current;
      const metadata = { displayName: name, role: myRole };

      const dc = dataConnsRef.current.get(targetId);
      const dcStarted = dataStartedAtRef.current.get(targetId) ?? 0;
      const dcStuck = dc && !dc.open && Date.now() - dcStarted > CALL_SETUP_TIMEOUT_MS;
      if (dcStuck) {
        dataConnsRef.current.delete(targetId);
        try {
          dc.close();
        } catch {
          /* noop */
        }
      }
      if (!dc || dcStuck) {
        try {
          handleDataConnection(peer.connect(targetId, { reliable: true, metadata }));
        } catch (err) {
          console.warn("[DataChannel connect failed]", err);
        }
      }

      const started = callStartedAtRef.current.get(targetId);
      const existing = mediaConnsRef.current.get(targetId);
      const stuck = existing && started && Date.now() - started > CALL_SETUP_TIMEOUT_MS;
      if (stuck) closeMedia(targetId);
      if (!existing || stuck) {
        try {
          const call = peer.call(targetId, buildSendStream(), { metadata });
          if (call) handleMediaConnection(call);
        } catch (err) {
          console.warn("[Media call failed]", err);
        }
      }
    },
    [handleDataConnection, handleMediaConnection, buildSendStream, closeMedia]
  );

  const connectToPeer = useCallback(
    (targetId: string, peerInfo?: { displayName?: string; role?: ParticipantRole }) => {
      const peer = peerRef.current;
      if (!peer?.open || targetId === peer.id) return;
      patchParticipant(
        targetId,
        {
          ...(peerInfo?.displayName ? { displayName: peerInfo.displayName } : {}),
          ...(peerInfo?.role ? { role: peerInfo.role } : {}),
        },
        true
      );
      knownSinceRef.current.set(targetId, knownSinceRef.current.get(targetId) ?? Date.now());
      // Only one side dials, the other answers — prevents glare/duplicate calls.
      if (shouldInitiateCall(peer.id, targetId)) dial(targetId);
    },
    [dial, patchParticipant]
  );

  /* ---------------------------------------------------------------- */
  /*  Room presence (heartbeat)                                       */
  /* ---------------------------------------------------------------- */

  const syncRoomPresence = useCallback(
    async (myId: string, session: number) => {
      if (!roomId || options.disableAutoConnect) return;
      try {
        const res = await fetch(`/api/telehealth/rooms/${encodeURIComponent(roomId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            peerId: myId,
            displayName: identityRef.current.displayName,
            role: identityRef.current.role,
            isMicMuted: isMicMutedRef.current,
            isCamOff: isCamOffRef.current,
          }),
        });
        if (res.status === 409 && session === sessionRef.current) {
          onRoomFullRef.current();
          return;
        }
        if (!res.ok || session !== sessionRef.current || !joinedRef.current) return;
        const data = await res.json();
        const others: Array<{ peerId: string; displayName: string; role: ParticipantRole }> =
          (data.peers || []).filter((p: { peerId: string }) => p.peerId !== myId);

        const now = Date.now();
        departedRef.current.forEach((t, id) => {
          if (now - t > DEPARTED_TTL_MS) departedRef.current.delete(id);
        });

        const active = new Set<string>();
        for (const other of others) {
          if (departedRef.current.has(other.peerId)) continue;
          active.add(other.peerId);
          connectToPeer(other.peerId, { displayName: other.displayName, role: other.role });
        }

        // Drop anyone no longer present in the room (closed tab, crashed, network gone)
        Array.from(knownSinceRef.current.entries()).forEach(([id, since]) => {
          if (!active.has(id) && now - since > 6000) removePeer(id, false);
        });
      } catch {
        // offline: ICE / PeerJS reconnect logic handles media; keep trying
      }
    },
    [roomId, options.disableAutoConnect, connectToPeer, removePeer]
  );

  /* ---------------------------------------------------------------- */
  /*  PeerJS instance                                                 */
  /* ---------------------------------------------------------------- */

  const initPeer = useCallback(
    (assignedId: string, session: number) => {
      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();

      const peer = new Peer(assignedId, {
        debug: 1,
        ...buildPeerServerOptions(),
        config: {
          iceServers: buildIceServers(),
          iceCandidatePoolSize: 4,
          bundlePolicy: "max-bundle",
        },
      });
      peerRef.current = peer;

      peer.on("open", (openId) => {
        if (session !== sessionRef.current) return;
        setPeerId(openId);
        setSignalingDown(false);
        syncRoomPresence(openId, session);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => syncRoomPresence(openId, session), HEARTBEAT_MS);
      });

      peer.on("call", (call) => {
        if (session !== sessionRef.current) {
          call.close();
          return;
        }
        departedRef.current.delete(call.peer);
        call.answer(buildSendStream());
        handleMediaConnection(call);
      });

      peer.on("connection", (conn) => {
        if (session !== sessionRef.current) {
          conn.close();
          return;
        }
        handleDataConnection(conn);
      });

      peer.on("disconnected", () => {
        // Lost the signaling server only; existing media keeps flowing.
        if (session === sessionRef.current) setSignalingDown(true);
        setTimeout(() => {
          if (session === sessionRef.current && !peer.destroyed && peer.disconnected) {
            try {
              peer.reconnect();
            } catch {
              /* noop */
            }
          }
        }, 1500);
      });

      peer.on("error", (err: Error & { type?: string }) => {
        if (session !== sessionRef.current) return;
        switch (err.type) {
          case "unavailable-id":
            setTimeout(() => {
              if (session === sessionRef.current)
                initPeer(generateUniquePeerId(roomId, identityRef.current.role), session);
            }, 500);
            return;
          case "peer-unavailable":
            return; // target left / not yet registered; heartbeat retries
          case "network":
          case "server-error":
          case "socket-error":
          case "socket-closed":
            setSignalingDown(true);
            setTimeout(() => {
              if (session === sessionRef.current && !peer.destroyed && peer.disconnected) {
                try {
                  peer.reconnect();
                } catch {
                  /* noop */
                }
              }
            }, 3000);
            return;
          case "browser-incompatible":
            setError("This browser does not support video calls. Please use Chrome, Edge, Safari or Firefox.");
            setConnectionState("error");
            return;
          default:
            console.warn("[PeerJS]", err.type, err.message);
        }
      });

      return peer;
    },
    [
      roomId,
      syncRoomPresence,
      handleMediaConnection,
      handleDataConnection,
      buildSendStream,
    ]
  );

  /* ---------------------------------------------------------------- */
  /*  Local media                                                     */
  /* ---------------------------------------------------------------- */

  const startLocalMedia = useCallback(
    (video: boolean = true, audio: boolean = true): Promise<void> => {
      if (localStreamRef.current && (micTrackRef.current || camTrackRef.current)) {
        return Promise.resolve();
      }
      if (mediaPromiseRef.current) return mediaPromiseRef.current;
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Your browser does not allow camera access. Use HTTPS or localhost.");
        setIsMediaReady(true);
        return Promise.resolve();
      }

      const session = sessionRef.current;
      setError(null);
      setConnectionState((s) => (s === "idle" || s === "error" ? "requesting_media" : s));

      const promise = (async () => {
        const gum = (c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c);
        const camC = cameraConstraints(videoDeviceRef.current, facingModeRef.current);
        const micC = micConstraints(audioDeviceRef.current);
        let mic: MediaStreamTrack | null = null;
        let cam: MediaStreamTrack | null = null;
        let failure: string | null = null;

        try {
          const s = await gum({ video: video ? camC : false, audio: audio ? micC : false });
          mic = s.getAudioTracks()[0] || null;
          cam = s.getVideoTracks()[0] || null;
        } catch (err) {
          // Retry each device on its own so one broken/busy device doesn't block the call
          if (audio) {
            try {
              mic = (await gum({ audio: micC })).getAudioTracks()[0] || null;
            } catch {
              /* no mic */
            }
          }
          if (video) {
            try {
              cam = (await gum({ video: camC })).getVideoTracks()[0] || null;
            } catch {
              /* no cam */
            }
          }
          const name = (err as { name?: string })?.name;
          if (!mic && !cam) {
            failure =
              name === "NotAllowedError"
                ? "Camera and microphone are blocked. Allow access in your browser's address bar, then retry."
                : "No camera or microphone found. You can still join and use chat.";
          } else if (!mic) {
            failure = "Microphone unavailable — others won't hear you.";
          } else if (!cam && video) {
            failure = "Camera unavailable or in use by another app — joining with audio only.";
          }
        }

        if (session !== sessionRef.current) {
          mic?.stop();
          cam?.stop();
          return;
        }

        micTrackRef.current = mic;
        camTrackRef.current = cam;
        if (mic) {
          mic.enabled = !isMicMutedRef.current;
          const id = mic.getSettings().deviceId;
          if (id) {
            audioDeviceRef.current = id;
            setCurrentAudioDeviceId(id);
          }
        } else {
          isMicMutedRef.current = true;
          setIsMicMuted(true);
        }
        if (cam) {
          const id = cam.getSettings().deviceId;
          if (id) {
            videoDeviceRef.current = id;
            setCurrentVideoDeviceId(id);
          }
          if (isCamOffRef.current) {
            cam.stop();
            camTrackRef.current = null;
          }
        } else {
          isCamOffRef.current = true;
          setIsCamOff(true);
        }

        publishLocalStream();
        syncSenders();
        if (failure) setError(failure);
        setIsMediaReady(true);
        setConnectionState((s) => (s === "requesting_media" ? (joinedRef.current ? "connecting" : "idle") : s));
        loadAvailableDevices(); // labels become available after permission
      })().finally(() => {
        if (mediaPromiseRef.current === promise) mediaPromiseRef.current = null;
      });

      mediaPromiseRef.current = promise;
      return promise;
    },
    [publishLocalStream, syncSenders, loadAvailableDevices]
  );

  const stopLocalMedia = useCallback(() => {
    micTrackRef.current?.stop();
    camTrackRef.current?.stop();
    screenTrackRef.current?.stop();
    placeholderAudioRef.current?.stop();
    placeholderVideoRef.current?.stop();
    micTrackRef.current = null;
    camTrackRef.current = null;
    screenTrackRef.current = null;
    placeholderAudioRef.current = null;
    placeholderVideoRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setIsMediaReady(false);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Join / leave                                                    */
  /* ---------------------------------------------------------------- */

  const joinRoom = useCallback(async () => {
    if (joinedRef.current) return;
    const session = sessionRef.current;
    joinedRef.current = true;
    setHasJoined(true);
    setConnectionState("connecting");
    setError(null);
    await startLocalMedia(true, true);
    if (session !== sessionRef.current || !joinedRef.current) return;
    initPeer(generateUniquePeerId(roomId, identityRef.current.role, customPeerId), session);
  }, [roomId, customPeerId, startLocalMedia, initPeer]);

  const leaveSignals = useCallback(
    (useBeacon: boolean) => {
      broadcastDataPayload({ type: "bye" });
      const myId = peerRef.current?.id;
      if (!myId || !roomId) return;
      const url = `/api/telehealth/rooms/${encodeURIComponent(roomId)}?peerId=${encodeURIComponent(myId)}`;
      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/telehealth/rooms/${encodeURIComponent(roomId)}`,
          new Blob([JSON.stringify({ peerId: myId, action: "leave" })], { type: "application/json" })
        );
      } else {
        fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
      }
    },
    [broadcastDataPayload, roomId]
  );

  const teardown = useCallback(
    (finalState: ConnectionState, useBeacon = false) => {
      sessionRef.current += 1;
      if (joinedRef.current) leaveSignals(useBeacon);
      joinedRef.current = false;

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
      stopCallTimer();
      stopNetworkMonitor();
      iceTimersRef.current.forEach((t) => clearTimeout(t));
      iceTimersRef.current.clear();

      mediaConnsRef.current.forEach((c) => {
        try {
          c.close();
        } catch {
          /* noop */
        }
      });
      dataConnsRef.current.forEach((c) => {
        try {
          c.close();
        } catch {
          /* noop */
        }
      });
      mediaConnsRef.current.clear();
      dataConnsRef.current.clear();
      callStartedAtRef.current.clear();
      dataStartedAtRef.current.clear();
      prevLossRef.current.clear();
      knownSinceRef.current.clear();
      setSignalingDown(false);

      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();
      peerRef.current = null;
      mediaPromiseRef.current = null;
      stopLocalMedia();

      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
      setRemoteParticipants([]);
      setHasJoined(false);
      setPeerId(null);
      setConnectionState(finalState);
    },
    [leaveSignals, stopCallTimer, stopNetworkMonitor, stopLocalMedia]
  );

  const disconnect = useCallback(() => teardown("disconnected"), [teardown]);

  onRoomFullRef.current = () => {
    teardown("error");
    setError("This call is full (maximum " + MAX_PARTICIPANTS + " people).");
  };

  // Mount / unmount. Strict-Mode safe: the fake unmount tears down and the
  // re-mount starts a fresh session.
  useEffect(() => {
    if (autoJoin) joinRoom();
    const onPageHide = () => {
      if (joinedRef.current) leaveSignals(true);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      teardown("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, customPeerId]);

  // Pre-join lobby: show who's already in the call, without announcing ourselves
  useEffect(() => {
    if (hasJoined || !roomId) {
      setLobbyPeers([]);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/telehealth/rooms/${encodeURIComponent(roomId)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setLobbyPeers(
          (data.peers || []).map((p: LobbyPeer) => ({
            peerId: p.peerId,
            displayName: p.displayName,
            role: p.role,
          }))
        );
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, LOBBY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [hasJoined, roomId]);

  // Name edits after joining propagate to everyone
  useEffect(() => {
    if (joinedRef.current) broadcastDataPayload(selfStatePayload("participant_info"));
  }, [displayName, broadcastDataPayload, selfStatePayload]);

  // Optional direct target (legacy deep links)
  useEffect(() => {
    if (targetPeerId && peerId) connectToPeer(targetPeerId);
  }, [targetPeerId, peerId, connectToPeer]);

  /* ---------------------------------------------------------------- */
  /*  Device switching                                                */
  /* ---------------------------------------------------------------- */

  const switchMicrophone = useCallback(
    async (deviceId: string) => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: micConstraints(deviceId) });
        const track = s.getAudioTracks()[0];
        if (!track) return;
        micTrackRef.current?.stop();
        micTrackRef.current = track;
        audioDeviceRef.current = deviceId;
        setCurrentAudioDeviceId(deviceId);
        track.enabled = !isMicMutedRef.current;
        publishLocalStream();
        syncSenders();
      } catch (err) {
        console.warn("[switchMicrophone]", err);
        setError("Could not switch microphone.");
      }
    },
    [publishLocalStream, syncSenders]
  );

  const switchCamera = useCallback(
    async (deviceId?: string) => {
      if (deviceId) {
        videoDeviceRef.current = deviceId;
        setCurrentVideoDeviceId(deviceId);
      } else {
        // Mobile front/back flip
        const next = facingModeRef.current === "user" ? "environment" : "user";
        facingModeRef.current = next;
        setFacingMode(next);
        videoDeviceRef.current = null;
      }
      // Camera off → just remember the choice for when it turns back on
      if (isCamOffRef.current) return;
      const previous = camTrackRef.current;
      const previousDeviceId = previous?.getSettings().deviceId ?? null;
      previous?.stop(); // release first: many phones allow one camera at a time
      let track: MediaStreamTrack | null = null;
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: cameraConstraints(videoDeviceRef.current, facingModeRef.current),
        });
        track = s.getVideoTracks()[0] || null;
      } catch (err) {
        console.warn("[switchCamera]", err);
        setError("Could not switch camera, staying on the previous one.");
        // Re-open the camera we had so video doesn't go black
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: cameraConstraints(previousDeviceId, facingModeRef.current),
          });
          track = s.getVideoTracks()[0] || null;
          videoDeviceRef.current = previousDeviceId;
        } catch {
          track = null;
        }
      }
      if (isCamOffRef.current) {
        track?.stop();
        return;
      }
      camTrackRef.current = track;
      if (!track) {
        isCamOffRef.current = true;
        setIsCamOff(true);
        broadcastDataPayload({ ...selfStatePayload("camera_state"), isCamOff: true });
      } else {
        const id = track.getSettings().deviceId;
        if (id) setCurrentVideoDeviceId(id);
      }
      publishLocalStream();
      syncSenders();
    },
    [publishLocalStream, syncSenders, broadcastDataPayload, selfStatePayload]
  );

  const switchSpeaker = useCallback(async (deviceId: string) => {
    setCurrentOutputDeviceId(deviceId);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Mic / camera / screen share                                     */
  /* ---------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    const nextMuted = !isMicMutedRef.current;
    if (!nextMuted && !micTrackRef.current) {
      // No mic yet (denied/missing at start) — try to acquire one now
      navigator.mediaDevices
        ?.getUserMedia({ audio: micConstraints(audioDeviceRef.current) })
        .then((s) => {
          const track = s.getAudioTracks()[0];
          if (!track) return;
          micTrackRef.current = track;
          isMicMutedRef.current = false;
          setIsMicMuted(false);
          setError(null);
          publishLocalStream();
          syncSenders();
          broadcastDataPayload({ ...selfStatePayload("mic_state"), isMicMuted: false });
        })
        .catch(() => setError("Microphone is blocked or unavailable."));
      return;
    }
    isMicMutedRef.current = nextMuted;
    setIsMicMuted(nextMuted);
    if (micTrackRef.current) micTrackRef.current.enabled = !nextMuted;
    broadcastDataPayload({ ...selfStatePayload("mic_state"), isMicMuted: nextMuted });
  }, [publishLocalStream, syncSenders, broadcastDataPayload, selfStatePayload]);

  const toggleCamera = useCallback(() => {
    const turningOff = !isCamOffRef.current;
    if (turningOff) {
      isCamOffRef.current = true;
      setIsCamOff(true);
      camTrackRef.current?.stop(); // camera light goes off, like Meet
      camTrackRef.current = null;
      publishLocalStream();
      syncSenders();
      broadcastDataPayload({ ...selfStatePayload("camera_state"), isCamOff: true });
      return;
    }

    isCamOffRef.current = false;
    setIsCamOff(false);
    const session = sessionRef.current;
    navigator.mediaDevices
      ?.getUserMedia({ video: cameraConstraints(videoDeviceRef.current, facingModeRef.current) })
      .then((s) => {
        const track = s.getVideoTracks()[0];
        if (!track) return;
        if (session !== sessionRef.current || isCamOffRef.current) {
          track.stop(); // user toggled off again while camera was starting
          return;
        }
        camTrackRef.current = track;
        setError(null);
        publishLocalStream();
        syncSenders();
        broadcastDataPayload({ ...selfStatePayload("camera_state"), isCamOff: false });
      })
      .catch(() => {
        isCamOffRef.current = true;
        setIsCamOff(true);
        setError("Camera is blocked, unavailable, or in use by another app.");
      });
  }, [publishLocalStream, syncSenders, broadcastDataPayload, selfStatePayload]);

  const stopScreenShare = useCallback(() => {
    if (!screenTrackRef.current) return;
    screenTrackRef.current.onended = null;
    screenTrackRef.current.stop();
    screenTrackRef.current = null;
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);
    publishLocalStream();
    syncSenders();
    broadcastDataPayload(selfStatePayload("media_state"));
  }, [publishLocalStream, syncSenders, broadcastDataPayload, selfStatePayload]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported on this device");
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const track = s.getVideoTracks()[0];
      if (!track) return;
      try {
        (track as MediaStreamTrack & { contentHint: string }).contentHint = "detail";
      } catch {
        /* noop */
      }
      screenTrackRef.current = track;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
      track.onended = () => stopScreenShare(); // browser "Stop sharing" button
      publishLocalStream();
      syncSenders();
      broadcastDataPayload(selfStatePayload("media_state"));
    } catch (err) {
      console.warn("[Screen share cancelled]", err);
    }
  }, [stopScreenShare, publishLocalStream, syncSenders, broadcastDataPayload, selfStatePayload]);

  /* ---------------------------------------------------------------- */
  /*  Chat                                                            */
  /* ---------------------------------------------------------------- */

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const { displayName: name, role: myRole } = identityRef.current;
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: "local",
        text: text.trim(),
        timestamp: nowTime(),
        status: dataConnsRef.current.size > 0 ? "delivered" : "sent",
        senderName: name,
        senderRole: myRole,
        sentAt: Date.now(),
      };
      setChatMessages((prev) => [...prev, msg]);
      broadcastDataPayload({
        type: "chat",
        id: msg.id,
        message: msg.text,
        timestamp: msg.timestamp,
        sentAt: msg.sentAt,
        senderName: name,
        senderRole: myRole,
      });
    },
    [broadcastDataPayload]
  );

  const sendTypingIndicator = useCallback(
    (typing: boolean) => {
      broadcastDataPayload({
        type: typing ? "typing" : "stop_typing",
        senderName: identityRef.current.displayName,
        senderRole: identityRef.current.role,
      });
    },
    [broadcastDataPayload]
  );

  const restartConnection = useCallback(() => {
    const peer = peerRef.current;
    if (!peer || !joinedRef.current) return;
    if (peer.disconnected && !peer.destroyed) {
      try {
        peer.reconnect();
      } catch {
        /* noop */
      }
    }
    // Force a fresh call to everyone we dial; the others will re-dial us.
    mediaConnsRef.current.forEach((_, id) => {
      if (shouldInitiateCall(peer.id, id)) closeMedia(id);
    });
    syncRoomPresence(peer.id, sessionRef.current);
  }, [closeMedia, syncRoomPresence]);

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                  */
  /* ---------------------------------------------------------------- */

  const firstRemote = remoteParticipants[0];
  const isRemote240pQuality = remoteParticipants.some((p) => p.is240p);
  const isRemoteVideoPausedForNetwork = remoteParticipants.some((p) => p.isVideoPausedForNetwork);
  const isAudioOnlyFallback = isSimulatedPoorNetwork || networkQuality === "poor";

  return {
    localStream,
    remoteStream: remoteParticipants.find((p) => p.stream)?.stream || null,
    remoteParticipants,
    remotePeers: remoteParticipants,
    remotePeersCount: remoteParticipants.length,
    connectionState,
    networkQuality,
    isMicMuted,
    isCamOff,
    isScreenSharing,
    isRemoteTyping,
    remoteTypingName,
    isRemoteCamOff: firstRemote?.isCamOff ?? false,
    isRemoteMicMuted: firstRemote?.isMicMuted ?? false,
    callDurationSeconds,
    chatMessages,
    peerId,
    remotePeerId: firstRemote?.peerId || null,
    error,
    facingMode,
    participantCount: remoteParticipants.length + 1,

    hasJoined,
    isMediaReady,
    lobbyPeers,
    isRoomFull: !hasJoined && lobbyPeers.length >= MAX_PARTICIPANTS,
    joinRoom,

    is240pQuality,
    isRemote240pQuality,
    isVideoPausedForNetwork: false,
    isRemoteVideoPausedForNetwork,
    isAudioOnlyFallback,
    isSimulatedPoorNetwork,
    simulatePoorNetwork,

    availableDevices,
    currentAudioDeviceId,
    currentVideoDeviceId,
    currentOutputDeviceId,
    switchCamera,
    switchMicrophone,
    switchSpeaker,

    startLocalMedia,
    stopLocalMedia,
    connectToPeer,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
    sendTypingIndicator,
    disconnect,
    restartConnection,
  };
}
