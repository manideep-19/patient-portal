"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether someone is speaking on a MediaStream (Meet-style speaking
 * ring). One shared AudioContext; each stream gets its own AnalyserNode.
 */

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  sharedCtx = new Ctx();
  return sharedCtx;
}

const THRESHOLD = 0.035; // RMS level that counts as speech
const HOLD_MS = 450; // keep the ring on briefly between words

export function useAudioActivity(stream: MediaStream | null, enabled = true): boolean {
  const [speaking, setSpeaking] = useState(false);
  const audioTrack = stream?.getAudioTracks()[0] ?? null;

  useEffect(() => {
    if (!enabled || !audioTrack || audioTrack.readyState === "ended") {
      setSpeaking(false);
      return;
    }
    const ctx = getAudioContext();
    if (!ctx) return;

    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    try {
      source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
    } catch {
      return;
    }

    const resume = () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    };
    resume();
    window.addEventListener("pointerdown", resume, { once: true });

    const buf = new Float32Array(analyser.fftSize);
    let lastLoud = 0;
    let current = false;
    const interval = setInterval(() => {
      if (!analyser) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!;
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (rms > THRESHOLD) lastLoud = now;
      const next = now - lastLoud < HOLD_MS;
      if (next !== current) {
        current = next;
        setSpeaking(next);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", resume);
      try {
        source?.disconnect();
        analyser?.disconnect();
      } catch {
        /* noop */
      }
      setSpeaking(false);
    };
  }, [audioTrack, enabled]);

  return speaking;
}
