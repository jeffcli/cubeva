import { Heart, MessageCircle, Timer, Trophy } from "lucide-react";
import type { AppSession } from "../database";
import { average, bestTime, formatSolveResult } from "../solveUtils";

export function FeedPage({
  sessions,
  loading,
}: {
  sessions: AppSession[];
  loading: boolean;
}) {
  return (
    <>
      <header className="feed-page-header">
        <div>
          <p className="eyebrow">Following</p>
          <h2>Recent cubing activity</h2>
        </div>
        <span>{loading ? "Loading" : `${sessions.length} sessions`}</span>
      </header>

      <section className="feed-page">
        {loading && <p className="empty-state">Loading sessions from people you follow.</p>}
        {!loading && sessions.length === 0 && (
          <p className="empty-state">Follow cubers with public sessions to fill your feed.</p>
        )}
        {sessions.map((session) => (
          <FeedCard session={session} key={session.id} />
        ))}
      </section>
    </>
  );
}

function FeedCard({ session }: { session: AppSession }) {
  const previewSolves = session.solves.slice(0, 8);

  return (
    <article className="feed-card">
      <header className="feed-card-header">
        <div className="avatar">{session.avatar}</div>
        <div>
          <strong>{session.user}</strong>
          <small>{session.createdAt} · {session.puzzle}</small>
        </div>
      </header>

      <div className="feed-card-body">
        <div>
          <p className="eyebrow">Session</p>
          <h3>{session.title}</h3>
        </div>
        <div className="feed-card-stats">
          <span>
            <Trophy size={17} />
            best {bestTime(session.solves)}
          </span>
          <span>
            <Timer size={17} />
            avg {average(session.solves)}
          </span>
          <span>{session.solves.length} solves</span>
        </div>
      </div>

      <div className="solve-strip" aria-label="Solve preview">
        {previewSolves.map((solve, index) => (
          <span key={solve.id}>#{session.solves.length - index} {formatSolveResult(solve)}</span>
        ))}
      </div>

      <footer className="feed-card-actions">
        <button className={session.liked ? "liked" : ""} type="button">
          <Heart size={17} /> Kudos
        </button>
        <button type="button">
          <MessageCircle size={17} /> Comment
        </button>
      </footer>
    </article>
  );
}
