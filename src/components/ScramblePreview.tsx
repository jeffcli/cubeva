import { useEffect, useRef, useState } from "react";
import { puzzleIdForEvent } from "../cubing/scrambles";

export function ScramblePreview({
  eventLabel,
  scramble,
}: {
  eventLabel: string;
  scramble: string;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let wrapperElement: HTMLElement | null = null;

    async function drawScramble() {
      const previewElement = previewRef.current;
      if (!previewElement || !scramble.trim()) return;

      previewElement.replaceChildren();
      setError("");

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
  }, [eventLabel, scramble]);

  return (
    <section className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-panel-border bg-panel p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.78rem] font-extrabold text-muted">
          {eventLabel}
        </span>
      </div>
      <div
        className="relative grid min-h-[320px] place-items-center overflow-hidden rounded-lg bg-card max-[760px]:min-h-[280px]"
        ref={previewRef}
      />
      {error && (
        <p className="m-0 rounded-lg bg-[#fff2ed] p-3 font-bold text-[#b4331f]">
          {error}
        </p>
      )}
    </section>
  );
}
