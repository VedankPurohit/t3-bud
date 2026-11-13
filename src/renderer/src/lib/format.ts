export function relativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 45) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/** How long until `iso`, for snooze wake times: "in 3h". */
export function untilLabel(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
  if (minutes < 60) return `in ${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `in ${hours}h` : `in ${Math.round(hours / 24)}d`;
}

/** "gpt-6-luna" reads better as "GPT-6 Luna"; T3 Code shows the same names. */
export function modelLabel(model: string | null): string {
  if (!model) return "Default model";
  return model
    .replace(/^claude-/, "")
    .split(/[-_]/)
    .map((part) => (/^gpt$/i.test(part) ? "GPT" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ")
    .replace(/(\d) (\d)/g, "$1.$2");
}

