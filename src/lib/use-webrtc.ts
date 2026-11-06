/**
 * SmrkoMed Telehealth — Multi-Party WebRTC Mesh Hook
 *
 * Built on PeerJS and room signaling to support 1-to-1 consultations,
 * couple / family attendance (patient + spouse), and clinical team presence
 * (doctor + nurse coordinator / specialist) simultaneously in a deterministic mesh.
 * Includes adaptive 240p network resilience, audio/video device switching,
 * and reliable RTCRtpSender track toggling.
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

export interface RemoteParticipant {
  peerId: string;
  displayName: string;
  role: ParticipantRole;
  stream: MediaStream | null;
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

export interface ChatMessage {
  id: string;
  sender: "local" | "remote";
  text: string;
  timestamp: string;
  status: "sent" | "delivered";
  senderName?: string;
  senderRole?: ParticipantRole;
}

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
    | "mic_state";
  message?: string;
  timestamp?: string;
  id?: string;
  senderName?: string;
  senderRole?: ParticipantRole;
  isMicMuted?: boolean;
  isCamOff?: boolean;
  videoPausedForNetwork?: boolean;
  is240p?: boolean;
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
  switchCamera: (deviceId?: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;

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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "");
}

function generateUniquePeerId(
  roomId: string,
  role: ParticipantRole,
  customId?: string
): string {
  if (customId) return customId;
  const rand = Math.random().toString(36).slice(2, 7);
  return `smrko-${sanitizeId(roomId)}-${role}-${rand}`;
}

function shouldInitiateCall(myId: string, theirId: string): boolean {
  return myId.localeCompare(theirId) > 0;
}

/* ------------------------------------------------------------------ */
/*  Hook Implementation                                                */
/* ------------------------------------------------------------------ */

