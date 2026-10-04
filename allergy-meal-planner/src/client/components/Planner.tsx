import { useState } from "react";
import { Alert, Button, Spinner, Switch, Typography } from "../ui.tsx";
import { useService } from "../di/context.tsx";
import { tokens } from "../di/tokens.ts";
import type { PlanService } from "../services/plan.service.ts";
import type { SpeechService } from "../services/speech.service.ts";
import type { PlanResult } from "../../shared/types.ts";
import { toPlainText } from "../markdown.ts";
import { PromptInput } from "./PromptInput.tsx";
import { PushToTalk } from "./PushToTalk.tsx";
import { PlanView } from "./PlanView.tsx";

// Orchestrator: owns request/result state and composes the smaller components.
// Depends only on injected service abstractions.
export function Planner() {
  const planService = useService<PlanService>(tokens.planService);
  const speech = useService<SpeechService>(tokens.speechService);

  const [text, setText] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const submit = async (override?: string) => {
    const request = (override ?? text).trim();
    if (!request || busy) return;
    setBusy(true);
    setError(null);
    setStatus("thinking\u2026");
    try {
      const response = await planService.plan({ text: request, threadId });
      setThreadId(response.threadId ?? threadId);
      setResult(response);
      setText("");
      setStatus("done");
      if (autoSpeak && speech.canSpeak()) speech.speak(toPlainText(response.text));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "request failed");
      setStatus("failed");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    speech.stopSpeaking();
    setThreadId(undefined);
    setResult(null);
    setError(null);
    setStatus("");
    setText("");
  };

  return (
    <div className="space-y-4">
      <PromptInput value={text} onChange={setText} onSubmit={() => submit()} disabled={busy} />
      <div className="flex flex-wrap items-center gap-3">
        <PushToTalk
          text={text}
          disabled={busy}
          busy={busy}
          onText={setText}
          onSubmit={(finalText) => submit(finalText)}
          onStatus={setStatus}
        />
        <label className="flex items-center gap-2">
          <Switch checked={autoSpeak} onChange={() => setAutoSpeak((value) => !value)} />
          <Typography variant="small" className="font-normal">
            Speak answers
          </Typography>
        </label>
        {threadId ? (
          <Button variant="text" size="sm" onClick={restart}>
            New consultation
          </Button>
        ) : null}
        {busy ? (
          <span className="ml-auto inline-flex items-center gap-2 text-sm text-blue-gray-500" role="status" aria-live="polite">
            <Spinner className="h-4 w-4" />
            {"preparing\u2026"}
          </span>
        ) : (
          <Typography variant="small" className="ml-auto font-normal text-blue-gray-500">
            {status}
          </Typography>
        )}
      </div>
      {error ? (
        <Alert open color="red" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <PlanView result={result} />
    </div>
  );
}
