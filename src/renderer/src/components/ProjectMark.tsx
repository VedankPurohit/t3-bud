const HUES = [215, 265, 330, 25, 150, 190, 45, 290];

/** A small colored monogram; MCP does not serve project favicons. */
export function ProjectMark(props: { title: string; size?: number }) {
  const title = props.title || "?";
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = HUES[hash % HUES.length] ?? 215;
  const size = props.size ?? 14;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[4px] font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.58,
        background: `linear-gradient(160deg, oklch(0.68 0.15 ${hue}), oklch(0.52 0.17 ${hue}))`,
      }}
    >
      {title.charAt(0).toUpperCase()}
    </span>
  );
}
