import { Edit3, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { wcaEvents } from "../cubing/scrambles";
import type { AppSession } from "../data/database";
import {
  getEventStats,
  getWeeklyProgress,
} from "../features/profile/profileStats";
import type { ProfileView } from "../types/app";
import { getProfileStats } from "../utils/solveUtils";
import { WeeklyProgressChart } from "./ProfileCharts";
import { ProfileSessionCard } from "./ProfileSessionCard";
import { WcaPersonalBestCard } from "./WcaPersonalBestCard";

export function ProfilePage({
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
  onDeleteSession,
}: {
  profile: ProfileView;
  stats: ReturnType<typeof getProfileStats>;
  isEditing: boolean;
  form: { displayName: string; username: string; bio: string; wcaId: string };
  message: string;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: {
    displayName: string;
    username: string;
    bio: string;
    wcaId: string;
  }) => void;
  onFollow: () => void;
  onDeleteSession: (sessionId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("wca");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const eventStats = useMemo(
    () => getEventStats(profile.sessions),
    [profile.sessions],
  );
  const filteredProfileSessions = useMemo(
    () =>
      selectedEvent === "all"
        ? profile.sessions
        : profile.sessions.filter(
            (session) => session.puzzle === selectedEvent,
          ),
    [profile.sessions, selectedEvent],
  );
  const weeklyProgress = useMemo(
    () => getWeeklyProgress(filteredProfileSessions),
    [filteredProfileSessions],
  );
  const selectedEventStats = useMemo(
    () => eventStats.find((event) => event.puzzle === selectedEvent) ?? null,
    [eventStats, selectedEvent],
  );
  const selectedWeeklyDay =
    weeklyProgress.days.find((day) => day.key === selectedDayKey) ??
    weeklyProgress.days.at(-1) ??
    null;
  const selectedDaySessions = useMemo(
    () =>
      selectedWeeklyDay
        ? filteredProfileSessions.filter(
            (session) => sessionDateKey(session) === selectedWeeklyDay.key,
          )
        : [],
    [filteredProfileSessions, selectedWeeklyDay],
  );

  useEffect(() => {
    setSelectedDayKey(null);
  }, [selectedEvent, profile.id]);

  return (
    <>
      <section className="grid gap-4 rounded-lg border border-line bg-card p-[22px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
        <div className="flex items-center gap-3.5 max-[760px]:flex-col max-[760px]:items-stretch">
          <div className="flex h-[78px] w-[78px] flex-none items-center justify-center rounded-lg bg-teal text-[1.75rem] font-black text-white">
            {profile.initials}
          </div>
          <div>
            <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
              {profile.isSelf ? "Your profile" : "Public profile"}
            </p>
            <h2 className="m-0 text-[clamp(2.1rem,5vw,4rem)] leading-[0.98]">
              {profile.displayName}
            </h2>
            <p className="m-0">@{profile.username}</p>
            {profile.wcaId && (
              <p className="mt-1 text-[0.88rem] font-black text-[#227064]">
                WCA ID {profile.wcaId}
              </p>
            )}
          </div>
        </div>
        <p className="m-0">{profile.bio || "No bio yet."}</p>
        <div className="flex items-center gap-3.5 max-[760px]:flex-col max-[760px]:items-stretch">
          {profile.isSelf ? (
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={onEdit}
            >
              <Edit3 size={18} /> Edit Profile
            </button>
          ) : (
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="button"
              onClick={onFollow}
            >
              <UserPlus size={18} />{" "}
              {profile.following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </section>

      {profile.isSelf && isEditing && (
        <form
          className="grid gap-3 rounded-lg border border-line bg-card p-[18px] shadow-[0_18px_45px_rgba(29,35,32,0.08)] [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[0.82rem] [&_label]:font-extrabold [&_label]:text-muted"
          onSubmit={onSave}
        >
          <label>
            Display name
            <input
              value={form.displayName}
              onChange={(event) =>
                onFormChange({ ...form, displayName: event.target.value })
              }
              required
            />
          </label>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) =>
                onFormChange({ ...form, username: event.target.value })
              }
              required
            />
          </label>
          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(event) =>
                onFormChange({ ...form, bio: event.target.value })
              }
              rows={4}
            />
          </label>
          <label>
            WCA ID
            <input
              value={form.wcaId}
              onChange={(event) =>
                onFormChange({ ...form, wcaId: event.target.value })
              }
              placeholder="2019SMIT01"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              className="min-h-11 bg-panel px-3.5 text-ink"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
          {message}
        </p>
      )}

      <section className="grid gap-3 rounded-lg border border-line bg-card p-[18px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-panel-border bg-panel p-1 max-[760px]:grid-cols-1"
          role="tablist"
          aria-label="Profile details"
        >
          {profileTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={`min-h-10 justify-center px-2.5 ${
                activeTab === tab.id
                  ? "bg-ink text-white"
                  : "bg-transparent text-muted hover:bg-ink hover:text-white"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "wca" && (
          <div className="grid gap-3" role="tabpanel">
            {!profile.wcaId ? (
              <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
                Add a WCA ID to this profile to show official personal bests.
              </p>
            ) : profile.wcaPersonalBests.length === 0 ? (
              <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
                WCA ID linked. Personal bests will appear after the WCA cache is
                imported.
              </p>
            ) : (
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
                {profile.wcaPersonalBests.map((personalBest) => (
                  <WcaPersonalBestCard
                    personalBest={personalBest}
                    key={personalBest.eventId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="grid gap-3" role="tabpanel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3>Stats by event</h3>
              <span className="text-[0.85rem] font-extrabold text-soft-muted">
                {stats.eventCount} events
              </span>
            </div>
            <label className="grid max-w-80 gap-1.5 text-[0.78rem] font-extrabold text-muted">
              Event
              <select
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
              >
                <option value="all">All events</option>
                {wcaEvents.map((event) => (
                  <option value={event.label} key={event.eventId}>
                    {event.label}
                  </option>
                ))}
              </select>
            </label>
            <WeeklyProgressChart
              onSelectDay={setSelectedDayKey}
              progress={weeklyProgress}
              selectedDayKey={selectedWeeklyDay?.key ?? null}
            />
            {selectedEvent === "all" && eventStats.length === 0 ? (
              <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
                No event stats yet.
              </p>
            ) : selectedEvent === "all" ? (
              <SelectedDaySessions
                eventLabel="all events"
                sessions={selectedDaySessions}
                selectedDayLabel={selectedWeeklyDay?.label ?? ""}
              />
            ) : selectedEventStats ? (
              <SelectedDaySessions
                eventLabel={selectedEvent}
                sessions={selectedDaySessions}
                selectedDayLabel={selectedWeeklyDay?.label ?? ""}
              />
            ) : (
              <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
                No public sessions logged for {selectedEvent} yet.
              </p>
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="grid gap-3" role="tabpanel">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3>Recent sessions</h3>
              <span className="text-[0.85rem] font-extrabold text-soft-muted">
                {profile.sessions.length} total
              </span>
            </div>
            {profile.sessions.length === 0 && (
              <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
                No public sessions yet.
              </p>
            )}
            {profile.sessions.map((session) => (
              <ProfileSessionCard
                canDelete={profile.isSelf}
                onDeleteSession={onDeleteSession}
                session={session}
                key={session.id}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

type ProfileTab = "wca" | "events" | "sessions";

const profileTabs: { id: ProfileTab; label: string }[] = [
  { id: "wca", label: "WCA PBs" },
  { id: "events", label: "Stats" },
  { id: "sessions", label: "Recent sessions" },
];

function SelectedDaySessions({
  eventLabel,
  selectedDayLabel,
  sessions,
}: {
  eventLabel: string;
  selectedDayLabel: string;
  sessions: AppSession[];
}) {
  const heading = selectedDayLabel
    ? `${selectedDayLabel} (${eventLabel}) sessions`
    : `Selected day (${eventLabel}) sessions`;

  return (
    <section className="grid gap-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4>{heading}</h4>
        <span className="text-[0.85rem] font-extrabold text-soft-muted">
          {sessions.length} total
        </span>
      </div>
      {sessions.length === 0 ? (
        <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
          No sessions for this day.
        </p>
      ) : (
        sessions.map((session) => (
          <ProfileSessionCard
            canDelete={false}
            onDeleteSession={() => undefined}
            session={session}
            key={session.id}
          />
        ))
      )}
    </section>
  );
}

function sessionDateKey(session: AppSession) {
  const date = new Date(session.createdAtSort ?? session.createdAt);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
