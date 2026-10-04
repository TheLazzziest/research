import { BackboardClient, type ChatMessagesResponse } from "backboard-sdk";
import type { AgentPort, AgentReply, AgentTurn } from "../domain/ports.ts";

// Adapter: Backboard (hosted, open-weight models). One implementation of AgentPort.
export class BackboardAgent implements AgentPort {
  constructor(private readonly apiKey: string) {}

  async chat({ system, user, threadId, provider, model, memory }: AgentTurn): Promise<AgentReply> {
    if (!this.apiKey) throw new Error("BACKBOARD_API_KEY is not set");
    const client = new BackboardClient({ apiKey: this.apiKey });
    const response = (await client.sendMessage({
      content: user,
      systemPrompt: system,
      threadId,
      llm_provider: provider,
      model_name: model,
      memory,
      stream: false,
    })) as ChatMessagesResponse;
    return { text: response.content ?? "", provider, model, threadId: response.threadId };
  }
}
