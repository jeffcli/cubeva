import { Activity, Clock, Edit3, Flame, Trophy, UserPlus } from "lucide-react";
import type { AppSession } from "../database";
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
  form: { displayName: string; username: string; bio: string };
  message: string;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onFormChange: (form: {
    displayName: string;
    username: string;
    bio: string;
  }) => void;
  onFollow: () => void;
}) {
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

      <section className="stats-grid">
        <Metric icon={<Trophy size={18} />} label="PB" value={stats.best} />
        <Metric
          icon={<Activity size={18} />}
          label="Average"
          value={stats.average}
        />
        <Metric
          icon={<Clock size={18} />}
          label="Sessions"
          value={String(stats.sessionCount)}
        />
        <Metric
          icon={<Flame size={18} />}
          label="Solves"
          value={String(stats.solveCount)}
        />
      </section>

      <section className="feed profile-history">
        <div className="section-head">
          <h3>Recent sessions</h3>
          <span>{stats.eventCount} events</span>
        </div>
        {profile.sessions.length === 0 && (
          <p className="empty-state">No public sessions yet.</p>
        )}
        {profile.sessions.map((session) => (
          <ProfileSessionCard session={session} key={session.id} />
        ))}
      </section>
    </>
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
