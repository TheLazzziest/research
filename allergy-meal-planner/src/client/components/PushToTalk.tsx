import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useService } from "../di/context.tsx";
import { tokens } from "../di/tokens.ts";
import type { ListenSession, SpeechService } from "../services/speech.service.ts";

interface Props {
  text: string;
  disabled?: boolean;
  onText: (text: string) => void;
  onSubmit: (text: string) => void;
  onStatus?: (status: string) => void;
}

// One control, radio/walkie-talkie mode: hold to talk, release to send. A native button
// with pointer capture (so release is caught even if the pointer moves off). On browsers
// without speech recognition (Firefox), it becomes a Send button for the typed text.
export function PushToTalk({ text, disabled, onText, onSubmit, onStatus }: Props) {
  const speech = useService<SpeechService>(tokens.speechService);
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef<ListenSession | null>(null);
  const transcriptRef = useRef("");
  const releasedRef = useRef(false);
  const supported = speech.canListen();

  const finish = () => {
    setRecording(false);
    const finalText = transcriptRef.current.trim();
    transcriptRef.current = "";
    if (finalText) onSubmit(finalText);
  };

  const start = () => {
    if (disabled || !supported) return;
    transcriptRef.current = "";
    releasedRef.current = false;
    let session: ListenSession | null = null;
    try {
      session = speech.listen({
        onFinal: (spoken) => {
          transcriptRef.current = `${transcriptRef.current} ${spoken}`.trim();
          onText(transcriptRef.current);
          if (releasedRef.current) finish();
        },
        onPartial: (spoken) => onStatus?.(`hearing: ${spoken.slice(0, 40)}\u2026`),
        onError: (error) => {
          onStatus?.(`mic error: ${error}`);
          setRecording(false);
        },
        onEnd: () => {
          if (releasedRef.current && transcriptRef.current.trim()) finish();
          else setRecording(false);
        },
      });
    } catch (error) {
      onStatus?.(`mic error: ${error instanceof Error ? error.message : "failed"}`);
      return;
    }
    if (!session) {
      onStatus?.("Voice input needs Chrome or Edge \u2014 type instead.");
      return;
    }
    sessionRef.current = session;
    setRecording(true);
    onStatus?.("listening\u2026 release to send");
  };

  const stop = () => {
    if (!recording) return;
    releasedRef.current = true;
    sessionRef.current?.stop();
    sessionRef.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start();
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    stop();
  };
  const onPointerCancel = () => stop();

  const label = !supported ? "Send" : recording ? "Release to send" : "Hold to talk";
  const isDisabled = disabled || (!supported && !text.trim());

  return (
    <button
      type="button"
      disabled={isDisabled}
      title="Hold the button, speak, then release to send."
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={() => {
        // Firefox / no-mic fallback: send the typed text.
        if (!supported && text.trim()) onSubmit(text.trim());
      }}
      className={[
        "select-none touch-none rounded-lg px-5 py-3 text-sm font-semibold text-white shadow",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        recording ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
