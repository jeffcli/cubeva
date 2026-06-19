import type { User } from "@supabase/supabase-js";
import type {
  AppProfile,
  AppBattle,
  AppSession,
  AppComment,
  AppNotification,
  AppSolve,
  BattleGoal,
  BattleStatus,
  NotificationType,
  Penalty,
  ProfileSocialCounts,
  SocialProfile,
  WcaPersonalBest,
} from "./domain";
export type {
  AppProfile,
  AppBattle,
  AppSession,
  AppComment,
  AppNotification,
  AppSolve,
  BattleGoal,
  BattleStatus,
  LeaderboardEntry,
  LeaderboardMetric,
  NotificationType,
  Penalty,
  ProfileSocialCounts,
  SocialProfile,
  WcaPersonalBest,
} from "./domain";
import { supabase } from "../services/supabase";
import { formatSessionTimestamp } from "../utils/dateUtils";

const profileColumns = "id, display_name, username, bio, wca_id, created_at";
const missingBattlesTableMessage =
  "Battles are not set up in Supabase yet. Run supabase/add-battles.sql in the Supabase SQL editor, then try again.";
const wcaIdPattern = /^[0-9]{4}[A-Z]{4}[0-9]{2}$/;
const wcaPersonApiBase =
  "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons";

const wcaEventNames: Record<string, string> = {
  "222": "2x2x2 Cube",
  "333": "3x3x3 Cube",
  "444": "4x4x4 Cube",
  "555": "5x5x5 Cube",
  "666": "6x6x6 Cube",
  "777": "7x7x7 Cube",
  "333bf": "3x3x3 Blindfolded",
  "333fm": "3x3x3 Fewest Moves",
  "333mbf": "3x3x3 Multi-Blind",
  "333oh": "3x3x3 One-Handed",
  "444bf": "4x4x4 Blindfolded",
  "555bf": "5x5x5 Blindfolded",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
};

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter(Boolean)
      .map(String)
      .join(" ");
  }

  return fallback;
}

function profileSaveErrorMessage(error: unknown) {
  const message = errorMessage(error, "Could not save profile.");
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("wca_id") &&
    (lowerMessage.includes("duplicate") || lowerMessage.includes("unique"))
  ) {
    return "That WCA ID is already linked to another profile.";
  }

  if (
    lowerMessage.includes("username") &&
    (lowerMessage.includes("duplicate") || lowerMessage.includes("unique"))
  ) {
    return "That username is already taken.";
  }

  if (
    lowerMessage.includes("wca_id") &&
    (lowerMessage.includes("foreign key") ||
      lowerMessage.includes("violates foreign key constraint"))
  ) {
    return "WCA IDs should save before PBs are imported. Run supabase/fix-wca-id-save.sql in Supabase, then try again.";
  }

  return message;
}

function isMissingTableError(error: unknown, tableName: string) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes(tableName.toLowerCase()) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("pgrst205"))
  );
}

type SolveRow = {
  id: string;
  time_ms: number;
  penalty: Penalty;
  scramble: string | null;
  notes: string | null;
  created_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  puzzle: string;
  title: string;
  created_at: string;
  solves: SolveRow[];
};

type KudoRow = {
  session_id: string;
  user_id: string;
};

type CommentRow = {
  id: string;
  session_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: AppProfile | AppProfile[] | null;
};

type SessionSocialData = {
  comments: AppComment[];
  kudosCount: number;
  liked: boolean;
};

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  session_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor: AppProfile | AppProfile[] | null;
};

type WcaPersonalBestRow = {
  wca_id: string;
  event_id: string;
  event_name: string;
  best_single: number | null;
  best_average: number | null;
  world_rank_single: number | null;
  country_rank_single: number | null;
  continent_rank_single: number | null;
  world_rank_average: number | null;
  country_rank_average: number | null;
  continent_rank_average: number | null;
  updated_at: string;
};

type WcaRankEntry = {
  eventId?: string;
  best?: number;
  rank?: {
    world?: number;
    country?: number;
    continent?: number;
  };
};

