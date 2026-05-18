import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Clock,
  Flame,
  Heart,
  Play,
  Plus,
  Search,
  Square,
  Timer,
  Trophy,
  UserPlus,
  Users
} from "lucide-react";
import "./styles.css";
import { useEffect, useMemo, useRef, useState } from "react";

type Penalty = "ok" | "+2" | "dnf";

type Solve = {
  id: string;
  timeMs: number;
  penalty: Penalty;
  scramble: string;
  createdAt: string;
};

type Session = {
  id: string;
  user: string;
  avatar: string;
  puzzle: string;
  title: string;
  solves: Solve[];
  createdAt: string;
  liked: boolean;
};

type FollowCandidate = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  average: string;
  following: boolean;
};

const sampleScrambles = [
  "R U R' U' F2 D L2 U R2 F' U2",
  "F R U' R' U' R U R' F' L2 D2",
  "L2 B2 U' R2 F2 D B2 L' U R'",
  "R2 U2 F' L2 B D2 R U' B2 D",
  "U F2 R U' R2 F L' D2 B U2"
];

const starterSessions: Session[] = [
  {
    id: "s1",
    user: "Maya Chen",
    avatar: "MC",
    puzzle: "3x3",
    title: "Lunch break turning felt clean",
    createdAt: "11:42 AM",
    liked: true,
    solves: [
      makeSolve(18740, "ok"),
      makeSolve(17990, "ok"),
      makeSolve(19630, "+2"),
      makeSolve(17320, "ok"),
      makeSolve(18110, "ok")
    ]
  },
  {
    id: "s2",
    user: "Noah Patel",
    avatar: "NP",
    puzzle: "OH",
    title: "One-handed consistency block",
    createdAt: "Yesterday",
    liked: false,
    solves: [
      makeSolve(31240, "ok"),
      makeSolve(29870, "ok"),
      makeSolve(33610, "ok"),
      makeSolve(30550, "ok"),
      makeSolve(32190, "dnf")
    ]
  }
];

const initialSolves = [
  makeSolve(21420, "ok"),
  makeSolve(20350, "ok"),
  makeSolve(22810, "+2"),
  makeSolve(19770, "ok")
];

const candidates: FollowCandidate[] = [
  { id: "u1", name: "Lena Ortiz", handle: "@lena2look", avatar: "LO", average: "avg 16.84", following: false },
  { id: "u2", name: "Sam Rivera", handle: "@samcuber", avatar: "SR", average: "avg 21.03", following: true },
  { id: "u3", name: "Iris Zhou", handle: "@iriscross", avatar: "IZ", average: "avg 13.92", following: false }
];

function makeSolve(timeMs: number, penalty: Penalty): Solve {
  return {
    id: crypto.randomUUID(),
    timeMs,
    penalty,
    scramble: sampleScrambles[Math.floor(Math.random() * sampleScrambles.length)],
    createdAt: new Date().toISOString()
  };
}

