import {
  Activity,
  Clock,
  Flame,
  Plus,
  Timer,
  Trash2,
  Trophy,
} from "lucide-react";
import { Metric } from "./Metric";
import { ScramblePreview } from "./ScramblePreview";
import type { AppSolve, Penalty } from "../data/database";
import type { TimerState } from "../types/app";
import { formatSolveResult, formatTime } from "../utils/solveUtils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

type TimerStats = {
  average: string;
  ao5: string;
  ao12: string;
  best: string;
  count: number;
  latest: string;
};

export function TimerPage({
  addManualSolve,
  currentScramble,
  importSolves,
  importText,
  inspectionAvailable,
  inspectionElapsed,
  isManualOnlyEvent,
  manualPenalty,
  manualTime,
  nextScramble,
  onDeleteSolve,
  onImportTextChange,
  onManualPenaltyChange,
  onManualTimeChange,
  onPuzzleChange,
  onSolvePenaltyChange,
  publishSession,
  publishing,
  puzzle,
  scrambleLoading,
  sessionMessage,
  solves,
  stats,
  timerState,
  toggleTimer,
  elapsed,
}: {
  addManualSolve: () => void;
  currentScramble: string;
  elapsed: number;
  importSolves: () => void;
  importText: string;
  inspectionAvailable: boolean;
  inspectionElapsed: number;
  inspectionEnabled: boolean;
  inspectionPenalty: Penalty;
  isManualOnlyEvent: boolean;
  manualPenalty: Penalty;
  manualTime: string;
  nextScramble: () => void;
  onDeleteSolve: (solveId: string) => void;
  onImportTextChange: (value: string) => void;
  onInspectionEnabledChange: (enabled: boolean) => void;
  onManualPenaltyChange: (penalty: Penalty) => void;
  onManualTimeChange: (value: string) => void;
  onPuzzleChange: (puzzle: string) => void;
  onSolvePenaltyChange: (solveId: string, penalty: Penalty) => void;
  publishSession: () => void;
  publishing: boolean;
  puzzle: string;
  scrambleLoading: boolean;
  sessionMessage: string;
  solves: AppSolve[];
  stats: TimerStats;
  timerState: TimerState;
  toggleTimer: () => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4" id="timer">
      <section className="grid items-stretch gap-4 grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] max-[980px]:grid-cols-1">
        <section className="grid h-full gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
          <div
            aria-label="Current scramble"
            className="rounded-lg bg-ink p-3.5 text-center font-mono text-[clamp(0.9rem,1.3vw,1.15rem)] text-[#f8f2e7]"
          >
            {scrambleLoading ? "Generating scramble..." : currentScramble}
          </div>
          {isManualOnlyEvent ? (
            <div className="grid min-h-45 place-content-center gap-2 rounded-lg border-[3px] border-ink bg-panel text-center">
              <strong className="text-[clamp(2rem,5vw,4rem)] leading-none">
                FMC manual entry
              </strong>
              <span>Enter your move count, then publish the session.</span>
            </div>
          ) : (
            <button
              className={`grid min-h-62.5 w-full place-items-center border-[5px] border-ink text-center text-ink max-[760px]:min-h-52.5 ${
                timerState === "running"
                  ? "bg-green"
                  : timerState === "inspection"
                    ? "bg-panel"
                    : "bg-gold"
              }`}
              type="button"
              onClick={toggleTimer}
            >
              <span className="text-[clamp(4.4rem,10vw,8.4rem)] leading-[0.95] [font-variant-numeric:tabular-nums]">
                {timerState === "running"
                  ? formatTime(elapsed)
                  : timerState === "inspection"
                    ? Math.max(0, 15 - Math.floor(inspectionElapsed / 1000))
                    : "Ready"}
              </span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              type="button"
              onClick={nextScramble}
              disabled={scrambleLoading || timerState !== "ready"}
            >
              <Timer size={18} /> New Scramble
            </Button>
            <Button
              size="lg"
              type="button"
              onClick={publishSession}
              disabled={publishing || !solves.length}
            >
              <Plus size={18} />{" "}
              {publishing ? "Publishing..." : "Publish Session"}
            </Button>
          </div>

          {!inspectionAvailable && !isManualOnlyEvent && (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              No WCA inspection for this event.
            </p>
          )}
          {sessionMessage && (
            <p className="m-0 rounded-lg bg-panel p-3 font-bold text-[#34413d]">
              {sessionMessage}
            </p>
          )}
        </section>

        <ScramblePreview
          eventLabel={puzzle}
          loading={scrambleLoading}
          onEventChange={onPuzzleChange}
          scramble={currentScramble}
        />

        <section className="col-span-full grid grid-cols-6 gap-2.5 max-[1180px]:grid-cols-3 max-[760px]:grid-cols-2">
          <Metric
            icon={<Clock size={18} />}
            label="Latest"
            value={stats.latest}
          />
          <Metric icon={<Trophy size={18} />} label="Best" value={stats.best} />
          <Metric
            icon={<Activity size={18} />}
            label="Average"
            value={stats.average}
          />
          <Metric icon={<Timer size={18} />} label="Ao5" value={stats.ao5} />
          <Metric icon={<Timer size={18} />} label="Ao12" value={stats.ao12} />
          <Metric
            icon={<Flame size={18} />}
            label="Solves"
            value={String(stats.count)}
          />
        </section>
      </section>

      <section className="rounded-lg border border-line bg-card p-4 shadow-sm">
        <h3 className="m-0">
          {isManualOnlyEvent ? "FMC entry" : "Manual log"}
        </h3>
        <div className="mt-3 flex items-center gap-3 max-[760px]:flex-col max-[760px]:items-stretch [&_input]:min-w-30 [&_input]:flex-1">
          <Input
            inputMode={isManualOnlyEvent ? "numeric" : "decimal"}
            placeholder={isManualOnlyEvent ? "32 moves" : "18.42"}
            value={manualTime}
            onChange={(event) => onManualTimeChange(event.target.value)}
          />
          <Select
            className="max-[760px]:w-full"
            value={manualPenalty}
            onChange={(event) =>
              onManualPenaltyChange(event.target.value as Penalty)
            }
          >
            <option value="ok">OK</option>
            {!isManualOnlyEvent && <option value="+2">+2</option>}
            <option value="dnf">DNF</option>
          </Select>
          <Button size="lg" type="button" onClick={addManualSolve}>
            <Plus size={18} /> Add
          </Button>
        </div>
        <div className="mt-3 grid items-stretch gap-2.5 grid-cols-[minmax(0,1fr)_auto] max-[760px]:flex max-[760px]:flex-col [&_textarea]:min-w-30 [&_textarea]:flex-1">
          <Textarea
            rows={3}
            placeholder={
              isManualOnlyEvent
                ? "Paste FMC results: 32, 29, DNF 34"
                : "Paste times: 18.42, 17.90 +2, DNF 20.10"
            }
            value={importText}
            onChange={(event) => onImportTextChange(event.target.value)}
          />
          <Button size="lg" type="button" onClick={importSolves}>
            <Plus size={18} />{" "}
            {isManualOnlyEvent ? "Import Results" : "Import Times"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="m-0">Session solves</h3>
          <span className="text-[0.85rem] font-extrabold text-soft-muted">
            {puzzle}
          </span>
        </div>
        {solves.map((solve, index) => (
          <div
            className="grid min-h-13.5 items-center gap-2.5 border-t border-rule grid-cols-[46px_90px_76px_minmax(0,1fr)_42px] max-[760px]:grid-cols-[42px_80px_76px_42px]"
            key={solve.id}
          >
            <span>#{solves.length - index}</span>
            <strong>{formatSolveResult(solve)}</strong>
            <Select
              aria-label={`Penalty for solve ${solves.length - index}`}
              value={solve.penalty}
              onChange={(event) =>
                onSolvePenaltyChange(solve.id, event.target.value as Penalty)
              }
            >
              <option value="ok">OK</option>
              {solve.resultType !== "moves" && <option value="+2">+2</option>}
              <option value="dnf">DNF</option>
            </Select>
            <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[#66716c] max-[760px]:col-span-full max-[760px]:pb-2.5 max-[760px]:whitespace-normal">
              {solve.scramble}
            </p>
            <Button
              className="h-9 w-9"
              size="icon"
              variant="secondary"
              type="button"
              aria-label={`Delete solve ${solves.length - index}`}
              onClick={() => onDeleteSolve(solve.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </section>
    </section>
  );
}
