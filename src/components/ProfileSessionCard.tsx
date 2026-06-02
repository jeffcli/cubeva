import { Trash2 } from "lucide-react";
import type { AppSession } from "../data/database";
import { average, bestTime } from "../utils/solveUtils";
import { Button } from "./ui/button";

export function ProfileSessionCard({
  canDelete,
  onDeleteSession,
  onViewSession,
  session,
}: {
  canDelete: boolean;
  onDeleteSession: (sessionId: string) => void;
  onViewSession: (session: AppSession) => void;
  session: AppSession;
}) {
  return (
    <article className="grid gap-3 border-t border-rule pt-3.5 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="flex items-center gap-3 [&_small]:block [&_strong]:block">
        <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-teal font-black text-white">
          {session.avatar}
        </div>
        <div>
          <strong>{session.title}</strong>
          <small className="text-soft-muted">{session.createdAt}</small>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 [&_span]:rounded-md [&_span]:bg-panel [&_span]:p-[9px] [&_span]:text-center [&_span]:text-[0.8rem] [&_span]:font-semibold">
        <span>avg {average(session.solves)}</span>
        <span>best {bestTime(session.solves)}</span>
        <span>{session.solves.length} solves</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => onViewSession(session)}
        >
          View details
        </Button>
        {canDelete && (
          <Button
            variant="destructive"
            type="button"
            onClick={() => onDeleteSession(session.id)}
          >
            <Trash2 size={16} /> Delete session
          </Button>
        )}
      </div>
    </article>
  );
}