type WcaPerson = {
  rank?: {
    singles?: WcaRankEntry[];
    averages?: WcaRankEntry[];
  };
};

type BattleRow = {
  id: string;
  creator_id: string;
  opponent_id: string;
  event_label: string;
  goal: BattleGoal;
  status: BattleStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
  creator: AppProfile | AppProfile[] | null;
  opponent: AppProfile | AppProfile[] | null;
};

const emptySocialCounts: ProfileSocialCounts = {
  followers: 0,
  following: 0,
};

export function getUserDisplay(user: User | null, profile?: AppProfile | null) {
  const displayName = String(
      profile?.display_name ||
      user?.user_metadata.display_name ||
      user?.email?.split("@")[0] ||
      "CubeVa Cuber",
  );
  const username = String(
    profile?.username ||
      user?.user_metadata.username ||
      displayName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
  );
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Y";

  return { displayName, username, initials, bio: profile?.bio ?? "", wcaId: profile?.wca_id ?? "" };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function ensureProfile(user: User) {
  if (!supabase) return;

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) throw new Error(errorMessage(fetchError, "Could not check profile."));
  if (existingProfile) return;

  const display = getUserDisplay(user);
  const baseUsername = display.username || `cuber-${user.id.slice(0, 8)}`;
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: baseUsername,
      display_name: display.displayName,
    });

  if (!error) return;

  const { error: fallbackError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: `${baseUsername}-${user.id.slice(0, 8)}`,
      display_name: display.displayName,
    });

  if (fallbackError) {
    throw new Error(errorMessage(fallbackError, "Could not create profile."));
  }
}

export async function updateProfile({
  userId,
  displayName,
  username,
  bio,
  wcaId,
}: {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  wcaId: string;
}): Promise<AppProfile> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalizedWcaId = normalizeWcaId(wcaId);
  if (normalizedWcaId && !wcaIdPattern.test(normalizedWcaId)) {
    throw new Error("WCA ID should look like 2019SMIT01.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      bio,
      wca_id: normalizedWcaId,
    })
    .eq("id", userId)
    .select(profileColumns)
    .single();

  if (error) throw new Error(profileSaveErrorMessage(error));
  return data;
}

export async function fetchWcaPersonalBests(wcaId: string): Promise<WcaPersonalBest[]> {
  if (!supabase) return [];

  const normalizedWcaId = normalizeWcaId(wcaId);
  if (!normalizedWcaId) return [];

  const { data, error } = await supabase
    .from("wca_personal_bests")
    .select(
      "wca_id, event_id, event_name, best_single, best_average, world_rank_single, country_rank_single, continent_rank_single, world_rank_average, country_rank_average, continent_rank_average, updated_at",
    )
    .eq("wca_id", normalizedWcaId)
    .order("event_name", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "wca_personal_bests")) {
      return [];
    }

    throw error;
  }

  return ((data as WcaPersonalBestRow[] | null) ?? []).map(mapWcaPersonalBestRow);
}

