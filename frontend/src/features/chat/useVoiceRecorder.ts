import { useEffect, useRef, useState } from "react";

export const MAX_VOICE_SECONDS = 120;
const MIN_VOICE_MS = 800; // shorter is a stray tap: dropped

/** First format this browser can record (Android/Chrome: WebM Opus). */
function pickMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
}

export const canRecordVoice =
  typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

/**
 * Tap-to-record voice messages: start() asks for the microphone and records,
 * stop(true) hands the recording to onDone, stop(false) throws it away. It
 * stops (and sends) by itself at MAX_VOICE_SECONDS. The microphone is always
 * released when recording ends or the component goes away.
 */
export function useVoiceRecorder(onDone: (recording: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const keepRef = useRef(false);
  const startingRef = useRef(false); // a second tap while the microphone opens is ignored
  const startedAt = useRef(0);
  const tick = useRef<number>();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  function release() {
    window.clearInterval(tick.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
  }

  function stop(send: boolean) {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    keepRef.current = send && Date.now() - startedAt.current >= MIN_VOICE_MS;
    rec.stop(); // onstop delivers the data, then releases the microphone
  }

  async function start() {
    if (recorderRef.current || startingRef.current) return;
    startingRef.current = true;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Micro inaccessible : autorise-le pour MemoCat dans les réglages du téléphone.");
      return;
    } finally {
      startingRef.current = false;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 32_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      const keep = keepRef.current;
      release();
      if (keep && chunks.length > 0) onDoneRef.current(new Blob(chunks, { type: rec.mimeType || mimeType }));
    };
    recorderRef.current = rec;
    startedAt.current = Date.now();
    rec.start();
    setRecording(true);
    tick.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_VOICE_SECONDS) stop(true);
    }, 250);
  }

  // Leaving the chat while recording: drop it and free the microphone.
  useEffect(
    () => () => {
      keepRef.current = false;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      window.clearInterval(tick.current);
      rec?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { recording, seconds, error, start, stop };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
