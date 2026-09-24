export const APPLICATION_TYPES = {
  retail: {
    route: "/recruitment#application",
  },
  forever: {
    route: "/recruitment?application=forever#application",
  },
} as const;

export const APPLICATION_TYPE_VALUES = ["retail", "forever"] as const;

export type ApplicationType = keyof typeof APPLICATION_TYPES;