export async function fetchOfficialWcaPersonalBests(
  wcaId: string,
): Promise<WcaPersonalBest[]> {
  const normalizedWcaId = normalizeWcaId(wcaId);
  if (!normalizedWcaId) return [];
  if (!wcaIdPattern.test(normalizedWcaId)) {
    throw new Error("WCA ID should look like 2019SMIT01.");
  }

  const response = await fetch(`${wcaPersonApiBase}/${normalizedWcaId}.json`);

  if (response.status === 404) {
    throw new Error("That WCA ID was not found.");
  }

  if (!response.ok) {
    throw new Error(`WCA returned ${response.status}. Try again later.`);
  }

  const person = (await response.json()) as WcaPerson;
  const byEvent = new Map<string, WcaPersonalBest>();
  const updatedAt = new Date().toISOString();

  for (const single of person.rank?.singles ?? []) {
    if (!single.eventId) continue;
    const personalBest = getOrCreateOfficialWcaPersonalBest(
      byEvent,
      normalizedWcaId,
      single.eventId,
      updatedAt,
    );
    personalBest.bestSingle = numberOrNull(single.best);
    personalBest.worldRankSingle = numberOrNull(single.rank?.world);
    personalBest.countryRankSingle = numberOrNull(single.rank?.country);
    personalBest.continentRankSingle = numberOrNull(single.rank?.continent);
  }

  for (const average of person.rank?.averages ?? []) {
    if (!average.eventId) continue;
    const personalBest = getOrCreateOfficialWcaPersonalBest(
      byEvent,
      normalizedWcaId,
      average.eventId,
      updatedAt,
    );
    personalBest.bestAverage = numberOrNull(average.best);
    personalBest.worldRankAverage = numberOrNull(average.rank?.world);
    personalBest.countryRankAverage = numberOrNull(average.rank?.country);
    personalBest.continentRankAverage = numberOrNull(average.rank?.continent);
  }

  return [...byEvent.values()].sort((a, b) =>
    a.eventName.localeCompare(b.eventName),
  );
}

export async function importWcaPersonalBests(wcaId: string) {
  if (!supabase) return false;

  const normalizedWcaId = normalizeWcaId(wcaId);
  if (!normalizedWcaId || !wcaIdPattern.test(normalizedWcaId)) return false;

  const { data, error } = await supabase.functions.invoke<{
    importedCount: number;
    results: { status: string; error?: string }[];
  }>("import-wca-personal-bests", {
    body: { wcaId: normalizedWcaId },
  });

  if (error) throw error;

  const result = data?.results?.[0];
  if (result?.status === "error") {
    throw new Error(result.error ?? "Could not import WCA personal bests.");
  }

  return Boolean(data?.importedCount);
}

export async function fetchUserSessions(user: User): Promise<AppSession[]> {
  if (!supabase) return [];

  const profile = await fetchProfile(user.id);
  if (!profile) return [];

  return fetchPublicSessionsForProfile(profile, user.id);
}

export async function fetchDiscoverProfiles(userId: string): Promise<SocialProfile[]> {
  if (!supabase) return [];

  const [followingIds, profiles] = await Promise.all([
    fetchFollowingIds(userId),
    fetchProfilesExcept(userId),
  ]);

  const [sessionsByUser, socialCountsByUser] = await Promise.all([
    fetchPublicSessionsForUsers(profiles, userId),
    fetchSocialCounts(profiles.map((profile) => profile.id)),
  ]);

  return profiles.map((profile) => {
    const display = getUserDisplay(null, profile);
    const sessions = sessionsByUser.get(profile.id) ?? [];

    return {
      id: profile.id,
      name: display.displayName,
      handle: `@${display.username}`,
      avatar: display.initials,
      average: sessions.length ? `avg ${averageLabel(sessions)}` : "no sessions",
      following: followingIds.has(profile.id),
      followersCount: socialCountsByUser.get(profile.id)?.followers ?? 0,
      followingCount: socialCountsByUser.get(profile.id)?.following ?? 0,
      bio: profile.bio ?? "",
      wcaId: profile.wca_id ?? "",
      sessions,
    };
  });
}

export async function fetchProfileSocialCounts(
  profileId: string,
): Promise<ProfileSocialCounts> {
  const counts = await fetchSocialCounts([profileId]);
  return counts.get(profileId) ?? emptySocialCounts;
}

export async function fetchFollowingFeed(userId: string): Promise<AppSession[]> {
  if (!supabase) return [];

  const followingIds = await fetchFollowingIds(userId);
  if (!followingIds.size) return [];

  const profiles = await fetchProfilesByIds([...followingIds]);
  const sessionsByUser = await fetchPublicSessionsForUsers(profiles, userId);

  return [...sessionsByUser.values()]
    .flat()
    .sort((a, b) => Date.parse(b.createdAtSort ?? b.createdAt) - Date.parse(a.createdAtSort ?? a.createdAt));
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(`id, recipient_id, actor_id, type, session_id, message, read, created_at, actor:actor_id (${profileColumns})`)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    const message = errorMessage(error).toLowerCase();
    if (
      message.includes("notifications") &&
      (message.includes("does not exist") ||
        message.includes("schema cache"))
    ) {
      return [];
    }
    throw error;
  }

  return ((data as NotificationRow[] | null) ?? []).map(mapNotificationRow);
}

