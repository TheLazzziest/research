import { createContext, useContext, type ReactNode } from "react";
import type { Container } from "../../shared/container.ts";

const ServicesContext = createContext<Container | null>(null);

export function ServicesProvider({ container, children }: { container: Container; children: ReactNode }) {
  return <ServicesContext.Provider value={container}>{children}</ServicesContext.Provider>;
}

export function useService<T>(token: string): T {
  const container = useContext(ServicesContext);
  if (!container) throw new Error("ServicesProvider is missing");
  return container.resolve<T>(token);
}
