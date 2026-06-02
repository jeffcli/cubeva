import { useEffect, useRef, useState } from "react";
import { puzzleIdForEvent, wcaEvents } from "../cubing/scrambles";
import { Select } from "./ui/select";

export function ScramblePreview({
  eventLabel,
  loading,
  onEventChange,
  scramble,
}: {
  eventLabel: string;
  loading: boolean;
  onEventChange: (eventLabel: string) => void;
  scramble: string;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let wrapperElement: HTMLElement | null = null;

    async function drawScramble() {
      const previewElement = previewRef.current;
      if (!previewElement) return;

      previewElement.replaceChildren();
      setError("");

      if (loading || !scramble.trim()) return;

      try {
        const [{ puzzles }, { ExperimentalSVGAnimator }] = await Promise.all([
          import("cubing/puzzles"),
          import("cubing/twisty"),
        ]);
        const puzzleId = puzzleIdForEvent(eventLabel);
        const puzzle = puzzles[puzzleId];

        if (!puzzle) {
          throw new Error(`No preview available for ${eventLabel}.`);
        }

        const [kpuzzle, svgSource] = await Promise.all([
          puzzle.kpuzzle(),
          puzzle.svg(),
        ]);
        const pattern = kpuzzle.defaultPattern().applyAlg(scramble);

        if (cancelled) return;

        const animator = new ExperimentalSVGAnimator(kpuzzle, svgSource);
        animator.drawPattern(pattern);
        wrapperElement = animator.wrapperElement;
        wrapperElement.className =
          "absolute inset-0 flex items-center justify-center p-3 [&_svg]:max-h-full [&_svg]:max-w-full";
        previewElement.appendChild(wrapperElement);
      } catch {
        if (!cancelled) {
          setError("Could not draw this scramble.");
        }
      }
    }

    drawScramble();

    return () => {
      cancelled = true;
      wrapperElement?.remove();
    };
  }, [eventLabel, loading, scramble]);

  return (
    <section className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-panel-border bg-panel p-3.5">
      <div className="flex items-center justify-between gap-3">
        <Select
          className="min-h-10 w-full max-w-[220px] bg-card"
          aria-label="Timer event"
          value={eventLabel}
          onChange={(event) => onEventChange(event.target.value)}
        >
          {wcaEvents.map((event) => (
            <option key={event.eventId} value={event.label}>
              {event.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="relative grid min-h-[320px] place-items-center overflow-hidden rounded-lg bg-card max-[760px]:min-h-[280px]">
        <div className="absolute inset-0" ref={previewRef} />
        {loading && (
          <span className="relative z-10 font-bold text-soft-muted">
            Drawing scramble...
          </span>
        )}
      </div>
      {error && (
        <p className="m-0 rounded-lg bg-[#fff2ed] p-3 font-bold text-[#b4331f]">
          {error}
        </p>
      )}
    </section>
  );
}
