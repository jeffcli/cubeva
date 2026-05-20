import { Edit3, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { wcaEvents } from "../cubing/scrambles";
import type { AppSession } from "../data/database";
import { getEventStats, getWeeklyProgress } from "../features/profile/profileStats";
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
        : profile.sessions.filter((session) => session.puzzle === selectedEvent),
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
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="avatar xl">{profile.initials}</div>
          <div>
            <p className="eyebrow">
              {profile.isSelf ? "Your profile" : "Public profile"}
            </p>
            <h2>{profile.displayName}</h2>
            <p>@{profile.username}</p>
            {profile.wcaId && <p className="wca-id">WCA ID {profile.wcaId}</p>}
          </div>
        </div>
        <p>{profile.bio || "No bio yet."}</p>
        <div className="profile-actions">
          {profile.isSelf ? (
            <button type="button" onClick={onEdit}>
              <Edit3 size={18} /> Edit Profile
            </button>
          ) : (
            <button type="button" onClick={onFollow}>
              <UserPlus size={18} />{" "}
              {profile.following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </section>

      {profile.isSelf && isEditing && (
        <form className="profile-editor" onSubmit={onSave}>
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
          <div className="action-row">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && <p className="session-message">{message}</p>}

      <section className="profile-tabs">
        <div
          className="profile-tab-list"
          role="tablist"
          aria-label="Profile details"
        >
          {profileTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
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
          <div className="profile-tab-panel" role="tabpanel">
            <div className="section-head">
              <h3>WCA personal bests</h3>
              <span>{profile.wcaId || "No WCA ID"}</span>
            </div>
            {!profile.wcaId ? (
              <p className="empty-state">
                Add a WCA ID to this profile to show official personal bests.
              </p>
            ) : profile.wcaPersonalBests.length === 0 ? (
              <p className="empty-state">
                WCA ID linked. Personal bests will appear after the WCA cache is
                imported.
              </p>
            ) : (
              <div className="wca-grid">
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
          <div className="profile-tab-panel" role="tabpanel">
            <div className="section-head">
              <h3>Stats by event</h3>
              <span>{stats.eventCount} events</span>
            </div>
            <label className="select-label profile-event-select">
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
              <p className="empty-state">No event stats yet.</p>
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
              <p className="empty-state">
                No public sessions logged for {selectedEvent} yet.
              </p>
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="profile-tab-panel" role="tabpanel">
            <div className="section-head">
              <h3>Recent sessions</h3>
              <span>{profile.sessions.length} total</span>
            </div>
            {profile.sessions.length === 0 && (
              <p className="empty-state">No public sessions yet.</p>
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
    <section className="selected-day-sessions">
      <div className="section-head">
        <h4>{heading}</h4>
        <span>{sessions.length} total</span>
      </div>
      {sessions.length === 0 ? (
        <p className="empty-state">No sessions for this day.</p>
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
