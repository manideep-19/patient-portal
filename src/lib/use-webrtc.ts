/**
 * SmrkoMed Telehealth — Multi-Party WebRTC Hook
 *
 * Wraps PeerJS to provide a single React hook for the entire
 * real-time video / audio / chat lifecycle.
 *
 * Supports up to 4 participants in a P2P mesh topology.
 * Each participant maintains a direct PeerConnection to every
 * other participant in the room.
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

/** Per-participant info exposed to the UI */
export interface RemotePeer {
  peerId: string;
  stream: MediaStream | null;
  isCamOff: boolean;
  isMicMuted: boolean;
  isTyping: boolean;
  displayName: string;
}

interface DataPayload {
  type: "chat" | "typing" | "stop_typing" | "media_state" | "room_announce" | "room_peers";
  message?: string;
  timestamp?: string;
  id?: string;
  isCamOff?: boolean;
  isMicMuted?: boolean;
  senderName?: string;
  /** List of peer IDs this participant knows about (for mesh discovery) */
  knownPeers?: string[];
}

export interface UseWebRTCOptions {
  /** Whether this peer is the host (patient), doctor, or an additional guest */
  role: "patient" | "doctor" | "guest";
  /** Display name shown in chat */
  displayName: string;
  /** Optional custom peer ID */
  customPeerId?: string;
  /** Optional target peer ID to auto-connect to */
  targetPeerId?: string;
  /** Disable automatic polling connection to counter-role peer */
  disableAutoConnect?: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  /** @deprecated Use remotePeers instead for multi-party */
  remoteStream: MediaStream | null;
  /** All remote participants with their streams and media states */
  remotePeers: RemotePeer[];
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  /** @deprecated Use remotePeers[].isTyping */
  isRemoteTyping: boolean;
  /** @deprecated Use remotePeers[].isCamOff */
  isRemoteCamOff: boolean;
  /** @deprecated Use remotePeers[].isMicMuted */
  isRemoteMicMuted: boolean;
  callDurationSeconds: number;
  chatMessages: ChatMessage[];
  peerId: string | null;
  /** @deprecated Use remotePeers instead */
  remotePeerId: string | null;
  error: string | null;
  facingMode: "user" | "environment";
  participantCount: number;

  startLocalMedia: (video?: boolean, audio?: boolean) => Promise<void>;
  stopLocalMedia: () => void;
  connectToPeer: (remotePeerId: string) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  sendChatMessage: (text: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  restartConnection: () => void;
  disconnect: () => void;
}

/* ------------------------------------------------------------------ */
/*  Peer ID generator                                                  */
/* ------------------------------------------------------------------ */

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "");
}

function generatePeerId(roomId: string, role: "patient" | "doctor" | "guest"): string {
  if (role === "guest") {
    return `smrko-${sanitizeId(roomId)}-guest-${Math.random().toString(36).slice(2, 7)}`;
  }
  return `smrko-${sanitizeId(roomId)}-${role}`;
}

/**
 * Pretty human-readable fallback name based on peer ID role
 */
function formatPeerDisplayName(peerId: string): string {
  if (peerId.includes("-doctor")) return "Dr. Sunita Sharma (Doctor)";
  if (peerId.includes("-patient")) return "Ananya Sharma (Patient)";
  if (peerId.includes("-guest")) return "Specialist / Guest";
  return peerId;
}

/**
 * Deterministic initiator rule: In any pair of peers, only the higher ID initiates the call.
 * This completely eliminates WebRTC glare and duplicate connection conflicts.
 */
function shouldInitiateCall(myId: string, otherId: string): boolean {
  return myId.localeCompare(otherId) > 0;
}