export async function fetchBattles(userId: string): Promise<AppBattle[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("battles")
    .select(
      `id, creator_id, opponent_id, event_label, goal, status, starts_at, ends_at, created_at, creator:creator_id (${profileColumns}), opponent:opponent_id (${profileColumns})`,
    )
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "battles")) {
      return [];
    }
    throw error;
  }

  const battleRows = (data as BattleRow[] | null) ?? [];
  const profiles = uniqueBattleProfiles(battleRows);
  const sessionsByUser = await fetchPublicSessionsForUsers(profiles, userId);

  return battleRows.map((battle) => mapBattleRow(battle, sessionsByUser));
}

export async function createBattle({
  creatorId,
  durationDays,
  eventLabel,
  goal,
  opponentId,
}: {
  creatorId: string;
  durationDays: number;
  eventLabel: string;
  goal: BattleGoal;
  opponentId: string;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + durationDays);

  const { error } = await supabase.from("battles").insert({
    creator_id: creatorId,
    opponent_id: opponentId,
    event_label: eventLabel,
    goal,
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });

  if (error) {
    if (isMissingTableError(error, "battles")) {
      throw new Error(missingBattlesTableMessage);
    }

    throw new Error(errorMessage(error, "Could not create battle."));
  }
}

export async function updateBattleStatus({
  battleId,
  status,
}: {
  battleId: string;
  status: BattleStatus;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("battles")
    .update({ status })
    .eq("id", battleId);

  if (error) {
    if (isMissingTableError(error, "battles")) {
      throw new Error(missingBattlesTableMessage);
    }

    throw new Error(errorMessage(error, "Could not update battle."));
  }
}

export async function createNotification({
  actorId,
  message,
  recipientId,
  sessionId,
  type,
}: {
  actorId: string;
  message: string;
  recipientId: string;
  sessionId?: string | null;
  type: NotificationType;
}): Promise<AppNotification | null> {
  if (!supabase || actorId === recipientId) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      actor_id: actorId,
      message,
      recipient_id: recipientId,
      session_id: sessionId ?? null,
      type,
    })
    .select(`id, recipient_id, actor_id, type, session_id, message, read, created_at, actor:actor_id (${profileColumns})`)
    .single();

  if (error) throw new Error(errorMessage(error, "Could not create notification."));
  return mapNotificationRow(data as NotificationRow);
}

export async function markNotificationsRead(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  if (error) throw new Error(errorMessage(error, "Could not update notifications."));
}

export async function fetchPublicSessionsForProfile(
  profile: AppProfile,
  viewerId?: string,
): Promise<AppSession[]> {
  const sessionsByUser = await fetchPublicSessionsForUsers([profile], viewerId);
  return sessionsByUser.get(profile.id) ?? [];
}

