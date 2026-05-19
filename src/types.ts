import type { AppSession, WcaPersonalBest } from "./database";

export type AppView = "timer" | "feed" | "people" | "profile";
export type TimerState = "ready" | "inspection" | "running";

export type ProfileView = {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  bio: string;
  wcaId: string;
  wcaPersonalBests: WcaPersonalBest[];
  following?: boolean;
  sessions: AppSession[];
  isSelf: boolean;
};