const MAX_PARTICIPANTS = 4;

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useWebRTC(
  roomId: string,
  options: UseWebRTCOptions
): UseWebRTCReturn {
  const { role, displayName } = options;

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Media toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Call timer
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Peer info
  const [peerId, setPeerId] = useState<string | null>(null);

  // Camera facing mode (front / rear for mobile devices)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const facingModeRef = useRef<"user" | "environment">("user");

  // ---- Multi-peer state ----
  // Map of remotePeerId -> RemotePeer state (re-rendered via version counter)
  const remotePeersMapRef = useRef<Map<string, RemotePeer>>(new Map());
  const [remotePeersVersion, setRemotePeersVersion] = useState(0);
  const bumpPeers = useCallback(() => setRemotePeersVersion((v) => v + 1), []);

  // Map of remotePeerId -> MediaConnection
  const mediaConnsRef = useRef<Map<string, MediaConnection>>(new Map());
  // Map of remotePeerId -> DataConnection
  const dataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  // Set of peer IDs we've already attempted to connect to (prevent duplicates)
  const connectingToPeersRef = useRef<Set<string>>(new Set());

  // Refs for cleanup
  const peerRef = useRef<Peer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const disconnectGraceTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Backward compat refs
  const isCamOffRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const displayNameRef = useRef(displayName);

  // Keep refs in sync
  isCamOffRef.current = isCamOff;
  isMicMutedRef.current = isMicMuted;
  displayNameRef.current = displayName;

  /* ---------------------------------------------------------------- */
  /*  Derived state for backward compatibility                         */
  /* ---------------------------------------------------------------- */

  const remotePeers = Array.from(remotePeersMapRef.current.values());
  const firstRemote = remotePeers[0] ?? null;

  // Backward compat single-peer fields
  const remoteStream = firstRemote?.stream ?? null;
  const remotePeerId = firstRemote?.peerId ?? null;
  const isRemoteTyping = remotePeers.some((p) => p.isTyping);
  const isRemoteCamOff = firstRemote?.isCamOff ?? false;
  const isRemoteMicMuted = firstRemote?.isMicMuted ?? false;
  const participantCount = 1 + remotePeers.length; // self + remotes

  /* ---------------------------------------------------------------- */
  /*  Start local media (camera + mic)                                 */
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

  /* ---------------------------------------------------------------- */
  /*  Stop local media                                                 */
  /* ---------------------------------------------------------------- */

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Call timer & network monitor helpers                             */
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

  const startNetworkMonitor = useCallback((call: MediaConnection) => {
    if (statsIntervalRef.current) return;

    statsIntervalRef.current = setInterval(async () => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        if (!pc) return;

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
          packetsReceived > 0
            ? packetsLost / (packetsLost + packetsReceived)
            : 0;

        let quality: NetworkQuality = "excellent";
        if (roundTripTime > 300 || lossRate > 0.1) quality = "poor";
        else if (roundTripTime > 150 || lossRate > 0.05) quality = "fair";
        else if (roundTripTime > 80 || lossRate > 0.02) quality = "good";

        setNetworkQuality(quality);
      } catch {
        // Stats not available
      }
    }, 3000);
  }, []);

  const stopNetworkMonitor = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Broadcast to all connected data channels                         */
  /* ---------------------------------------------------------------- */

  const broadcastData = useCallback((payload: DataPayload) => {
    dataConnsRef.current.forEach((conn) => {
      if ((conn as any).open) {
        try {
          conn.send(payload);
        } catch {
          // channel closed
        }
      }
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Send media state to all peers                                    */
  /* ---------------------------------------------------------------- */

  const sendMediaState = useCallback(
    (camOff: boolean, micMuted: boolean) => {
      broadcastData({
        type: "media_state",
        isCamOff: camOff,
        isMicMuted: micMuted,
        senderName: displayNameRef.current,
      });
    },
    [broadcastData]
  );

  /* ---------------------------------------------------------------- */
  /*  Handle media connection (incoming or outgoing call)              */
  /* ---------------------------------------------------------------- */

  const handleMediaConnection = useCallback((call: MediaConnection) => {
    const remotePId = call.peer;

    // If we already have an active call to this peer, skip
    const existing = mediaConnsRef.current.get(remotePId);
    if (existing && (existing as any).open && existing !== call) {
      console.log(`[MediaConnection] Already connected to ${remotePId}, ignoring duplicate`);
      return;
    }
    mediaConnsRef.current.set(remotePId, call);

    call.on("stream", (stream) => {
      // Clear grace timeout for this peer
      const graceTimeout = disconnectGraceTimeoutsRef.current.get(remotePId);
      if (graceTimeout) {
        clearTimeout(graceTimeout);
        disconnectGraceTimeoutsRef.current.delete(remotePId);
      }

      // Update remote peer state
      const existing = remotePeersMapRef.current.get(remotePId);
      const meta = (call as any).metadata;
      remotePeersMapRef.current.set(remotePId, {
        peerId: remotePId,
        stream,
        isCamOff: typeof meta?.isCamOff === "boolean" ? meta.isCamOff : (existing?.isCamOff ?? false),
        isMicMuted: typeof meta?.isMicMuted === "boolean" ? meta.isMicMuted : (existing?.isMicMuted ?? false),
        isTyping: existing?.isTyping ?? false,
        displayName: existing?.displayName && !existing.displayName.startsWith("smrko-")
          ? existing.displayName
          : (meta?.displayName || formatPeerDisplayName(remotePId)),
      });
      bumpPeers();
      setConnectionState("connected");
      startCallTimer();
      startNetworkMonitor(call);
    });

    // Monitor underlying RTCPeerConnection ICE state for stability
    const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        console.log(`[WebRTC ICE State] ${remotePId}:`, ice);
        if (ice === "connected" || ice === "completed") {
          // Check if any peer is connected
          if (remotePeersMapRef.current.size > 0) {
            setConnectionState("connected");
          }
          const graceTimeout = disconnectGraceTimeoutsRef.current.get(remotePId);
          if (graceTimeout) {
            clearTimeout(graceTimeout);
            disconnectGraceTimeoutsRef.current.delete(remotePId);
          }
        } else if (ice === "disconnected") {
          console.warn(`[WebRTC] ICE temporarily disconnected for ${remotePId}, allowing candidate recovery...`);
          if (!disconnectGraceTimeoutsRef.current.has(remotePId)) {
            const timeout = setTimeout(() => {
              if (
                pc.iceConnectionState === "disconnected" ||
                pc.iceConnectionState === "failed"
              ) {
                // Only show reconnecting if ALL peers are disconnected
                const anyConnected = Array.from(mediaConnsRef.current.entries()).some(
                  ([pid, conn]) =>
                    pid !== remotePId &&
                    ((conn as any).peerConnection as RTCPeerConnection | undefined)?.iceConnectionState === "connected"
                );
                if (!anyConnected) {
                  setConnectionState("reconnecting");
                }
              }
              disconnectGraceTimeoutsRef.current.delete(remotePId);
            }, 3500);
            disconnectGraceTimeoutsRef.current.set(remotePId, timeout);
          }
        } else if (ice === "failed") {
          console.warn(`[WebRTC] ICE failed for ${remotePId}`);
        }
      };
    }

    call.on("close", () => {
      if (!disconnectGraceTimeoutsRef.current.has(remotePId)) {
        const timeout = setTimeout(() => {
          // Remove this peer
          remotePeersMapRef.current.delete(remotePId);
          mediaConnsRef.current.delete(remotePId);
          connectingToPeersRef.current.delete(remotePId);
          bumpPeers();

          // If no peers left, set disconnected
          if (remotePeersMapRef.current.size === 0) {
            setConnectionState("disconnected");
            stopCallTimer();
            stopNetworkMonitor();
          }
        }, 3000);
        disconnectGraceTimeoutsRef.current.set(remotePId, timeout);
      }
    });

    call.on("error", (err) => {
      console.error(`[MediaConnection Error] ${remotePId}:`, err);
    });
  }, [startCallTimer, startNetworkMonitor, stopCallTimer, stopNetworkMonitor, bumpPeers]);

  /* ---------------------------------------------------------------- */
  /*  Handle data connection (chat & media status channel)             */
  /* ---------------------------------------------------------------- */

  // Forward declaration for connectToPeer so handleDataConnection can reference it
  const connectToPeerRef = useRef<(targetPeerId: string) => void>(() => {});

  const handleDataConnection = useCallback(
    (conn: DataConnection) => {
      const remotePId = conn.peer;
      dataConnsRef.current.set(remotePId, conn);

      conn.on("open", () => {
        console.log(`[DataChannel] Open with ${remotePId}`);
        // Sync media state immediately on connection open
        if ((conn as any).open) {
          conn.send({
            type: "media_state",
            isCamOff: isCamOffRef.current,
            isMicMuted: isMicMutedRef.current,
            senderName: displayNameRef.current,
          } as DataPayload);
        }

        // Announce ourselves and share known peers for mesh discovery
        if ((conn as any).open) {
          const knownPeers = Array.from(remotePeersMapRef.current.keys());
          conn.send({
            type: "room_announce",
            senderName: displayNameRef.current,
            knownPeers,
          } as DataPayload);

          // Broadcast updated known peer list to ALL connected peers
          const allKnown = Array.from(remotePeersMapRef.current.keys());
          if (!allKnown.includes(remotePId)) allKnown.push(remotePId);
          broadcastData({
            type: "room_peers",
            knownPeers: allKnown,
            senderName: displayNameRef.current,
          });
        }
      });

      conn.on("data", (raw) => {
        const payload = raw as DataPayload;

        if (payload.type === "media_state") {
          const existing = remotePeersMapRef.current.get(remotePId);
          remotePeersMapRef.current.set(remotePId, {
            peerId: remotePId,
            stream: existing?.stream ?? null,
            isCamOff: typeof payload.isCamOff === "boolean" ? payload.isCamOff : (existing?.isCamOff ?? false),
            isMicMuted: typeof payload.isMicMuted === "boolean" ? payload.isMicMuted : (existing?.isMicMuted ?? false),
            isTyping: existing?.isTyping ?? false,
            displayName: payload.senderName || existing?.displayName || remotePId,
          });
          bumpPeers();
        } else if (payload.type === "chat" && payload.message) {
          const msg: ChatMessage = {
            id: payload.id || `msg-${Date.now()}`,
            sender: "remote",
            senderName: payload.senderName || remotePId,
            text: payload.message,
            timestamp:
              payload.timestamp ||
              new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "delivered",
          };
          setChatMessages((prev) => [...prev, msg]);
        } else if (payload.type === "typing") {
          const existing = remotePeersMapRef.current.get(remotePId);
          if (existing) {
            existing.isTyping = true;
            bumpPeers();
          }
        } else if (payload.type === "stop_typing") {
          const existing = remotePeersMapRef.current.get(remotePId);
          if (existing) {
            existing.isTyping = false;
            bumpPeers();
          }
        } else if (payload.type === "room_announce" || payload.type === "room_peers") {
          // Mesh discovery: connect to any peers we don't know about yet
          const discoveredPeers = payload.knownPeers || [];
          const myId = peerRef.current?.id;
          if (myId && discoveredPeers.length > 0) {
            for (const pid of discoveredPeers) {
              if (
                pid !== myId &&
                !remotePeersMapRef.current.has(pid) &&
                !connectingToPeersRef.current.has(pid) &&
                remotePeersMapRef.current.size < MAX_PARTICIPANTS - 1
              ) {
                // Glare avoidance: higher ID initiates connection
                if (myId.localeCompare(pid) > 0) {
                  console.log(`[Mesh Discovery] Higher ID initiates call to ${pid}`);
                  connectingToPeersRef.current.add(pid);
                  setTimeout(() => {
                    connectToPeerRef.current(pid);
                  }, 400 + Math.random() * 400);
                } else {
                  // Fallback: if after 4 seconds lower ID still not called, lower ID attempts
                  setTimeout(() => {
                    if (
                      !remotePeersMapRef.current.has(pid) &&
                      !connectingToPeersRef.current.has(pid) &&
                      remotePeersMapRef.current.size < MAX_PARTICIPANTS - 1
                    ) {
                      console.log(`[Mesh Discovery] Fallback initiating call to ${pid}`);
                      connectingToPeersRef.current.add(pid);
                      connectToPeerRef.current(pid);
                    }
                  }, 3500 + Math.random() * 500);
                }
              }
            }
          }

          // Update display name
          if (payload.senderName) {
            const existing = remotePeersMapRef.current.get(remotePId);
            if (existing) {
              existing.displayName = payload.senderName;
              bumpPeers();
            }
          }
        }
      });

      conn.on("close", () => {
        console.log(`[DataChannel] Closed with ${remotePId}`);
        dataConnsRef.current.delete(remotePId);
      });
    },
    [bumpPeers]
  );

  /* ---------------------------------------------------------------- */
  /*  Connect to a remote peer (outgoing call)                         */
  /* ---------------------------------------------------------------- */

  const connectToPeer = useCallback(
    (targetPeerId: string) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed) return;
      if (remotePeersMapRef.current.size >= MAX_PARTICIPANTS - 1) {
        console.log("[WebRTC] Max participants reached, ignoring new connection.");
        return;
      }

      // Skip if already have active connection to this peer
      const existingMedia = mediaConnsRef.current.get(targetPeerId);
      if (existingMedia && (existingMedia as any).open) return;

      connectingToPeersRef.current.add(targetPeerId);

      try {
        // Establish data channel first
        if (!dataConnsRef.current.has(targetPeerId)) {
          const dataConn = peer.connect(targetPeerId, { reliable: true });
          handleDataConnection(dataConn);
        }

        // Then call with media and metadata if local stream exists
        if (localStreamRef.current) {
          const call = peer.call(targetPeerId, localStreamRef.current, {
            metadata: {
              displayName: displayNameRef.current,
              isCamOff: isCamOffRef.current,
              isMicMuted: isMicMutedRef.current,
            },
          });
          if (call) {
            handleMediaConnection(call);
          }
        }
      } catch (err) {
        console.log("[PeerJS connect error]", err);
        connectingToPeersRef.current.delete(targetPeerId);
      }
    },
    [handleMediaConnection, handleDataConnection, bumpPeers]
  );

  // Keep the ref in sync for mesh discovery callback
  connectToPeerRef.current = connectToPeer;

  /* ---------------------------------------------------------------- */
  /*  Initialize Peer & listen for incoming calls                      */
  /* ---------------------------------------------------------------- */

  const initPeer = useCallback((customId?: string) => {
    const id = customId || options.customPeerId || generatePeerId(roomId, role);

    const peer = new Peer(id, {
      debug: 1,
      config: {
        iceServers: [
          // STUN: Fast, reliable global Google & Twilio STUN cluster
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
          { urls: "stun:stun.services.mozilla.com" },

          // Optional custom production TURN credentials via environment variables:
          ...(typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TURN_URL
            ? [
                {
                  urls: process.env.NEXT_PUBLIC_TURN_URL.split(","),
                  username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
                  credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
                },
              ]
            : []),
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all" as RTCIceTransportPolicy,
      },
    });

    peer.on("open", (openId) => {
      setPeerId(openId);
      setConnectionState("waiting");
    });

    peer.on("error", (err) => {
      console.error("[PeerJS Error]", err);
      if (err.type === "unavailable-id") {
        console.warn("[PeerJS] ID taken, generating alternate ID...");
        const altId = `${id}-${Math.random().toString(36).slice(2, 6)}`;
        peer.destroy();
        setTimeout(() => {
          initPeer(altId);
        }, 800);
        return;
      }
      if (err.type === "peer-unavailable") {
        // Expected when other peer has not yet connected; do not set error
        console.log("[PeerJS] Remote peer not yet online; waiting...");
      } else if (err.type === "network" || err.type === "server-error") {
        // Signaling server connection dropped; attempt background socket reconnect
        setTimeout(() => {
          if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.open) {
            peerRef.current.reconnect();
          }
        }, 3000);
      } else {
        console.warn(`[PeerJS Notice] ${err.message}`);
      }
    });

    peer.on("disconnected", () => {
      // Signaling socket lost, but P2P media stream is direct and often still running!
      console.log("[PeerJS] Signaling server socket disconnected, reconnecting in background...");
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.open) {
          peerRef.current.reconnect();
        }
      }, 1500);
    });

    // Listen for incoming calls — accept from any peer up to MAX_PARTICIPANTS
    peer.on("call", (call) => {
      const incomingPeerId = call.peer;

      // Check participant limit
      if (remotePeersMapRef.current.size >= MAX_PARTICIPANTS - 1) {
        console.log(`[PeerJS] Max participants reached, rejecting call from ${incomingPeerId}`);
        return;
      }

      // If we already have an active call to this peer, ignore duplicate
      const existingMedia = mediaConnsRef.current.get(incomingPeerId);
      if (existingMedia && (existingMedia as any).open && existingMedia !== call) {
        console.log(`[PeerJS] Already connected to ${incomingPeerId}, ignoring duplicate incoming call`);
        return;
      }

      // Pre-seed entry with caller metadata if available
      const meta = (call as any).metadata;
      if (meta?.displayName) {
        const existing = remotePeersMapRef.current.get(incomingPeerId);
        remotePeersMapRef.current.set(incomingPeerId, {
          peerId: incomingPeerId,
          stream: existing?.stream ?? null,
          isCamOff: meta.isCamOff ?? existing?.isCamOff ?? false,
          isMicMuted: meta.isMicMuted ?? existing?.isMicMuted ?? false,
          isTyping: false,
          displayName: meta.displayName,
        });
        bumpPeers();
      }

      // Ensure data connection back to caller if missing
      if (!dataConnsRef.current.has(incomingPeerId) && peerRef.current) {
        const dataConn = peerRef.current.connect(incomingPeerId, { reliable: true });
        handleDataConnection(dataConn);
      }

      setConnectionState("connecting");
      // Answer with our local stream
      call.answer(localStreamRef.current || undefined);
      handleMediaConnection(call);
    });

    // Listen for incoming data connections
    peer.on("connection", (conn) => {
      handleDataConnection(conn);
    });

    peerRef.current = peer;
    return peer;
  }, [roomId, role, options.customPeerId]);

  /* ---------------------------------------------------------------- */
  /*  Toggle mic / camera                                              */
  /* ---------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const next = !isMicMuted;
    audioTracks.forEach((t) => {
      t.enabled = !next;
    });
    setIsMicMuted(next);
    sendMediaState(isCamOff, next);
  }, [isMicMuted, isCamOff, sendMediaState]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    const next = !isCamOff;
    videoTracks.forEach((t) => {
      t.enabled = !next;
    });
    setIsCamOff(next);
    sendMediaState(next, isMicMuted);
  }, [isCamOff, isMicMuted, sendMediaState]);

  /* ---------------------------------------------------------------- */
  /*  Switch Camera (Front / Rear on mobile & tablets)                 */
  /* ---------------------------------------------------------------- */

  const switchCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    const nextMode = facingModeRef.current === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

        // Replace track in ALL peer connections
        mediaConnsRef.current.forEach((mediaConn) => {
          const sender = (mediaConn as any).peerConnection
            ?.getSenders()
            ?.find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(() => {});
          }
        });

        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      facingModeRef.current = nextMode;
      setFacingMode(nextMode);
    } catch (err: any) {
      console.warn("[switchCamera] Failed to switch camera:", err);
      throw err;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Screen sharing                                                   */
  /* ---------------------------------------------------------------- */

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share — restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (originalVideoTrackRef.current && localStreamRef.current) {
        // Replace track in ALL peer connections
        mediaConnsRef.current.forEach((mediaConn) => {
          const sender = (mediaConn as any).peerConnection
            ?.getSenders()
            ?.find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender && originalVideoTrackRef.current) {
            sender.replaceTrack(originalVideoTrackRef.current).catch(() => {});
          }
        });
      }
      setIsScreenSharing(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported on mobile browsers (supported on desktop Chrome, Edge, Safari, Firefox).");
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false,
      });
      screenStreamRef.current = screenStream;

      // Save original camera track
      if (localStreamRef.current) {
        originalVideoTrackRef.current =
          localStreamRef.current.getVideoTracks()[0] || null;
      }

      // Replace the video track in ALL peer connections
      const screenTrack = screenStream.getVideoTracks()[0]!;
      mediaConnsRef.current.forEach((mediaConn) => {
        const sender = (mediaConn as any).peerConnection
          ?.getSenders()
          ?.find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack).catch(() => {});
        }
      });

      // When user stops sharing via browser UI
      screenTrack.onended = () => {
        toggleScreenShare();
      };

      setIsScreenSharing(true);
    } catch (err: any) {
      // User cancelled or browser rejected
      if (err?.name !== "NotAllowedError") {
        throw err;
      }
    }
  }, [isScreenSharing]);

  /* ---------------------------------------------------------------- */
  /*  Chat                                                             */
  /* ---------------------------------------------------------------- */

  const sendChatMessage = useCallback(
    (text: string) => {
      if (dataConnsRef.current.size === 0 || !text.trim()) return;

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

      const payload: DataPayload = {
        type: "chat",
        message: text.trim(),
        timestamp,
        id,
        senderName: displayNameRef.current,
      };
      broadcastData(payload);

      const msg: ChatMessage = {
        id,
        sender: "local",
        senderName: displayNameRef.current,
        text: text.trim(),
        timestamp,
        status: "sent",
      };
      setChatMessages((prev) => [...prev, msg]);
    },
    [broadcastData]
  );

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    const payload: DataPayload = {
      type: isTyping ? "typing" : "stop_typing",
      senderName: displayNameRef.current,
    };
    broadcastData(payload);
  }, [broadcastData]);

  /* ---------------------------------------------------------------- */
  /*  Disconnect & cleanup                                             */
  /* ---------------------------------------------------------------- */

  const disconnect = useCallback(() => {
    stopCallTimer();
    stopNetworkMonitor();

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Close all media connections
    mediaConnsRef.current.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    mediaConnsRef.current.clear();

    // Close all data connections
    dataConnsRef.current.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    dataConnsRef.current.clear();

    // Clear grace timeouts
    disconnectGraceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    disconnectGraceTimeoutsRef.current.clear();

    // Clear connecting set
    connectingToPeersRef.current.clear();

    // Clear remote peers
    remotePeersMapRef.current.clear();
    bumpPeers();

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setConnectionState("disconnected");
    setIsScreenSharing(false);
  }, [stopCallTimer, stopNetworkMonitor, bumpPeers]);

  /* ---------------------------------------------------------------- */
  /*  Initialize peer on mount, cleanup on unmount                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    // Only init after local media is ready
    if (!localStreamRef.current) return;

    initPeer();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  // Cleanup local media on unmount
  useEffect(() => {
    return () => {
      stopLocalMedia();
    };
  }, [stopLocalMedia]);

  // Auto-connect loop to discover and connect with counter-role peer
  useEffect(() => {
    if (options.disableAutoConnect) return;
    if (connectionState !== "waiting" || !localStream) return;

    // Don't auto-connect if we already have connections
    if (remotePeersMapRef.current.size > 0) return;

    const targets = options.targetPeerId
      ? [options.targetPeerId]
      : role === "guest"
      ? [
          `smrko-${sanitizeId(roomId)}-doctor`,
          `smrko-${sanitizeId(roomId)}-patient`,
        ]
      : [`smrko-${sanitizeId(roomId)}-${role === "doctor" ? "patient" : "doctor"}`];

    // Doctor & Guest initiate quickly; Patient waits 6s as fallback to prevent call glare
    const initialDelay = role === "patient" ? 6000 : 700;

    let timer: NodeJS.Timeout | null = null;
    const initial = setTimeout(() => {
      const myId = peerRef.current?.id;
      if (
        peerRef.current &&
        !peerRef.current.destroyed &&
        connectionState === "waiting" &&
        remotePeersMapRef.current.size === 0
      ) {
        targets.forEach((t) => {
          // If my ID > target ID, I initiate the call
          if (!myId || shouldInitiateCall(myId, t)) {
            connectToPeer(t);
          } else {
            console.log(`[AutoConnect] Lower ID ${myId} waiting for ${t} to initiate call...`);
          }
        });
      }

      timer = setInterval(() => {
        const curMyId = peerRef.current?.id;
        if (
          peerRef.current &&
          !peerRef.current.destroyed &&
          connectionState === "waiting" &&
          remotePeersMapRef.current.size === 0
        ) {
          targets.forEach((t) => {
            if (!curMyId || shouldInitiateCall(curMyId, t)) {
              connectToPeer(t);
            }
          });
        }
      }, 4000);
    }, initialDelay);

    return () => {
      if (timer) clearInterval(timer);
      clearTimeout(initial);
    };
  }, [
    connectionState,
    localStream,
    options.disableAutoConnect,
    options.targetPeerId,
    roomId,
    role,
    connectToPeer,
  ]);

  /* ---------------------------------------------------------------- */
  /*  Manual Restart Connection                                        */
  /* ---------------------------------------------------------------- */

  const restartConnection = useCallback(() => {
    console.log("[WebRTC] Clean reconnect triggered...");
    setConnectionState("reconnecting");

    // Close all media connections
    mediaConnsRef.current.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    mediaConnsRef.current.clear();
    connectingToPeersRef.current.clear();

    // Reconnect to all known peers after a brief delay
    const knownPeerIds = Array.from(remotePeersMapRef.current.keys());
    const targetId =
      options.targetPeerId ||
      `smrko-${sanitizeId(roomId)}-${role === "doctor" ? "patient" : "doctor"}`;

    const peersToReconnect = knownPeerIds.length > 0 ? knownPeerIds : [targetId];

    if (peerRef.current && !peerRef.current.destroyed) {
      setTimeout(() => {
        peersToReconnect.forEach((pid, i) => {
          setTimeout(() => {
            connectToPeer(pid);
          }, i * 300);
        });
      }, 400);
    }
  }, [options.targetPeerId, roomId, role, connectToPeer]);

  return {
    localStream,
    remoteStream,
    remotePeers,
    connectionState,
    networkQuality,
    isMicMuted,
    isCamOff,
    isScreenSharing,
    isRemoteTyping,
    isRemoteCamOff,
    isRemoteMicMuted,
    callDurationSeconds,
    chatMessages,
    peerId,
    remotePeerId,
    error,
    facingMode,
    participantCount,
    startLocalMedia,
    stopLocalMedia,
    connectToPeer,
    toggleMic,
    toggleCamera,
    switchCamera,
    toggleScreenShare,
    sendChatMessage,
    sendTypingIndicator,
    restartConnection,
    disconnect,
  };
}
