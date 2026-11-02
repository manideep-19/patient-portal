/**
 * SmrkoMed Telehealth — Multi-Peer WebRTC Hook
 *
 * Wraps PeerJS and a server room registry to provide:
 * 1. Multi-party video calling where multiple participants join with the SAME LINK.
 * 2. Glare-free P2P mesh calling (lexicographical peer ID negotiation).
 * 3. WhatsApp-style Adaptive Audio-First Resilience:
 *    When network drops, video pauses while audio streams uninterrupted;
 *    visual shows an audio-active pulsing card; video resumes seamlessly when network stabilizes.
 * 4. Multi-peer broadcast chat, typing indicator, and screen sharing.
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

export interface ChatMessage {
  id: string;
  sender: "local" | "remote";
  senderName?: string;
  text: string;
  timestamp: string;
  status: "sent" | "delivered";
}

interface DataPayload {
  type: "chat" | "typing" | "stop_typing" | "network_mode" | "camera_state";
  message?: string;
  senderName?: string;
  timestamp?: string;
  id?: string;
  videoPausedForNetwork?: boolean;
  isCamOff?: boolean;
}

export interface RemotePeer {
  peerId: string;
  role: "patient" | "doctor" | "guest";
  displayName: string;
  stream: MediaStream | null;
  isVideoPausedForNetwork?: boolean;
  isMicMuted?: boolean;
  isCamOff?: boolean;
}

export interface UseWebRTCOptions {
  /** Whether this peer is patient, doctor, or guest */
  role: "patient" | "doctor" | "guest";
  /** Display name shown in roster & chat */
  displayName: string;
  /** Optional custom peer ID (otherwise auto-generated with unique session suffix) */
  customPeerId?: string;
  /** Optional target peer ID to auto-connect to */
  targetPeerId?: string;
  /** Disable automatic room discovery & mesh connection */
  disableAutoConnect?: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null; // Backwards compatible (first connected peer)
  remotePeers: RemotePeer[];
  remotePeersCount: number;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  isRemoteTyping: boolean;
  callDurationSeconds: number;
  chatMessages: ChatMessage[];
  peerId: string | null;
  remotePeerId: string | null;
  error: string | null;

  // WhatsApp-style Adaptive Audio-First Resilience
  isRemoteCamOff: boolean;
  isVideoPausedForNetwork: boolean;
  isRemoteVideoPausedForNetwork: boolean;
  isAudioOnlyFallback: boolean;
  isSimulatedPoorNetwork: boolean;
  simulatePoorNetwork: (enable?: boolean) => void;

  startLocalMedia: (video?: boolean, audio?: boolean) => Promise<void>;
  stopLocalMedia: () => void;
  connectToPeer: (remotePeerId: string, role?: "patient" | "doctor" | "guest", displayName?: string) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  sendChatMessage: (text: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  disconnect: () => void;
}

/* ------------------------------------------------------------------ */
/*  Peer ID Helpers                                                    */
/* ------------------------------------------------------------------ */

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "");
}

function generateUniqueSessionId(roomId: string, role: string): string {
  const rand = Math.random().toString(36).substring(2, 7);
  return `smrko-${sanitizeId(roomId)}-${role}-${rand}`;
}

/* ------------------------------------------------------------------ */
/*  Hook Implementation                                                */
/* ------------------------------------------------------------------ */

