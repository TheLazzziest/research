import path from "node:path";
import { Container } from "../../shared/container.ts";
import { agentConfig, config } from "../config.ts";
import { BackboardAgent } from "../adapters/backboard.agent.ts";
import { BackboardClassifier } from "../adapters/backboard.classifier.ts";
import { FsSkillRepository } from "../adapters/fs.skills.ts";
import { FsRoleProvider } from "../adapters/fs.role.ts";
import { AgentService } from "../domain/agent.service.ts";
import { tokens } from "./tokens.ts";

// Composition root: the only place that knows concrete adapters. (DIP)
export function createContainer(root: string): Container {
  return new Container()
    .register(tokens.skills, () => new FsSkillRepository(path.join(root, "skills")))
    .register(tokens.role, () => new FsRoleProvider(path.join(root, "AGENTS.md")))
    .register(tokens.agent, () => new BackboardAgent(config.backboardApiKey))
    .register(tokens.classifier, () => new BackboardClassifier(config.backboardApiKey))
    .register(tokens.agentService, (container) =>
      new AgentService(
        container.resolve(tokens.agent),
        container.resolve(tokens.skills),
        container.resolve(tokens.role),
        container.resolve(tokens.classifier),
        agentConfig(),
      ),
    );
}
