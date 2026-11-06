"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, MicOff, Pin, PinOff, Grid, MonitorUp, Volume2, WifiOff } from "lucide-react";
import type { RemoteParticipant, ParticipantRole, PeerConnectionStatus } from "@/lib/use-webrtc";
import { useAudioActivity } from "@/lib/use-audio-activity";

interface VideoGridProps {
  localStream: MediaStream | null;
  localLabel?: string;
  localDisplayName?: string;
  localRole?: ParticipantRole;
  localMirror?: boolean;
  localCamOff?: boolean;
  isLocalCamOff?: boolean;
  localMicMuted?: boolean;
  isLocalMicMuted?: boolean;
  isLocalScreenSharing?: boolean;
  remotePeers?: RemoteParticipant[];
  remoteParticipants?: RemoteParticipant[];
  /** Speaker / headphones device for remote audio (setSinkId) */
  outputDeviceId?: string | null;
  /** Controls dock floats over the grid (default true) — reserve space for it */
  overlayControls?: boolean;
  /** Called when user taps the Reconnect button */
  onRetry?: () => void;
  className?: string;
  emptyStateAction?: React.ReactNode;
}

interface TileData {
  id: string;
  name: string;
  role?: ParticipantRole;
  stream: MediaStream | null;
  isCamOff: boolean;
  isMicMuted: boolean;
  isSelf: boolean;
  isScreenSharing: boolean;
  mirror: boolean;
  status: PeerConnectionStatus;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, "").replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-rose-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-cyan-600",
  ];
  return colors[Math.abs(hash) % colors.length]!;
}

function roleLabel(role?: ParticipantRole): string | null {
  switch (role) {
    case "doctor":
      return "Doctor";
    case "family":
      return "Family";
    case "coordinator":
      return "Care Team";
    case "patient":
      return "Patient";
    default:
      return null;
  }
}

/** True while the stream has a live video track that is actually receiving frames. */
function useVideoFlowing(stream: MediaStream | null): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    if (!stream) return;
    const rerender = () => force((n) => n + 1);
    const bind = (t: MediaStreamTrack) => {
      t.addEventListener("mute", rerender);
      t.addEventListener("unmute", rerender);
      t.addEventListener("ended", rerender);
    };
    stream.getVideoTracks().forEach(bind);
    const onAdd = (e: MediaStreamTrackEvent) => {
      bind(e.track);
      rerender();
    };
    stream.addEventListener("addtrack", onAdd);
    stream.addEventListener("removetrack", rerender);
    return () => {
      stream.getVideoTracks().forEach((t) => {
        t.removeEventListener("mute", rerender);
        t.removeEventListener("unmute", rerender);
        t.removeEventListener("ended", rerender);
      });
      stream.removeEventListener("addtrack", onAdd);
      stream.removeEventListener("removetrack", rerender);
    };
  }, [stream]);
  return !!stream?.getVideoTracks().some((t) => t.readyState === "live" && !t.muted);
}

/* ------------------------------------------------------------------ */
/*  Remote audio — independent from video so camera-off never mutes   */
/* ------------------------------------------------------------------ */

function RemoteAudio({
  stream,
  sinkId,
  unlockKey,
  onBlocked,
}: {
  stream: MediaStream;
  sinkId?: string | null;
  unlockKey: number;
  onBlocked: (blocked: boolean) => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    const play = () =>
      el
        .play()
        .then(() => onBlocked(false))
        .catch((err: Error) => {
          if (err.name === "NotAllowedError") onBlocked(true);
        });
    play();
    const onTrack = () => play();
    stream.addEventListener("addtrack", onTrack);
    stream.getAudioTracks().forEach((t) => t.addEventListener("unmute", onTrack));
    return () => {
      stream.removeEventListener("addtrack", onTrack);
      stream.getAudioTracks().forEach((t) => t.removeEventListener("unmute", onTrack));
    };
  }, [stream, unlockKey, onBlocked]);

  useEffect(() => {
    const el = ref.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (el && sinkId && typeof el.setSinkId === "function") {
      el.setSinkId(sinkId).catch(() => {});
    }
  }, [sinkId]);

  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

