import type { AgentConfig } from "../config.ts";
import type { AgentPort, ClassifierPort, RoleProvider, SkillRepository } from "./ports.ts";
import type { PlanRequest, PlanResult } from "../../shared/types.ts";
import { buildController } from "./controller.ts";

// Application service: runs the controller graph. The graph owns loops/branches; this
// service only invokes it. Depends on abstractions only. (DIP)
export class AgentService {
  private readonly controller;

  constructor(
    agent: AgentPort,
    skills: SkillRepository,
    role: RoleProvider,
    classifier: ClassifierPort,
    private readonly config: AgentConfig,
  ) {
    this.controller = buildController({ agent, skills, role, classifier, config });
  }

  async plan(request: PlanRequest): Promise<PlanResult> {
    const final = await this.controller.invoke(
      { request: request.text, threadId: request.threadId, revisions: 0 },
      { recursionLimit: 12 },
    );
    return {
      text: final.reply ?? "",
      provider: this.config.provider,
      model: this.config.model,
      threadId: final.threadId,
      gate: final.verdict,
    };
  }
}