export function useWebRTC(
  roomId: string,
  options: UseWebRTCOptions
): UseWebRTCReturn {
  const { role, displayName } = options;

  // Session-stable peer ID (randomized suffix prevents collision when multiple join with same link)
  const sessionPeerIdRef = useRef<string>(
    options.customPeerId || generateUniqueSessionId(roomId, role)
  );

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Media toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);

  // Call timer
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Peer info
  const [peerId, setPeerId] = useState<string | null>(null);

  // WhatsApp-style Audio-Only Fallback & Network Resilience
  const [isVideoPausedForNetwork, setIsVideoPausedForNetwork] = useState(false);
  const [isRemoteVideoPausedForNetwork, setIsRemoteVideoPausedForNetwork] = useState(false);
  const [isSimulatedPoorNetwork, setIsSimulatedPoorNetwork] = useState(false);

  // Mutable refs to prevent stale closure issues in callbacks
  const isVideoPausedForNetworkRef = useRef(false);
  const isSimulatedPoorNetworkRef = useRef(false);
  const isCamOffRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const stableCounterRef = useRef(0);

  const peerRef = useRef<Peer | null>(null);
  const mediaConnsRef = useRef<Map<string, MediaConnection>>(new Map());
  const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const remotePeersRef = useRef<Map<string, RemotePeer>>(new Map());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roomHeartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Call timer                                                       */
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
  /*  Start / Stop Local Media                                         */
  /* ---------------------------------------------------------------- */

  const startLocalMedia = useCallback(
    async (video: boolean = true, audio: boolean = true) => {
      setConnectionState("requesting_media");
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video
            ? {
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
          audio: audio
            ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        setConnectionState("idle");
      } catch (err: any) {
        const msg =
          err.name === "NotAllowedError"
            ? "Camera/mic permission denied. Please allow access."
            : err.name === "NotFoundError"
            ? "No camera or microphone found."
            : `Media error: ${err.message}`;
        setError(msg);
        setConnectionState("error");
      }
    },
    []
  );

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  DataChannel Broadcast Helpers                                    */
  /* ---------------------------------------------------------------- */

  const broadcastDataPayload = useCallback((payload: DataPayload) => {
    dataConnsRef.current.forEach((conn) => {
      if ((conn as any).open) {
        try {
          conn.send(payload);
        } catch (err) {
          console.warn("[DataChannel Broadcast Error]", err);
        }
      }
    });
  }, []);

  const sendNetworkModePayload = useCallback(
    (videoPaused: boolean) => {
      broadcastDataPayload({
        type: "network_mode",
        videoPausedForNetwork: videoPaused,
      });
    },
    [broadcastDataPayload]
  );

  /* ---------------------------------------------------------------- */
  /*  WhatsApp-style Adaptive Resilience & Simulation Toggle           */
  /* ---------------------------------------------------------------- */

  const simulatePoorNetwork = useCallback(
    (enable?: boolean) => {
      const nextState =
        typeof enable === "boolean" ? enable : !isSimulatedPoorNetworkRef.current;
      isSimulatedPoorNetworkRef.current = nextState;
      setIsSimulatedPoorNetwork(nextState);

      if (nextState) {
        setNetworkQuality("poor");
        isVideoPausedForNetworkRef.current = true;
        setIsVideoPausedForNetwork(true);

        // WhatsApp rule: pause video track to preserve audio clarity
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMicMutedRef.current));
        }
        sendNetworkModePayload(true);
      } else {
        stableCounterRef.current = 2; // Immediate restoration
        setNetworkQuality("excellent");
        isVideoPausedForNetworkRef.current = false;
        setIsVideoPausedForNetwork(false);

        if (localStreamRef.current && !isCamOffRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));
        }
        sendNetworkModePayload(false);
      }
    },
    [sendNetworkModePayload]
  );

  /* ---------------------------------------------------------------- */
  /*  Network Quality Monitor (RTCStats)                              */
  /* ---------------------------------------------------------------- */

  const startNetworkMonitor = useCallback(() => {
    if (statsIntervalRef.current) return;

    statsIntervalRef.current = setInterval(async () => {
      try {
        if (mediaConnsRef.current.size === 0) return;

        let worstRTT = 0;
        let worstLossRate = 0;

        for (const call of mediaConnsRef.current.values()) {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          if (!pc) continue;

          const stats = await pc.getStats();
          let roundTripTime = 0;
          let packetsLost = 0;
          let packetsReceived = 0;

          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.currentRoundTripTime) {
              roundTripTime = report.currentRoundTripTime * 1000;
            }
            if (report.type === "inbound-rtp" && report.kind === "video") {
              packetsLost = report.packetsLost || 0;
              packetsReceived = report.packetsReceived || 0;
            }
          });

          const lossRate =
            packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;

          if (roundTripTime > worstRTT) worstRTT = roundTripTime;
          if (lossRate > worstLossRate) worstLossRate = lossRate;
        }

        let quality: NetworkQuality = "excellent";
        if (worstRTT > 300 || worstLossRate > 0.08) {
          quality = "poor";
        } else if (worstRTT > 150 || worstLossRate > 0.04) {
          quality = "fair";
        } else if (worstRTT > 80 || worstLossRate > 0.015) {
          quality = "good";
        }

        if (isSimulatedPoorNetworkRef.current) {
          quality = "poor";
        }

        setNetworkQuality(quality);

        // WhatsApp-style Audio-First Resilience:
        if (quality === "poor") {
          stableCounterRef.current = 0;
          if (!isVideoPausedForNetworkRef.current) {
            console.log(
              "[WebRTC Audio-First] Poor network detected — pausing local video to prioritize uninterrupted audio."
            );
            isVideoPausedForNetworkRef.current = true;
            setIsVideoPausedForNetwork(true);

            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
              localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMicMutedRef.current));
            }

            sendNetworkModePayload(true);
          }
        } else if (quality === "good" || quality === "excellent") {
          stableCounterRef.current += 1;
          if (
            stableCounterRef.current >= 2 &&
            isVideoPausedForNetworkRef.current &&
            !isSimulatedPoorNetworkRef.current
          ) {
            console.log(
              "[WebRTC Audio-First] Network stabilized — automatically restoring video stream."
            );
            isVideoPausedForNetworkRef.current = false;
            setIsVideoPausedForNetwork(false);

            if (localStreamRef.current && !isCamOffRef.current) {
              localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = true));
            }

            sendNetworkModePayload(false);
          }
        } else {
          stableCounterRef.current = 0;
        }
      } catch {
        // Ignore stats fetch error
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
  /*  Data Connection Handler                                          */
  /* ---------------------------------------------------------------- */

  const handleDataConnection = useCallback((conn: DataConnection) => {
    const remoteId = conn.peer;
    dataConnsRef.current.set(remoteId, conn);

    conn.on("open", () => {
      console.log(`[DataChannel] Open with ${remoteId}`);
      if (isVideoPausedForNetworkRef.current) {
        conn.send({
          type: "network_mode",
          videoPausedForNetwork: true,
        });
      }
      if (isCamOffRef.current) {
        conn.send({
          type: "camera_state",
          isCamOff: true,
        });
      }
    });

    conn.on("data", (raw) => {
      const payload = raw as DataPayload;
      if (payload.type === "camera_state") {
        const isOff = Boolean(payload.isCamOff);
        console.log(`[WebRTC] Peer ${remoteId} camera_state isCamOff = ${isOff}`);
        const existing = remotePeersRef.current.get(remoteId);
        if (existing) {
          existing.isCamOff = isOff;
          setRemotePeers(new Map(remotePeersRef.current));
        }
      } else if (payload.type === "network_mode") {
        const isPaused = Boolean(payload.videoPausedForNetwork);
        console.log(`[WebRTC Audio-First] Peer ${remoteId} videoPausedForNetwork = ${isPaused}`);

        const existing = remotePeersRef.current.get(remoteId);
        if (existing) {
          existing.isVideoPausedForNetwork = isPaused;
          setRemotePeers(new Map(remotePeersRef.current));
        }

        // Check if any remote peer has video paused
        const anyRemotePaused = Array.from(remotePeersRef.current.values()).some(
          (p) => p.isVideoPausedForNetwork
        );
        setIsRemoteVideoPausedForNetwork(anyRemotePaused);
      } else if (payload.type === "chat" && payload.message) {
        const msg: ChatMessage = {
          id: payload.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: "remote",
          senderName: payload.senderName,
          text: payload.message,
          timestamp:
            payload.timestamp ||
            new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
        };
        setChatMessages((prev) => [...prev, msg]);
      } else if (payload.type === "typing") {
        setIsRemoteTyping(true);
      } else if (payload.type === "stop_typing") {
        setIsRemoteTyping(false);
      }
    });

    conn.on("close", () => {
      console.log(`[DataChannel] Closed with ${remoteId}`);
      dataConnsRef.current.delete(remoteId);
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Media Connection Handler                                         */
  /* ---------------------------------------------------------------- */

  const handleMediaConnection = useCallback((call: MediaConnection) => {
    const remoteId = call.peer;
    mediaConnsRef.current.set(remoteId, call);

    call.on("stream", (stream) => {
      console.log(`[MediaConnection] Stream received from ${remoteId}`);

      // Parse metadata from peerId if available: smrko-[roomId]-[role]-[suffix]
      const parts = remoteId.split("-");
      const peerRole: "patient" | "doctor" | "guest" =
        parts[2] === "doctor" ? "doctor" : parts[2] === "guest" ? "guest" : "patient";
      const defaultName = peerRole === "doctor" ? "Dr. Sunita Sharma" : "Participant";

      const existing = remotePeersRef.current.get(remoteId);
      remotePeersRef.current.set(remoteId, {
        peerId: remoteId,
        role: existing?.role || peerRole,
        displayName: existing?.displayName || defaultName,
        stream,
        isVideoPausedForNetwork: existing?.isVideoPausedForNetwork || false,
        isMicMuted: existing?.isMicMuted || false,
        isCamOff: existing?.isCamOff || false,
      });

      setRemotePeers(new Map(remotePeersRef.current));
      setConnectionState("connected");
      startCallTimer();
      startNetworkMonitor();
    });

    const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        console.log(`[WebRTC ICE ${remoteId}]`, ice);
        if (ice === "connected" || ice === "completed") {
          setConnectionState("connected");
        } else if (ice === "disconnected") {
          console.warn(`[WebRTC ICE ${remoteId}] Temporarily disconnected; preserving audio`);
          if (pc.restartIce) {
            try {
              pc.restartIce();
            } catch {
              // Ignore
            }
          }
        }
      };
    }

    call.on("close", () => {
      console.log(`[MediaConnection] Call closed from ${remoteId}`);
      mediaConnsRef.current.delete(remoteId);
      remotePeersRef.current.delete(remoteId);
      setRemotePeers(new Map(remotePeersRef.current));

      if (mediaConnsRef.current.size === 0) {
        setConnectionState("waiting");
      }
    });

    call.on("error", (err) => {
      console.warn(`[MediaConnection Error ${remoteId}]`, err);
    });
  }, [startCallTimer, startNetworkMonitor]);

  /* ---------------------------------------------------------------- */
  /*  Connect to a Remote Peer (Outgoing Call)                         */
  /* ---------------------------------------------------------------- */

  const connectToPeer = useCallback(
    (
      targetPeerId: string,
      targetRole?: "patient" | "doctor" | "guest",
      targetDisplayName?: string
    ) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed) return;

      // Prevent redundant outgoing call if already established
      const existingCall = mediaConnsRef.current.get(targetPeerId);
      if (existingCall && (existingCall as any).open) return;

      console.log(`[Mesh Calling] Initiating P2P connection to ${targetPeerId}...`);

      // Pre-register remote peer metadata
      if (targetDisplayName || targetRole) {
        remotePeersRef.current.set(targetPeerId, {
          peerId: targetPeerId,
          role: targetRole || "patient",
          displayName: targetDisplayName || "Participant",
          stream: null,
          isVideoPausedForNetwork: false,
        });
        setRemotePeers(new Map(remotePeersRef.current));
      }

      try {
        // Connect data channel
        const dataConn = peer.connect(targetPeerId, { reliable: true });
        handleDataConnection(dataConn);

        // Call with media
        if (localStreamRef.current) {
          const call = peer.call(targetPeerId, localStreamRef.current);
          if (call) {
            handleMediaConnection(call);
          }
        }
      } catch (err) {
        console.warn(`[PeerJS connectToPeer error ${targetPeerId}]`, err);
      }
    },
    [handleMediaConnection, handleDataConnection]
  );

  /* ---------------------------------------------------------------- */
  /*  Initialize PeerJS Instance                                       */
  /* ---------------------------------------------------------------- */

  const initPeer = useCallback(() => {
    const myId = sessionPeerIdRef.current;

    const peer = new Peer(myId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          { urls: "stun:stun.services.mozilla.com" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
      },
    });

    peer.on("open", (openId) => {
      console.log(`[PeerJS] Initialized with Peer ID: ${openId}`);
      setPeerId(openId);
      setConnectionState("waiting");
    });

    peer.on("error", (err) => {
      if (err.type === "peer-unavailable") {
        // Normal transient state when remote peer hasn't opened socket yet
        return;
      }
      if (err.type === "unavailable-id") {
        console.warn("[PeerJS] Peer ID collision; generating fresh unique ID...");
        sessionPeerIdRef.current = generateUniqueSessionId(roomId, role);
        peer.destroy();
        setTimeout(() => {
          initPeer();
        }, 600);
        return;
      }
      if (err.type === "network" || err.type === "server-error") {
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed && peerRef.current.disconnected) {
            try {
              peerRef.current.reconnect();
            } catch {
              // Ignore
            }
          }
        }, 3000);
        return;
      }
      console.warn(`[PeerJS Notice] ${err.message || err.type}`);
    });

    peer.on("disconnected", () => {
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed && peerRef.current.disconnected) {
          try {
            peerRef.current.reconnect();
          } catch {
            // Ignore
          }
        }
      }, 2000);
    });

    // Listen for incoming calls
    peer.on("call", (call) => {
      console.log(`[PeerJS] Incoming call from ${call.peer}`);
      setConnectionState("connecting");
      // Answer with local stream
      call.answer(localStreamRef.current || undefined);
      handleMediaConnection(call);
    });

    // Listen for incoming data connections
    peer.on("connection", (conn) => {
      console.log(`[PeerJS] Incoming data channel from ${conn.peer}`);
      handleDataConnection(conn);
    });

    peerRef.current = peer;
    return peer;
  }, [roomId, role, handleMediaConnection, handleDataConnection]);

  /* ---------------------------------------------------------------- */
  /*  Room Discovery & Mesh Heartbeat Loop                             */
  /* ---------------------------------------------------------------- */

  const syncRoomRoster = useCallback(async () => {
    const myId = sessionPeerIdRef.current;
    if (!myId || !peerRef.current || peerRef.current.destroyed) return;

    try {
      const res = await fetch("/api/telehealth/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          roomId,
          peerId: myId,
          role,
          displayName,
          isVideoPausedForNetwork: isVideoPausedForNetworkRef.current,
          isMicMuted: isMicMutedRef.current,
          isCamOff: isCamOffRef.current,
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      const activePeers: Array<{
        peerId: string;
        role: "patient" | "doctor" | "guest";
        displayName: string;
        isVideoPausedForNetwork?: boolean;
        isMicMuted?: boolean;
        isCamOff?: boolean;
      }> = data.peers || [];

      // Set of peer IDs currently active in room
      const activePeerIds = new Set(activePeers.map((p) => p.peerId));

      for (const remote of activePeers) {
        // Update metadata
        const existing = remotePeersRef.current.get(remote.peerId);
        if (existing) {
          let changed = false;
          if (existing.displayName !== remote.displayName) {
            existing.displayName = remote.displayName;
            changed = true;
          }
          if (existing.role !== remote.role) {
            existing.role = remote.role;
            changed = true;
          }
          if (existing.isMicMuted !== remote.isMicMuted) {
            existing.isMicMuted = remote.isMicMuted;
            changed = true;
          }
          if (existing.isCamOff !== remote.isCamOff) {
            existing.isCamOff = remote.isCamOff;
            changed = true;
          }
          if (changed) {
            setRemotePeers(new Map(remotePeersRef.current));
          }
        }

        // Glare-free mesh calling:
        // If we do not have an active call with this peer:
        // Compare peer IDs: peer with greater ID initiates call to peer with lesser ID!
        const existingCall = mediaConnsRef.current.get(remote.peerId);
        const isCallOpen = existingCall && (existingCall as any).open;

        if (!isCallOpen && localStreamRef.current) {
          if (myId > remote.peerId) {
            console.log(
              `[Mesh Glare Prevention] (MyID: ${myId} > PeerID: ${remote.peerId}) -> Calling remote peer.`
            );
            connectToPeer(remote.peerId, remote.role, remote.displayName);
          } else {
            console.log(
              `[Mesh Glare Prevention] (MyID: ${myId} < PeerID: ${remote.peerId}) -> Awaiting incoming call.`
            );
          }
        }
      }

      // Cleanup peers who left the room roster
      remotePeersRef.current.forEach((_, pId) => {
        if (!activePeerIds.has(pId)) {
          const call = mediaConnsRef.current.get(pId);
          if (call) call.close();
          const conn = dataConnsRef.current.get(pId);
          if (conn) conn.close();
          mediaConnsRef.current.delete(pId);
          dataConnsRef.current.delete(pId);
          remotePeersRef.current.delete(pId);
          setRemotePeers(new Map(remotePeersRef.current));
        }
      });
    } catch {
      // Ignore background network error
    }
  }, [roomId, role, displayName, connectToPeer]);

  /* ---------------------------------------------------------------- */
  /*  Media Track Toggles                                              */
  /* ---------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isMicMuted;
    isMicMutedRef.current = nextState;
    setIsMicMuted(nextState);

    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextState;
    });
  }, [isMicMuted]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isCamOff;
    isCamOffRef.current = nextState;
    setIsCamOff(nextState);

    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !nextState && !isVideoPausedForNetworkRef.current;
    });

    broadcastDataPayload({
      type: "camera_state",
      isCamOff: nextState,
    });
  }, [isCamOff, broadcastDataPayload]);

  /* ---------------------------------------------------------------- */
  /*  Screen Sharing across all active mesh calls                     */
  /* ---------------------------------------------------------------- */

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share — restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (originalVideoTrackRef.current && localStreamRef.current) {
        mediaConnsRef.current.forEach((call) => {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          const sender = pc?.getSenders()?.find((s) => s.track?.kind === "video");
          if (sender && originalVideoTrackRef.current) {
            sender.replaceTrack(originalVideoTrackRef.current);
          }
        });
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false,
      });
      screenStreamRef.current = screenStream;

      if (localStreamRef.current) {
        originalVideoTrackRef.current =
          localStreamRef.current.getVideoTracks()[0] || null;
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack) {
        mediaConnsRef.current.forEach((call) => {
          const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
          const sender = pc?.getSenders()?.find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      }

      setIsScreenSharing(true);
    } catch {
      // User cancelled picker
    }
  }, [isScreenSharing]);

  /* ---------------------------------------------------------------- */
  /*  Chat Broadcast                                                   */
  /* ---------------------------------------------------------------- */

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const payload: DataPayload = {
        type: "chat",
        message: text.trim(),
        senderName: displayName,
        timestamp,
        id,
      };

      broadcastDataPayload(payload);

      const msg: ChatMessage = {
        id,
        sender: "local",
        senderName: displayName,
        text: text.trim(),
        timestamp,
        status: "sent",
      };
      setChatMessages((prev) => [...prev, msg]);
    },
    [displayName, broadcastDataPayload]
  );

  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      broadcastDataPayload({
        type: isTyping ? "typing" : "stop_typing",
      });
    },
    [broadcastDataPayload]
  );

  /* ---------------------------------------------------------------- */
  /*  Disconnect & Cleanup                                             */
  /* ---------------------------------------------------------------- */

  const disconnect = useCallback(() => {
    stopCallTimer();
    stopNetworkMonitor();

    if (roomHeartbeatRef.current) {
      clearInterval(roomHeartbeatRef.current);
      roomHeartbeatRef.current = null;
    }

    // Notify server of leave
    const myId = sessionPeerIdRef.current;
    if (myId) {
      try {
        fetch("/api/telehealth/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave", roomId, peerId: myId }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Ignore
      }
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    mediaConnsRef.current.forEach((conn) => conn.close());
    mediaConnsRef.current.clear();

    dataConnsRef.current.forEach((conn) => conn.close());
    dataConnsRef.current.clear();

    remotePeersRef.current.clear();
    setRemotePeers(new Map());

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setConnectionState("disconnected");
    setIsScreenSharing(false);
  }, [roomId, stopCallTimer, stopNetworkMonitor]);

  /* ---------------------------------------------------------------- */
  /*  Lifecycle Effects                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!localStreamRef.current) return;
    initPeer();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  useEffect(() => {
    return () => {
      stopLocalMedia();
    };
  }, [stopLocalMedia]);

  // Start periodic room roster sync once peer is ready
  useEffect(() => {
    if (options.disableAutoConnect) return;
    if (!peerId) return;

    syncRoomRoster();
    roomHeartbeatRef.current = setInterval(syncRoomRoster, 2500);

    return () => {
      if (roomHeartbeatRef.current) {
        clearInterval(roomHeartbeatRef.current);
        roomHeartbeatRef.current = null;
      }
    };
  }, [options.disableAutoConnect, peerId, syncRoomRoster]);

  // Backwards compatibility helper values
  const remotePeersList = Array.from(remotePeers.values());
  const firstRemotePeer = remotePeersList[0] || null;
  const remoteStream = firstRemotePeer?.stream || null;
  const remotePeerId = firstRemotePeer?.peerId || null;

  const isAudioOnlyFallback =
    isVideoPausedForNetwork ||
    isRemoteVideoPausedForNetwork ||
    networkQuality === "poor";

  const isRemoteCamOff = Boolean(firstRemotePeer?.isCamOff);

  return {
    localStream,
    remoteStream,
    remotePeers: remotePeersList,
    remotePeersCount: remotePeersList.length,
    connectionState,
    networkQuality,
    isMicMuted,
    isCamOff,
    isRemoteCamOff,
    isScreenSharing,
    isRemoteTyping,
    callDurationSeconds,
    chatMessages,
    peerId,
    remotePeerId,
    error,

    // WhatsApp-style Audio-First Resilience
    isVideoPausedForNetwork,
    isRemoteVideoPausedForNetwork,
    isAudioOnlyFallback,
    isSimulatedPoorNetwork,
    simulatePoorNetwork,

    startLocalMedia,
    stopLocalMedia,
    connectToPeer,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
    sendTypingIndicator,
    disconnect,
  };
}
