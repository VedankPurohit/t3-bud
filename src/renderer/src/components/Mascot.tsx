import { useEffect, useId, useRef, useState } from "react";

import { gazeOffset } from "../lib/gaze";
import { cn } from "../t3/lib/utils";

export type CompanionMood = "idle" | "working" | "done" | "attention" | "failed";

const BLINK_MIN_MS = 4_200;
const BLINK_SPREAD_MS = 3_200;
const SMILE_MS = 850;
/**
 * The night-sky orb from T3 Tots (github.com/Deepusleepy/t3-tots, MIT), redrawn as SVG so its eyes
 * can blink and react. It animates only on events (waking up, a blink, a hop on news, the cursor
 * moving), so an always-visible window never repaints continuously.
 */
export function CompanionMascot(props: {
  mood: CompanionMood;
  /** Bumped when something new needs the user; restarts the hop. */
  hopKey: number;
  size: number;
  className?: string;
}) {
  const { mood, size } = props;
  const id = useId();
  const [blink, setBlink] = useState<"still" | "closing" | "opening">("still");
  const [smiling, setSmiling] = useState(false);
  const [waking, setWaking] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const gazeRef = useRef<SVGGElement>(null);

  // Expression changes share the blink timer and pause when hidden or Reduce Motion is enabled.
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.hidden || motion.matches) return;
      timer = setTimeout(
        () => {
          setBlink("closing");
          schedule();
        },
        smiling ? SMILE_MS : BLINK_MIN_MS + Math.random() * BLINK_SPREAD_MS,
      );
    };
    const refresh = () => {
      clearTimeout(timer);
      if (document.hidden || motion.matches) setBlink("still");
      if (motion.matches) setWaking(false);
      schedule();
    };
    refresh();
    motion.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [smiling]);

  // Eyes follow the cursor anywhere on screen. The transform is written directly, so gaze never
  // re-renders React; the design gallery has no companion bridge and keeps still eyes.
  useEffect(() => {
    if (!("companion" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = "";
    return window.companion.onCursor((cursor) => {
      const svg = svgRef.current;
      const gaze = gazeRef.current;
      if (!svg || !gaze) return;
      const offset = gazeOffset(svg.getBoundingClientRect(), cursor);
      const next = `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation}deg) scale(${offset.scaleX}, ${offset.scaleY})`;
      if (next === last) return;
      last = next;
      gaze.style.transform = next;
    });
  }, [props.hopKey]);

  const wide = mood === "attention";
  const sad = mood === "failed";
  const happy = smiling && (mood === "done" || mood === "idle");
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 64 64"
      style={{ width: size, height: size }}
      aria-hidden
      className={cn("overflow-visible", props.className)}
      data-mood={mood}
      data-eyes={happy ? "smile" : "open"}
    >
      <defs>
        <radialGradient id={`${id}-sky`} cx="0.42" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#2a2470" />
          <stop offset="0.55" stopColor="#1c1752" />
          <stop offset="1" stopColor="#130f3a" />
        </radialGradient>
        <linearGradient id={`${id}-cloud-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a3ec0" />
          <stop offset="1" stopColor="#3d2a8f" />
        </linearGradient>
        <linearGradient id={`${id}-cloud-front`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a74ee" />
          <stop offset="1" stopColor="#7350da" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="29.5" />
        </clipPath>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <g key={props.hopKey} className={cn("mascot-body", props.hopKey > 0 && "mascot-hop")}>
        <circle cx="32" cy="32" r="31" fill="#100c30" />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="64" height="64" fill={`url(#${id}-sky)`} />
          {/* Stars, with the one four-point sparkle from the original. */}
          <path
            d="M14 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"
            fill="#fff"
            opacity="0.95"
          />
          <circle cx="27" cy="9" r="0.7" fill="#fff" opacity="0.8" />
          <circle cx="41" cy="12" r="0.55" fill="#fff" opacity="0.7" />
          <circle cx="50" cy="20" r="0.6" fill="#fff" opacity="0.75" />
          <circle cx="20" cy="27" r="0.5" fill="#fff" opacity="0.6" />
          <circle cx="47" cy="30" r="0.45" fill="#fff" opacity="0.55" />
          {/* Back clouds, then front clouds rising over the bottom of the orb. */}
          {/* Clouds rise high at the sides and dip in the middle, as in the original. */}
          <g fill={`url(#${id}-cloud-back)`}>
            <circle cx="0" cy="36" r="15" />
            <circle cx="13" cy="40" r="9" />
            <circle cx="24" cy="46" r="8" />
            <circle cx="36" cy="48" r="8" />
            <circle cx="49" cy="42" r="9" />
            <circle cx="64" cy="35" r="15" />
            <rect x="0" y="44" width="64" height="20" />
          </g>
          <g fill={`url(#${id}-cloud-front)`}>
            <circle cx="0" cy="48" r="13" />
            <circle cx="13" cy="52" r="9" />
            <circle cx="26" cy="56" r="9" />
            <circle cx="38" cy="57" r="8.5" />
            <circle cx="50" cy="53" r="9" />
            <circle cx="64" cy="47" r="13" />
            <rect x="0" y="57" width="64" height="7" />
          </g>
          <g fill="#c9adfc" opacity="0.28">
            <circle cx="9" cy="46" r="4" />
            <circle cx="56" cy="46" r="4" />
            <circle cx="30" cy="53" r="3" />
          </g>
        </g>
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#2c2475"
          strokeWidth="1.2"
          opacity="0.8"
        />
        {/* Swap eye shapes only while the eyelids are closed. */}
        <g ref={gazeRef} className="mascot-gaze">
          <g
            className={cn(
              "mascot-eyes",
              waking
                ? "mascot-wake"
                : blink === "closing"
                  ? "mascot-close"
                  : blink === "opening" && "mascot-open",
            )}
            onAnimationEnd={(event) => {
              if (event.animationName === "mascot-close") {
                setSmiling((current) => !current);
                setBlink("opening");
              }
              if (event.animationName === "mascot-open") setBlink("still");
              if (event.animationName === "mascot-wake") setWaking(false);
            }}
          >
            {happy ? (
              <g fill="none" stroke="#f3eeff" strokeWidth="3.2" strokeLinecap="round">
                <path d="M20 26q5-7 10 0" />
                <path d="M34 26q5-7 10 0" />
              </g>
            ) : (
              <>
                <g filter={`url(#${id}-glow)`} opacity="0.75" fill="#d9c8ff">
                  <Eye x={25} mood={mood} side="left" />
                  <Eye x={39} mood={mood} side="right" />
                </g>
                <g fill="#f6f2ff">
                  <Eye x={25} mood={mood} side="left" />
                  <Eye x={39} mood={mood} side="right" />
                </g>
              </>
            )}
          </g>
          {sad ? (
            <path
              d="M22 33c1.4 2.2 2.1 3.2 2.1 4.2a2.1 2.1 0 0 1-4.2 0c0-1 .7-2 2.1-4.2Z"
              fill="#9fd4ff"
            />
          ) : null}
        </g>
        {wide ? (
          <circle cx="54" cy="10" r="3.6" fill="#f5b544" stroke="#100c30" strokeWidth="1.2" />
        ) : null}
      </g>
    </svg>
  );
}

function Eye(props: { x: number; mood: CompanionMood; side: "left" | "right" }) {
  const width = props.mood === "attention" ? 8 : 7;
  const height =
    props.mood === "failed"
      ? 10
      : props.mood === "attention"
        ? 17.5
        : 16;
  const tilt = props.mood === "failed" ? 16 : props.mood === "working" ? -8 : 0;
  const angle = props.side === "left" ? tilt : -tilt;
  const y = props.mood === "failed" ? 26 : 24;
  return (
    <rect
      x={props.x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      rx={width / 2}
      transform={`rotate(${angle} ${props.x} ${y})`}
    />
  );
}