export async function setFollow({
  followerId,
  followingId,
  follow,
}: {
  followerId: string;
  followingId: string;
  follow: boolean;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (follow) {
    const { error } = await supabase
      .from("follows")
      .upsert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;
}

async function fetchFollowingIds(userId: string) {
  if (!supabase) return new Set<string>();

  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (error) throw error;
  return new Set(((data as { following_id: string }[] | null) ?? []).map((row) => row.following_id));
}

async function fetchSocialCounts(profileIds: string[]) {
  const counts = new Map<string, ProfileSocialCounts>();
  for (const profileId of profileIds) {
    counts.set(profileId, { ...emptySocialCounts });
  }

  if (!supabase || !profileIds.length) return counts;

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, following_id")
    .or(
      `follower_id.in.(${profileIds.join(",")}),following_id.in.(${profileIds.join(",")})`,
    );

  if (error) return counts;

  for (const follow of
    (data as { follower_id: string; following_id: string }[] | null) ?? []) {
    const followerCounts = counts.get(follow.follower_id);
    if (followerCounts) {
      followerCounts.following += 1;
    }

    const followingCounts = counts.get(follow.following_id);
    if (followingCounts) {
      followingCounts.followers += 1;
    }
  }

  return counts;
}

async function fetchProfilesExcept(userId: string): Promise<AppProfile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .neq("id", userId)
    .order("username", { ascending: true })
    .limit(25);

  if (error) throw error;
  return (data as AppProfile[] | null) ?? [];
}

async function fetchProfilesByIds(ids: string[]): Promise<AppProfile[]> {
  if (!supabase || !ids.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .in("id", ids);

  if (error) throw error;
  return (data as AppProfile[] | null) ?? [];
}

async function fetchPublicSessionsForUsers(
  profiles: AppProfile[],
  viewerId?: string,
) {
  if (!supabase || !profiles.length) return new Map<string, AppSession[]>();

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, puzzle, title, created_at, solves(id, time_ms, penalty, scramble, notes, created_at)")
    .in("user_id", profiles.map((profile) => profile.id))
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "solves", ascending: false });

  if (error) throw error;

  const socialDataBySession = await fetchSessionSocialData(
    ((data as SessionRow[] | null) ?? []).map((session) => session.id),
    viewerId,
  );
  const grouped = new Map<string, AppSession[]>();

  for (const session of (data as SessionRow[] | null) ?? []) {
    const profile = profileMap.get(session.user_id);
    if (!profile) continue;
    const display = getUserDisplay(null, profile);
    const appSession = mapSessionRow(
      session,
      display.displayName,
      display.initials,
      socialDataBySession.get(session.id),
    );
    grouped.set(session.user_id, [...(grouped.get(session.user_id) ?? []), appSession]);
  }

  return grouped;
}

export async function saveSession({
  user,
  puzzle,
  title,
  solves,
}: {
  user: User;
  puzzle: string;
  title: string;
  solves: AppSolve[];
}) {
  if (!supabase) throw new Error("Supabase is not configured.");
  await ensureProfile(user);

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      puzzle,
      title,
      visibility: "public",
      is_manual: false,
      ended_at: new Date().toISOString(),
    })
    .select("id, puzzle, title, created_at")
    .single();

  if (sessionError) throw new Error(errorMessage(sessionError, "Could not create session."));

  const solveRows = solves.map((solve) => ({
    session_id: session.id,
    time_ms: solve.timeMs,
    penalty: solve.penalty,
    scramble: solve.scramble,
    notes: solve.resultType === "moves" ? `fmc_moves:${solve.timeMs}` : null,
    created_at: solve.createdAt,
  }));

  const { data: savedSolves, error: solvesError } = await supabase
    .from("solves")
    .insert(solveRows)
    .select("id, time_ms, penalty, scramble, notes, created_at");

  if (solvesError) throw new Error(errorMessage(solvesError, "Could not save solves."));

  const display = getUserDisplay(user);

  return {
    id: session.id,
    userId: user.id,
    user: display.displayName,
    avatar: display.initials,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionTimestamp(session.created_at),
    createdAtSort: session.created_at,
    liked: false,
    kudosCount: 0,
    comments: [],
    solves: ((savedSolves as SolveRow[] | null) ?? []).map((solve) => ({
      id: solve.id,
      timeMs: solve.time_ms,
      penalty: solve.penalty,
      scramble: solve.scramble ?? "",
      createdAt: solve.created_at,
      resultType: parseSolveResultType(solve),
    })),
  };
}

export async function deleteSession(sessionId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(errorMessage(error, "Could not delete session."));
}

