/**
 * SmrkoMed Telehealth — WebRTC Hook
 *
 * Wraps PeerJS to provide a single React hook for the entire
 * real-time video / audio / chat lifecycle.
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
  text: string;
  timestamp: string;
  status: "sent" | "delivered";
}

interface DataPayload {
  type: "chat" | "typing" | "stop_typing" | "media_state";
  message?: string;
  timestamp?: string;
  id?: string;
  isCamOff?: boolean;
  isMicMuted?: boolean;
}

export interface UseWebRTCOptions {
  /** Whether this peer is the host (patient) or the joiner (doctor) */
  role: "patient" | "doctor";
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
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isMicMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  isRemoteTyping: boolean;
  isRemoteCamOff: boolean;
  isRemoteMicMuted: boolean;
  callDurationSeconds: number;
  chatMessages: ChatMessage[];
  peerId: string | null;
  remotePeerId: string | null;
  error: string | null;
  facingMode: "user" | "environment";

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

function generatePeerId(roomId: string, role: "patient" | "doctor"): string {
  return `smrko-${sanitizeId(roomId)}-${role}`;
}

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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("unknown");
  const [error, setError] = useState<string | null>(null);

  // Media toggles
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isRemoteMicMuted, setIsRemoteMicMuted] = useState(false);

  // Call timer
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Peer info
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

  // Camera facing mode (front / rear for mobile devices)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const facingModeRef = useRef<"user" | "environment">("user");

  // Refs for cleanup
  const peerRef = useRef<Peer | null>(null);
  const mediaConnRef = useRef<MediaConnection | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const disconnectGraceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        iceTransportPolicy: "all",
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

    // Listen for incoming calls (patient waits, doctor may also wait)
    peer.on("call", (call) => {
      // If we already have an active call open, ignore duplicate offer
      if (
        mediaConnRef.current &&
        (mediaConnRef.current as any).open &&
        mediaConnRef.current !== call
      ) {
        console.log("[PeerJS] Already in active call, ignoring duplicate incoming call");
        return;
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
  /*  Handle media connection (incoming or outgoing call)              */
  /* ---------------------------------------------------------------- */

  const handleMediaConnection = useCallback((call: MediaConnection) => {
    // Prevent replacing an existing active call
    if (
      mediaConnRef.current &&
      (mediaConnRef.current as any).open &&
      mediaConnRef.current !== call
    ) {
      console.log("[MediaConnection] Maintaining current active call, ignoring duplicate");
      return;
    }
    mediaConnRef.current = call;

    call.on("stream", (stream) => {
      if (disconnectGraceTimeoutRef.current) {
        clearTimeout(disconnectGraceTimeoutRef.current);
        disconnectGraceTimeoutRef.current = null;
      }
      setRemoteStream(stream);
      setRemotePeerId(call.peer);
      setConnectionState("connected");
      startCallTimer();
      startNetworkMonitor(call);
    });

    // Monitor underlying RTCPeerConnection ICE state for stability
    const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        console.log("[WebRTC ICE State]", ice);
        if (ice === "connected" || ice === "completed") {
          setConnectionState("connected");
          if (disconnectGraceTimeoutRef.current) {
            clearTimeout(disconnectGraceTimeoutRef.current);
            disconnectGraceTimeoutRef.current = null;
          }
        } else if (ice === "disconnected") {
          console.warn("[WebRTC] ICE temporarily disconnected, allowing candidate recovery...");
          if (!disconnectGraceTimeoutRef.current) {
            disconnectGraceTimeoutRef.current = setTimeout(() => {
              if (
                pc.iceConnectionState === "disconnected" ||
                pc.iceConnectionState === "failed"
              ) {
                setConnectionState("reconnecting");
              }
            }, 3500);
          }
        } else if (ice === "failed") {
          console.warn("[WebRTC] ICE failed");
          setConnectionState("reconnecting");
        }
      };
    }

    call.on("close", () => {
      if (!disconnectGraceTimeoutRef.current) {
        disconnectGraceTimeoutRef.current = setTimeout(() => {
          setRemoteStream(null);
          setConnectionState("disconnected");
          stopCallTimer();
          stopNetworkMonitor();
        }, 3000);
      }
    });

    call.on("error", (err) => {
      console.error("[MediaConnection Error]", err);
    });
  }, [startCallTimer, startNetworkMonitor, stopCallTimer, stopNetworkMonitor]);

  const sendMediaState = useCallback(
    (camOff: boolean, micMuted: boolean) => {
      if (dataConnRef.current && (dataConnRef.current as any).open) {
        dataConnRef.current.send({
          type: "media_state",
          isCamOff: camOff,
          isMicMuted: micMuted,
        });
      }
    },
    []
  );

  /* ---------------------------------------------------------------- */
  /*  Handle data connection (chat & media status channel)             */
  /* ---------------------------------------------------------------- */

  const handleDataConnection = useCallback(
    (conn: DataConnection) => {
      dataConnRef.current = conn;

      conn.on("open", () => {
        console.log("[DataChannel] Open");
        // Sync media state immediately on connection open
        sendMediaState(isCamOff, isMicMuted);
      });

      conn.on("data", (raw) => {
        const payload = raw as DataPayload;
        if (payload.type === "media_state") {
          if (typeof payload.isCamOff === "boolean") {
            setIsRemoteCamOff(payload.isCamOff);
          }
          if (typeof payload.isMicMuted === "boolean") {
            setIsRemoteMicMuted(payload.isMicMuted);
          }
        } else if (payload.type === "chat" && payload.message) {
          const msg: ChatMessage = {
            id: payload.id || `msg-${Date.now()}`,
            sender: "remote",
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
        console.log("[DataChannel] Closed");
      });
    },
    [isCamOff, isMicMuted, sendMediaState]
  );

  /* ---------------------------------------------------------------- */
  /*  Connect to a remote peer (outgoing call)                         */
  /* ---------------------------------------------------------------- */

  const connectToPeer = useCallback(
    (targetPeerId: string) => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed) return;
      if (mediaConnRef.current && (mediaConnRef.current as any).open) return;

      setRemotePeerId(targetPeerId);

      try {
        // Establish data channel first
        const dataConn = peer.connect(targetPeerId, { reliable: true });
        handleDataConnection(dataConn);

        // Then call with media if local stream exists
        if (localStreamRef.current) {
          const call = peer.call(targetPeerId, localStreamRef.current);
          if (call) {
            handleMediaConnection(call);
          }
        }
      } catch (err) {
        console.log("[PeerJS connect error]", err);
      }
    },
    [handleMediaConnection, handleDataConnection]
  );

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

        if (mediaConnRef.current) {
          const sender = (mediaConnRef.current as any).peerConnection
            ?.getSenders()
            ?.find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }

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
      if (
        originalVideoTrackRef.current &&
        localStreamRef.current &&
        mediaConnRef.current
      ) {
        const sender = (mediaConnRef.current as any).peerConnection
          ?.getSenders()
          ?.find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(originalVideoTrackRef.current);
        }
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

      // Replace the video track in the peer connection
      const screenTrack = screenStream.getVideoTracks()[0]!;
      if (mediaConnRef.current) {
        const sender = (mediaConnRef.current as any).peerConnection
          ?.getSenders()
          ?.find((s: RTCRtpSender) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
      }

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
      if (!dataConnRef.current || !text.trim()) return;

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
      };
      dataConnRef.current.send(payload);

      const msg: ChatMessage = {
        id,
        sender: "local",
        text: text.trim(),
        timestamp,
        status: "sent",
      };
      setChatMessages((prev) => [...prev, msg]);
    },
    []
  );

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!dataConnRef.current) return;
    const payload: DataPayload = {
      type: isTyping ? "typing" : "stop_typing",
    };
    dataConnRef.current.send(payload);
  }, []);



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

    if (mediaConnRef.current) {
      mediaConnRef.current.close();
      mediaConnRef.current = null;
    }

    if (dataConnRef.current) {
      dataConnRef.current.close();
      dataConnRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setRemoteStream(null);
    setRemotePeerId(null);
    setConnectionState("disconnected");
    setIsScreenSharing(false);
  }, [stopCallTimer, stopNetworkMonitor]);

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
    if (mediaConnRef.current && (mediaConnRef.current as any).open) return;

    const targetId =
      options.targetPeerId ||
      `smrko-${sanitizeId(roomId)}-${role === "doctor" ? "patient" : "doctor"}`;

    // Doctor initiates immediately; Patient waits 6s as fallback to prevent call glare
    const initialDelay = role === "doctor" ? 600 : 6000;

    let timer: NodeJS.Timeout | null = null;
    const initial = setTimeout(() => {
      if (
        peerRef.current &&
        !peerRef.current.destroyed &&
        connectionState === "waiting" &&
        !mediaConnRef.current
      ) {
        connectToPeer(targetId);
      }

      timer = setInterval(() => {
        if (
          peerRef.current &&
          !peerRef.current.destroyed &&
          connectionState === "waiting" &&
          !mediaConnRef.current
        ) {
          connectToPeer(targetId);
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
  /*  Manual Restart Connection (Re-sync stream & ICE restart)          */
  /* ---------------------------------------------------------------- */

  const restartConnection = useCallback(() => {
    console.log("[WebRTC] Clean reconnect triggered...");
    setConnectionState("reconnecting");
    if (mediaConnRef.current) {
      try {
        mediaConnRef.current.close();
      } catch (e) {
        console.warn("[restartConnection] Error closing old mediaConn:", e);
      }
      mediaConnRef.current = null;
    }
    const targetId =
      remotePeerId ||
      options.targetPeerId ||
      `smrko-${sanitizeId(roomId)}-${role === "doctor" ? "patient" : "doctor"}`;
    if (targetId && peerRef.current && !peerRef.current.destroyed) {
      setTimeout(() => {
        connectToPeer(targetId);
      }, 400);
    }
  }, [remotePeerId, options.targetPeerId, roomId, role, connectToPeer]);

  return {
    localStream,
    remoteStream,
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
