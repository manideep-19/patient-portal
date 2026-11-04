/**
 * SmrkoMed Telehealth — Multi-Peer WebRTC Hook
 *
 * Provides:
 * 1. Multi-party video calling where multiple participants join with the SAME LINK.
 * 2. Glare-free P2P mesh calling (lexicographical peer ID negotiation).
 * 3. Adaptive Video Quality Degradation:
 *    When network drops, video resolution smoothly throttles down to 240p (saving 85% bandwidth)
 *    so video NEVER goes blank, and audio stays crystal clear.
 * 4. Reliable Mic & Camera Toggling & Device Switching:
 *    - Real-time RTCRtpSender track replacement for mic and camera switching.
 *    - Explicit mic mute/unmute re-enabling so voice is never permanently muted.
 *    - Real-time DataChannel camera & mic state sync.
 * 5. Multi-peer broadcast chat, typing indicator, and screen sharing.
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

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

interface DataPayload {
  type: "chat" | "typing" | "stop_typing" | "network_mode" | "camera_state" | "mic_state";
  message?: string;
  senderName?: string;
  timestamp?: string;
  id?: string;
  is240p?: boolean;
  videoPausedForNetwork?: boolean;
  isCamOff?: boolean;
  isMicMuted?: boolean;
}

export interface RemotePeer {
  peerId: string;
  role: "patient" | "doctor" | "guest";
  displayName: string;
  stream: MediaStream | null;
  is240p?: boolean;
  isVideoPausedForNetwork?: boolean;
  isMicMuted?: boolean;
  isCamOff?: boolean;
}

export interface UseWebRTCOptions {
  role: "patient" | "doctor" | "guest";
  displayName: string;
  customPeerId?: string;
  targetPeerId?: string;
  disableAutoConnect?: boolean;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remotePeers: RemotePeer[];
  remotePeersCount: number;
  connectionState: ConnectionState;
  networkQuality: NetworkQuality;
  isMicMuted: boolean;
  isCamOff: boolean;
  isRemoteCamOff: boolean;
  isScreenSharing: boolean;
  isRemoteTyping: boolean;
  callDurationSeconds: number;
  chatMessages: ChatMessage[];
  peerId: string | null;
  remotePeerId: string | null;
  error: string | null;

  // Adaptive 240p Quality Degradation
  is240pQuality: boolean;
  isRemote240pQuality: boolean;
  isVideoPausedForNetwork: boolean; // Backwards compatible
  isRemoteVideoPausedForNetwork: boolean; // Backwards compatible
  isAudioOnlyFallback: boolean; // Backwards compatible
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

  const sessionPeerIdRef = useRef<string>(
    options.customPeerId || generateUniqueSessionId(roomId, role)
  );

  // Streams & Remote Peers
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

  // Adaptive 240p Quality Drop
  const [is240pQuality, setIs240pQuality] = useState(false);
  const [isRemote240pQuality, setIsRemote240pQuality] = useState(false);
  const [isSimulatedPoorNetwork, setIsSimulatedPoorNetwork] = useState(false);

  // Devices
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [currentAudioDeviceId, setCurrentAudioDeviceId] = useState<string | null>(null);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string | null>(null);
  const currentAudioDeviceIdRef = useRef<string | null>(null);
  const currentVideoDeviceIdRef = useRef<string | null>(null);

  // Call timer & Chat
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [peerId, setPeerId] = useState<string | null>(null);

  // Mutable refs
  const is240pQualityRef = useRef(false);
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
  /*  Device Enumeration                                               */
  /* ---------------------------------------------------------------- */

  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const list = devices.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 5)}…)`,
        kind: d.kind as DeviceInfo["kind"],
      }));
      setAvailableDevices(list);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
      };
    }
  }, [refreshDevices]);

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

        const vTrack = stream.getVideoTracks()[0];
        const aTrack = stream.getAudioTracks()[0];
        if (vTrack) {
          const settings = vTrack.getSettings();
          currentVideoDeviceIdRef.current = settings.deviceId || null;
          setCurrentVideoDeviceId(settings.deviceId || null);
        }
        if (aTrack) {
          const settings = aTrack.getSettings();
          currentAudioDeviceIdRef.current = settings.deviceId || null;
          setCurrentAudioDeviceId(settings.deviceId || null);
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        setConnectionState("idle");
        refreshDevices();
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
    [refreshDevices]
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

  /* ---------------------------------------------------------------- */
  /*  WebRTC Sender Encoding Adaptation (240p Quality Scaling)        */
  /* ---------------------------------------------------------------- */

  const applyVideoQualityConstraints = useCallback((targetQuality: "240p" | "hd") => {
    mediaConnsRef.current.forEach((call) => {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      const sender = pc?.getSenders()?.find((s) => s.track?.kind === "video");
      if (sender) {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          if (targetQuality === "240p") {
            params.encodings[0].scaleResolutionDownBy = 3.0; // 720p / 3 = 240p
            params.encodings[0].maxBitrate = 120000; // 120 kbps (conserves 85% data)
            params.encodings[0].maxFramerate = 15;
          } else {
            params.encodings[0].scaleResolutionDownBy = 1.0;
            params.encodings[0].maxBitrate = 2000000; // 2 Mbps
            delete params.encodings[0].maxFramerate;
          }
          sender.setParameters(params).catch(() => {});
        } catch {
          // Ignore
        }
      }
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Simulate Poor Network (Interactive Toggle)                       */
  /* ---------------------------------------------------------------- */

  const simulatePoorNetwork = useCallback(
    (enable?: boolean) => {
      const nextState =
        typeof enable === "boolean" ? enable : !isSimulatedPoorNetworkRef.current;
      isSimulatedPoorNetworkRef.current = nextState;
      setIsSimulatedPoorNetwork(nextState);

      if (nextState) {
        setNetworkQuality("poor");
        is240pQualityRef.current = true;
        setIs240pQuality(true);
        // Video stays VISIBLE and fully moving, just scaled to 240p!
        applyVideoQualityConstraints("240p");
        broadcastDataPayload({
          type: "network_mode",
          is240p: true,
        });
      } else {
        stableCounterRef.current = 2;
        setNetworkQuality("excellent");
        is240pQualityRef.current = false;
        setIs240pQuality(false);
        applyVideoQualityConstraints("hd");
        broadcastDataPayload({
          type: "network_mode",
          is240p: false,
        });
      }
    },
    [applyVideoQualityConstraints, broadcastDataPayload]
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

        // Quality Downscaling to 240p (Video stays visible!)
        if (quality === "poor") {
          stableCounterRef.current = 0;
          if (!is240pQualityRef.current) {
            console.log("[WebRTC] Poor network detected — scaling video to 240p to preserve audio.");
            is240pQualityRef.current = true;
            setIs240pQuality(true);
            applyVideoQualityConstraints("240p");
            broadcastDataPayload({ type: "network_mode", is240p: true });
          }
        } else if (quality === "good" || quality === "excellent") {
          stableCounterRef.current += 1;
          if (
            stableCounterRef.current >= 2 &&
            is240pQualityRef.current &&
            !isSimulatedPoorNetworkRef.current
          ) {
            console.log("[WebRTC] Network stabilized — restoring video stream to HD.");
            is240pQualityRef.current = false;
            setIs240pQuality(false);
            applyVideoQualityConstraints("hd");
            broadcastDataPayload({ type: "network_mode", is240p: false });
          }
        } else {
          stableCounterRef.current = 0;
        }
      } catch {
        // Ignore stats fetch error
      }
    }, 2500);
  }, [applyVideoQualityConstraints, broadcastDataPayload]);

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
      if (is240pQualityRef.current) {
        conn.send({ type: "network_mode", is240p: true });
      }
      if (isCamOffRef.current) {
        conn.send({ type: "camera_state", isCamOff: true });
      }
      if (isMicMutedRef.current) {
        conn.send({ type: "mic_state", isMicMuted: true });
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
      } else if (payload.type === "mic_state") {
        const isMuted = Boolean(payload.isMicMuted);
        console.log(`[WebRTC] Peer ${remoteId} mic_state isMicMuted = ${isMuted}`);
        const existing = remotePeersRef.current.get(remoteId);
        if (existing) {
          existing.isMicMuted = isMuted;
          setRemotePeers(new Map(remotePeersRef.current));
        }
      } else if (payload.type === "network_mode") {
        const is240 = Boolean(payload.is240p);
        console.log(`[WebRTC] Peer ${remoteId} is240p = ${is240}`);
        const existing = remotePeersRef.current.get(remoteId);
        if (existing) {
          existing.is240p = is240;
          setRemotePeers(new Map(remotePeersRef.current));
        }
        const anyRemote240p = Array.from(remotePeersRef.current.values()).some((p) => p.is240p);
        setIsRemote240pQuality(anyRemote240p);
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
        is240p: existing?.is240p || false,
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
          console.warn(`[WebRTC ICE ${remoteId}] Temporarily disconnected; attempting ICE restart`);
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

      const existingCall = mediaConnsRef.current.get(targetPeerId);
      if (existingCall && (existingCall as any).open) return;

      console.log(`[Mesh Calling] Initiating P2P connection to ${targetPeerId}...`);

      if (targetDisplayName || targetRole) {
        remotePeersRef.current.set(targetPeerId, {
          peerId: targetPeerId,
          role: targetRole || "patient",
          displayName: targetDisplayName || "Participant",
          stream: null,
          is240p: false,
          isMicMuted: false,
          isCamOff: false,
        });
        setRemotePeers(new Map(remotePeersRef.current));
      }

      try {
        const dataConn = peer.connect(targetPeerId, { reliable: true });
        handleDataConnection(dataConn);

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

    // Answer incoming calls with local stream
    peer.on("call", (call) => {
      console.log(`[PeerJS] Incoming call from ${call.peer}`);
      setConnectionState("connecting");
      const currentStream = localStreamRef.current;
      if (currentStream) {
        call.answer(currentStream);
      } else {
        call.answer();
      }
      handleMediaConnection(call);
    });

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
          isVideoPausedForNetwork: is240pQualityRef.current,
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
        isMicMuted?: boolean;
        isCamOff?: boolean;
      }> = data.peers || [];

      const activePeerIds = new Set(activePeers.map((p) => p.peerId));

      for (const remote of activePeers) {
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

        const existingCall = mediaConnsRef.current.get(remote.peerId);
        const isCallOpen = existingCall && (existingCall as any).open;

        if (!isCallOpen && localStreamRef.current) {
          if (myId > remote.peerId) {
            console.log(`[Mesh Glare Prevention] (MyID: ${myId} > PeerID: ${remote.peerId}) -> Calling remote peer.`);
            connectToPeer(remote.peerId, remote.role, remote.displayName);
          }
        }
      }

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
  /*  Switch Camera & Microphone                                       */
  /* ---------------------------------------------------------------- */

  const switchCamera = useCallback(async (targetDeviceId?: string) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      if (videoDevices.length === 0) return;

      let selectedId = targetDeviceId;
      if (!selectedId) {
        const currId = currentVideoDeviceIdRef.current;
        const currIdx = videoDevices.findIndex((d) => d.deviceId === currId);
        const nextIdx = (currIdx + 1) % videoDevices.length;
        selectedId = videoDevices[nextIdx].deviceId;
      }

      console.log(`[WebRTC] Switching camera to deviceId: ${selectedId}`);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      currentVideoDeviceIdRef.current = selectedId;
      setCurrentVideoDeviceId(selectedId);
      newTrack.enabled = !isCamOffRef.current;

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }

      const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0];
      const newLocalStream = new MediaStream();
      if (currentAudioTrack) newLocalStream.addTrack(currentAudioTrack);
      newLocalStream.addTrack(newTrack);

      localStreamRef.current = newLocalStream;
      setLocalStream(newLocalStream);

      for (const call of mediaConnsRef.current.values()) {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        const sender = pc?.getSenders()?.find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }
    } catch (err: any) {
      console.warn("[WebRTC] Switch camera error:", err);
    }
  }, []);

  const switchMicrophone = useCallback(async (targetDeviceId: string) => {
    try {
      console.log(`[WebRTC] Switching microphone to deviceId: ${targetDeviceId}`);

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: targetDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;

      currentAudioDeviceIdRef.current = targetDeviceId;
      setCurrentAudioDeviceId(targetDeviceId);
      newTrack.enabled = !isMicMutedRef.current;

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
      }

      const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      const newLocalStream = new MediaStream();
      newLocalStream.addTrack(newTrack);
      if (currentVideoTrack) newLocalStream.addTrack(currentVideoTrack);

      localStreamRef.current = newLocalStream;
      setLocalStream(newLocalStream);

      for (const call of mediaConnsRef.current.values()) {
        const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
        const sender = pc?.getSenders()?.find((s) => s.track?.kind === "audio");
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }
    } catch (err: any) {
      console.warn("[WebRTC] Switch microphone error:", err);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Media Track Toggles (Fixed Mic & Camera)                         */
  /* ---------------------------------------------------------------- */

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isMicMuted;
    isMicMutedRef.current = nextState;
    setIsMicMuted(nextState);

    // 1. Enable/disable on local stream
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextState;
    });

    // 2. Explicitly update track.enabled on all RTCRtpSenders
    mediaConnsRef.current.forEach((call) => {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      pc?.getSenders()?.forEach((s) => {
        if (s.track && s.track.kind === "audio") {
          s.track.enabled = !nextState;
        }
      });
    });

    // 3. Sync mic state to all peers
    broadcastDataPayload({
      type: "mic_state",
      isMicMuted: nextState,
    });
  }, [isMicMuted, broadcastDataPayload]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextState = !isCamOff;
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
      isCamOff: nextState,
    });
  }, [isCamOff, broadcastDataPayload]);

  /* ---------------------------------------------------------------- */
  /*  Screen Sharing                                                   */
  /* ---------------------------------------------------------------- */

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
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

  const remotePeersList = Array.from(remotePeers.values());
  const firstRemotePeer = remotePeersList[0] || null;
  const remoteStream = firstRemotePeer?.stream || null;
  const remotePeerId = firstRemotePeer?.peerId || null;
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

    // Adaptive 240p Quality Degradation (Video stays visible!)
    is240pQuality,
    isRemote240pQuality,
    isVideoPausedForNetwork: false,
    isRemoteVideoPausedForNetwork: false,
    isAudioOnlyFallback: false,
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
  };
}
