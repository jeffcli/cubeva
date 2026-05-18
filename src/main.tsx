import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Clock,
  LogOut,
  Edit3,
  Flame,
  Heart,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import "./styles.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession, User } from "@supabase/supabase-js";
import {
  fetchProfile,
  fetchUserSessions,
  getUserDisplay,
  saveSession,
  updateProfile,
  type AppProfile,
  type AppSession,
  type AppSolve,
  type Penalty,
} from "./database";
import { isSupabaseConfigured, supabase } from "./supabase";

type FollowCandidate = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  average: string;
  following: boolean;
  bio: string;
  sessions: AppSession[];
};

const sampleScrambles = [
  "R U R' U' F2 D L2 U R2 F' U2",
  "F R U' R' U' R U R' F' L2 D2",
  "L2 B2 U' R2 F2 D B2 L' U R'",
  "R2 U2 F' L2 B D2 R U' B2 D",
  "U F2 R U' R2 F L' D2 B U2",
];

const starterSessions: AppSession[] = [
  {
    id: "s1",
    user: "Maya Chen",
    avatar: "MC",
    puzzle: "3x3",
    title: "Lunch break turning felt clean",
    createdAt: "11:42 AM",
    liked: true,
    solves: [
      makeSolve(18740, "ok"),
      makeSolve(17990, "ok"),
      makeSolve(19630, "+2"),
      makeSolve(17320, "ok"),
      makeSolve(18110, "ok"),
    ],
  },
  {
    id: "s2",
    user: "Noah Patel",
    avatar: "NP",
    puzzle: "OH",
    title: "One-handed consistency block",
    createdAt: "Yesterday",
    liked: false,
    solves: [
      makeSolve(31240, "ok"),
      makeSolve(29870, "ok"),
      makeSolve(33610, "ok"),
      makeSolve(30550, "ok"),
      makeSolve(32190, "dnf"),
    ],
  },
];

const initialSolves: AppSolve[] = [
  makeSolve(21420, "ok"),
  makeSolve(20350, "ok"),
  makeSolve(22810, "+2"),
  makeSolve(19770, "ok"),
];

const candidates: FollowCandidate[] = [
  {
    id: "u1",
    name: "Lena Ortiz",
    handle: "@lena2look",
    avatar: "LO",
    average: "avg 16.84",
    following: false,
    bio: "Color-neutral 3x3 solver working on smoother F2L and calmer last layers.",
    sessions: [
      makeCandidateSession("Lena Ortiz", "LO", "3x3", "Evening lookahead block", [16840, 17220, 16190, 17980, 16550]),
      makeCandidateSession("Lena Ortiz", "LO", "2x2", "Quick layer drills", [5290, 4810, 5120, 4960, 5030]),
    ],
  },
  {
    id: "u2",
    name: "Sam Rivera",
    handle: "@samcuber",
    avatar: "SR",
    average: "avg 21.03",
    following: true,
    bio: "Casual cuber chasing sub-20 while keeping solves fun.",
    sessions: [
      makeCandidateSession("Sam Rivera", "SR", "3x3", "Sub-20 attempt set", [21030, 19840, 22450, 20580, 21710]),
      makeCandidateSession("Sam Rivera", "SR", "Pyraminx", "Tips-only practice", [8120, 7790, 8400, 7950, 7680]),
    ],
  },
  {
    id: "u3",
    name: "Iris Zhou",
    handle: "@iriscross",
    avatar: "IZ",
    average: "avg 13.92",
    following: false,
    bio: "Cross planning nerd. Mostly 3x3, sometimes OH when the wrists cooperate.",
    sessions: [
      makeCandidateSession("Iris Zhou", "IZ", "3x3", "Fast cross planning", [13920, 14410, 13680, 14190, 13220]),
      makeCandidateSession("Iris Zhou", "IZ", "OH", "Controlled TPS set", [27910, 28640, 27120, 29500, 28220]),
    ],
  },
];

type AppView = "timer" | "feed" | "people" | "profile";

type ProfileView = {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  bio: string;
  following?: boolean;
  sessions: AppSession[];
  isSelf: boolean;
};

