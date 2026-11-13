import { useEffect, useId, useRef, useState } from "react";

import { gazeOffset } from "../lib/gaze";
import { cn } from "../t3/lib/utils";

export type CompanionMood = "idle" | "working" | "done" | "attention" | "failed";

const BLINK_MIN_MS = 3_200;
const BLINK_SPREAD_MS = 3_800;
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
  const [blinking, setBlinking] = useState(false);
  const [waking, setWaking] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const gazeRef = useRef<SVGGElement>(null);

  // Schedules idle blinks on a wall-clock timer.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (!document.hidden) setBlinking(true);
          schedule();
        },
        BLINK_MIN_MS + Math.random() * BLINK_SPREAD_MS,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

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
      const next = `translate(${offset.x}px, ${offset.y}px)`;
      if (next === last) return;
      last = next;
      gaze.style.transform = next;
    });
  }, []);

  const happy = mood === "done";
  const wide = mood === "attention";
  const sad = mood === "failed";
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 64 64"
      style={{ width: size, height: size }}
      aria-hidden
      className={cn("overflow-visible", props.className)}
      data-mood={mood}
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
          <path d="M14 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="#fff" opacity="0.95" />
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
        <circle cx="32" cy="32" r="30" fill="none" stroke="#2c2475" strokeWidth="1.2" opacity="0.8" />
        {/* The eyes: two slanted, glowing pills; happy arcs when a thread is done. */}
        <g ref={gazeRef} className="mascot-gaze">
        <g
          className={cn("mascot-eyes", waking ? "mascot-wake" : blinking && "mascot-blink")}
          onAnimationEnd={(event) => {
            if (event.animationName === "mascot-blink") setBlinking(false);
            if (event.animationName === "mascot-wake") setWaking(false);
          }}
        >
          {happy ? (
            <g fill="none" stroke="#f3eeff" strokeWidth="3.2" strokeLinecap="round">
              <path d="M30 27q5-7 10 0" />
              <path d="M45.5 22q5-7 10 0" />
            </g>
          ) : (
            <>
              <g filter={`url(#${id}-glow)`} opacity="0.75" fill="#d9c8ff">
                <Eye x={35} y={sad ? 28 : 25} wide={wide} sad={sad} />
                <Eye x={50.5} y={sad ? 23 : 20} wide={wide} sad={sad} />
              </g>
              <g fill="#f6f2ff">
                <Eye x={35} y={sad ? 28 : 25} wide={wide} sad={sad} />
                <Eye x={50.5} y={sad ? 23 : 20} wide={wide} sad={sad} />
              </g>
            </>
          )}
        </g>
        </g>
        {sad ? <path d="M47 34c1.6 2.4 2.4 3.6 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.4 2.4-4.8Z" fill="#9fd4ff" /> : null}
        {wide ? <circle cx="54" cy="10" r="3.6" fill="#f5b544" stroke="#100c30" strokeWidth="1.2" /> : null}
      </g>
    </svg>
  );
}

/** One slanted pill eye, centered on (x, y). */
function Eye(props: { x: number; y: number; wide: boolean; sad: boolean }) {
  const width = props.wide ? 8 : 7;
  const height = props.sad ? 10 : props.wide ? 17.5 : 16;
  return (
    <rect
      x={props.x - width / 2}
      y={props.y - height / 2}
      width={width}
      height={height}
      rx={width / 2}
      transform={`rotate(-33 ${props.x} ${props.y})`}
    />
  );
}
