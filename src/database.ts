import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Penalty = "ok" | "+2" | "dnf";

export type AppSolve = {
  id: string;
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  createdAt: string;
};

export type AppSession = {
  id: string;
  user: string;
  avatar: string;
  puzzle: string;
  title: string;
  solves: AppSolve[];
  createdAt: string;
  liked: boolean;
};

export type AppProfile = {
  id: string;
  display_name: string;
  username: string;
  bio: string | null;
  created_at: string;
};

type SolveRow = {
  id: string;
  time_ms: number;
  penalty: Penalty;
  scramble: string | null;
  created_at: string;
};

type SessionRow = {
  id: string;
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
  const display = getUserDisplay(user, profile);
  const displayName = display.displayName;
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || display.initials;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, puzzle, title, created_at, solves(id, time_ms, penalty, scramble, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "solves", ascending: false });

  if (error) throw error;

  return ((data as SessionRow[] | null) ?? []).map((session) => ({
    id: session.id,
    user: displayName,
    avatar: initials,
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
    })),
  }));
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

  if (sessionError) throw sessionError;

  const solveRows = solves.map((solve) => ({
    session_id: session.id,
    time_ms: solve.timeMs,
    penalty: solve.penalty,
    scramble: solve.scramble,
    created_at: solve.createdAt,
  }));

  const { data: savedSolves, error: solvesError } = await supabase
    .from("solves")
    .insert(solveRows)
    .select("id, time_ms, penalty, scramble, created_at");

  if (solvesError) throw solvesError;

  const display = getUserDisplay(user);

  return {
    id: session.id,
    user: display.displayName,
    avatar: display.initials,
    puzzle: session.puzzle,
    title: session.title,
    createdAt: formatSessionDate(session.created_at),
    liked: false,
    solves: ((savedSolves as SolveRow[] | null) ?? []).map((solve) => ({
      id: solve.id,
      timeMs: solve.time_ms,
      penalty: solve.penalty,
      scramble: solve.scramble ?? "",
      createdAt: solve.created_at,
    })),
  };
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