function makeSolve(timeMs: number, penalty: Penalty): AppSolve {
  return {
    id: crypto.randomUUID(),
    timeMs,
    penalty,
    scramble:
      sampleScrambles[Math.floor(Math.random() * sampleScrambles.length)],
    createdAt: new Date().toISOString(),
  };
}

function makeCandidateSession(
  user: string,
  avatar: string,
  puzzle: string,
  title: string,
  times: number[],
): AppSession {
  return {
    id: crypto.randomUUID(),
    user,
    avatar,
    puzzle,
    title,
    createdAt: "This week",
    liked: false,
    solves: times.map((time) => makeSolve(time, "ok")),
  };
}

function formatTime(ms: number, penalty: Penalty = "ok") {
  if (penalty === "dnf") return "DNF";
  const adjusted = penalty === "+2" ? ms + 2000 : ms;
  const seconds = adjusted / 1000;
  return seconds < 60
    ? seconds.toFixed(2)
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

function effectiveTime(solve: AppSolve) {
  if (solve.penalty === "dnf") return Number.POSITIVE_INFINITY;
  return solve.timeMs + (solve.penalty === "+2" ? 2000 : 0);
}

function average(solves: AppSolve[]) {
  const valid = solves.filter((solve) => solve.penalty !== "dnf");
  if (!valid.length) return "DNF";
  return formatTime(
    valid.reduce((sum, solve) => sum + effectiveTime(solve), 0) / valid.length,
  );
}

function bestTime(solves: AppSolve[]) {
  const validTimes = solves
    .map(effectiveTime)
    .filter((time) => Number.isFinite(time));

  if (!validTimes.length) return "DNF";
  return formatTime(Math.min(...validTimes));
}

function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthSession(session);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <AuthShell>
        <div className="auth-card">
          <p className="eyebrow">Loading</p>
          <h1>Checking your CubeVa session.</h1>
        </div>
      </AuthShell>
    );
  }

  if (!authSession && !demoMode) {
    return <AuthScreen onDemo={() => setDemoMode(true)} />;
  }

  if (!isSupabaseConfigured && !demoMode) {
    return <AuthScreen onDemo={() => setDemoMode(true)} />;
  }

  return (
    <CubeApp
      user={authSession?.user ?? null}
      onSignOut={() => {
        setDemoMode(false);
        supabase?.auth.signOut();
      }}
      demoMode={demoMode}
    />
  );
}

