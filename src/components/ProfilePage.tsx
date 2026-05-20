import {
  Activity,
  Clock,
  Edit3,
  Flame,
  Medal,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const weeklyProgress = useMemo(
    () =>
      getWeeklyProgress(
        selectedEvent === "all"
          ? profile.sessions
          : profile.sessions.filter((session) => session.puzzle === selectedEvent),
      ),
    [profile.sessions, selectedEvent],
  );
  const selectedEventStats = useMemo(
    () => eventStats.find((event) => event.puzzle === selectedEvent) ?? null,
    [eventStats, selectedEvent],
  );
  const selectedWeeklyDay =
    weeklyProgress.days.find((day) => day.key === selectedDayKey) ??
    weeklyProgress.days.at(-1) ??
    null;

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
            <div className="profile-chart-grid">
              <WeeklyProgressChart
                eventLabel={selectedEvent === "all" ? "All events" : selectedEvent}
                onSelectDay={setSelectedDayKey}
                progress={weeklyProgress}
                selectedDayKey={selectedWeeklyDay?.key ?? null}
              />
              <SolveBarChart
                bars={eventStats.map((event) => ({
                  key: event.puzzle,
                  label: event.puzzle,
                  value: event.solveCount,
                }))}
                emptyLabel="No event volume yet."
                title="Solves by event"
              />
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

type EventStats = {
  puzzle: string;
  sessionCount: number;
  solveCount: number;
  best: string;
  average: string;
};

type ChartBar = {
  key: string;
  label: string;
  eventCount?: number;
  sessionCount?: number;
  value: number;
};

type WeeklyProgress = {
  days: ChartBar[];
  totalSolves: number;
  sessionCount: number;
  eventCount: number;
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

function ProfileSessionCard({
  canDelete,
  onDeleteSession,
  session,
}: {
  canDelete: boolean;
  onDeleteSession: (sessionId: string) => void;
  session: AppSession;
}) {
  return (
    <article className="feed-item">
      <div className="feed-author">
        <div className="avatar">{session.avatar}</div>
        <div>
          <strong>{session.title}</strong>
          <small>{session.createdAt}</small>
        </div>
      </div>
      <div className="feed-stats">
        <span>avg {average(session.solves)}</span>
        <span>best {bestTime(session.solves)}</span>
        <span>{session.solves.length} solves</span>
      </div>
      {canDelete && (
        <button
          className="delete-session-button"
          type="button"
          onClick={() => onDeleteSession(session.id)}
        >
          <Trash2 size={16} /> Delete session
        </button>
      )}
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

function WeeklyProgressChart({
  eventLabel,
  onSelectDay,
  progress,
  selectedDayKey,
}: {
  eventLabel: string;
  onSelectDay: (dayKey: string) => void;
  progress: WeeklyProgress;
  selectedDayKey: string | null;
}) {
  const chartWidth = 620;
  const chartHeight = 210;
  const padding = { top: 22, right: 22, bottom: 34, left: 44 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const selectedDay =
    progress.days.find((day) => day.key === selectedDayKey) ??
    progress.days.at(-1) ??
    null;
  const maxValue = Math.max(...progress.days.map((day) => day.value), 1);
  const points = progress.days.map((day, index) => {
    const x =
      padding.left +
      (progress.days.length === 1
        ? plotWidth
        : (index / (progress.days.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (day.value / maxValue) * plotHeight;
    return { x, y, day };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  const selectedPoint =
    points.find((point) => point.day.key === selectedDay?.key) ?? points.at(-1);

  return (
    <article className="weekly-progress-card">
      <div>
        <h4>This week</h4>
        <p>{eventLabel}</p>
      </div>
      <div className="weekly-summary">
        <div>
          <span>Solves</span>
          <strong>{selectedDay?.value ?? 0}</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{selectedDay?.sessionCount ?? 0}</strong>
        </div>
        <div>
          <span>Events</span>
          <strong>{selectedDay?.eventCount ?? 0}</strong>
        </div>
      </div>
      <div className="weekly-chart-wrap">
        <svg
          className="weekly-chart"
          role="img"
          aria-label={`Last 7 days: ${progress.totalSolves} solves`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <linearGradient id="weeklySolveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f06d2f" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f06d2f" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  className="weekly-grid-line"
                  x1={padding.left}
                  x2={padding.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text className="weekly-axis-label" x={8} y={y + 5}>
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            );
          })}
          {progress.days.map((day, index) => {
            const x =
              padding.left +
              (progress.days.length === 1
                ? plotWidth
                : (index / (progress.days.length - 1)) * plotWidth);
            return (
              <g key={day.label}>
                <line
                  className="weekly-grid-line vertical"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                />
                <text
                  className="weekly-axis-label day"
                  textAnchor="middle"
                  x={x}
                  y={chartHeight - 8}
                >
                  {day.label}
                </text>
              </g>
            );
          })}
          <path className="weekly-area" d={areaPath} />
          <path className="weekly-line" d={linePath} />
          {points.map((point) => (
            <g
              className="weekly-point-button"
              key={point.day.key}
              onClick={() => onSelectDay(point.day.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDay(point.day.key);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <circle
                className={
                  point.day.key === selectedPoint?.day.key
                    ? "weekly-point selected"
                    : "weekly-point"
                }
                cx={point.x}
                cy={point.y}
                r="6"
              />
              <circle
                className="weekly-hit-target"
                cx={point.x}
                cy={point.y}
                r="18"
              />
            </g>
          ))}
          {selectedPoint && (
            <>
              <line
                className="weekly-current-line"
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={padding.top}
                y2={padding.top + plotHeight}
              />
              <circle
                className="weekly-current-glow"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="20"
              />
              <circle
                className="weekly-current-point"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="10"
              />
              <text
                className="weekly-current-label"
                textAnchor="end"
                x={selectedPoint.x}
                y={padding.top - 8}
              >
                {selectedPoint.day.value} solves
              </text>
            </>
          )}
        </svg>
      </div>
    </article>
  );
}

function SolveBarChart({
  bars,
  emptyLabel,
  title,
}: {
  bars: ChartBar[];
  emptyLabel: string;
  title: string;
}) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <article className="profile-chart-card">
      <div className="section-head">
        <h4>{title}</h4>
        <span>{maxValue ? `${maxValue} max` : "No data"}</span>
      </div>
      {bars.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <div className="solve-bar-chart">
          {bars.map((bar) => (
            <div
              className="solve-bar-row"
              key={bar.key}
              aria-label={`${bar.label}: ${bar.value} solves`}
            >
              <span>{bar.label}</span>
              <div className="solve-bar-track">
                <div
                  className="solve-bar-fill"
                  style={{ width: `${Math.max((bar.value / maxValue) * 100, 4)}%` }}
                />
              </div>
              <strong>{bar.value}</strong>
            </div>
          ))}
        </div>
      )}
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

function getWeeklyProgress(sessions: AppSession[]): WeeklyProgress {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const dayKeySet = new Set(dayKeys);
  const dayStats = new Map<
    string,
    { eventIds: Set<string>; sessionCount: number; solveCount: number }
  >();

  for (const session of sessions) {
    const date = new Date(session.createdAtSort ?? session.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10);
    if (!dayKeySet.has(dayKey)) continue;

    const current = dayStats.get(dayKey) ?? {
      eventIds: new Set<string>(),
      sessionCount: 0,
      solveCount: 0,
    };
    current.eventIds.add(session.puzzle);
    current.sessionCount += 1;
    current.solveCount += session.solves.length;
    dayStats.set(dayKey, current);
  }

  const days = dayKeys.map((day) => ({
      key: day,
      label: formatChartDay(day),
      eventCount: dayStats.get(day)?.eventIds.size ?? 0,
      sessionCount: dayStats.get(day)?.sessionCount ?? 0,
      value: dayStats.get(day)?.solveCount ?? 0,
  }));

  return {
    days,
    eventCount: new Set(sessions.map((session) => session.puzzle)).size,
    sessionCount: sessions.length,
    totalSolves: days.reduce((sum, day) => sum + day.value, 0),
  };
}

function formatChartDay(day: string) {
  const date = new Date(`${day}T12:00:00`);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
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
