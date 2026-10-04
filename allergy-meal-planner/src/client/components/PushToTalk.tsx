import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Spinner } from "../ui.tsx";
import { useService } from "../di/context.tsx";
import { tokens } from "../di/tokens.ts";
import type { ListenSession, SpeechService } from "../services/speech.service.ts";

interface Props {
  text: string;
  disabled?: boolean;
  busy?: boolean;
  onText: (text: string) => void;
  onSubmit: (text: string) => void;
  onStatus?: (status: string) => void;
}

// Radio/walkie-talkie control. Reliability guards:
//  - MIN_HOLD: a tap shorter than this is cancelled (no rushed turn).
//  - COOLDOWN: ignore a new press right after a turn ends (no overlap/double send).
//  - GRACE: after release, wait briefly for the recognizer's late final result.
//  - RESTART: Chrome ends recognition on silence; while the key is held we reopen the
//    session so a pause does not cut the turn short.
const MIN_HOLD_MS = 250;
const COOLDOWN_MS = 350;
const GRACE_MS = 400;
const MAX_RESTARTS = 40;

export function PushToTalk({ text, disabled, busy, onText, onSubmit, onStatus }: Props) {
  const speech = useService<SpeechService>(tokens.speechService);
  const [recording, setRecording] = useState(false);
  const supported = speech.canListen();

  const sessionRef = useRef<ListenSession | null>(null);
  const activeRef = useRef(false);
  const releasedRef = useRef(false);
  const cancelledRef = useRef(false);
  const restartsRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastEndAtRef = useRef(0);
  const transcriptRef = useRef("");
  const graceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    sessionRef.current?.stop();
  }, []);

  const cleanup = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = null;
    activeRef.current = false;
    sessionRef.current = null;
    releasedRef.current = false;
    cancelledRef.current = false;
    restartsRef.current = 0;
    lastEndAtRef.current = Date.now();
    setRecording(false);
  };

  const finish = (override?: string) => {
    if (!activeRef.current) return;
    const finalText = (override ?? transcriptRef.current).trim();
    transcriptRef.current = "";
    cleanup();
    if (finalText) onSubmit(finalText);
  };

  const open = () => {
    const session = speech.listen({
      onFinal: (spoken) => {
        transcriptRef.current = `${transcriptRef.current} ${spoken}`.trim();
        onText(transcriptRef.current);
        if (releasedRef.current && !cancelledRef.current) finish();
      },
      onPartial: (spoken) => onStatus?.(`hearing: ${spoken.slice(0, 40)}\u2026`),
      onError: (error) => {
        if (error === "not-allowed" || error === "service-not-allowed") {
          onStatus?.("Microphone permission is blocked.");
          cleanup();
          return;
        }
        // Transient stops (aborted / no-speech / network) are followed by `onend`,
        // which reopens the session while the key is still held.
      },
      onEnd: () => {
        if (!activeRef.current) return;
        if (cancelledRef.current) {
          cleanup();
          return;
        }
        if (!releasedRef.current && restartsRef.current < MAX_RESTARTS) {
          restartsRef.current += 1;
          open();
          return;
        }
        if (graceRef.current) clearTimeout(graceRef.current);
        graceRef.current = setTimeout(() => finish(), GRACE_MS);
      },
    });
    if (!session) {
      activeRef.current = false;
      onStatus?.("Voice input needs Chrome or Edge \u2014 type instead.");
      return;
    }
    sessionRef.current = session;
  };

  const start = () => {
    if (disabled || busy || !supported) return;
    const now = Date.now();
    if (activeRef.current) return; // a session is already live
    if (now - lastEndAtRef.current < COOLDOWN_MS) return; // debounce after a turn

    transcriptRef.current = "";
    releasedRef.current = false;
    cancelledRef.current = false;
    restartsRef.current = 0;
    startedAtRef.current = now;
    activeRef.current = true;

    open();
    setRecording(true);
    onStatus?.("listening\u2026 release to send");
  };

  const release = () => {
    if (!activeRef.current) return;
    releasedRef.current = true;
    if (Date.now() - startedAtRef.current < MIN_HOLD_MS) {
      // Too quick: treat as a tap, not a turn.
      cancelledRef.current = true;
      sessionRef.current?.stop();
      return;
    }
    sessionRef.current?.stop();
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => finish(), GRACE_MS);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start();
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    release();
  };
  const onPointerCancel = () => release();

  const isDisabled = disabled || busy || (!supported && !text.trim());

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={busy}
      title="Hold the button, speak, then release to send."
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={() => {
        if (!supported && text.trim()) onSubmit(text.trim());
      }}
      className={[
        "inline-flex items-center justify-center gap-2 select-none touch-none rounded-lg px-5 py-3",
        "text-sm font-semibold text-white shadow transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        recording ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700",
      ].join(" ")}
    >
      {busy ? (
        <>
          <Spinner className="h-4 w-4" />
          {"Preparing\u2026"}
        </>
      ) : !supported ? (
        "Send"
      ) : recording ? (
        "Release to send"
      ) : (
        "Hold to talk"
      )}
    </button>
  );
}
