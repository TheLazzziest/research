import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardBody, Chip, Typography } from "../ui.tsx";
import type { PlanResult } from "../../shared/types.ts";

function formatClassification(answers: Record<string, unknown> | undefined): string[] {
  if (!answers) return [];
  return Object.entries(answers).map(([name, raw]) => {
    const answer = raw as { type?: string; noul?: number; choice?: string; score?: number };
    if (answer.type === "noul") return `${name}: ${Math.round((answer.noul ?? 0) * 100)}%`;
    if (answer.type === "choice") return `${name}: ${answer.choice ?? "?"}`;
    if (answer.type === "score") return `${name}: ${answer.score ?? "?"}`;
    return name;
  });
}

export function PlanView({ result }: { result: PlanResult | null }) {
  if (!result) return null;
  const classified = formatClassification(result.classification);
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Chip value="adapter: backboard" size="sm" />
          <Chip value={`provider: ${result.provider}`} size="sm" />
          <Chip value={`model: ${result.model}`} size="sm" />
          {result.threadId ? <Chip value={`thread: ${result.threadId.slice(0, 8)}\u2026`} size="sm" /> : null}
          {result.gate ? (
            <Chip
              value={`gate: ${result.gate.status}`}
              size="sm"
              color={result.gate.status === "pass" ? "green" : "red"}
              variant="outlined"
            />
          ) : null}
        </div>
        {result.gate && result.gate.reasons.length > 0 ? (
          <Typography variant="small" color="red" className="font-medium">
            Gate flagged: {result.gate.reasons.join(", ")}
          </Typography>
        ) : null}
        {classified.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {classified.map((text) => (
              <Chip key={text} value={text} size="sm" variant="ghost" color="indigo" />
            ))}
          </div>
        ) : null}
        {result.summary ? (
          <div className="rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
            <Typography variant="small" color="indigo-gray" className="mb-1 font-semibold uppercase tracking-wide">
              Summary
            </Typography>
            <Typography className="text-sm text-indigo-900">{result.summary}</Typography>
          </div>
        ) : null}
        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.text}</ReactMarkdown>
        </div>
      </CardBody>
    </Card>
  );
}
