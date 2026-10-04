import type { ChangeEvent, KeyboardEvent } from "react";
import { Textarea, Typography } from "../ui.tsx";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, onSubmit, disabled }: Props) {
  return (
    <div>
      <Typography variant="small" color="blue-gray" className="mb-1 font-medium">
        What do you need?
      </Typography>
      <Textarea
        value={value}
        disabled={disabled}
        rows={3}
        resize
        label=""
        placeholder="Plan four dinners for this week, reusing what we have"
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onSubmit();
        }}
      />
    </div>
  );
}
