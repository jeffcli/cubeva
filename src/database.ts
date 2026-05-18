import type { User } from "@supabase/supabase-js";
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
  created_at: string;
};

export type SocialProfile = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  average: string;
  following: boolean;
  bio: string;
  sessions: AppSession[];
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

  return { displayName, username, initials, bio: profile?.bio ?? "" };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, created_at")
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
}: {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
}): Promise<AppProfile> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      bio,
    })
    .eq("id", userId)
    .select("id, display_name, username, bio, created_at")
    .single();

  if (error) throw error;
  return data;
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
    .select("id, display_name, username, bio, created_at")
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
    .select("id, display_name, username, bio, created_at")
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
    createdAt: formatSessionDate(session.created_at),
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

function formatSessionDate(value: string) {
  const date = new Date(value);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function mapSessionRow(session: SessionRow, user: string, avatar: string): AppSession {
  return {
    id: session.id,
    user,
    avatar,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionDate(session.created_at),
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
