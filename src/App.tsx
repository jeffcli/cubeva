import { useEffect, useMemo, useRef, useState } from "react";
import type { Session as AuthSession, User } from "@supabase/supabase-js";
import { AppSidebar } from "./components/AppSidebar";
import { AuthScreen, AuthShell } from "./components/Auth";
import { FeedPage } from "./components/FeedPage";
import { NotificationBell } from "./components/NotificationBell";
import { PeoplePage } from "./components/PeoplePage";
import { ProfilePage } from "./components/ProfilePage";
import { TimerPage } from "./components/TimerPage";
import { eventConfig, generateScramble } from "./cubing/scrambles";
import {
  addSessionComment,
  deleteSessionComment,
  deleteSession,
  fetchDiscoverProfiles,
  fetchFollowingFeed,
  fetchNotifications,
  fetchProfile,
  fetchPublicSessionsForProfile,
  fetchUserSessions,
  fetchWcaPersonalBests,
  getUserDisplay,
  createNotification,
  errorMessage,
  markNotificationsRead,
  saveSession,
  setSessionKudos,
  setFollow,
  updateProfile,
  type AppComment,
  type AppNotification,
  type AppProfile,
  type AppSession,
  type AppSolve,
  type Penalty,
  type SocialProfile,
  type WcaPersonalBest,
} from "./data/database";
import { isSupabaseConfigured, supabase } from "./services/supabase";
import {
  average,
  averageOf,
  effectiveTime,
  formatSolveResult,
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

  if (!authSession) {
    return <AuthScreen />;
  }

  if (!isSupabaseConfigured) {
    return <AuthScreen />;
  }

  return (
    <CubeApp
      user={authSession.user}
      onSignOut={() => {
        supabase?.auth.signOut();
      }}
    />
  );
}