function formatTime(ms: number, penalty: Penalty = "ok") {
  if (penalty === "dnf") return "DNF";
  const adjusted = penalty === "+2" ? ms + 2000 : ms;
  const seconds = adjusted / 1000;
  return seconds < 60 ? seconds.toFixed(2) : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

function effectiveTime(solve: Solve) {
  if (solve.penalty === "dnf") return Number.POSITIVE_INFINITY;
  return solve.timeMs + (solve.penalty === "+2" ? 2000 : 0);
}

function average(solves: Solve[]) {
  const valid = solves.filter((solve) => solve.penalty !== "dnf");
  if (!valid.length) return "DNF";
  return formatTime(valid.reduce((sum, solve) => sum + effectiveTime(solve), 0) / valid.length);
}

function App() {
  const [solves, setSolves] = useState<Solve[]>(initialSolves);
  const [sessions, setSessions] = useState<Session[]>(starterSessions);
  const [following, setFollowing] = useState(candidates);
  const [manualTime, setManualTime] = useState("");
  const [manualPenalty, setManualPenalty] = useState<Penalty>("ok");
  const [puzzle, setPuzzle] = useState("3x3");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 17);
    return () => window.clearInterval(interval);
  }, [running]);

  const stats = useMemo(() => {
    const valid = solves.filter((solve) => solve.penalty !== "dnf");
    const best = valid.length ? valid.reduce((min, solve) => (effectiveTime(solve) < effectiveTime(min) ? solve : min), valid[0]) : null;
    return {
      count: solves.length,
      best: best ? formatTime(best.timeMs, best.penalty) : "--",
      average: average(solves),
      latest: solves[0] ? formatTime(solves[0].timeMs, solves[0].penalty) : "--"
    };
  }, [solves]);

  function toggleTimer() {
    if (running) {
      const solve = makeSolve(Date.now() - startRef.current, "ok");
      setSolves((current) => [solve, ...current]);
      setElapsed(0);
      setRunning(false);
      return;
    }
    startRef.current = Date.now();
    setRunning(true);
  }

  function addManualSolve() {
    const parsed = Number.parseFloat(manualTime);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setSolves((current) => [makeSolve(Math.round(parsed * 1000), manualPenalty), ...current]);
    setManualTime("");
    setManualPenalty("ok");
  }

  function publishSession() {
    if (!solves.length) return;
    const session: Session = {
      id: crypto.randomUUID(),
      user: "You",
      avatar: "Y",
      puzzle,
      title: `${puzzle} practice session`,
      createdAt: "Just now",
      liked: false,
      solves
    };
    setSessions((current) => [session, ...current]);
    setSolves([]);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <h1>CubeVa</h1>
            <p>Training feed for speedcubers</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          <a className="active" href="#timer"><Timer size={18} /> Timer</a>
          <a href="#feed"><Activity size={18} /> Feed</a>
          <a href="#people"><Users size={18} /> People</a>
          <a href="#profile"><Trophy size={18} /> Profile</a>
        </nav>

        <section className="profile-card" id="profile">
          <div className="avatar large">Y</div>
          <h2>Your Cubing Log</h2>
          <p>@you · 3x3 focus</p>
          <div className="mini-grid">
            <span><strong>{stats.best}</strong> PB</span>
            <span><strong>{stats.average}</strong> Avg</span>
          </div>
        </section>
      </aside>

      <section className="workspace" id="timer">
        <header className="topbar">
          <div>
            <p className="eyebrow">Current session</p>
            <h2>Log solves, publish progress, follow friends.</h2>
          </div>
          <label className="select-label">
            Event
            <select value={puzzle} onChange={(event) => setPuzzle(event.target.value)}>
              <option>3x3</option>
              <option>2x2</option>
              <option>4x4</option>
              <option>OH</option>
              <option>Pyraminx</option>
              <option>Megaminx</option>
            </select>
          </label>
        </header>

        <section className="timer-panel">
          <div className="scramble-line">{sampleScrambles[solves.length % sampleScrambles.length]}</div>
          <button className={`timer-face ${running ? "running" : ""}`} onClick={toggleTimer}>
            <span>{running ? formatTime(elapsed) : "Ready"}</span>
            <small>{running ? "tap to stop and save" : "tap to start timer"}</small>
          </button>
          <div className="action-row">
            <button type="button" onClick={toggleTimer}>{running ? <Square size={18} /> : <Play size={18} />} {running ? "Stop" : "Start"}</button>
            <button type="button" onClick={publishSession}><Plus size={18} /> Publish Session</button>
          </div>
        </section>

        <section className="stats-grid">
          <Metric icon={<Clock size={18} />} label="Latest" value={stats.latest} />
          <Metric icon={<Trophy size={18} />} label="Best" value={stats.best} />
          <Metric icon={<Activity size={18} />} label="Average" value={stats.average} />
          <Metric icon={<Flame size={18} />} label="Solves" value={String(stats.count)} />
        </section>

        <section className="manual-log">
          <h3>Manual log</h3>
          <div className="manual-controls">
            <input inputMode="decimal" placeholder="18.42" value={manualTime} onChange={(event) => setManualTime(event.target.value)} />
            <select value={manualPenalty} onChange={(event) => setManualPenalty(event.target.value as Penalty)}>
              <option value="ok">OK</option>
              <option value="+2">+2</option>
              <option value="dnf">DNF</option>
            </select>
            <button type="button" onClick={addManualSolve}><Plus size={18} /> Add</button>
          </div>
        </section>

        <section className="solve-table">
          <div className="section-head">
            <h3>Session solves</h3>
            <span>{puzzle}</span>
          </div>
          {solves.map((solve, index) => (
            <div className="solve-row" key={solve.id}>
              <span>#{solves.length - index}</span>
              <strong>{formatTime(solve.timeMs, solve.penalty)}</strong>
              <small>{solve.penalty.toUpperCase()}</small>
              <p>{solve.scramble}</p>
            </div>
          ))}
        </section>
      </section>

      <aside className="right-rail">
        <section className="feed" id="feed">
          <div className="section-head">
            <h3>Following feed</h3>
            <span>{sessions.length} updates</span>
          </div>
          {sessions.map((session) => (
            <article className="feed-item" key={session.id}>
              <div className="feed-author">
                <div className="avatar">{session.avatar}</div>
                <div>
                  <strong>{session.user}</strong>
                  <small>{session.createdAt} · {session.puzzle}</small>
                </div>
              </div>
              <p>{session.title}</p>
              <div className="feed-stats">
                <span>avg {average(session.solves)}</span>
                <span>best {formatTime(Math.min(...session.solves.map(effectiveTime)))}</span>
                <span>{session.solves.length} solves</span>
              </div>
              <button className={session.liked ? "liked" : ""} type="button"><Heart size={17} /> Like</button>
            </article>
          ))}
        </section>

        <section className="people" id="people">
          <div className="section-head">
            <h3>Find cubers</h3>
            <Search size={18} />
          </div>
          {following.map((person) => (
            <div className="person-row" key={person.id}>
              <div className="avatar">{person.avatar}</div>
              <div>
                <strong>{person.name}</strong>
                <small>{person.handle} · {person.average}</small>
              </div>
              <button
                aria-label={`Follow ${person.name}`}
                className={person.following ? "following" : ""}
                onClick={() => setFollowing((current) => current.map((item) => item.id === person.id ? { ...item, following: !item.following } : item))}
                type="button"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </section>
      </aside>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
