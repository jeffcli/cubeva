import { Heart, MessageCircle, Timer, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import type { AppComment, AppSession } from "../data/database";
import { average, bestTime, formatSolveResult } from "../utils/solveUtils";

export function FeedPage({
  onAddComment,
  onDeleteComment,
  onToggleKudos,
  sessions,
  loading,
  userId,
}: {
  onAddComment: (session: AppSession, body: string) => void;
  onDeleteComment: (session: AppSession, comment: AppComment) => void;
  onToggleKudos: (session: AppSession) => void;
  sessions: AppSession[];
  loading: boolean;
  userId: string | null;
}) {
  return (
    <>
      <header className="flex items-end justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch">
        <div></div>
      </header>

      <section className="grid gap-4">
        {loading && (
          <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
            Loading sessions from people you follow.
          </p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
            Follow cubers with public sessions to fill your feed.
          </p>
        )}
        {sessions.map((session) => (
          <FeedCard
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onToggleKudos={onToggleKudos}
            session={session}
            userId={userId}
            key={session.id}
          />
        ))}
      </section>
    </>
  );
}

function FeedCard({
  onAddComment,
  onDeleteComment,
  onToggleKudos,
  session,
  userId,
}: {
  onAddComment: (session: AppSession, body: string) => void;
  onDeleteComment: (session: AppSession, comment: AppComment) => void;
  onToggleKudos: (session: AppSession) => void;
  session: AppSession;
  userId: string | null;
}) {
  const previewSolves = session.solves.slice(0, 8);
  const [commentText, setCommentText] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(session.comments.length > 0);

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;

    onAddComment(session, body);
    setCommentText("");
    setCommentsOpen(true);
  }

  return (
    <article className="grid gap-4 rounded-lg border border-line bg-card p-[18px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
      <header className="flex items-center gap-3 [&_small]:block [&_strong]:block">
        <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-lg bg-teal font-black text-white">
          {session.avatar}
        </div>
        <div>
          <strong>{session.user}</strong>
          <small className="text-soft-muted">
            {session.createdAt} · {session.puzzle}
          </small>
        </div>
      </header>

      <div className="grid items-start gap-4 [grid-template-columns:minmax(0,1fr)_minmax(220px,0.55fr)] max-[760px]:flex max-[760px]:flex-col max-[760px]:items-stretch">
        <div>
          <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
            Session
          </p>
          <h3 className="m-0 text-[clamp(1.45rem,2.4vw,2.25rem)] leading-[1.05]">
            {session.title}
          </h3>
        </div>
        <div className="grid gap-2 [&_span]:inline-flex [&_span]:min-h-[38px] [&_span]:items-center [&_span]:gap-[7px] [&_span]:rounded-lg [&_span]:bg-panel [&_span]:px-2.5 [&_span]:py-2 [&_span]:font-black">
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

      <div
        className="flex flex-wrap gap-2 [&_span]:inline-flex [&_span]:min-h-[38px] [&_span]:items-center [&_span]:gap-[7px] [&_span]:rounded-lg [&_span]:bg-[#f2eadc] [&_span]:px-2.5 [&_span]:py-2 [&_span]:font-mono [&_span]:text-[0.82rem] [&_span]:font-black"
        aria-label="Solve preview"
      >
        {previewSolves.map((solve, index) => (
          <span key={solve.id}>
            #{session.solves.length - index} {formatSolveResult(solve)}
          </span>
        ))}
      </div>

      <footer className="flex items-center gap-3 border-t border-rule pt-3.5">
        <button
          className={`min-h-10 px-3.5 text-white ${
            session.liked ? "bg-accent" : "bg-ink"
          }`}
          type="button"
          onClick={() => onToggleKudos(session)}
        >
          <Heart size={17} /> {session.kudosCount} Kudos
        </button>
        <button
          className="min-h-10 bg-ink px-3.5 text-white"
          type="button"
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle size={17} /> {session.comments.length} Comments
        </button>
      </footer>
      {commentsOpen && (
        <section className="grid gap-3 rounded-lg bg-panel p-3">
          {session.comments.length > 0 && (
            <div className="grid gap-2">
              {session.comments.map((comment) => (
                <article
                  className="grid gap-1 rounded-lg bg-card p-3"
                  key={comment.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-[0.78rem] font-black text-white">
                      {comment.avatar}
                    </span>
                    <div>
                      <strong className="block text-[0.9rem]">
                        {comment.user}
                      </strong>
                      <small className="block text-soft-muted">
                        {comment.createdAt}
                      </small>
                    </div>
                    </div>
                    {comment.userId === userId && (
                      <button
                        aria-label={`Delete comment by ${comment.user}`}
                        className="h-8 w-8 bg-[#fff2ed] p-0 text-[#b4331f] hover:bg-accent hover:text-white"
                        type="button"
                        onClick={() => onDeleteComment(session, comment)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <p className="m-0 text-[#34413d]">{comment.body}</p>
                </article>
              ))}
            </div>
          )}
          <form
            className="grid gap-2 [grid-template-columns:minmax(0,1fr)_auto] max-[760px]:grid-cols-1"
            onSubmit={submitComment}
          >
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment"
            />
            <button
              className="min-h-11 bg-ink px-3.5 text-white"
              type="submit"
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </form>
        </section>
      )}
    </article>
  );
}