export function useWebRTC(
  roomId: string,
  options: UseWebRTCOptions
): UseWebRTCReturn {
  const { role, displayName, customPeerId, targetPeerId } = options;

  // Streams & participants
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);

  // Connection state & quality
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Media toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [remoteTypingName, setRemoteTypingName] = useState<string | undefined>(undefined);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Adaptive network resilience state
  const [is240pQuality, setIs240pQuality] = useState(false);
  const [isRemote240pQuality, setIsRemote240pQuality] = useState(false);
  const [isVideoPausedForNetwork, setIsVideoPausedForNetwork] = useState(false);
  const [isRemoteVideoPausedForNetwork, setIsRemoteVideoPausedForNetwork] = useState(false);
  const [isSimulatedPoorNetwork, setIsSimulatedPoorNetwork] = useState(false);

  // Available Audio & Video Devices
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [currentAudioDeviceId, setCurrentAudioDeviceId] = useState<string | null>(null);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string | null>(null);

  // Call timer
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Peer info
  const [peerId, setPeerId] = useState<string | null>(null);

  // Internal connection tracking maps
  const peerRef = useRef<Peer | null>(null);
  const isPeerInitRef = useRef(false);
  const mediaConnsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");

  // Resilience tracking refs
  const is240pRef = useRef(false);
  const isVideoPausedForNetworkRef = useRef(false);
  const isSimulatedPoorNetworkRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const isCamOffRef = useRef(false);
  const stableCounterRef = useRef(0);

  // Timers & intervals
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  isMicMutedRef.current = isMicMuted;
  isCamOffRef.current = isCamOff;

  /* ---------------------------------------------------------------- */
  /*  Enumerate Audio & Video Devices                                 */
  /* ---------------------------------------------------------------- */

  const loadAvailableDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const list: DeviceInfo[] = devices
        .filter((d) => d.kind === "audioinput" || d.kind === "videoinput" || d.kind === "audiooutput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label:
            d.label ||
            `${d.kind === "videoinput" ? "Camera" : d.kind === "audioinput" ? "Microphone" : "Speaker"} ${
              index + 1
            }`,
          kind: d.kind,
        }));
      setAvailableDevices(list);
    } catch (e) {
      console.warn("Failed to enumerate devices:", e);
    }
  }, []);

  useEffect(() => {
    loadAvailableDevices();
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", loadAvailableDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", loadAvailableDevices);
      };
    }
  }, [loadAvailableDevices]);

  /* ---------------------------------------------------------------- */
  /*  Call timer                                                      */
  /* ---------------------------------------------------------------- */

  const startCallTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Broadcast Data Helper                                           */
  /* ---------------------------------------------------------------- */

  const broadcastDataPayload = useCallback((payload: DataPayload) => {
    dataConnsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(payload);
        } catch {
          // ignore closed channel
        }
      }
    });
  }, []);

  const sendNetworkModePayload = useCallback(
    (videoPaused: boolean, is240p: boolean) => {
      broadcastDataPayload({
        type: "network_mode",
        videoPausedForNetwork: videoPaused,
        is240p,
      });
    },
    [broadcastDataPayload]
  );

  /* ---------------------------------------------------------------- */
  /*  Adaptive 240p Resilience & Simulation Toggle                    */
  /* ---------------------------------------------------------------- */

  const simulatePoorNetwork = useCallback(
    (enable?: boolean) => {
      const nextState =
        typeof enable === "boolean" ? enable : !isSimulatedPoorNetworkRef.current;
      isSimulatedPoorNetworkRef.current = nextState;
      setIsSimulatedPoorNetwork(nextState);

      if (nextState) {
        setNetworkQuality("poor");
        is240pRef.current = true;
        setIs240pQuality(true);
        sendNetworkModePayload(false, true);
      } else {
        stableCounterRef.current = 2;
        setNetworkQuality("excellent");
        is240pRef.current = false;
        setIs240pQuality(false);
        sendNetworkModePayload(false, false);
      }
    },
    [sendNetworkModePayload]
  );

  /* ---------------------------------------------------------------- */
  /*  Network monitor across active peer connections                  */
  /* ---------------------------------------------------------------- */

  const startNetworkMonitor = useCallback(() => {
    if (statsIntervalRef.current) return;

    statsIntervalRef.current = setInterval(async () => {
      try {
        const conns = Array.from(mediaConnsRef.current.values());
        if (conns.length === 0) return;

        let worstRTT = 0;
        let totalLoss = 0;
        let totalReceived = 0;

        for (const conn of conns) {
          const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
          if (!pc) continue;

          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.currentRoundTripTime) {
              const rtt = report.currentRoundTripTime * 1000;
              if (rtt > worstRTT) worstRTT = rtt;
            }
            if (report.type === "inbound-rtp" && report.kind === "video") {
              totalLoss += report.packetsLost || 0;
              totalReceived += report.packetsReceived || 0;
            }
          });
        }

        const lossRate =
          totalReceived > 0 ? totalLoss / (totalLoss + totalReceived) : 0;

        let quality: NetworkQuality = "excellent";
        if (worstRTT > 300 || lossRate > 0.1) quality = "poor";
        else if (worstRTT > 150 || lossRate > 0.05) quality = "fair";
        else if (worstRTT > 80 || lossRate > 0.02) quality = "good";

        if (!isSimulatedPoorNetworkRef.current) {
          setNetworkQuality(quality);

          if (quality === "poor") {
            stableCounterRef.current = 0;
            if (!is240pRef.current) {
              is240pRef.current = true;
              setIs240pQuality(true);
              sendNetworkModePayload(false, true);
            }
          } else if (quality === "good" || quality === "excellent") {
            stableCounterRef.current += 1;
            if (stableCounterRef.current >= 2 && is240pRef.current) {
              is240pRef.current = false;
              setIs240pQuality(false);
              sendNetworkModePayload(false, false);
            }
          }
        }
      } catch {
        // Stats unavailable
      }
    }, 2500);
  }, [sendNetworkModePayload]);

  const stopNetworkMonitor = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Handle incoming DataConnection (chat / presence channel)        */
  /* ---------------------------------------------------------------- */

  const handleDataConnection = useCallback(
    (conn: DataConnection) => {
      const remoteId = conn.peer;
      dataConnsRef.current.set(remoteId, conn);

      conn.on("open", () => {
        try {
          conn.send({
            type: "participant_info",
            senderName: displayName,
            senderRole: role,
            isMicMuted: localStreamRef.current
              ? !localStreamRef.current.getAudioTracks().some((t) => t.enabled)
              : false,
            isCamOff: localStreamRef.current
              ? !localStreamRef.current.getVideoTracks().some((t) => t.enabled)
              : false,
            is240p: is240pRef.current,
            videoPausedForNetwork: isVideoPausedForNetworkRef.current,
          });
        } catch (e) {
          console.warn("[DataConnection send failed]", e);
        }
      });

      conn.on("data", (raw: unknown) => {
        const payload = raw as DataPayload;

        if (payload.type === "chat" && payload.message) {
          const msg: ChatMessage = {
            id:
              payload.id ||
              `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            sender: "remote",
            text: payload.message,
            timestamp:
              payload.timestamp ||
              new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            status: "delivered",
            senderName: payload.senderName,
            senderRole: payload.senderRole,
          };
          setChatMessages((prev) => [...prev, msg]);
        } else if (payload.type === "typing") {
          setIsRemoteTyping(true);
          setRemoteTypingName(payload.senderName);
          if (typingResetTimeoutRef.current) clearTimeout(typingResetTimeoutRef.current);
          typingResetTimeoutRef.current = setTimeout(() => {
            setIsRemoteTyping(false);
            setRemoteTypingName(undefined);
          }, 3000);
        } else if (payload.type === "stop_typing") {
          setIsRemoteTyping(false);
          setRemoteTypingName(undefined);
        } else if (payload.type === "network_mode") {
          if (payload.is240p !== undefined) {
            setIsRemote240pQuality(payload.is240p);
          }
          if (payload.videoPausedForNetwork !== undefined) {
            setIsRemoteVideoPausedForNetwork(payload.videoPausedForNetwork);
          }
          setRemoteParticipants((prev) =>
            prev.map((p) =>
              p.peerId === remoteId
                ? {
                    ...p,
                    is240p: payload.is240p ?? p.is240p,
                    isVideoPausedForNetwork: payload.videoPausedForNetwork ?? p.isVideoPausedForNetwork,
                  }
                : p
            )
          );
        } else if (payload.type === "camera_state") {
          const isCamOffVal = payload.isCamOff ?? false;
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.peerId === remoteId ? { ...p, isCamOff: isCamOffVal } : p))
          );
        } else if (payload.type === "mic_state") {
          const isMicMutedVal = payload.isMicMuted ?? false;
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.peerId === remoteId ? { ...p, isMicMuted: isMicMutedVal } : p))
          );
        } else if (
          payload.type === "media_state" ||
          payload.type === "participant_info"
        ) {
          if (payload.videoPausedForNetwork !== undefined) {
            setIsRemoteVideoPausedForNetwork(payload.videoPausedForNetwork);
          }
          if (payload.is240p !== undefined) {
            setIsRemote240pQuality(payload.is240p);
          }
          setRemoteParticipants((prev) => {
            const idx = prev.findIndex((p) => p.peerId === remoteId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx]!,
                displayName: payload.senderName || updated[idx]!.displayName,
                role: payload.senderRole || updated[idx]!.role,
                isMicMuted: payload.isMicMuted ?? updated[idx]!.isMicMuted,
                isCamOff: payload.isCamOff ?? updated[idx]!.isCamOff,
                is240p: payload.is240p ?? updated[idx]!.is240p,
                isVideoPausedForNetwork:
                  payload.videoPausedForNetwork !== undefined
                    ? payload.videoPausedForNetwork
                    : updated[idx]!.isVideoPausedForNetwork,
              };
              return updated;
            } else {
              return [
                ...prev,
                {
                  peerId: remoteId,
                  displayName:
                    payload.senderName ||
                    (payload.senderRole === "doctor" ? "Doctor" : "Guest"),
                  role: payload.senderRole || "patient",
                  stream: null,
                  isMicMuted: payload.isMicMuted ?? false,
                  isCamOff: payload.isCamOff ?? false,
                  is240p: payload.is240p ?? false,
                  isVideoPausedForNetwork: payload.videoPausedForNetwork ?? false,
                },
              ];
            }
          });
        }
      });

      conn.on("close", () => {
        dataConnsRef.current.delete(remoteId);
      });

      conn.on("error", (err) => {
        console.warn(`[DataConnection error ${remoteId}]`, err);
      });
    },
    [displayName, role]
  );

  /* ---------------------------------------------------------------- */
  /*  Handle MediaConnection (video / audio call stream)              */
  /* ---------------------------------------------------------------- */

  const handleMediaConnection = useCallback(
    (call: MediaConnection) => {
      const remoteId = call.peer;
      mediaConnsRef.current.set(remoteId, call);

      call.on("stream", (stream: MediaStream) => {
        setRemoteParticipants((prev) => {
          const idx = prev.findIndex((p) => p.peerId === remoteId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx]!, stream };
            return updated;
          } else {
            const inferredRole: ParticipantRole = remoteId.includes("-doctor")
              ? "doctor"
              : remoteId.includes("-family")
              ? "family"
              : remoteId.includes("-coordinator")
              ? "coordinator"
              : "patient";

            return [
              ...prev,
              {
                peerId: remoteId,
                displayName: inferredRole === "doctor" ? "Doctor" : "Participant",
                role: inferredRole,
                stream,
              },
            ];
          }
        });

        setConnectionState("connected");
        startCallTimer();
        startNetworkMonitor();
      });

      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      if (pc) {
        pc.oniceconnectionstatechange = () => {
          const ice = pc.iceConnectionState;
          if (ice === "connected" || ice === "completed") {
            setConnectionState("connected");
          } else if (ice === "failed") {
            if (pc.restartIce) pc.restartIce();
          }
        };
      }

      call.on("close", () => {
        mediaConnsRef.current.delete(remoteId);
        setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== remoteId));

        if (mediaConnsRef.current.size === 0) {
          setConnectionState("waiting");
          stopNetworkMonitor();
        }
      });

      call.on("error", (err) => {
        console.warn(`[MediaConnection error ${remoteId}]`, err);
      });
    },
    [startCallTimer, startNetworkMonitor, stopNetworkMonitor]
  );

  /* ---------------------------------------------------------------- */
  /*  Connect to an individual peer in room                           */
  /* ---------------------------------------------------------------- */

  const connectToPeer = useCallback(
    (
      targetId: string,
      peerInfo?: { displayName?: string; role?: ParticipantRole }
    ) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed || !peer.open) return;
      if (targetId === peer.id) return;

      if (peerInfo) {
        setRemoteParticipants((prev) => {
          if (prev.some((p) => p.peerId === targetId)) return prev;
          return [
            ...prev,
            {
              peerId: targetId,
              displayName: peerInfo.displayName || "Participant",
              role: peerInfo.role || "patient",
              stream: null,
            },
          ];
        });
      }

      if (!dataConnsRef.current.has(targetId)) {
        try {
          const dataConn = peer.connect(targetId, {
            reliable: true,
            metadata: { displayName, role },
          });
          handleDataConnection(dataConn);
        } catch (err) {
          console.warn("[DataChannel connect failed]", err);
        }
      }

      if (localStreamRef.current && !mediaConnsRef.current.has(targetId)) {
        try {
          const call = peer.call(targetId, localStreamRef.current, {
            metadata: { displayName, role },
          });
          if (call) {
            handleMediaConnection(call);
          }
        } catch (err) {
          console.warn("[Media call failed]", err);
        }
      }
    },
    [displayName, role, handleDataConnection, handleMediaConnection]
  );

  /* ---------------------------------------------------------------- */
  /*  Room Presence Signaling (Announce & Heartbeat)                  */
  /* ---------------------------------------------------------------- */

  const syncRoomPresence = useCallback(
    async (currentPeerId: string) => {
      if (!roomId) return;

      try {
        const res = await fetch(
          `/api/telehealth/rooms/${encodeURIComponent(roomId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              peerId: currentPeerId,
              displayName,
              role,
              isMicMuted: localStreamRef.current
                ? !localStreamRef.current.getAudioTracks().some((t) => t.enabled)
                : false,
              isCamOff: localStreamRef.current
                ? !localStreamRef.current.getVideoTracks().some((t) => t.enabled)
                : false,
            }),
          }
        );

        if (!res.ok) return;
        const data = await res.json();
        const otherPeers: Array<{
          peerId: string;
          displayName: string;
          role: ParticipantRole;
          isMicMuted?: boolean;
          isCamOff?: boolean;
        }> = data.peers || [];

        for (const other of otherPeers) {
          if (other.peerId === currentPeerId) continue;

          const shouldInitiate = shouldInitiateCall(currentPeerId, other.peerId);

          if (shouldInitiate) {
            connectToPeer(other.peerId, {
              displayName: other.displayName,
              role: other.role,
            });
          }
        }

        const activeIds = new Set(otherPeers.map((p) => p.peerId));
        setRemoteParticipants((prev) =>
          prev.filter((p) => {
            if (!activeIds.has(p.peerId) && !mediaConnsRef.current.has(p.peerId)) {
              return false;
            }
            return true;
          })
        );
      } catch {
        // Background sync failed; ignore
      }
    },
    [roomId, displayName, role, connectToPeer]
  );

  /* ---------------------------------------------------------------- */
  /*  Initialize PeerJS Instance                                      */
  /* ---------------------------------------------------------------- */

  const initPeer = useCallback(
    (assignedPeerId: string) => {
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }

      const peer = new Peer(assignedPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
            { urls: "stun:stun.services.mozilla.com" },
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: "all",
        },
      });

      peer.on("open", (openId) => {
        setPeerId(openId);
        setConnectionState("waiting");

        syncRoomPresence(openId);

        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          syncRoomPresence(openId);
        }, 3000);
      });

      peer.on("error", (err: any) => {
        console.error("[PeerJS Error]", err);
        if (err.type === "unavailable-id") {
          const altId = generateUniquePeerId(roomId, role);
          peer.destroy();
          setTimeout(() => initPeer(altId), 600);
          return;
        }
        if (err.type === "peer-unavailable") {
          // Expected when target peer is not yet online
        } else if (err.type === "network" || err.type === "server-error") {
          setTimeout(() => {
            if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.open) {
              peerRef.current.reconnect();
            }
          }, 3000);
        } else {
          setError(err.message || "WebRTC connection error");
        }
      });

      peer.on("disconnected", () => {
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.open) {
            peerRef.current.reconnect();
          }
        }, 1500);
      });

      peer.on("call", (call) => {
        call.answer(localStreamRef.current || undefined);
        handleMediaConnection(call);
      });

      peer.on("connection", (conn) => {
        handleDataConnection(conn);
      });

      peerRef.current = peer;
      return peer;
    },
    [roomId, role, syncRoomPresence, handleMediaConnection, handleDataConnection]
  );

  /* ---------------------------------------------------------------- */
  /*  Media Stream Initialization                                     */
  /* ---------------------------------------------------------------- */

  const startLocalMedia = useCallback(
    async (video: boolean = true, audio: boolean = true) => {
      setConnectionState("requesting_media");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video
            ? {
                facingMode: { ideal: facingModeRef.current },
                width: { ideal: is240pRef.current ? 320 : 1280 },
                height: { ideal: is240pRef.current ? 240 : 720 },
              }
            : false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Capture initially active device IDs
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          const settings = vTrack.getSettings();
          if (settings.deviceId) setCurrentVideoDeviceId(settings.deviceId);
        }
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          const settings = aTrack.getSettings();
          if (settings.deviceId) setCurrentAudioDeviceId(settings.deviceId);
        }

        if (peerRef.current && peerRef.current.open) {
          dataConnsRef.current.forEach((_, remoteId) => {
            if (!mediaConnsRef.current.has(remoteId)) {
              try {
                const call = peerRef.current!.call(remoteId, stream, {
                  metadata: { displayName, role },
                });
                if (call) handleMediaConnection(call);
              } catch (e) {
                console.warn("[Media call after getUserMedia failed]", e);
              }
            }
          });
        }

        setConnectionState((prev) =>
          prev === "requesting_media" ? "waiting" : prev
        );
      } catch (err: any) {
        console.error("[getUserMedia error]", err);
        setError("Camera and microphone permission required for consultation.");
        setConnectionState("error");
      }
    },
    [displayName, role, handleMediaConnection]
  );

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Mount & Unmount Lifecycle                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!isPeerInitRef.current) {
      isPeerInitRef.current = true;
      const id = generateUniquePeerId(roomId, role, customPeerId);
      initPeer(id);
    }

    return () => {
      const myId = peerRef.current?.id;
      if (myId && roomId) {
        fetch(
          `/api/telehealth/rooms/${encodeURIComponent(roomId)}?peerId=${encodeURIComponent(myId)}`,
          {
            method: "DELETE",
          }
        ).catch(() => {});
      }

      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      stopCallTimer();
      stopNetworkMonitor();

      mediaConnsRef.current.forEach((call) => call.close());
      dataConnsRef.current.forEach((conn) => conn.close());
      mediaConnsRef.current.clear();
      dataConnsRef.current.clear();

      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
      stopLocalMedia();
    };
  }, [
    roomId,
    role,
    customPeerId,
    initPeer,
    stopCallTimer,
    stopNetworkMonitor,
    stopLocalMedia,
  ]);

  useEffect(() => {
    if (targetPeerId && peerId && localStream && connectionState === "waiting") {
      const timer = setTimeout(() => {
        connectToPeer(targetPeerId);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [targetPeerId, peerId, localStream, connectionState, connectToPeer]);

  /* ---------------------------------------------------------------- */
  /*  Device Switching (Microphone & Camera)                          */
  /* ---------------------------------------------------------------- */

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;

      setCurrentAudioDeviceId(deviceId);

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getAudioTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newTrack);
        newTrack.enabled = !isMicMutedRef.current;
      }

      mediaConnsRef.current.forEach((call) => {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        const sender = pc?.getSenders()?.find((s) => s.track?.kind === "audio");
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      });
    } catch (err: any) {
      console.warn("[WebRTC] Switch microphone error:", err);
    }
  }, []);

  const switchCamera = useCallback(async (deviceId?: string) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      let videoConstraints: MediaTrackConstraints = {};
      if (deviceId) {
        videoConstraints = { deviceId: { exact: deviceId } };
        setCurrentVideoDeviceId(deviceId);
      } else {
        const nextMode = facingModeRef.current === "user" ? "environment" : "user";
        facingModeRef.current = nextMode;
        setFacingMode(nextMode);
        videoConstraints = { facingMode: { ideal: nextMode } };
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...videoConstraints,
          width: { ideal: is240pRef.current ? 320 : 1280 },
          height: { ideal: is240pRef.current ? 240 : 720 },
        },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
        newVideoTrack.enabled = !isCamOffRef.current;
      }

      mediaConnsRef.current.forEach((call) => {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        const sender = pc?.getSenders()?.find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });
    } catch (err) {
      console.warn("[switchCamera error]", err);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Media Controls (Mic, Cam, Screen Share)                         */
  /* ---------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isMicMutedRef.current;
    isMicMutedRef.current = nextState;
    setIsMicMuted(nextState);

    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextState;
    });

    mediaConnsRef.current.forEach((call) => {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      pc?.getSenders()?.forEach((s) => {
        if (s.track && s.track.kind === "audio") {
          s.track.enabled = !nextState;
        }
      });
    });

    broadcastDataPayload({
      type: "mic_state",
      senderName: displayName,
      senderRole: role,
      isMicMuted: nextState,
    });
  }, [displayName, role, broadcastDataPayload]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isCamOffRef.current;
    isCamOffRef.current = nextState;
    setIsCamOff(nextState);

    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !nextState;
    });

    mediaConnsRef.current.forEach((call) => {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      pc?.getSenders()?.forEach((s) => {
        if (s.track && s.track.kind === "video") {
          s.track.enabled = !nextState;
        }
      });
    });

    broadcastDataPayload({
      type: "camera_state",
      senderName: displayName,
      senderRole: role,
      isCamOff: nextState,
    });
  }, [displayName, role, broadcastDataPayload]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (originalVideoTrackRef.current && localStreamRef.current) {
        const currentVideo = localStreamRef.current.getVideoTracks()[0];
        if (currentVideo) localStreamRef.current.removeTrack(currentVideo);
        localStreamRef.current.addTrack(originalVideoTrackRef.current);

        mediaConnsRef.current.forEach((call) => {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          if (pc) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender && originalVideoTrackRef.current) {
              sender.replaceTrack(originalVideoTrackRef.current);
            }
          }
        });
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      if (localStreamRef.current) {
        originalVideoTrackRef.current =
          localStreamRef.current.getVideoTracks()[0] || null;
        if (originalVideoTrackRef.current) {
          localStreamRef.current.removeTrack(originalVideoTrackRef.current);
        }
        localStreamRef.current.addTrack(screenTrack);
      }

      mediaConnsRef.current.forEach((call) => {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        if (pc) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
      });

      screenTrack.onended = () => {
        toggleScreenShare();
      };

      setIsScreenSharing(true);
    } catch (err) {
      console.warn("[Screen share cancelled]", err);
    }
  }, [isScreenSharing]);

  /* ---------------------------------------------------------------- */
  /*  Chat messaging (broadcasted to all peers)                       */
  /* ---------------------------------------------------------------- */

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: "local",
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sent",
        senderName: displayName,
        senderRole: role,
      };

      setChatMessages((prev) => [...prev, newMsg]);

      broadcastDataPayload({
        type: "chat",
        id: newMsg.id,
        message: newMsg.text,
        timestamp: newMsg.timestamp,
        senderName: displayName,
        senderRole: role,
      });
    },
    [displayName, role, broadcastDataPayload]
  );

  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      broadcastDataPayload({
        type: isTyping ? "typing" : "stop_typing",
        senderName: displayName,
        senderRole: role,
      });
    },
    [displayName, role, broadcastDataPayload]
  );

  const disconnect = useCallback(() => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    stopCallTimer();
    stopNetworkMonitor();

    const myId = peerRef.current?.id;
    if (myId && roomId) {
      fetch(
        `/api/telehealth/rooms/${encodeURIComponent(roomId)}?peerId=${encodeURIComponent(myId)}`,
        {
          method: "DELETE",
        }
      ).catch(() => {});
    }

    mediaConnsRef.current.forEach((call) => call.close());
    dataConnsRef.current.forEach((conn) => conn.close());
    mediaConnsRef.current.clear();
    dataConnsRef.current.clear();

    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }
    stopLocalMedia();
    setRemoteParticipants([]);
    setConnectionState("disconnected");
  }, [roomId, stopCallTimer, stopNetworkMonitor, stopLocalMedia]);

  const restartConnection = useCallback(() => {
    console.log("[WebRTC] Reconnecting...");
    setConnectionState("reconnecting");
    if (peerId) {
      syncRoomPresence(peerId);
    }
  }, [peerId, syncRoomPresence]);

  const firstRemoteStream =
    remoteParticipants.find((p) => p.stream !== null)?.stream || null;
  const firstRemotePeerId = remoteParticipants[0]?.peerId || null;

  const isAudioOnlyFallback =
    isVideoPausedForNetwork ||
    isRemoteVideoPausedForNetwork ||
    isSimulatedPoorNetwork ||
    networkQuality === "poor";

  return {
    localStream,
    remoteStream: firstRemoteStream,
    remoteParticipants,
    remotePeers: remoteParticipants, // alias
    remotePeersCount: remoteParticipants.length,
    connectionState,
    networkQuality,
    isMicMuted,
    isCamOff,
    isScreenSharing,
    isRemoteTyping,
    remoteTypingName,
    isRemoteCamOff: remoteParticipants[0]?.isCamOff ?? false,
    isRemoteMicMuted: remoteParticipants[0]?.isMicMuted ?? false,
    callDurationSeconds,
    chatMessages,
    peerId,
    remotePeerId: firstRemotePeerId,
    error,
    facingMode,
    participantCount: remoteParticipants.length + 1,

    // Adaptive 240p Quality Degradation & Resilience
    is240pQuality,
    isRemote240pQuality,
    isVideoPausedForNetwork,
    isRemoteVideoPausedForNetwork,
    isAudioOnlyFallback,
    isSimulatedPoorNetwork,
    simulatePoorNetwork,

    // Device switching
    availableDevices,
    currentAudioDeviceId,
    currentVideoDeviceId,
    switchCamera,
    switchMicrophone,

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
