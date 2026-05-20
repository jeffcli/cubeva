import type { User } from "@supabase/supabase-js";
import { formatSessionTimestamp } from "./dateUtils";
import { supabase } from "./supabase";

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
  user: string;
  avatar: string;
  puzzle: string;
  title: string;
  solves: AppSolve[];
  createdAt: string;
  createdAtSort?: string;
  liked: boolean;
};

export type AppProfile = {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  wca_id: string | null;
  created_at: string;
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
  bio: string;
  wcaId: string;
  sessions: AppSession[];
};

const profileColumns = "id, display_name, username, bio, wca_id, created_at";

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

export function getUserDisplay(user: User | null, profile?: AppProfile | null) {
  const displayName = String(
    profile?.display_name ||
      user?.user_metadata.display_name ||
      user?.email?.split("@")[0] ||
      "Demo Cuber",
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

  if (error) throw error;
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

  if (error) throw error;

  return ((data as WcaPersonalBestRow[] | null) ?? []).map(mapWcaPersonalBestRow);
}

export async function fetchUserSessions(user: User): Promise<AppSession[]> {
  if (!supabase) return [];

  const profile = await fetchProfile(user.id);
  if (!profile) return [];

  return fetchPublicSessionsForProfile(profile);
}

export async function fetchDiscoverProfiles(userId: string): Promise<SocialProfile[]> {
  if (!supabase) return [];

  const [followingIds, profiles] = await Promise.all([
    fetchFollowingIds(userId),
    fetchProfilesExcept(userId),
  ]);

  const sessionsByUser = await fetchPublicSessionsForUsers(profiles);

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
      bio: profile.bio ?? "",
      wcaId: profile.wca_id ?? "",
      sessions,
    };
  });
}

export async function fetchFollowingFeed(userId: string): Promise<AppSession[]> {
  if (!supabase) return [];

  const followingIds = await fetchFollowingIds(userId);
  if (!followingIds.size) return [];

  const profiles = await fetchProfilesByIds([...followingIds]);
  const sessionsByUser = await fetchPublicSessionsForUsers(profiles);

  return [...sessionsByUser.values()]
    .flat()
    .sort((a, b) => Date.parse(b.createdAtSort ?? b.createdAt) - Date.parse(a.createdAtSort ?? a.createdAt));
}

export async function fetchPublicSessionsForProfile(profile: AppProfile): Promise<AppSession[]> {
  const sessionsByUser = await fetchPublicSessionsForUsers([profile]);
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

async function fetchPublicSessionsForUsers(profiles: AppProfile[]) {
  if (!supabase || !profiles.length) return new Map<string, AppSession[]>();

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, puzzle, title, created_at, solves(id, time_ms, penalty, scramble, notes, created_at)")
    .in("user_id", profiles.map((profile) => profile.id))
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "solves", ascending: false });

  if (error) throw error;

  const grouped = new Map<string, AppSession[]>();

  for (const session of (data as SessionRow[] | null) ?? []) {
    const profile = profileMap.get(session.user_id);
    if (!profile) continue;
    const display = getUserDisplay(null, profile);
    const appSession = mapSessionRow(session, display.displayName, display.initials);
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
    user: display.displayName,
    avatar: display.initials,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionTimestamp(session.created_at),
    createdAtSort: session.created_at,
    liked: false,
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

async function ensureProfile(user: User) {
  if (!supabase) return;

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) throw new Error(errorMessage(fetchError, "Could not check profile."));
  if (existingProfile) return;

  const display = getUserDisplay(user);
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: display.username,
      display_name: display.displayName,
    });

  if (error) throw new Error(errorMessage(error, "Could not create profile."));
}

function mapSessionRow(session: SessionRow, user: string, avatar: string): AppSession {
  return {
    id: session.id,
    user,
    avatar,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionTimestamp(session.created_at),
    createdAtSort: session.created_at,
    liked: false,
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

function parseSolveResultType(solve: SolveRow): "time" | "moves" {
  return solve.notes?.startsWith("fmc_moves:") ? "moves" : "time";
}

function normalizeWcaId(wcaId: string) {
  const trimmed = wcaId.trim().toUpperCase();
  return trimmed.length ? trimmed : null;
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
