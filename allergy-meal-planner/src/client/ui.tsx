import type { ComponentType, ReactNode } from "react";
import * as MT from "@material-tailwind/react";

// Adapter for the Material Tailwind design system. Its generated prop types are
// incompatible across @types/react versions, so we expose a single loose surface here
// and let app components depend on this module instead of the library directly.
export type UiProps = Record<string, unknown> & { children?: ReactNode };

const loose = (component: unknown): ComponentType<UiProps> => component as ComponentType<UiProps>;

export const Alert = loose(MT.Alert);
export const Button = loose(MT.Button);
export const Card = loose(MT.Card);
export const CardBody = loose(MT.CardBody);
export const Chip = loose(MT.Chip);
export const Spinner = loose(MT.Spinner);
export const Switch = loose(MT.Switch);
export const Textarea = loose(MT.Textarea);
export const Typography = loose(MT.Typography);
export const ThemeProvider = loose(MT.ThemeProvider);
