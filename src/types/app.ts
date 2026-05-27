import type { AppSession, WcaPersonalBest } from "../data/database";

export type AppView = "feed" | "people" | "profile" | "timer";
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
