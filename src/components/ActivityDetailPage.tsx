import { ArrowLeft, Heart, MessageCircle, Timer, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import type { AppComment, AppSession } from "../data/database";
import { average, bestTime, formatSolveResult } from "../utils/solveUtils";

export function ActivityDetailPage({
  onAddComment,
  onBack,
  onDeleteComment,
  onToggleKudos,
  session,
  userId,
}: {
  onAddComment: (session: AppSession, body: string) => void;
  onBack: () => void;
  onDeleteComment: (session: AppSession, comment: AppComment) => void;
  onToggleKudos: (session: AppSession) => void;
  session: AppSession;
  userId: string;
}) {
  const [commentText, setCommentText] = useState("");

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;

    onAddComment(session, body);
    setCommentText("");
  }

  return (
    <section className="grid gap-4">
      <button
        className="min-h-10 justify-self-start bg-panel px-3 text-ink"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} /> Back
      </button>

      <article className="grid gap-4 rounded-lg border border-line bg-card p-[22px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
        <header className="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-lg bg-teal font-black text-white">
              {session.avatar}
            </div>
            <div>
              <strong className="block text-[1.05rem]">{session.user}</strong>
              <small className="block text-soft-muted">
                {session.createdAt} · {session.puzzle}
              </small>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 [&_span]:inline-flex [&_span]:min-h-9 [&_span]:items-center [&_span]:gap-1.5 [&_span]:rounded-lg [&_span]:bg-panel [&_span]:px-2.5 [&_span]:font-black">
            <span>
              <Heart size={16} /> {session.kudosCount} kudos
            </span>
            <span>
              <MessageCircle size={16} /> {session.comments.length} comments
            </span>
          </div>
        </header>

        <div>
          <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
            Activity
          </p>
          <h2 className="m-0 text-[clamp(2rem,4vw,3.6rem)] leading-none">
            {session.title}
          </h2>
        </div>

        <div className="grid gap-2.5 [grid-template-columns:repeat(3,minmax(0,1fr))] max-[760px]:grid-cols-1 [&_span]:rounded-lg [&_span]:bg-panel [&_span]:p-3 [&_span]:font-black">
          <span>
            <Trophy size={17} /> Best {bestTime(session.solves)}
          </span>
          <span>
            <Timer size={17} /> Average {average(session.solves)}
          </span>
          <span>{session.solves.length} solves</span>
        </div>

        <button
          className={`min-h-10 justify-self-start px-3.5 text-white ${
            session.liked ? "bg-accent" : "bg-ink"
          }`}
          type="button"
          onClick={() => onToggleKudos(session)}
        >
          <Heart size={17} /> {session.kudosCount} Kudos
        </button>
      </article>

      <section className="grid gap-3 rounded-lg border border-line bg-card p-[18px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0">Solves</h3>
          <span className="text-[0.85rem] font-extrabold text-soft-muted">
            {session.solves.length} total
          </span>
        </div>
        {session.solves.map((solve, index) => (
          <div
            className="grid min-h-[48px] items-center gap-2.5 border-t border-rule [grid-template-columns:44px_90px_76px_minmax(0,1fr)] max-[760px]:[grid-template-columns:40px_86px_72px]"
            key={solve.id}
          >
            <span>#{session.solves.length - index}</span>
            <strong>{formatSolveResult(solve)}</strong>
            <span>{solve.penalty.toUpperCase()}</span>
            <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[#66716c] max-[760px]:col-span-full max-[760px]:whitespace-normal">
              {solve.scramble}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 rounded-lg border border-line bg-card p-[18px] shadow-[0_18px_45px_rgba(29,35,32,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0">Comments</h3>
          <span className="text-[0.85rem] font-extrabold text-soft-muted">
            {session.comments.length} total
          </span>
        </div>
        {session.comments.length === 0 ? (
          <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
            No comments yet.
          </p>
        ) : (
          <div className="grid gap-2">
            {session.comments.map((comment) => (
              <article className="grid gap-1 rounded-lg bg-panel p-3" key={comment.id}>
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
    </section>
  );
}
