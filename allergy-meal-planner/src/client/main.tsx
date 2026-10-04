import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./ui.tsx";
import { App } from "./App.tsx";
import { Container } from "../shared/container.ts";
import { ServicesProvider } from "./di/context.tsx";
import { tokens } from "./di/tokens.ts";
import { HttpPlanService } from "./services/plan.service.ts";
import { BrowserSpeechService } from "./services/speech.service.ts";

// Composition root: wire concrete adapters to tokens, then render.
const container = new Container()
  .register(tokens.planService, () => new HttpPlanService())
  .register(tokens.speechService, () => new BrowserSpeechService());

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

createRoot(rootEl).render(
  <ThemeProvider>
    <ServicesProvider container={container}>
      <App />
    </ServicesProvider>
  </ThemeProvider>,
);
