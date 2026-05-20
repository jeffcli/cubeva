import { Trash2 } from "lucide-react";
import type { AppSession } from "../database";
import { average, bestTime } from "../solveUtils";

export function ProfileSessionCard({
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
