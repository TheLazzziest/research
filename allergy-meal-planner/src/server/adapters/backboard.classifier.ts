import { BackboardClient, type ChatMessagesResponse, type SystemOneQuestion } from "backboard-sdk";
import type { ClassificationAnswers, ClassificationQuestions, ClassifierPort } from "../domain/ports.ts";

// Adapter: Backboard System One (TypeSafe Jev). Returns typed answers (probabilities,
// choices, scores) instead of prose. Separate inference: provider `typesafe`.
export class BackboardClassifier implements ClassifierPort {
  constructor(
    private readonly apiKey: string,
    private readonly provider = "typesafe",
    private readonly model = "jev-latest",
  ) {}

  async classify({ text, questions }: { text: string; questions: ClassificationQuestions }): Promise<ClassificationAnswers> {
    if (!this.apiKey) throw new Error("BACKBOARD_API_KEY is not set");
    const client = new BackboardClient({ apiKey: this.apiKey });
    const response = (await client.sendMessage({
      content: text,
      llmProvider: this.provider,
      modelName: this.model,
      stream: false,
      systemOne: { questions: questions as Record<string, SystemOneQuestion> },
    })) as ChatMessagesResponse;
    return (response.systemOne?.answers ?? {}) as ClassificationAnswers;
  }
}