/* ------------------------------------------------------------------ */
/*  Video element (always muted — audio is played by RemoteAudio)     */
/* ------------------------------------------------------------------ */

function TileVideo({
  stream,
  mirror,
  contain,
}: {
  stream: MediaStream;
  mirror: boolean;
  contain: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});
    const resume = () => {
      if (document.visibilityState === "visible") el.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 w-full h-full ${contain ? "object-contain bg-black" : "object-cover"} ${
        mirror ? "scale-x-[-1]" : ""
      }`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Tile                                                               */
/* ------------------------------------------------------------------ */

function ParticipantTile({
  participant,
  isPinned,
  onTogglePin,
  size = "medium",
}: {
  participant: TileData;
  isPinned: boolean;
  onTogglePin: () => void;
  size?: "compact" | "medium" | "large";
}) {
  const { name, role, stream, isCamOff, isMicMuted, isSelf, mirror, isScreenSharing, status } =
    participant;
  const speaking = useAudioActivity(stream, !isMicMuted);
  const videoFlowing = useVideoFlowing(stream);
  const showVideo = !!stream && videoFlowing && (isScreenSharing || !isCamOff);
  const label = roleLabel(role);
  const connecting = !isSelf && !stream && status !== "connected";

  const avatarSize =
    size === "large" ? "w-28 h-28 text-4xl" : size === "medium" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-base";

  return (
    <div className="relative w-full h-full bg-[#3c4043] overflow-hidden rounded-[inherit] group select-none">
      {showVideo ? (
        <TileVideo stream={stream!} mirror={mirror && !isScreenSharing} contain={isScreenSharing} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`relative rounded-full ${getAvatarColor(name)} text-white font-medium flex items-center justify-center ${avatarSize}`}
          >
            {speaking && (
              <span className="absolute -inset-2 rounded-full border-4 border-sky-400/70 animate-pulse" />
            )}
            {getInitials(name)}
          </div>
        </div>
      )}

      {/* Connecting / reconnecting overlay */}
      {connecting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/50 text-white/90">
          {status === "reconnecting" ? (
            <WifiOff className="w-6 h-6 text-amber-300" />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin" />
          )}
          <span className="text-xs font-medium">
            {status === "reconnecting" ? "Reconnecting…" : "Connecting…"}
          </span>
        </div>
      )}

      {/* Active-speaker frame (Meet blue border) */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-all duration-150 ${
          speaking ? "ring-4 ring-inset ring-sky-400" : "ring-1 ring-inset ring-white/10"
        }`}
      />

      {/* Presenting badge */}
      {isScreenSharing && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-medium">
          <MonitorUp className="w-3.5 h-3.5 text-sky-300" />
          <span>{isSelf ? "You are presenting" : `${name} is presenting`}</span>
        </div>
      )}

      {/* Name label (bottom-left) */}
      <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 max-w-[85%] px-2 py-0.5 rounded-md bg-black/55 text-white">
        <span className="text-xs font-medium truncate">{isSelf ? "You" : name}</span>
        {label && size !== "compact" && (
          <span className="text-[10px] text-white/70 shrink-0">· {label}</span>
        )}
      </div>

      {/* Mic state (top-right) */}
      <div className="absolute top-2 right-2 z-20">
        {isMicMuted ? (
          <div className="p-1.5 rounded-full bg-black/60 text-white" title="Muted">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        ) : speaking ? (
          <div className="flex items-end gap-[2px] h-6 px-1.5 py-1 rounded-full bg-sky-500" title="Speaking">
            <span className="w-[3px] bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2" />
            <span className="w-[3px] bg-white rounded-full animate-[pulse_0.6s_ease-in-out_0.15s_infinite] h-3.5" />
            <span className="w-[3px] bg-white rounded-full animate-[pulse_0.6s_ease-in-out_0.3s_infinite] h-2" />
          </div>
        ) : null}
      </div>

      {/* Pin (hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={`absolute top-2 left-2 z-20 p-1.5 rounded-full transition-opacity cursor-pointer ${
          isPinned
            ? "bg-sky-500 text-white opacity-100"
            : "bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
        title={isPinned ? "Unpin" : "Pin to main screen"}
      >
        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid                                                               */
/* ------------------------------------------------------------------ */

/**
 * Google Meet–style adaptive layout:
 *  - alone: your tile + "waiting for others" card
 *  - 2 people: the other person fills the stage, you are a floating self-view
 *  - 3 people: 2 + 1 (stacked on phones)
 *  - 4+: 2×2 / 3-col gallery
 *  - someone presents → auto spotlight on the screen share with a filmstrip
 *  - pin any tile to spotlight it
 */
export function VideoGrid({
  localStream,
  localLabel,
  localDisplayName,
  localRole = "patient",
  localMirror = true,
  localCamOff,
  isLocalCamOff,
  localMicMuted,
  isLocalMicMuted,
  isLocalScreenSharing = false,
  remotePeers,
  remoteParticipants,
  outputDeviceId,
  overlayControls = true,
  className = "",
  emptyStateAction,
}: VideoGridProps) {
  // undefined = automatic (follow presenter); null = user chose grid; string = pinned id
  const [pinnedId, setPinnedId] = useState<string | null | undefined>(undefined);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [unlockKey, setUnlockKey] = useState(0);
  const onBlocked = React.useCallback((b: boolean) => setAudioBlocked((prev) => (prev === b ? prev : b)), []);

  const selfName = localDisplayName || localLabel || "You";
  const selfCamOff = isLocalCamOff ?? localCamOff ?? false;
  const selfMicMuted = isLocalMicMuted ?? localMicMuted ?? false;
  const remotes = remoteParticipants || remotePeers || [];

  const self: TileData = {
    id: "self",
    name: selfName,
    role: localRole,
    stream: localStream,
    isCamOff: selfCamOff,
    isMicMuted: selfMicMuted,
    isSelf: true,
    isScreenSharing: isLocalScreenSharing,
    mirror: localMirror,
    status: "connected",
  };

  const others: TileData[] = remotes.map((p) => ({
    id: p.peerId,
    name: p.displayName,
    role: p.role,
    stream: p.stream,
    isCamOff: p.isCamOff ?? false,
    isMicMuted: p.isMicMuted ?? false,
    isSelf: false,
    isScreenSharing: p.isScreenSharing ?? false,
    mirror: false,
    status: p.connectionStatus ?? (p.stream ? "connected" : "connecting"),
  }));

  const all = [self, ...others];
  const total = all.length;
  const presenterId = others.find((p) => p.isScreenSharing)?.id ?? null;

  // A new presentation re-enables auto spotlight
  useEffect(() => {
    setPinnedId(undefined);
  }, [presenterId]);

  // Pinned participant left → back to auto
  useEffect(() => {
    if (pinnedId && !all.some((p) => p.id === pinnedId)) setPinnedId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, pinnedId]);

  const spotlightId = pinnedId === undefined ? presenterId : pinnedId;
  const togglePin = (id: string) => setPinnedId((prev) => (prev === id ? null : id));

  const audioLayer = (
    <>
      {remotes.map((p) =>
        p.stream ? (
          <RemoteAudio
            key={`audio-${p.peerId}`}
            stream={p.stream}
            sinkId={outputDeviceId}
            unlockKey={unlockKey}
            onBlocked={onBlocked}
          />
        ) : null
      )}
      {audioBlocked && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center pointer-events-none">
          <button
            onClick={() => {
              setUnlockKey((k) => k + 1);
              setAudioBlocked(false);
            }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500 text-white text-sm font-semibold shadow-2xl cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Click to hear other participants</span>
          </button>
        </div>
      )}
    </>
  );

  const dockPad = overlayControls ? "pb-24" : "";
  const floatBottom = overlayControls ? "bottom-24 sm:bottom-28" : "bottom-4";
  const tileShell = "relative min-h-0 min-w-0 rounded-xl sm:rounded-2xl overflow-hidden";

  /* ---------- Spotlight (pinned or presenting) ---------- */
  const spotlight = spotlightId ? all.find((p) => p.id === spotlightId) : undefined;
  if (spotlight && total > 1) {
    const strip = all.filter((p) => p.id !== spotlight.id);
    return (
      <div className={`relative w-full h-full bg-[#202124] p-2 sm:p-3 ${dockPad} flex flex-col md:flex-row gap-2 ${className}`}>
        <div className={`${tileShell} flex-1`}>
          <ParticipantTile
            participant={spotlight}
            isPinned={pinnedId === spotlight.id}
            onTogglePin={() => togglePin(spotlight.id)}
            size="large"
          />
        </div>
        <div className="flex md:flex-col gap-2 shrink-0 h-28 md:h-auto md:w-60 overflow-x-auto md:overflow-y-auto">
          {strip.map((p) => (
            <div key={p.id} className={`${tileShell} aspect-video h-full md:h-auto md:w-full shrink-0`}>
              <ParticipantTile participant={p} isPinned={false} onTogglePin={() => togglePin(p.id)} size="compact" />
            </div>
          ))}
        </div>
        <button
          onClick={() => setPinnedId(null)}
          className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Grid view</span>
        </button>
        {audioLayer}
      </div>
    );
  }

  /* ---------- Alone ---------- */
  if (total === 1) {
    return (
      <div className={`relative w-full h-full bg-[#202124] p-2 sm:p-4 flex items-center justify-center ${className}`}>
        <div className={`${tileShell} w-full max-w-5xl aspect-video max-h-full`}>
          <ParticipantTile participant={self} isPinned={false} onTogglePin={() => {}} size="large" />
        </div>
        <div className="absolute inset-x-4 ${floatBottom} sm:left-auto sm:right-6 sm:max-w-sm z-30 p-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold">You&apos;re the only one here</span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            Share the invite link with the doctor, family member or care team. They&apos;ll appear here as soon as they join.
          </p>
          {emptyStateAction && <div className="pt-1">{emptyStateAction}</div>}
        </div>
      </div>
    );
  }

  /* ---------- 1:1 — remote fills stage, self-view floats ---------- */
  if (total === 2) {
    const other = others[0]!;
    return (
      <div className={`relative w-full h-full bg-[#202124] p-2 sm:p-3 ${className}`}>
        <div className={`${tileShell} w-full h-full`}>
          <ParticipantTile participant={other} isPinned={false} onTogglePin={() => togglePin(other.id)} size="large" />
        </div>
        <div
          className={`absolute z-30 right-4 ${floatBottom} w-32 sm:w-56 aspect-[3/4] sm:aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20`}
        >
          <ParticipantTile participant={self} isPinned={false} onTogglePin={() => togglePin("self")} size="compact" />
        </div>
        {audioLayer}
      </div>
    );
  }

  /* ---------- 3 people — 2 + 1 ---------- */
  if (total === 3) {
    return (
      <div className={`relative w-full h-full bg-[#202124] p-2 sm:p-3 ${dockPad} ${className}`}>
        <div className="w-full h-full grid gap-2 grid-cols-1 grid-rows-3 md:grid-cols-4 md:grid-rows-2">
          {all.map((p, i) => (
            <div
              key={p.id}
              className={`${tileShell} md:col-span-2 ${i === 2 ? "md:col-start-2" : ""}`}
            >
              <ParticipantTile participant={p} isPinned={false} onTogglePin={() => togglePin(p.id)} size="medium" />
            </div>
          ))}
        </div>
        {audioLayer}
      </div>
    );
  }

  /* ---------- 4+ gallery ---------- */
  const cols = total <= 4 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
  return (
    <div className={`relative w-full h-full bg-[#202124] p-2 sm:p-3 ${dockPad} ${className}`}>
      <div className={`w-full h-full grid gap-2 ${cols} auto-rows-fr`}>
        {all.map((p) => (
          <div key={p.id} className={tileShell}>
            <ParticipantTile participant={p} isPinned={false} onTogglePin={() => togglePin(p.id)} size="compact" />
          </div>
        ))}
      </div>
      {audioLayer}
    </div>
  );
}
