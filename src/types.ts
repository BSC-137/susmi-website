export interface MediaRef {
  title: string;
  artist?: string;
}

export interface ComfortMedia {
  label: string;
  title: string;
}

export interface ExecPrompts {
  altPath?: string;
  altAnswer?: string;
  cantLiveWithout?: string;
  redFlag?: string;
  secretTalent?: string;
  lastMeal?: string;
  bucketList?: string[];
}

export interface Exec {
  id: string;
  name: string;
  role: string;
  order: number;
  degree: string;
  linkedin: string;
  photo: string;
  photoAlt: string;
  photoSecondary?: string | null;
  quote?: string | null;
  nowPlaying?: MediaRef | null;
  comfortMedia?: ComfortMedia | null;
  prompts: ExecPrompts;
}

export function hasValidLinkedIn(url: string) {
  return Boolean(url) && !url.includes("REPLACE_ME") && url !== "#";
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