function CubeApp({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  const [solves, setSolves] = useState<AppSolve[]>([]);
  const [userSessions, setUserSessions] = useState<AppSession[]>([]);
  const [feedSessions, setFeedSessions] = useState<AppSession[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [following, setFollowing] = useState<FollowCandidate[]>([]);
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
  const userId = user.id;
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

      setSessionsLoading(true);
      setPeopleLoading(true);
      setSessionMessage("");

      try {
        const [
          profile,
          loadedSessions,
          loadedFeed,
          loadedPeople,
          loadedNotifications,
        ] =
          await Promise.all([
            fetchProfile(user.id),
            fetchUserSessions(user),
            fetchFollowingFeed(user.id),
            fetchDiscoverProfiles(user.id),
            fetchNotifications(user.id),
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
        setNotifications(loadedNotifications);
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
  }, [user, userId]);

  const selfProfile = useMemo<ProfileView>(
    () => ({
      id: user.id,
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
      user,
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

    try {
      const savedSession = await saveSession({
        user,
        puzzle,
        title: `${puzzle} practice session`,
        solves,
      });
      setUserSessions((current) => [savedSession, ...current]);
      setSolves([]);
      setSessionMessage("Session saved.");
    } catch (error) {
      setSessionMessage(errorMessage(error, "Could not save session."));
    } finally {
      setPublishing(false);
    }
  }

  async function deletePublishedSession(sessionId: string) {
    const session = userSessions.find((item) => item.id === sessionId);
    const label = session ? `"${session.title}"` : "this session";

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setProfileMessage("");

    try {
      await deleteSession(sessionId);
    } catch (error) {
      setProfileMessage(errorMessage(error, "Could not delete session."));
      return;
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
    try {
      const profile = await fetchProfile(person.id);
      if (profile) {
        wcaId = profile.wca_id ?? "";
        sessions = await fetchPublicSessionsForProfile(profile, user.id);
        wcaPersonalBests = wcaId ? await fetchWcaPersonalBests(wcaId) : [];
      }
    } catch (error) {
      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Could not load profile sessions.",
      );
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

    if (nextFollowState) {
      await notifyUser({
        message: `${displayName} followed you.`,
        recipientId: selectedProfile.id,
        type: "follow",
      });
    }
  }

  async function togglePersonFollow(person: FollowCandidate) {
    const nextFollowState = !person.following;

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

    if (nextFollowState) {
      await notifyUser({
        message: `${displayName} followed you.`,
        recipientId: person.id,
        type: "follow",
      });
    }
  }

  function updateSessionById(
    sessionId: string,
    update: (session: AppSession) => AppSession,
  ) {
    const updateSessions = (sessions: AppSession[]) =>
      sessions.map((session) =>
        session.id === sessionId ? update(session) : session,
      );

    setUserSessions(updateSessions);
    setFeedSessions(updateSessions);
    setFollowing((current) =>
      current.map((person) => ({
        ...person,
        sessions: updateSessions(person.sessions),
      })),
    );
    setSelectedProfile((current) =>
      current
        ? {
            ...current,
            sessions: updateSessions(current.sessions),
          }
        : current,
    );
  }

  async function toggleSessionKudos(session: AppSession) {
    const nextLiked = !session.liked;

    updateSessionById(session.id, (current) => ({
      ...current,
      liked: nextLiked,
      kudosCount: Math.max(0, current.kudosCount + (nextLiked ? 1 : -1)),
    }));

    try {
      await setSessionKudos({
        sessionId: session.id,
        userId: user.id,
        liked: nextLiked,
      });
      if (nextLiked) {
        await notifyUser({
          message: `${displayName} gave kudos to your ${session.puzzle} session.`,
          recipientId: session.userId,
          sessionId: session.id,
          type: "kudos",
        });
      }
    } catch (error) {
      updateSessionById(session.id, (current) => ({
        ...current,
        liked: session.liked,
        kudosCount: session.kudosCount,
      }));
      setSessionMessage(errorMessage(error, "Could not update kudos."));
    }
  }

  async function addFeedComment(session: AppSession, body: string) {
    const trimmedBody = body.trim();
    if (!trimmedBody) return;

    let comment: AppComment;

    try {
      comment = await addSessionComment({
        body: trimmedBody,
        sessionId: session.id,
        user,
      });
    } catch (error) {
      setSessionMessage(errorMessage(error, "Could not add comment."));
      return;
    }

    updateSessionById(session.id, (current) => ({
      ...current,
      comments: [...current.comments, comment],
    }));

    await notifyUser({
      message: `${displayName} commented on your ${session.puzzle} session.`,
      recipientId: session.userId,
      sessionId: session.id,
      type: "comment",
    });
  }

  async function deleteFeedComment(session: AppSession, comment: AppComment) {
    updateSessionById(session.id, (current) => ({
      ...current,
      comments: current.comments.filter((item) => item.id !== comment.id),
    }));

    try {
      await deleteSessionComment(comment.id);
    } catch (error) {
      updateSessionById(session.id, (current) => ({
        ...current,
        comments: [...current.comments, comment].sort(
          (a, b) =>
            Date.parse(a.createdAtSort) - Date.parse(b.createdAtSort),
        ),
      }));
      setSessionMessage(errorMessage(error, "Could not delete comment."));
    }
  }

  async function notifyUser({
    message,
    recipientId,
    sessionId = null,
    type,
  }: {
    message: string;
    recipientId: string;
    sessionId?: string | null;
    type: AppNotification["type"];
  }) {
    if (!userId || recipientId === userId) return;

    try {
      const notification = await createNotification({
        actorId: user.id,
        message,
        recipientId,
        sessionId,
        type,
      });
      if (notification && recipientId === userId) {
        setNotifications((current) => [notification, ...current]);
      }
    } catch (error) {
      setSessionMessage(errorMessage(error, "Could not create notification."));
    }
  }

  async function markAllNotificationsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );

    try {
      await markNotificationsRead(user.id);
    } catch (error) {
      setSessionMessage(errorMessage(error, "Could not update notifications."));
    }
  }

  return (
    <main className="grid min-h-screen gap-[22px] p-[22px] [grid-template-columns:260px_minmax(360px,1fr)] max-[1120px]:[grid-template-columns:210px_minmax(0,1fr)] max-[760px]:flex max-[760px]:flex-col max-[760px]:p-3.5">
      <AppSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onShowProfile={showSelfProfile}
        onSignOut={() => {
          if (confirmLeavingUnpublishedSession()) onSignOut();
        }}
      />

      <div className="grid min-w-0 content-start gap-4">
        <NotificationBell
          notifications={notifications}
          onMarkAllRead={markAllNotificationsRead}
        />

        {activeView === "timer" && (
          <div className="min-w-0">
            <TimerPage
              addManualSolve={addManualSolve}
              currentScramble={currentScramble}
              elapsed={elapsed}
              importSolves={importSolves}
              importText={importText}
              inspectionAvailable={inspectionAvailable}
              inspectionElapsed={inspectionElapsed}
              inspectionEnabled={inspectionEnabled}
              inspectionPenalty={inspectionPenalty}
              isManualOnlyEvent={isManualOnlyEvent}
              manualPenalty={manualPenalty}
              manualTime={manualTime}
              nextScramble={nextScramble}
              onDeleteSolve={deleteSolve}
              onImportTextChange={setImportText}
              onInspectionEnabledChange={setInspectionEnabled}
              onManualPenaltyChange={setManualPenalty}
              onManualTimeChange={setManualTime}
              onPuzzleChange={setPuzzle}
              onSolvePenaltyChange={setSolvePenalty}
              publishSession={publishSession}
              publishing={publishing}
              puzzle={puzzle}
              scrambleLoading={scrambleLoading}
              sessionMessage={sessionMessage}
              solves={solves}
              stats={stats}
              timerState={timerState}
              toggleTimer={toggleTimer}
            />
          </div>
        )}

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
            onAddComment={addFeedComment}
            onDeleteComment={deleteFeedComment}
            onToggleKudos={toggleSessionKudos}
            userId={userId}
          />
        </section>

        <section
          className="flex min-w-0 flex-col gap-4"
          hidden={activeView !== "people"}
        >
          <PeoplePage
            people={following}
            loading={peopleLoading}
            onFollow={togglePersonFollow}
            onViewProfile={openCandidateProfile}
          />
        </section>
      </div>
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
