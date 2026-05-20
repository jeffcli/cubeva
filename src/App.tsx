import {
  Activity,
  Clock,
  Flame,
  LogOut,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession, User } from "@supabase/supabase-js";
import {
  deleteSession,
  fetchDiscoverProfiles,
  fetchFollowingFeed,
  fetchProfile,
  fetchPublicSessionsForProfile,
  fetchUserSessions,
  fetchWcaPersonalBests,
  getUserDisplay,
  errorMessage,
  saveSession,
  setFollow,
  updateProfile,
  type AppProfile,
  type AppSession,
  type AppSolve,
  type Penalty,
  type SocialProfile,
  type WcaPersonalBest,
} from "./database";
import { AuthScreen, AuthShell } from "./components/Auth";
import { FeedPage } from "./components/FeedPage";
import { formatSessionTimestamp } from "./dateUtils";
import { Metric } from "./components/Metric";
import { ProfilePage } from "./components/ProfilePage";
import { eventConfig, generateScramble, wcaEvents } from "./scrambles";
import { candidates, initialSolves, starterSessions } from "./mockData";
import {
  average,
  averageOf,
  effectiveTime,
  formatSolveResult,
  formatTime,
  getProfileStats,
  makeSolve,
  parseImportedSolves,
  parseMoves,
  parseTimeToMs,
  sampleScrambles,
} from "./solveUtils";
import type { AppView, ProfileView, TimerState } from "./types";
import { isSupabaseConfigured, supabase } from "./supabase";

type FollowCandidate = SocialProfile;


