import { useEffect, useId, useState } from "react";

import { cn } from "../lib/cn";

export type CompanionMood = "idle" | "working" | "done" | "attention" | "failed";

const BLINK_MIN_MS = 3_200;
const BLINK_SPREAD_MS = 3_800;
const BOB_EVERY_MS = 2_600;

/**
 * The companion's blob. It animates only on events (a blink, a periodic bob while working, a hop
 * on news) so an always-visible window never repaints continuously.
 */
export function CompanionMascot(props: {
  mood: CompanionMood;
  /** Bumped when something new needs the user; restarts the hop. */
  hopKey: number;
  size: number;
  className?: string;
}) {
  const { mood, size } = props;
  const gradientId = useId();
  const [blinking, setBlinking] = useState(false);
  const [bobbing, setBobbing] = useState(false);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- schedules idle blinks on a wall-clock timer
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

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- retriggers a short bob on a wall-clock timer while threads are working
  useEffect(() => {
    if (mood !== "working") return;
    const timer = setInterval(() => {
      if (!document.hidden) setBobbing(true);
    }, BOB_EVERY_MS);
    return () => clearInterval(timer);
  }, [mood]);

  const happy = mood === "done";
  const alert = mood === "attention";
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={cn("overflow-visible", props.className)}
      data-mood={mood}
    >
      <defs>
        <linearGradient id={`${gradientId}-body`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" className="mascot-stop-top" />
          <stop offset="0.55" className="mascot-stop-mid" />
          <stop offset="1" className="mascot-stop-bottom" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="60" rx="15" ry="2.6" className="mascot-shadow" />
      <g
        key={props.hopKey}
        className={cn("mascot-body", props.hopKey > 0 && "mascot-hop")}
      >
        <g
          className={cn(bobbing && "mascot-bob")}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setBobbing(false);
          }}
        >
          <path
            d="M32 9C45.5 9 55 19.5 55 34c0 13-9.5 22-23 22S9 47 9 34C9 19.5 18.5 9 32 9Z"
            fill={`url(#${gradientId}-body)`}
          />
          <ellipse cx="23" cy="19" rx="7" ry="4.2" className="mascot-shine" />
          <ellipse cx="19" cy="40" rx="4" ry="2.4" className="mascot-cheek" />
          <ellipse cx="45" cy="40" rx="4" ry="2.4" className="mascot-cheek" />
          {happy ? (
            <g className="mascot-stroke" strokeWidth="2.6" strokeLinecap="round">
              <path d="M20.5 34.5q3.5-4.5 7 0" />
              <path d="M36.5 34.5q3.5-4.5 7 0" />
            </g>
          ) : (
            <g
              className={cn("mascot-eyes", blinking && "mascot-blink")}
              onAnimationEnd={() => setBlinking(false)}
            >
              <ellipse
                cx={mood === "working" ? 25 : 24}
                cy={mood === "working" ? 31.5 : 33}
                rx={alert ? 3.8 : 3.2}
                ry={alert ? 4.8 : 4.2}
                className="mascot-ink"
              />
              <ellipse
                cx={mood === "working" ? 41 : 40}
                cy={mood === "working" ? 31.5 : 33}
                rx={alert ? 3.8 : 3.2}
                ry={alert ? 4.8 : 4.2}
                className="mascot-ink"
              />
              <circle
                cx={mood === "working" ? 26.2 : 25.2}
                cy="31.2"
                r="1.15"
                className="mascot-glint"
              />
              <circle
                cx={mood === "working" ? 42.2 : 41.2}
                cy="31.2"
                r="1.15"
                className="mascot-glint"
              />
            </g>
          )}
          {alert || mood === "working" ? (
            <ellipse cx="32" cy="43.5" rx="2" ry="2.3" className="mascot-ink" />
          ) : (
            <path
              d="M28.5 42q3.5 3.4 7 0"
              className="mascot-stroke"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}
          {mood === "failed" ? (
            <path
              d="M50 22c2 3 3 4.6 3 6a3 3 0 0 1-6 0c0-1.4 1-3 3-6Z"
              className="mascot-tear"
            />
          ) : null}
        </g>
      </g>
    </svg>
  );
}