export async function setSessionKudos({
  sessionId,
  userId,
  liked,
}: {
  sessionId: string;
  userId: string;
  liked: boolean;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  if (liked) {
    const { error } = await supabase
      .from("session_kudos")
      .upsert({ session_id: sessionId, user_id: userId });

    if (error) throw new Error(errorMessage(error, "Could not add kudos."));
    return;
  }

  const { error } = await supabase
    .from("session_kudos")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (error) throw new Error(errorMessage(error, "Could not remove kudos."));
}

export async function addSessionComment({
  body,
  sessionId,
  user,
}: {
  body: string;
  sessionId: string;
  user: User;
}): Promise<AppComment> {
  if (!supabase) throw new Error("Supabase is not configured.");
  await ensureProfile(user);

  const { data, error } = await supabase
    .from("session_comments")
    .insert({
      body: body.trim(),
      session_id: sessionId,
      user_id: user.id,
    })
    .select(`id, session_id, user_id, body, created_at, profiles:user_id (${profileColumns})`)
    .single();

  if (error) throw new Error(errorMessage(error, "Could not add comment."));

  return mapCommentRow(data as CommentRow);
}

export async function deleteSessionComment(commentId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase
    .from("session_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw new Error(errorMessage(error, "Could not delete comment."));
}

function mapSessionRow(
  session: SessionRow,
  user: string,
  avatar: string,
  socialData: SessionSocialData = { comments: [], kudosCount: 0, liked: false },
): AppSession {
  return {
    id: session.id,
    userId: session.user_id,
    user,
    avatar,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionTimestamp(session.created_at),
    createdAtSort: session.created_at,
    liked: socialData.liked,
    kudosCount: socialData.kudosCount,
    comments: socialData.comments,
    solves: session.solves.map((solve) => ({
      id: solve.id,
      timeMs: solve.time_ms,
      penalty: solve.penalty,
      scramble: solve.scramble ?? "",
      createdAt: solve.created_at,
      resultType: parseSolveResultType(solve),
    })),
  };
}

function mapNotificationRow(row: NotificationRow): AppNotification {
  const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
  const display = getUserDisplay(null, actor);

  return {
    id: row.id,
    type: row.type,
    actorId: row.actor_id,
    actorName: display.displayName,
    actorAvatar: display.initials,
    message: row.message,
    sessionId: row.session_id,
    read: row.read,
    createdAt: formatSessionTimestamp(row.created_at),
    createdAtSort: row.created_at,
  };
}

async function fetchSessionSocialData(sessionIds: string[], viewerId?: string) {
  const socialData = new Map<string, SessionSocialData>();
  for (const sessionId of sessionIds) {
    socialData.set(sessionId, { comments: [], kudosCount: 0, liked: false });
  }

  if (!supabase || !sessionIds.length) return socialData;

  try {
    const [kudosResponse, commentsResponse] = await Promise.all([
      supabase
        .from("session_kudos")
        .select("session_id, user_id")
        .in("session_id", sessionIds),
      supabase
        .from("session_comments")
        .select(`id, session_id, user_id, body, created_at, profiles:user_id (${profileColumns})`)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ]);

    if (kudosResponse.error) throw kudosResponse.error;
    if (commentsResponse.error) throw commentsResponse.error;

    for (const kudo of (kudosResponse.data as KudoRow[] | null) ?? []) {
      const sessionSocialData = socialData.get(kudo.session_id);
      if (!sessionSocialData) continue;
      sessionSocialData.kudosCount += 1;
      sessionSocialData.liked =
        sessionSocialData.liked || Boolean(viewerId && kudo.user_id === viewerId);
    }

    for (const comment of (commentsResponse.data as CommentRow[] | null) ?? []) {
      const sessionSocialData = socialData.get(comment.session_id);
      if (!sessionSocialData) continue;
      sessionSocialData.comments.push(mapCommentRow(comment));
    }
  } catch {
    return socialData;
  }

  return socialData;
}

function mapCommentRow(row: CommentRow): AppComment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const display = getUserDisplay(null, profile);

  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    user: display.displayName,
    avatar: display.initials,
    body: row.body,
    createdAt: formatSessionTimestamp(row.created_at),
    createdAtSort: row.created_at,
  };
}

