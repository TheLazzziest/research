export const tokens = {
  planService: "planService",
  speechService: "speechService",
} as const;

export type Token = (typeof tokens)[keyof typeof tokens];
