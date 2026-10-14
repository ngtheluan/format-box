// A skin id is any string; the canonical list lives in Supabase (themes table).
export type Skin = string;

export const SKIN_STORAGE = {
  userChoice: "fb-skin",
  default: "fb-skin-default",
} as const;
