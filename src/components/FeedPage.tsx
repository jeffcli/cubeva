import { Heart, MessageCircle, Timer, Trophy } from "lucide-react";
import type { AppSession } from "../data/database";
import { average, bestTime, formatSolveResult } from "../utils/solveUtils";

export function FeedPage({
  sessions,
  loading,
}: {
  sessions: AppSession[];
  loading: boolean;
}) {
  return (
    <>
      <header className="flex items-end justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch">
        <div>
          <p className="m-0 text-[0.72rem] font-black uppercase text-soft-muted">
            Following
          </p>
          <h2 className="m-0 text-[clamp(2rem,4vw,3.6rem)] leading-[0.98]">
            Recent cubing activity
          </h2>
        </div>
        <span className="m-0 font-black text-soft-muted">
          {loading ? "Loading" : `${sessions.length} sessions`}
        </span>
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
          <FeedCard session={session} key={session.id} />
        ))}
      </section>
    </>
  );
}

function FeedCard({ session }: { session: AppSession }) {
  const previewSolves = session.solves.slice(0, 8);

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
        >
          <Heart size={17} /> Kudos
        </button>
        <button className="min-h-10 bg-ink px-3.5 text-white" type="button">
          <MessageCircle size={17} /> Comment
        </button>
      </footer>
    </article>
  );
}
