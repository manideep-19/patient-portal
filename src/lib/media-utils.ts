/**
 * SmrkoMed Telehealth — Media Utilities
 *
 * Camera / microphone helpers, device enumeration,
 * screen-sharing, and quality-preset factories.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

export type VideoQuality = "hd" | "sd" | "audio_only";

/* ------------------------------------------------------------------ */
/*  Constraints                                                        */
/* ------------------------------------------------------------------ */

export function getMediaConstraints(quality: VideoQuality): MediaStreamConstraints {
  switch (quality) {
    case "hd":
      return {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
    case "sd":
      return {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
    case "audio_only":
      return {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Permission request                                                 */
/* ------------------------------------------------------------------ */

export async function requestMediaPermissions(
  video: boolean = true,
  audio: boolean = true
): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video
        ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
      audio: audio
        ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : false,
    });
    return stream;
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      throw new Error(
        "Camera/microphone permission was denied. Please allow access in your browser settings."
      );
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      throw new Error(
        "No camera or microphone found on this device. Please connect one and try again."
      );
    }
    throw new Error(`Failed to access media devices: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Device enumeration                                                 */
/* ------------------------------------------------------------------ */

export async function getAvailableDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "audioinput" || d.kind === "videoinput" || d.kind === "audiooutput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.slice(0, 6)}…)`,
        kind: d.kind as MediaDeviceInfo["kind"],
      }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Switch camera (toggle front ↔ rear on mobile)                     */
/* ------------------------------------------------------------------ */

export async function switchCamera(
  currentStream: MediaStream
): Promise<MediaStream> {
  const currentTrack = currentStream.getVideoTracks()[0];
  if (!currentTrack) throw new Error("No video track to switch");

  const settings = currentTrack.getSettings();
  const currentFacing = settings.facingMode || "user";
  const nextFacing = currentFacing === "user" ? "environment" : "user";

  // Stop the old track
  currentTrack.stop();

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: nextFacing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  // Replace video track in the original stream
  const newTrack = newStream.getVideoTracks()[0]!;
  currentStream.removeTrack(currentTrack);
  currentStream.addTrack(newTrack);

  return currentStream;
}

/* ------------------------------------------------------------------ */
/*  Screen sharing                                                     */
/* ------------------------------------------------------------------ */

export async function createScreenShareStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" } as any,
      audio: false,
    });
    return stream;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Screen sharing was cancelled or denied.");
    }
    throw new Error(`Screen sharing failed: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Stop all tracks on a stream                                        */
/* ------------------------------------------------------------------ */

export function stopAllTracks(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/* ------------------------------------------------------------------ */
/*  Audio level metering (returns 0-1 value)                           */
/* ------------------------------------------------------------------ */

export function createAudioLevelMonitor(
  stream: MediaStream,
  onLevel: (level: number) => void
): () => void {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let running = true;

  const tick = () => {
    if (!running) return;
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    const avg = sum / dataArray.length;
    onLevel(Math.min(avg / 128, 1)); // normalise to 0–1
    requestAnimationFrame(tick);
  };
  tick();

  return () => {
    running = false;
    source.disconnect();
    audioCtx.close();
  };
}
