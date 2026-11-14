import type { ThreadSearchInput, ThreadSearchResult } from "../../shared/types";
import { foldSearchQuery, rankSearchItems, scoreThreadSearch } from "../../shared/t3/paletteSearch";
import { buildSections } from "./sections";
import type { RawThreadShell, ShellState } from "./shell";

export interface ServerSearchResult {
  matches: Array<{ threadId: string; snippet: string }>;
  threads?: RawThreadShell[];
}

export function searchThreadCatalog(
  shell: ShellState,
  input: ThreadSearchInput,
  server: ServerSearchResult,
  now: number,
): ThreadSearchResult["threads"] {
  const combined = new Map((server.threads ?? []).map((thread) => [thread.id, thread]));
  for (const [id, thread] of shell.threads) combined.set(id, thread);
  const sections = buildSections({ ...shell, threads: combined }, now, {
    inbox: Number.POSITIVE_INFINITY,
    settled: Number.POSITIVE_INFINITY,
  });
  const scope = new Set(input.projectIds);
  const threads = [
    ...sections.inbox,
    ...sections.working,
    ...sections.snoozed,
    ...sections.settled,
  ].filter((thread) => scope.size === 0 || scope.has(thread.projectId));
  const query = foldSearchQuery(input.query);
  if (!query) return threads;
  const titles = rankSearchItems(threads, (thread, options) =>
    scoreThreadSearch(
      query,
      {
        id: thread.threadId,
        title: thread.title,
        projectTitle: shell.projects.get(thread.projectId)?.title,
        activityAt: Date.parse(thread.updatedAt),
      },
      now,
      { ...options, picks: false },
    ),
  ).map(({ item }) => item);
  const shown = new Set(titles.map((thread) => thread.threadId));
  const byId = new Map(threads.map((thread) => [thread.threadId, thread]));
  return [
    ...titles,
    ...server.matches.flatMap((match) => {
      const thread = byId.get(match.threadId);
      if (!thread || shown.has(thread.threadId)) return [];
      shown.add(thread.threadId);
      return [{ ...thread, snippet: match.snippet }];
    }),
  ];
}