function CubeApp({
  user,
  onSignOut,
  demoMode,
}: {
  user: User | null;
  onSignOut: () => void;
  demoMode: boolean;
}) {
  const [solves, setSolves] = useState<AppSolve[]>(demoMode ? initialSolves : []);
  const [sessions, setSessions] = useState<AppSession[]>(demoMode ? starterSessions : []);
  const [following, setFollowing] = useState(candidates);
  const [manualTime, setManualTime] = useState("");
  const [manualPenalty, setManualPenalty] = useState<Penalty>("ok");
  const [puzzle, setPuzzle] = useState("3x3");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [displayProfile, setDisplayProfile] = useState(getUserDisplay(user));
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("timer");
  const [selectedProfile, setSelectedProfile] = useState<ProfileView | null>(null);
  const [profileRecord, setProfileRecord] = useState<AppProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ displayName: "", username: "", bio: "" });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const startRef = useRef(0);
  const { displayName, username, initials } = displayProfile;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 17);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedData() {
      setDisplayProfile(getUserDisplay(user));

      if (demoMode || !user) {
        setSolves(initialSolves);
        setSessions(starterSessions);
        setSessionsLoading(false);
        setProfileRecord(null);
        setProfileForm({
          displayName: getUserDisplay(null).displayName,
          username: getUserDisplay(null).username,
          bio: "Practicing consistency and building CubeVa.",
        });
        return;
      }

      setSolves([]);
      setSessionsLoading(true);
      setSessionMessage("");

      try {
        const [profile, loadedSessions] = await Promise.all([
          fetchProfile(user.id),
          fetchUserSessions(user),
        ]);

        if (cancelled) return;

        if (profile) {
          const profileDisplay = profile.display_name || getUserDisplay(user).displayName;
          setDisplayProfile({
            displayName: profileDisplay,
            username: profile.username,
            bio: profile.bio ?? "",
            initials:
              profileDisplay
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "Y",
          });
          setProfileRecord(profile);
          setProfileForm({
            displayName: profileDisplay,
            username: profile.username,
            bio: profile.bio ?? "",
          });
        }

        setSessions(loadedSessions);
      } catch (error) {
        if (!cancelled) {
          setSessionMessage(error instanceof Error ? error.message : "Could not load sessions.");
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    loadPersistedData();

    return () => {
      cancelled = true;
    };
  }, [demoMode, user]);

  const selfProfile = useMemo<ProfileView>(() => ({
    id: user?.id ?? "demo-user",
    displayName,
    username,
    initials,
    bio: profileRecord?.bio || displayProfile.bio || "Practicing consistency and building CubeVa.",
    sessions,
    isSelf: true,
  }), [displayName, displayProfile.bio, initials, profileRecord?.bio, sessions, user?.id, username]);

  const profileToShow = selectedProfile ?? selfProfile;
  const profileStats = useMemo(() => getProfileStats(profileToShow.sessions), [profileToShow.sessions]);

  const stats = useMemo(() => {
    const valid = solves.filter((solve) => solve.penalty !== "dnf");
    const best = valid.length
      ? valid.reduce(
          (min, solve) =>
            effectiveTime(solve) < effectiveTime(min) ? solve : min,
          valid[0],
        )
      : null;
    return {
      count: solves.length,
      best: best ? formatTime(best.timeMs, best.penalty) : "--",
      average: average(solves),
      latest: solves[0]
        ? formatTime(solves[0].timeMs, solves[0].penalty)
        : "--",
    };
  }, [solves]);

  function toggleTimer() {
    if (running) {
      const solve = makeSolve(Date.now() - startRef.current, "ok");
      setSolves((current) => [solve, ...current]);
      setElapsed(0);
      setRunning(false);
      return;
    }
    startRef.current = Date.now();
    setRunning(true);
  }

  function addManualSolve() {
    const parsed = Number.parseFloat(manualTime);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setSolves((current) => [
      makeSolve(Math.round(parsed * 1000), manualPenalty),
      ...current,
    ]);
    setManualTime("");
    setManualPenalty("ok");
  }

  async function publishSession() {
    if (!solves.length) return;
    setPublishing(true);
    setSessionMessage("");

    if (user && !demoMode) {
      try {
        const savedSession = await saveSession({
          user,
          puzzle,
          title: `${puzzle} practice session`,
          solves,
        });
        setSessions((current) => [savedSession, ...current]);
        setSolves([]);
        setSessionMessage("Session saved to Supabase.");
      } catch (error) {
        setSessionMessage(error instanceof Error ? error.message : "Could not save session.");
      } finally {
        setPublishing(false);
      }
      return;
    }

    const session: AppSession = {
      id: crypto.randomUUID(),
      user: displayName,
      avatar: initials,
      puzzle,
      title: `${puzzle} practice session`,
      createdAt: "Just now",
      liked: false,
      solves,
    };
    setSessions((current) => [session, ...current]);
    setSolves([]);
    setSessionMessage("Demo session published locally.");
    setPublishing(false);
  }

  async function saveProfileEdits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage("");

    if (demoMode || !user) {
      const fakeProfile = {
        ...displayProfile,
        displayName: profileForm.displayName,
        username: profileForm.username,
        bio: profileForm.bio,
      };
      setDisplayProfile(fakeProfile);
      setProfileEditing(false);
      setProfileMessage("Demo profile updated locally.");
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await updateProfile({
        userId: user.id,
        displayName: profileForm.displayName,
        username: profileForm.username,
        bio: profileForm.bio,
      });
      const updatedDisplay = getUserDisplay(user, updated);
      setProfileRecord(updated);
      setDisplayProfile(updatedDisplay);
      setProfileForm({
        displayName: updatedDisplay.displayName,
        username: updatedDisplay.username,
        bio: updated.bio ?? "",
      });
      setProfileEditing(false);
      setProfileMessage("Profile saved.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function openCandidateProfile(person: FollowCandidate) {
    setSelectedProfile({
      id: person.id,
      displayName: person.name,
      username: person.handle.replace("@", ""),
      initials: person.avatar,
      bio: person.bio,
      following: person.following,
      sessions: person.sessions,
      isSelf: false,
    });
    setActiveView("profile");
    setProfileEditing(false);
  }

  function showSelfProfile() {
    setSelectedProfile(null);
    setActiveView("profile");
    setProfileEditing(false);
  }

  function toggleSelectedFollow() {
    if (!selectedProfile) return;

    setFollowing((current) =>
      current.map((person) =>
        person.id === selectedProfile.id
          ? { ...person, following: !person.following }
          : person,
      ),
    );
    setSelectedProfile((current) =>
      current ? { ...current, following: !current.following } : current,
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <h1>CubeVa</h1>
            <p>Training feed for speedcubers</p>
          </div>
        </div>
        <button className="sign-out" type="button" onClick={onSignOut}>
          <LogOut size={17} /> {demoMode ? "Exit demo" : "Sign out"}
        </button>

        <nav className="nav-list" aria-label="Primary">
          <button className={activeView === "timer" ? "active" : ""} type="button" onClick={() => setActiveView("timer")}>
            <Timer size={18} /> Timer
          </button>
          <button className={activeView === "feed" ? "active" : ""} type="button" onClick={() => setActiveView("feed")}>
            <Activity size={18} /> Feed
          </button>
          <button className={activeView === "people" ? "active" : ""} type="button" onClick={() => setActiveView("people")}>
            <Users size={18} /> People
          </button>
          <button className={activeView === "profile" ? "active" : ""} type="button" onClick={showSelfProfile}>
            <Trophy size={18} /> Profile
          </button>
        </nav>

        <button className="profile-card compact-profile" type="button" onClick={showSelfProfile}>
          <div className="avatar large">{initials}</div>
          <h2>{displayName}</h2>
          <p>@{username} · 3x3 focus</p>
          <div className="mini-grid">
            <span>
              <strong>{stats.best}</strong> PB
            </span>
            <span>
              <strong>{stats.average}</strong> Avg
            </span>
          </div>
        </button>
      </aside>

      <section className="workspace" id="timer" hidden={activeView !== "timer"}>
        <header className="topbar">
          <div>
            <p className="eyebrow">Current session</p>
            <h2>Log solves, track progress, follow friends.</h2>
          </div>
          <label className="select-label">
            Event
            <select
              value={puzzle}
              onChange={(event) => setPuzzle(event.target.value)}
            >
              <option>3x3</option>
              <option>2x2</option>
              <option>4x4</option>
              <option>OH</option>
              <option>Pyraminx</option>
              <option>Megaminx</option>
            </select>
          </label>
        </header>

        <section className="timer-panel">
          <div className="scramble-line">
            {sampleScrambles[solves.length % sampleScrambles.length]}
          </div>
          <button
            className={`timer-face ${running ? "running" : ""}`}
            onClick={toggleTimer}
          >
            <span>{running ? formatTime(elapsed) : "Ready"}</span>
            <small>
              {running ? "tap to stop and save" : "tap to start timer"}
            </small>
          </button>
          <div className="action-row">
            <button type="button" onClick={toggleTimer}>
              {running ? <Square size={18} /> : <Play size={18} />}{" "}
              {running ? "Stop" : "Start"}
            </button>
            <button type="button" onClick={publishSession} disabled={publishing || !solves.length}>
              <Plus size={18} /> {publishing ? "Publishing..." : "Publish Session"}
            </button>
          </div>
          {sessionMessage && <p className="session-message">{sessionMessage}</p>}
        </section>

        <section className="stats-grid">
          <Metric
            icon={<Clock size={18} />}
            label="Latest"
            value={stats.latest}
          />
          <Metric icon={<Trophy size={18} />} label="Best" value={stats.best} />
          <Metric
            icon={<Activity size={18} />}
            label="Average"
            value={stats.average}
          />
          <Metric
            icon={<Flame size={18} />}
            label="Solves"
            value={String(stats.count)}
          />
        </section>

        <section className="manual-log">
          <h3>Manual log</h3>
          <div className="manual-controls">
            <input
              inputMode="decimal"
              placeholder="18.42"
              value={manualTime}
              onChange={(event) => setManualTime(event.target.value)}
            />
            <select
              value={manualPenalty}
              onChange={(event) =>
                setManualPenalty(event.target.value as Penalty)
              }
            >
              <option value="ok">OK</option>
              <option value="+2">+2</option>
              <option value="dnf">DNF</option>
            </select>
            <button type="button" onClick={addManualSolve}>
              <Plus size={18} /> Add
            </button>
          </div>
        </section>

        <section className="solve-table">
          <div className="section-head">
            <h3>Session solves</h3>
            <span>{puzzle}</span>
          </div>
          {solves.map((solve, index) => (
            <div className="solve-row" key={solve.id}>
              <span>#{solves.length - index}</span>
              <strong>{formatTime(solve.timeMs, solve.penalty)}</strong>
              <small>{solve.penalty.toUpperCase()}</small>
              <p>{solve.scramble}</p>
            </div>
          ))}
        </section>
      </section>

      <section className="workspace" hidden={activeView !== "profile"}>
        <ProfilePage
          profile={profileToShow}
          stats={profileStats}
          isEditing={profileEditing}
          form={profileForm}
          message={profileMessage}
          saving={profileSaving}
          onEdit={() => {
            setProfileForm({
              displayName,
              username,
              bio: selfProfile.bio,
            });
            setProfileEditing(true);
            setProfileMessage("");
          }}
          onCancel={() => setProfileEditing(false)}
          onSave={saveProfileEdits}
          onFormChange={setProfileForm}
          onFollow={toggleSelectedFollow}
        />
      </section>

      <aside className="right-rail">
        <section className="feed" id="feed" hidden={activeView === "people"}>
          <div className="section-head">
            <h3>Following feed</h3>
            <span>{sessionsLoading ? "Loading" : `${sessions.length} updates`}</span>
          </div>
          {!sessionsLoading && sessions.length === 0 && (
            <p className="empty-state">No saved sessions yet. Publish your first block from the timer.</p>
          )}
          {sessions.map((session) => (
            <article className="feed-item" key={session.id}>
              <div className="feed-author">
                <div className="avatar">{session.avatar}</div>
                <div>
                  <strong>{session.user}</strong>
                  <small>
                    {session.createdAt} · {session.puzzle}
                  </small>
                </div>
              </div>
              <p>{session.title}</p>
              <div className="feed-stats">
                <span>avg {average(session.solves)}</span>
                <span>best {bestTime(session.solves)}</span>
                <span>{session.solves.length} solves</span>
              </div>
              <button className={session.liked ? "liked" : ""} type="button">
                <Heart size={17} /> Like
              </button>
            </article>
          ))}
        </section>

        <section className="people" id="people" hidden={activeView === "feed"}>
          <div className="section-head">
            <h3>Find cubers</h3>
            <Search size={18} />
          </div>
          {following.map((person) => (
            <div className="person-row" key={person.id}>
              <div className="avatar">{person.avatar}</div>
              <div>
                <strong>{person.name}</strong>
                <small>
                  {person.handle} · {person.average}
                </small>
              </div>
              <button
                aria-label={`Follow ${person.name}`}
                className={person.following ? "following" : ""}
                onClick={() =>
                  setFollowing((current) =>
                    current.map((item) =>
                      item.id === person.id
                        ? { ...item, following: !item.following }
                        : item,
                    ),
                  )
                }
                type="button"
              >
                <UserPlus size={16} />
              </button>
              <button className="view-profile-button" type="button" onClick={() => openCandidateProfile(person)}>
                View
              </button>
            </div>
          ))}
        </section>
      </aside>
    </main>
  );
}

function getProfileStats(sessions: AppSession[]) {
  const allSolves = sessions.flatMap((session) => session.solves);
  const events = new Set(sessions.map((session) => session.puzzle));

  return {
    sessionCount: sessions.length,
    solveCount: allSolves.length,
    best: allSolves.length ? bestTime(allSolves) : "--",
    average: allSolves.length ? average(allSolves) : "--",
    eventCount: events.size,
  };
}

function ProfilePage({
  profile,
  stats,
  isEditing,
  form,
  message,
  saving,
  onEdit,
  onCancel,
  onSave,
  onFormChange,
  onFollow,
}: {
  profile: ProfileView;
  stats: ReturnType<typeof getProfileStats>;
  isEditing: boolean;
  form: { displayName: string; username: string; bio: string };
  message: string;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: { displayName: string; username: string; bio: string }) => void;
  onFollow: () => void;
}) {
  return (
    <>
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="avatar xl">{profile.initials}</div>
          <div>
            <p className="eyebrow">{profile.isSelf ? "Your profile" : "Public profile"}</p>
            <h2>{profile.displayName}</h2>
            <p>@{profile.username}</p>
          </div>
        </div>
        <p>{profile.bio || "No bio yet."}</p>
        <div className="profile-actions">
          {profile.isSelf ? (
            <button type="button" onClick={onEdit}><Edit3 size={18} /> Edit Profile</button>
          ) : (
            <button type="button" onClick={onFollow}><UserPlus size={18} /> {profile.following ? "Following" : "Follow"}</button>
          )}
        </div>
      </section>

      {profile.isSelf && isEditing && (
        <form className="profile-editor" onSubmit={onSave}>
          <label>
            Display name
            <input value={form.displayName} onChange={(event) => onFormChange({ ...form, displayName: event.target.value })} required />
          </label>
          <label>
            Username
            <input value={form.username} onChange={(event) => onFormChange({ ...form, username: event.target.value })} required />
          </label>
          <label>
            Bio
            <textarea value={form.bio} onChange={(event) => onFormChange({ ...form, bio: event.target.value })} rows={4} />
          </label>
          <div className="action-row">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
            <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      )}

      {message && <p className="session-message">{message}</p>}

      <section className="stats-grid">
        <Metric icon={<Trophy size={18} />} label="PB" value={stats.best} />
        <Metric icon={<Activity size={18} />} label="Average" value={stats.average} />
        <Metric icon={<Clock size={18} />} label="Sessions" value={String(stats.sessionCount)} />
        <Metric icon={<Flame size={18} />} label="Solves" value={String(stats.solveCount)} />
      </section>

      <section className="feed profile-history">
        <div className="section-head">
          <h3>Recent sessions</h3>
          <span>{stats.eventCount} events</span>
        </div>
        {profile.sessions.length === 0 && <p className="empty-state">No public sessions yet.</p>}
        {profile.sessions.map((session) => (
          <article className="feed-item" key={session.id}>
            <div className="feed-author">
              <div className="avatar">{session.avatar}</div>
              <div>
                <strong>{session.title}</strong>
                <small>{session.createdAt} · {session.puzzle}</small>
              </div>
            </div>
            <div className="feed-stats">
              <span>avg {average(session.solves)}</span>
              <span>best {bestTime(session.solves)}</span>
              <span>{session.solves.length} solves</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function AuthScreen({ onDemo }: { onDemo: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage(
        "Add your Supabase URL and anon key to .env.local, then restart the dev server.",
      );
      return;
    }

    setLoading(true);
    const response =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
                username,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    setMessage(
      mode === "signup"
        ? "Account created. Check your email if confirmation is enabled."
        : "Signed in.",
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthShell>
        <section className="auth-card">
          <p className="eyebrow">Auth setup</p>
          <h1>Connect Supabase to enable signup and login.</h1>
          <p>
            Create a `.env.local` file from `.env.example`, paste your project
            URL and anon key, then restart `npm run dev`.
          </p>
          <div className="auth-code">
            VITE_SUPABASE_URL=https://your-project.supabase.co
            <br />
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </div>
          <button type="button" onClick={onDemo}>
            Continue in demo mode
          </button>
        </section>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <section className="auth-card">
        <p className="eyebrow">Welcome to CubeVa</p>
        <h1>
          {mode === "signup"
            ? "Create your cubing profile."
            : "Sign in to your cubing log."}
        </h1>
        <form className="auth-form" onSubmit={submitAuth}>
          {mode === "signup" && (
            <>
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Maya Chen"
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="mayacuber"
                  required
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading
              ? "Working..."
              : mode === "signup"
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        <button
          className="link-button"
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
        <button className="link-button" type="button" onClick={onDemo}>
          Continue in demo mode
        </button>
      </section>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="brand auth-brand">
        <div className="brand-mark">CV</div>
        <div>
          <h1>CubeVa</h1>
          <p>Training feed for speedcubers</p>
        </div>
      </div>
      {children}
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