function parseSolveResultType(solve: SolveRow): "time" | "moves" {
  return solve.notes?.startsWith("fmc_moves:") ? "moves" : "time";
}

function normalizeWcaId(wcaId: string) {
  const trimmed = wcaId.trim().toUpperCase();
  return trimmed.length ? trimmed : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getOrCreateOfficialWcaPersonalBest(
  byEvent: Map<string, WcaPersonalBest>,
  wcaId: string,
  eventId: string,
  updatedAt: string,
) {
  if (!byEvent.has(eventId)) {
    byEvent.set(eventId, {
      wcaId,
      eventId,
      eventName: wcaEventNames[eventId] ?? eventId,
      bestSingle: null,
      bestAverage: null,
      worldRankSingle: null,
      countryRankSingle: null,
      continentRankSingle: null,
      worldRankAverage: null,
      countryRankAverage: null,
      continentRankAverage: null,
      updatedAt,
    });
  }

  return byEvent.get(eventId) as WcaPersonalBest;
}

function mapWcaPersonalBestRow(row: WcaPersonalBestRow): WcaPersonalBest {
  return {
    wcaId: row.wca_id,
    eventId: row.event_id,
    eventName: row.event_name,
    bestSingle: row.best_single,
    bestAverage: row.best_average,
    worldRankSingle: row.world_rank_single,
    countryRankSingle: row.country_rank_single,
    continentRankSingle: row.continent_rank_single,
    worldRankAverage: row.world_rank_average,
    countryRankAverage: row.country_rank_average,
    continentRankAverage: row.continent_rank_average,
    updatedAt: row.updated_at,
  };
}

function uniqueBattleProfiles(rows: BattleRow[]) {
  const profiles = new Map<string, AppProfile>();

  for (const row of rows) {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator;
    const opponent = Array.isArray(row.opponent) ? row.opponent[0] : row.opponent;
    if (creator) profiles.set(creator.id, creator);
    if (opponent) profiles.set(opponent.id, opponent);
  }

  return [...profiles.values()];
}

function mapBattleRow(
  row: BattleRow,
  sessionsByUser: Map<string, AppSession[]>,
): AppBattle {
  const creatorProfile = Array.isArray(row.creator) ? row.creator[0] : row.creator;
  const opponentProfile = Array.isArray(row.opponent) ? row.opponent[0] : row.opponent;
  const creatorDisplay = getUserDisplay(null, creatorProfile);
  const opponentDisplay = getUserDisplay(null, opponentProfile);

  return {
    id: row.id,
    eventLabel: row.event_label,
    goal: row.goal,
    status: row.status,
    startsAt: formatSessionTimestamp(row.starts_at),
    startsAtSort: row.starts_at,
    endsAt: formatSessionTimestamp(row.ends_at),
    endsAtSort: row.ends_at,
    createdAt: formatSessionTimestamp(row.created_at),
    createdAtSort: row.created_at,
    creator: {
      id: row.creator_id,
      name: creatorDisplay.displayName,
      handle: `@${creatorDisplay.username}`,
      avatar: creatorDisplay.initials,
      sessions: sessionsByUser.get(row.creator_id) ?? [],
    },
    opponent: {
      id: row.opponent_id,
      name: opponentDisplay.displayName,
      handle: `@${opponentDisplay.username}`,
      avatar: opponentDisplay.initials,
      sessions: sessionsByUser.get(row.opponent_id) ?? [],
    },
  };
}

function averageLabel(sessions: AppSession[]) {
  const solves = sessions
    .flatMap((session) => session.solves)
    .filter((solve) => solve.penalty !== "dnf");

  if (!solves.length) return "DNF";

  const total = solves.reduce(
    (sum, solve) => sum + solve.timeMs + (solve.penalty === "+2" ? 2000 : 0),
    0,
  );

  return (total / solves.length / 1000).toFixed(2);
}