export function App() {
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
  const [solves, setSolves] = useState<AppSolve[]>(
    demoMode ? initialSolves : [],
  );
  const [userSessions, setUserSessions] = useState<AppSession[]>(
    demoMode ? starterSessions : [],
  );
  const [feedSessions, setFeedSessions] = useState<AppSession[]>(
    demoMode ? starterSessions : [],
  );
  const [following, setFollowing] = useState(candidates);
  const [manualTime, setManualTime] = useState("");
  const [manualPenalty, setManualPenalty] = useState<Penalty>("ok");
  const [puzzle, setPuzzle] = useState("3x3");
  const [timerState, setTimerState] = useState<TimerState>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [inspectionEnabled, setInspectionEnabled] = useState(true);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [inspectionPenalty, setInspectionPenalty] = useState<Penalty>("ok");
  const [currentScramble, setCurrentScramble] = useState(sampleScrambles[0]);
  const [scrambleLoading, setScrambleLoading] = useState(false);
  const [importText, setImportText] = useState("");
  const [displayProfile, setDisplayProfile] = useState(getUserDisplay(user));
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("feed");
  const [selectedProfile, setSelectedProfile] = useState<ProfileView | null>(
    null,
  );
  const [profileRecord, setProfileRecord] = useState<AppProfile | null>(null);
  const [profileWcaPersonalBests, setProfileWcaPersonalBests] = useState<WcaPersonalBest[]>([]);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    wcaId: "",
  });
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const startRef = useRef(0);
  const inspectionStartRef = useRef(0);
  const { displayName, username, initials } = displayProfile;
  const userId = user?.id ?? null;
  const currentEvent = eventConfig(puzzle);
  const isManualOnlyEvent = currentEvent.manualOnly;
  const inspectionAvailable = currentEvent.inspection && !isManualOnlyEvent;
  const currentResultType = isManualOnlyEvent ? "moves" : "time";
  const hasUnpublishedSolves = solves.length > 0;

  useEffect(() => {
    if (!inspectionAvailable && timerState === "inspection") {
      setTimerState("ready");
    }
  }, [inspectionAvailable, timerState]);

  useEffect(() => {
    setInspectionEnabled(inspectionAvailable);
    setInspectionElapsed(0);
    setInspectionPenalty("ok");
    setElapsed(0);
    setTimerState("ready");
    setManualPenalty("ok");
  }, [inspectionAvailable, puzzle]);

  useEffect(() => {
    if (timerState !== "running") return;
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 17);
    return () => window.clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    if (timerState !== "inspection") return;
    const interval = window.setInterval(() => {
      const nextElapsed = Date.now() - inspectionStartRef.current;
      setInspectionElapsed(nextElapsed);
      setInspectionPenalty(
        nextElapsed > 17000 ? "dnf" : nextElapsed > 15000 ? "+2" : "ok",
      );
    }, 50);
    return () => window.clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnpublishedSolves) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnpublishedSolves]);

  useEffect(() => {
    let cancelled = false;

    async function loadScramble() {
      setScrambleLoading(true);
      const scramble = await generateScramble(puzzle);
      if (!cancelled) {
        setCurrentScramble(scramble);
        setScrambleLoading(false);
      }
    }

    loadScramble();

    return () => {
      cancelled = true;
    };
  }, [puzzle]);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedData() {
      setDisplayProfile(getUserDisplay(user));

      if (demoMode || !user) {
        setSolves(initialSolves);
        setUserSessions(starterSessions);
        setFeedSessions(starterSessions);
        setFollowing(candidates);
        setSessionsLoading(false);
        setPeopleLoading(false);
        setProfileRecord(null);
        setProfileForm({
          displayName: getUserDisplay(null).displayName,
          username: getUserDisplay(null).username,
          bio: "Practicing consistency and building CubeVa.",
          wcaId: "",
        });
        setProfileWcaPersonalBests([]);
        return;
      }

      setSessionsLoading(true);
      setPeopleLoading(true);
      setSessionMessage("");

      try {
        const [profile, loadedSessions, loadedFeed, loadedPeople] =
          await Promise.all([
            fetchProfile(user.id),
            fetchUserSessions(user),
            fetchFollowingFeed(user.id),
            fetchDiscoverProfiles(user.id),
          ]);

        if (cancelled) return;

        if (profile) {
          const profileDisplay =
            profile.display_name || getUserDisplay(user).displayName;
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
            wcaId: profile.wca_id ?? "",
          });
          setProfileRecord(profile);
          setProfileForm({
            displayName: profileDisplay,
            username: profile.username,
            bio: profile.bio ?? "",
            wcaId: profile.wca_id ?? "",
          });
          setProfileWcaPersonalBests(
            profile.wca_id ? await fetchWcaPersonalBests(profile.wca_id) : [],
          );
        }

        setUserSessions(loadedSessions);
        setFeedSessions(loadedFeed);
        setFollowing(loadedPeople);
      } catch (error) {
        if (!cancelled) {
          setSessionMessage(
            error instanceof Error ? error.message : "Could not load sessions.",
          );
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
          setPeopleLoading(false);
        }
      }
    }

    loadPersistedData();

    return () => {
      cancelled = true;
    };
  }, [demoMode, userId]);

  const selfProfile = useMemo<ProfileView>(
    () => ({
      id: userId ?? "demo-user",
      displayName,
      username,
      initials,
      bio:
        profileRecord?.bio ||
        displayProfile.bio ||
        "Practicing consistency and building CubeVa.",
      wcaId: profileRecord?.wca_id ?? displayProfile.wcaId ?? "",
      wcaPersonalBests: profileWcaPersonalBests,
      sessions: userSessions,
      isSelf: true,
    }),
    [
      displayName,
      displayProfile.bio,
      initials,
      profileRecord?.bio,
      profileRecord?.wca_id,
      profileWcaPersonalBests,
      userId,
      userSessions,
      username,
    ],
  );

  const profileToShow = selectedProfile ?? selfProfile;
  const profileStats = useMemo(
    () => getProfileStats(profileToShow.sessions),
    [profileToShow.sessions],
  );
  const chronologicalFeedSessions = useMemo(
    () =>
      [...feedSessions].sort(
        (a, b) =>
          Date.parse(b.createdAtSort ?? b.createdAt) -
          Date.parse(a.createdAtSort ?? a.createdAt),
      ),
    [feedSessions],
  );

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
      best: best ? formatSolveResult(best) : "--",
      average: average(solves),
      ao5: averageOf(solves, 5),
      ao12: averageOf(solves, 12),
      latest: solves[0] ? formatSolveResult(solves[0]) : "--",
    };
  }, [solves]);

  async function nextScramble() {
    setScrambleLoading(true);
    setCurrentScramble(await generateScramble(puzzle));
    setScrambleLoading(false);
  }

  async function toggleTimer() {
    if (isManualOnlyEvent) return;

    if (timerState === "running") {
      const solve = makeSolve(
        Date.now() - startRef.current,
        inspectionPenalty,
        currentScramble,
      );
      setSolves((current) => [solve, ...current]);
      setElapsed(0);
      setInspectionElapsed(0);
      setInspectionPenalty("ok");
      setTimerState("ready");
      await nextScramble();
      return;
    }

    if (timerState === "inspection") {
      startRef.current = Date.now();
      setElapsed(0);
      setTimerState("running");
      return;
    }

    if (inspectionAvailable && inspectionEnabled) {
      inspectionStartRef.current = Date.now();
      setInspectionElapsed(0);
      setInspectionPenalty("ok");
      setTimerState("inspection");
      return;
    }

    startRef.current = Date.now();
    setInspectionPenalty("ok");
    setTimerState("running");
  }

  useEffect(() => {
    function handleTimerKeydown(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      if (activeView !== "timer" || isTypingTarget(event.target)) return;

      event.preventDefault();
      void toggleTimer();
    }

    window.addEventListener("keydown", handleTimerKeydown);
    return () => window.removeEventListener("keydown", handleTimerKeydown);
  }, [activeView, toggleTimer]);

  function addManualSolve() {
    const parsed = isManualOnlyEvent
      ? parseMoves(manualTime)
      : parseTimeToMs(manualTime);
    if (!parsed) return;
    setSolves((current) => [
      makeSolve(parsed, manualPenalty, currentScramble, currentResultType),
      ...current,
    ]);
    setManualTime("");
    setManualPenalty("ok");
  }

  function importSolves() {
    const imported = parseImportedSolves(importText, currentScramble, currentResultType);
    if (!imported.length) return;
    setSolves((current) => [...imported, ...current]);
    setImportText("");
    setSessionMessage(`${imported.length} solves imported into this session.`);
  }

  function setSolvePenalty(solveId: string, penalty: Penalty) {
    setSolves((current) =>
      current.map((solve) =>
        solve.id === solveId ? { ...solve, penalty } : solve,
      ),
    );
  }

  function deleteSolve(solveId: string) {
    setSolves((current) => current.filter((solve) => solve.id !== solveId));
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
        setUserSessions((current) => [savedSession, ...current]);
        setSolves([]);
        setSessionMessage("Session saved to Supabase.");
      } catch (error) {
        setSessionMessage(errorMessage(error, "Could not save session."));
      } finally {
        setPublishing(false);
      }
      return;
    }

    const createdAt = new Date().toISOString();
    const session: AppSession = {
      id: crypto.randomUUID(),
      user: displayName,
      avatar: initials,
      puzzle,
      title: `${puzzle} practice session`,
      createdAt: formatSessionTimestamp(createdAt),
      createdAtSort: createdAt,
      liked: false,
      solves,
    };
    setUserSessions((current) => [session, ...current]);
    setSolves([]);
    setSessionMessage("Demo session published locally.");
    setPublishing(false);
  }

  async function deletePublishedSession(sessionId: string) {
    const session = userSessions.find((item) => item.id === sessionId);
    const label = session ? `"${session.title}"` : "this session";

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setProfileMessage("");

    if (user && !demoMode) {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        setProfileMessage(errorMessage(error, "Could not delete session."));
        return;
      }
    }

    setUserSessions((current) =>
      current.filter((item) => item.id !== sessionId),
    );
    setSelectedProfile((current) =>
      current?.isSelf
        ? {
            ...current,
            sessions: current.sessions.filter((item) => item.id !== sessionId),
          }
        : current,
    );
    setProfileMessage("Session deleted.");
  }

  function confirmLeavingUnpublishedSession() {
    if (!hasUnpublishedSolves) return true;

    return window.confirm(
      "Are you sure? Your current session has unpublished solves and progress will be lost.",
    );
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
        wcaId: profileForm.wcaId,
      };
      setDisplayProfile(fakeProfile);
      setProfileWcaPersonalBests([]);
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
        wcaId: profileForm.wcaId,
      });
      const updatedDisplay = getUserDisplay(user, updated);
      const wcaPersonalBests = updated.wca_id
        ? await fetchWcaPersonalBests(updated.wca_id)
        : [];
      setProfileRecord(updated);
      setProfileWcaPersonalBests(wcaPersonalBests);
      setDisplayProfile(updatedDisplay);
      setProfileForm({
        displayName: updatedDisplay.displayName,
        username: updatedDisplay.username,
        bio: updated.bio ?? "",
        wcaId: updated.wca_id ?? "",
      });
      setProfileEditing(false);
      setProfileMessage("Profile saved.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Could not save profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function openCandidateProfile(person: FollowCandidate) {
    let sessions = person.sessions;
    let wcaId = person.wcaId;
    let wcaPersonalBests: WcaPersonalBest[] = [];
    if (user && !demoMode) {
      try {
        const profile = await fetchProfile(person.id);
        if (profile) {
          wcaId = profile.wca_id ?? "";
          sessions = await fetchPublicSessionsForProfile(profile);
          wcaPersonalBests = wcaId ? await fetchWcaPersonalBests(wcaId) : [];
        }
      } catch (error) {
        setProfileMessage(
          error instanceof Error
            ? error.message
            : "Could not load profile sessions.",
        );
      }
    }

    setSelectedProfile({
      id: person.id,
      displayName: person.name,
      username: person.handle.replace("@", ""),
      initials: person.avatar,
      bio: person.bio,
      wcaId,
      wcaPersonalBests,
      following: person.following,
      sessions,
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

  async function toggleSelectedFollow() {
    if (!selectedProfile) return;
    const nextFollowState = !selectedProfile.following;

    if (user && !demoMode) {
      try {
        await setFollow({
          followerId: user.id,
          followingId: selectedProfile.id,
          follow: nextFollowState,
        });
        const loadedFeed = await fetchFollowingFeed(user.id);
        setFeedSessions(loadedFeed);
      } catch (error) {
        setProfileMessage(
          error instanceof Error ? error.message : "Could not update follow.",
        );
        return;
      }
    }

    setFollowing((current) =>
      current.map((person) =>
        person.id === selectedProfile.id
          ? { ...person, following: nextFollowState }
          : person,
      ),
    );
    setSelectedProfile((current) =>
      current ? { ...current, following: nextFollowState } : current,
    );
  }

  async function togglePersonFollow(person: FollowCandidate) {
    const nextFollowState = !person.following;

    if (user && !demoMode) {
      try {
        await setFollow({
          followerId: user.id,
          followingId: person.id,
          follow: nextFollowState,
        });
        const loadedFeed = await fetchFollowingFeed(user.id);
        setFeedSessions(loadedFeed);
      } catch (error) {
        setSessionMessage(
          error instanceof Error ? error.message : "Could not update follow.",
        );
        return;
      }
    }

    setFollowing((current) =>
      current.map((item) =>
        item.id === person.id ? { ...item, following: nextFollowState } : item,
      ),
    );
    setSelectedProfile((current) =>
      current && current.id === person.id
        ? { ...current, following: nextFollowState }
        : current,
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
        <button
          className="sign-out"
          type="button"
          onClick={() => {
            if (confirmLeavingUnpublishedSession()) onSignOut();
          }}
        >
          <LogOut size={17} /> {demoMode ? "Exit demo" : "Sign out"}
        </button>

        <nav className="nav-list" aria-label="Primary">
          <button
            className={activeView === "feed" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("feed")}
          >
            <Activity size={18} /> Feed
          </button>
          <button
            className={activeView === "timer" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("timer")}
          >
            <Timer size={18} /> Timer
          </button>
          <button
            className={activeView === "people" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("people")}
          >
            <Users size={18} /> People
          </button>
          <button
            className={activeView === "profile" ? "active" : ""}
            type="button"
            onClick={showSelfProfile}
          >
            <Trophy size={18} /> Profile
          </button>
        </nav>

        <button
          className="profile-card compact-profile"
          type="button"
          onClick={showSelfProfile}
        >
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
            <h2>Log solves, track progress, keep up with friends.</h2>
          </div>
          <label className="select-label">
            Event
            <select
              value={puzzle}
              onChange={(event) => setPuzzle(event.target.value)}
            >
              {wcaEvents.map((event) => (
                <option key={event.eventId}>{event.label}</option>
              ))}
            </select>
          </label>
        </header>

        <section className="timer-panel">
          <div className="scramble-line">
            {scrambleLoading ? "Generating scramble..." : currentScramble}
          </div>
          {isManualOnlyEvent ? (
            <div className="manual-only-panel">
              <strong>FMC manual entry</strong>
              <span>Enter your move count, then publish the session.</span>
            </div>
          ) : (
            <button className={`timer-face ${timerState}`} onClick={toggleTimer}>
              <span>
                {timerState === "running"
                  ? formatTime(elapsed)
                  : timerState === "inspection"
                    ? Math.max(0, 15 - Math.floor(inspectionElapsed / 1000))
                    : "Ready"}
              </span>
              <small>
                {timerState === "running"
                  ? `tap to stop and save${inspectionPenalty !== "ok" ? ` (${inspectionPenalty.toUpperCase()})` : ""}`
                  : timerState === "inspection"
                    ? "tap when inspection is done"
                    : inspectionAvailable && inspectionEnabled
                      ? "tap to start inspection"
                      : "tap to start timer"}
              </small>
            </button>
          )}
          <div className="action-row">
            {!isManualOnlyEvent && (
              <button type="button" onClick={toggleTimer}>
                {timerState === "running" ? (
                  <Square size={18} />
                ) : (
                  <Play size={18} />
                )}{" "}
                {timerState === "running"
                  ? "Stop"
                  : timerState === "inspection"
                    ? "Start Solve"
                    : "Start"}
              </button>
            )}
            <button
              type="button"
              onClick={nextScramble}
              disabled={scrambleLoading || timerState !== "ready"}
            >
              <Timer size={18} /> New Scramble
            </button>
            <button
              type="button"
              onClick={publishSession}
              disabled={publishing || !solves.length}
            >
              <Plus size={18} />{" "}
              {publishing ? "Publishing..." : "Publish Session"}
            </button>
          </div>
          {inspectionAvailable && (
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={inspectionEnabled}
                onChange={(event) => setInspectionEnabled(event.target.checked)}
              />
              15-second WCA inspection
            </label>
          )}
          {!inspectionAvailable && !isManualOnlyEvent && (
            <p className="session-message">No WCA inspection for this event.</p>
          )}
          {sessionMessage && (
            <p className="session-message">{sessionMessage}</p>
          )}
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
          <Metric icon={<Timer size={18} />} label="Ao5" value={stats.ao5} />
          <Metric icon={<Timer size={18} />} label="Ao12" value={stats.ao12} />
          <Metric
            icon={<Flame size={18} />}
            label="Solves"
            value={String(stats.count)}
          />
        </section>

        <section className="manual-log">
          <h3>{isManualOnlyEvent ? "FMC entry" : "Manual log"}</h3>
          <div className="manual-controls">
            <input
              inputMode={isManualOnlyEvent ? "numeric" : "decimal"}
              placeholder={isManualOnlyEvent ? "32 moves" : "18.42"}
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
              {!isManualOnlyEvent && <option value="+2">+2</option>}
              <option value="dnf">DNF</option>
            </select>
            <button type="button" onClick={addManualSolve}>
              <Plus size={18} /> Add
            </button>
          </div>
          <div className="import-controls">
            <textarea
              rows={3}
              placeholder={
                isManualOnlyEvent
                  ? "Paste FMC results: 32, 29, DNF 34"
                  : "Paste times: 18.42, 17.90 +2, DNF 20.10"
              }
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            <button type="button" onClick={importSolves}>
              <Plus size={18} /> {isManualOnlyEvent ? "Import Results" : "Import Times"}
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
              <strong>{formatSolveResult(solve)}</strong>
              <select
                aria-label={`Penalty for solve ${solves.length - index}`}
                value={solve.penalty}
                onChange={(event) =>
                  setSolvePenalty(solve.id, event.target.value as Penalty)
                }
              >
                <option value="ok">OK</option>
                {solve.resultType !== "moves" && <option value="+2">+2</option>}
                <option value="dnf">DNF</option>
              </select>
              <p>{solve.scramble}</p>
              <button
                type="button"
                aria-label={`Delete solve ${solves.length - index}`}
                onClick={() => deleteSolve(solve.id)}
              >
                <Trash2 size={16} />
              </button>
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
              wcaId: selfProfile.wcaId,
            });
            setProfileEditing(true);
            setProfileMessage("");
          }}
          onCancel={() => setProfileEditing(false)}
          onSave={saveProfileEdits}
          onFormChange={setProfileForm}
          onFollow={toggleSelectedFollow}
          onDeleteSession={deletePublishedSession}
        />
      </section>

      <section className="workspace" hidden={activeView !== "feed"}>
        <FeedPage sessions={chronologicalFeedSessions} loading={sessionsLoading} />
      </section>

      <section className="workspace" hidden={activeView !== "people"}>
        <section className="people" id="people">
          <div className="section-head">
            <h3>Find cubers</h3>
            {peopleLoading ? <span>Loading</span> : <Search size={18} />}
          </div>
          {!peopleLoading && following.length === 0 && (
            <p className="empty-state">
              No other profiles yet. Create another account to test follows.
            </p>
          )}
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
                onClick={() => togglePersonFollow(person)}
                type="button"
              >
                <UserPlus size={16} />
              </button>
              <button
                className="view-profile-button"
                type="button"
                onClick={() => openCandidateProfile(person)}
              >
                View
              </button>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}
