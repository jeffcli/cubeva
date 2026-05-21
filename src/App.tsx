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
import { AuthScreen, AuthShell } from "./components/Auth";
import { FeedPage } from "./components/FeedPage";
import { Metric } from "./components/Metric";
import { ProfilePage } from "./components/ProfilePage";
import { eventConfig, generateScramble, wcaEvents } from "./cubing/scrambles";
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
} from "./data/database";
import { candidates, initialSolves, starterSessions } from "./data/mockData";
import { isSupabaseConfigured, supabase } from "./services/supabase";
import { formatSessionTimestamp } from "./utils/dateUtils";
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
} from "./utils/solveUtils";
import type { AppView, ProfileView, TimerState } from "./types/app";

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
        <div className="grid w-[min(100%,480px)] max-w-[480px] gap-4 rounded-lg border border-line bg-card p-6 shadow-[0_22px_60px_rgba(29,35,32,0.12)]">
          <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
            Loading
          </p>
          <h1 className="m-0 text-[clamp(2rem,5vw,3.4rem)] leading-none">
            Checking your CubeVa session.
          </h1>
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
  const [profileWcaPersonalBests, setProfileWcaPersonalBests] = useState<
    WcaPersonalBest[]
  >([]);
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
    const imported = parseImportedSolves(
      importText,
      currentScramble,
      currentResultType,
    );
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
    <main className="grid min-h-screen gap-[22px] p-[22px] [grid-template-columns:260px_minmax(360px,1fr)] max-[1120px]:[grid-template-columns:210px_minmax(0,1fr)] max-[760px]:flex max-[760px]:flex-col max-[760px]:p-3.5">
      <aside className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-accent font-black text-[#101615] shadow-[inset_-10px_-10px_0_#f5a623,inset_10px_10px_0_#2f81ed]">
            CV
          </div>
          <div>
            <h1 className="m-0 text-[1.35rem]">CubeVa</h1>
            <p className="m-0 text-soft-muted">
              Training feed for speedcubers
            </p>
          </div>
        </div>
        <button
          className="min-h-[42px] bg-ink px-3 text-white"
          type="button"
          onClick={() => {
            if (confirmLeavingUnpublishedSession()) onSignOut();
          }}
        >
          <LogOut size={17} /> {demoMode ? "Exit demo" : "Sign out"}
        </button>

        <nav className="grid gap-2" aria-label="Primary">
          <button
            className={`w-full justify-start gap-2.5 p-3 ${
              activeView === "feed"
                ? "bg-ink text-white"
                : "bg-transparent text-[#34413d] hover:bg-ink hover:text-white"
            }`}
            type="button"
            onClick={() => setActiveView("feed")}
          >
            <Activity size={18} /> Feed
          </button>
          <button
            className={`w-full justify-start gap-2.5 p-3 ${
              activeView === "timer"
                ? "bg-ink text-white"
                : "bg-transparent text-[#34413d] hover:bg-ink hover:text-white"
            }`}
            type="button"
            onClick={() => setActiveView("timer")}
          >
            <Timer size={18} /> Timer
          </button>
          <button
            className={`w-full justify-start gap-2.5 p-3 ${
              activeView === "people"
                ? "bg-ink text-white"
                : "bg-transparent text-[#34413d] hover:bg-ink hover:text-white"
            }`}
            type="button"
            onClick={() => setActiveView("people")}
          >
            <Users size={18} /> People
          </button>
          <button
            className={`w-full justify-start gap-2.5 p-3 ${
              activeView === "profile"
                ? "bg-ink text-white"
                : "bg-transparent text-[#34413d] hover:bg-ink hover:text-white"
            }`}
            type="button"
            onClick={showSelfProfile}
          >
            <Trophy size={18} /> Profile
          </button>
        </nav>
      </aside>

      <section
        className="flex min-w-0 flex-col gap-4"
        id="timer"
        hidden={activeView !== "timer"}
      >
        <header className="flex items-center justify-between gap-3 max-[760px]:flex-col max-[760px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
              Current session
            </p>
            <h2 className="m-0 max-w-[720px] text-[clamp(1.55rem,2.4vw,2.7rem)] leading-[1.05]">
              Log solves, track progress, keep up with friends.
            </h2>
          </div>
          <label className="grid gap-1.5 text-[0.78rem] font-extrabold text-muted">
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

        <section className="grid gap-4 rounded-lg border border-line bg-card p-5 shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
          <div className="rounded-lg bg-ink p-3.5 text-center font-mono text-[clamp(0.9rem,1.3vw,1.15rem)] text-[#f8f2e7]">
            {scrambleLoading ? "Generating scramble..." : currentScramble}
          </div>
          {isManualOnlyEvent ? (
            <div className="grid min-h-[180px] place-content-center gap-2 rounded-lg border-[3px] border-ink bg-panel text-center">
              <strong className="text-[clamp(2rem,5vw,4rem)] leading-none">
                FMC manual entry
              </strong>
              <span>Enter your move count, then publish the session.</span>
            </div>
          ) : (
            <button
              className={`grid min-h-[250px] w-full place-items-center border-[5px] border-ink text-center text-ink max-[760px]:min-h-[210px] ${
                timerState === "running"
                  ? "bg-green"
                  : timerState === "inspection"
                    ? "bg-panel"
                    : "bg-gold"
              }`}
              onClick={toggleTimer}
            >
              <span className="text-[clamp(4.4rem,10vw,8.4rem)] leading-[0.95] [font-variant-numeric:tabular-nums]">
                {timerState === "running"
                  ? formatTime(elapsed)
                  : timerState === "inspection"
                    ? Math.max(0, 15 - Math.floor(inspectionElapsed / 1000))
                    : "Ready"}
              </span>
              <small className="mt-2 block font-extrabold text-ink">
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
          <div className="flex flex-wrap items-center gap-3">
            {!isManualOnlyEvent && (
              <button
                className="min-h-11 bg-ink px-3.5 text-white"
                type="button"
                onClick={toggleTimer}
              >
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
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={nextScramble}
              disabled={scrambleLoading || timerState !== "ready"}
            >
              <Timer size={18} /> New Scramble
            </button>
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={publishSession}
              disabled={publishing || !solves.length}
            >
              <Plus size={18} />{" "}
              {publishing ? "Publishing..." : "Publish Session"}
            </button>
          </div>
          {inspectionAvailable && (
            <label className="inline-flex items-center gap-2.5 font-extrabold text-[#34413d] [&_input]:min-h-0 [&_input]:w-[18px]">
              <input
                type="checkbox"
                checked={inspectionEnabled}
                onChange={(event) => setInspectionEnabled(event.target.checked)}
              />
              15-second WCA inspection
            </label>
          )}
          {!inspectionAvailable && !isManualOnlyEvent && (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              No WCA inspection for this event.
            </p>
          )}
          {sessionMessage && (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              {sessionMessage}
            </p>
          )}
        </section>

        <section className="grid grid-cols-4 gap-2.5 max-[760px]:grid-cols-2">
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

        <section className="rounded-lg border border-line bg-card p-4 shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
          <h3 className="m-0">{isManualOnlyEvent ? "FMC entry" : "Manual log"}</h3>
          <div className="mt-3 flex items-center gap-3 max-[760px]:flex-col max-[760px]:items-stretch [&_input]:min-w-[120px] [&_input]:flex-1">
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
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={addManualSolve}
            >
              <Plus size={18} /> Add
            </button>
          </div>
          <div className="mt-3 grid items-stretch gap-2.5 [grid-template-columns:minmax(0,1fr)_auto] max-[760px]:flex max-[760px]:flex-col [&_textarea]:min-w-[120px] [&_textarea]:flex-1">
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
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={importSolves}
            >
              <Plus size={18} />{" "}
              {isManualOnlyEvent ? "Import Results" : "Import Times"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-card p-4 shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0">Session solves</h3>
            <span className="text-[0.85rem] font-extrabold text-soft-muted">
              {puzzle}
            </span>
          </div>
          {solves.map((solve, index) => (
            <div
              className="grid min-h-[54px] items-center gap-2.5 border-t border-rule [grid-template-columns:46px_90px_76px_minmax(0,1fr)_42px] max-[760px]:[grid-template-columns:42px_80px_76px_42px]"
              key={solve.id}
            >
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
              <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[#66716c] max-[760px]:col-span-full max-[760px]:pb-2.5 max-[760px]:whitespace-normal">
                {solve.scramble}
              </p>
              <button
                className="h-9 w-9 bg-panel p-0 text-ink"
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

      <section
        className="flex min-w-0 flex-col gap-4"
        hidden={activeView !== "profile"}
      >
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

      <section
        className="flex min-w-0 flex-col gap-4"
        hidden={activeView !== "feed"}
      >
        <FeedPage
          sessions={chronologicalFeedSessions}
          loading={sessionsLoading}
        />
      </section>

      <section
        className="flex min-w-0 flex-col gap-4"
        hidden={activeView !== "people"}
      >
        <section
          className="grid gap-3 rounded-lg border border-line bg-card p-4 shadow-[0_18px_45px_rgba(29,35,32,0.08)]"
          id="people"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="m-0">Find cubers</h3>
            {peopleLoading ? (
              <span className="text-[0.85rem] font-extrabold text-soft-muted">
                Loading
              </span>
            ) : (
              <Search size={18} />
            )}
          </div>
          {!peopleLoading && following.length === 0 && (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              No other profiles yet. Create another account to test follows.
            </p>
          )}
          {following.map((person) => (
            <div
              className="flex items-center gap-3 border-t border-rule pt-3 [&_small]:block [&_strong]:block"
              key={person.id}
            >
              <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-teal font-black text-white">
                {person.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <strong>{person.name}</strong>
                <small className="text-soft-muted">
                  {person.handle} · {person.average}
                </small>
              </div>
              <button
                aria-label={`Follow ${person.name}`}
                className={`h-[38px] w-[38px] p-0 text-white ${
                  person.following ? "bg-green" : "bg-ink"
                }`}
                onClick={() => togglePersonFollow(person)}
                type="button"
              >
                <UserPlus size={16} />
              </button>
              <button
                className="h-[38px] w-auto bg-panel px-3 text-ink"
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
