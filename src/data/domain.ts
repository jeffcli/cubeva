export type Penalty = "ok" | "+2" | "dnf";

export type AppSolve = {
  id: string;
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  createdAt: string;
  resultType?: "time" | "moves";
};

export type AppSession = {
  id: string;
  userId: string;
  user: string;
  avatar: string;
  puzzle: string;
  title: string;
  solves: AppSolve[];
  createdAt: string;
  createdAtSort?: string;
  liked: boolean;
  kudosCount: number;
  comments: AppComment[];
};

export type NotificationType = "comment" | "follow" | "kudos";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  message: string;
  sessionId: string | null;
  read: boolean;
  createdAt: string;
  createdAtSort: string;
};

export type AppComment = {
  id: string;
  sessionId: string;
  userId: string;
  user: string;
  avatar: string;
  body: string;
  createdAt: string;
  createdAtSort: string;
};

export type AppProfile = {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  wca_id: string | null;
  created_at: string;
};

export type ProfileSocialCounts = {
  followers: number;
  following: number;
};

export type WcaPersonalBest = {
  wcaId: string;
  eventId: string;
  eventName: string;
  bestSingle: number | null;
  bestAverage: number | null;
  worldRankSingle: number | null;
  countryRankSingle: number | null;
  continentRankSingle: number | null;
  worldRankAverage: number | null;
  countryRankAverage: number | null;
  continentRankAverage: number | null;
  updatedAt: string;
};

export type SocialProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  average: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
  bio: string;
  wcaId: string;
  sessions: AppSession[];
};
