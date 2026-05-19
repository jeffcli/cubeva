import {
  Activity,
  Clock,
  Edit3,
  Flame,
  Medal,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AppSession, WcaPersonalBest } from "../database";
import { wcaEvents } from "../scrambles";
import { average, bestTime, getProfileStats } from "../solveUtils";
import type { ProfileView } from "../types";
import { Metric } from "./Metric";

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
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("wca");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const eventStats = useMemo(
    () => getEventStats(profile.sessions),
    [profile.sessions],
  );
  const selectedEventStats = useMemo(
    () => eventStats.find((event) => event.puzzle === selectedEvent) ?? null,
    [eventStats, selectedEvent],
  );

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
            {selectedEvent === "all" && eventStats.length === 0 ? (
              <p className="empty-state">No event stats yet.</p>
            ) : selectedEvent === "all" ? (
              <div className="event-stats-list">
                {eventStats.map((event) => (
                  <EventStatRow event={event} key={event.puzzle} />
                ))}
              </div>
            ) : selectedEventStats ? (
              <EventStatDetail event={selectedEventStats} />
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
              <ProfileSessionCard session={session} key={session.id} />
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

type EventStats = {
  puzzle: string;
  sessionCount: number;
  solveCount: number;
  best: string;
  average: string;
};

function WcaPersonalBestCard({
  personalBest,
}: {
  personalBest: WcaPersonalBest;
}) {
  return (
    <article className="wca-card">
      <div className="wca-card-head">
        <Medal size={18} />
        <strong>{personalBest.eventName}</strong>
      </div>
      <dl>
        <div>
          <dt>Single</dt>
          <dd>
            {formatWcaResult(personalBest.eventId, personalBest.bestSingle)}
          </dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>
            {formatWcaResult(personalBest.eventId, personalBest.bestAverage)}
          </dd>
        </div>
        <div>
          <dt>World rank</dt>
          <dd>
            {formatRank(personalBest.worldRankSingle)}
            {personalBest.worldRankAverage
              ? ` / ${formatRank(personalBest.worldRankAverage)}`
              : ""}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ProfileSessionCard({ session }: { session: AppSession }) {
  return (
    <article className="feed-item">
      <div className="feed-author">
        <div className="avatar">{session.avatar}</div>
        <div>
          <strong>{session.title}</strong>
          <small>
            {session.createdAt} · {session.puzzle}
          </small>
        </div>
      </div>
      <div className="feed-stats">
        <span>avg {average(session.solves)}</span>
        <span>best {bestTime(session.solves)}</span>
        <span>{session.solves.length} solves</span>
      </div>
    </article>
  );
}

function EventStatRow({ event }: { event: EventStats }) {
  return (
    <article className="event-stat-row">
      <div>
        <strong>{event.puzzle}</strong>
        <small>
          {event.sessionCount} sessions · {event.solveCount} solves
        </small>
      </div>
      <div className="event-stat-values">
        <span>best {event.best}</span>
        <span>avg {event.average}</span>
      </div>
    </article>
  );
}

function EventStatDetail({ event }: { event: EventStats }) {
  return (
    <article className="event-stat-detail">
      <div className="section-head">
        <h4>{event.puzzle}</h4>
        <span>{event.solveCount} solves</span>
      </div>
      <div className="event-detail-grid">
        <Metric icon={<Trophy size={18} />} label="Best" value={event.best} />
        <Metric
          icon={<Activity size={18} />}
          label="Average"
          value={event.average}
        />
        <Metric
          icon={<Clock size={18} />}
          label="Sessions"
          value={String(event.sessionCount)}
        />
        <Metric
          icon={<Flame size={18} />}
          label="Solves"
          value={String(event.solveCount)}
        />
      </div>
    </article>
  );
}

function getEventStats(sessions: AppSession[]): EventStats[] {
  const events = new Map<string, AppSession[]>();

  for (const session of sessions) {
    events.set(session.puzzle, [
      ...(events.get(session.puzzle) ?? []),
      session,
    ]);
  }

  return [...events.entries()]
    .map(([puzzle, eventSessions]) => {
      const solves = eventSessions.flatMap((session) => session.solves);
      return {
        puzzle,
        sessionCount: eventSessions.length,
        solveCount: solves.length,
        best: solves.length ? bestTime(solves) : "--",
        average: solves.length ? average(solves) : "--",
      };
    })
    .sort(
      (a, b) => b.solveCount - a.solveCount || a.puzzle.localeCompare(b.puzzle),
    );
}

function formatWcaResult(eventId: string, value: number | null) {
  if (!value || value < 0) return "-";

  if (eventId === "333fm") {
    return `${stripTrailingZeros(value / 100)} moves`;
  }

  if (eventId === "333mbf") {
    return String(value);
  }

  const totalSeconds = value / 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }

  return seconds.toFixed(2);
}

function formatRank(value: number | null) {
  return value ? `#${value.toLocaleString()}` : "-";
}

function stripTrailingZeros(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
