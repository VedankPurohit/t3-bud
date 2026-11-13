import type {
  CompanionState,
  ProjectSummary,
  Provider,
  ThreadDetail,
  ThreadItem,
  ThreadSummary,
} from "@shared/types";

/** Shared, realistic data every design direction renders, so they compare like for like. */

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

export const mockProjects: ProjectSummary[] = [
  { id: "p-t3", title: "t3code", workspaceRoot: "~/Github/t3code" },
  { id: "p-dash", title: "personal-dashboard", workspaceRoot: "~/Github/personal-dashboard" },
  { id: "p-recall", title: "LiveRecall", workspaceRoot: "~/Github/LiveRecall" },
  { id: "p-rp", title: "Roleplay-main", workspaceRoot: "~/Github/Roleplay-main" },
  { id: "p-agents", title: "My-Agents-Skills", workspaceRoot: "~/Github/My-Agents-Skills" },
];

export const mockProviders: Provider[] = [
  {
    providerInstanceId: "claudeAgent",
    driverKind: "claudeAgent",
    displayName: "Claude",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"].map((id) => ({
      id,
      options: [{ id: "reasoningEffort", values: ["low", "medium", "high", "max"], default: "high" }],
    })),
  },
  {
    providerInstanceId: "codex",
    driverKind: "codex",
    displayName: "Codex",
    models: ["gpt-6.1-sol", "gpt-6-astra", "gpt-6.1-terra", "gpt-6-luna"].map((id) => ({
      id,
      options: [
        { id: "reasoningEffort", values: ["low", "medium", "high", "xhigh", "max"], default: "medium" },
      ],
    })),
  },
  {
    providerInstanceId: "cursor",
    driverKind: "cursor",
    displayName: "Cursor",
    models: [{ id: "auto", options: [] }],
  },
];

const thread = (
  threadId: string,
  overrides: Partial<ThreadSummary> & Pick<ThreadSummary, "title" | "projectId">,
): ThreadSummary => ({
  threadId,
  status: "completed",
  settled: false,
  snoozed: false,
  snoozedUntil: null,
  providerInstanceId: "claudeAgent",
  model: "claude-opus-5-5",
  runtimeMode: "full-access",
  createdBy: "user",
  updatedAt: minutesAgo(12),
  pendingRequestCount: 0,
  fresh: false,
  ...overrides,
});

export const mockWorking: ThreadSummary[] = [
  thread("w1", {
    title: "Migrate settings to the new schema",
    projectId: "p-t3",
    status: "running",
    pendingRequestCount: 1,
    updatedAt: minutesAgo(1),
  }),
  thread("w2", {
    title: "Build the weekly review widget",
    projectId: "p-dash",
    status: "running",
    model: "gpt-6.1-sol",
    providerInstanceId: "codex",
    updatedAt: minutesAgo(0),
  }),
  thread("w3", {
    title: "Index transcripts for semantic search",
    projectId: "p-recall",
    status: "running",
    updatedAt: minutesAgo(3),
  }),
];

export const mockInbox: ThreadSummary[] = [
  thread("i1", {
    title: "Fix flaky composer focus test",
    projectId: "p-t3",
    fresh: true,
    updatedAt: minutesAgo(2),
  }),
  thread("i2", {
    title: "Release notes for v0.1.8",
    projectId: "p-t3",
    status: "failed",
    model: "gpt-6-astra",
    providerInstanceId: "codex",
    updatedAt: minutesAgo(9),
  }),
  thread("i3", {
    title: "Director prompt for scene transitions",
    projectId: "p-rp",
    fresh: true,
    model: "claude-sonnet-5-5",
    updatedAt: minutesAgo(18),
  }),
  thread("i4", { title: "Add a dark mode to the dashboard", projectId: "p-dash", updatedAt: minutesAgo(64) }),
  thread("i5", {
    title: "Write a skill for weekly planning",
    projectId: "p-agents",
    updatedAt: minutesAgo(190),
  }),
  thread("i6", { title: "Clip selection heuristics", projectId: "p-recall", updatedAt: minutesAgo(1440) }),
];

export const mockSnoozed: ThreadSummary[] = [
  thread("s1", {
    title: "Review the onboarding copy",
    projectId: "p-t3",
    snoozed: true,
    snoozedUntil: hoursFromNow(3),
  }),
  thread("s2", {
    title: "Benchmark the memory layer",
    projectId: "p-rp",
    snoozed: true,
    snoozedUntil: hoursFromNow(20),
  }),
];

export const mockSettled: ThreadSummary[] = [
  thread("x1", { title: "Bump Electron to 45", projectId: "p-t3", settled: true, updatedAt: minutesAgo(300) }),
  thread("x2", { title: "Fix chart tooltips", projectId: "p-dash", settled: true, updatedAt: minutesAgo(900) }),
  thread("x3", { title: "Trim the system prompt", projectId: "p-rp", settled: true, updatedAt: minutesAgo(2000) }),
];

export const mockState: CompanionState = {
  connection: { state: "connected", serverUrl: "http://127.0.0.1:3773" },
  environmentId: "env-1",
  inbox: mockInbox,
  working: mockWorking,
  snoozed: mockSnoozed,
  settled: mockSettled,
  inboxTotal: 1051,
  projects: mockProjects,
  providers: mockProviders,
  syncedAt: minutesAgo(0),
};

export const mockEmptyState: CompanionState = {
  ...mockState,
  inbox: [],
  working: [],
};

const item = (position: number, type: string, text: string, status = "completed"): ThreadItem => ({
  itemId: `item-${position}`,
  position,
  type,
  text,
  status,
  createdBy: type === "user_message" ? "user" : "agent",
  updatedAt: minutesAgo(10 - position),
});

/** A finished thread with a realistic reply: prose, a list, inline code and a code block. */
export const mockThreadDetail: ThreadDetail = {
  threadId: "i1",
  title: "Fix flaky composer focus test",
  status: "completed",
  pendingRequestCount: 0,
  providerInstanceId: "claudeAgent",
  model: "claude-opus-5-5",
  loading: false,
  error: null,
  items: [
    item(1, "user_message", "The composer focus test fails about one run in ten on CI. Can you find out why and fix it?"),
    item(
      2,
      "assistant_message",
      "Found it. The test focused the composer inside `requestAnimationFrame`, so on a slow CI runner the assertion ran before the frame fired.\n\nI changed it to wait on the element instead:\n\n```ts\nawait expect.element(screen.getByRole(\"textbox\")).toHaveFocus();\n```\n\n- Removed the frame wait in `ChatView.browser.test.tsx`\n- Ran the file 50 times locally: **0 failures**",
    ),
    item(3, "user_message", "Nice. Does the same pattern show up anywhere else?"),
    item(
      4,
      "assistant_message",
      "Two more places use a frame wait before asserting focus. Both are in the side chat tests. I fixed them the same way and the suite passes.",
    ),
  ],
};

/** A thread mid-run that is waiting on an approval. */
export const mockAttentionDetail: ThreadDetail = {
  threadId: "w1",
  title: "Migrate settings to the new schema",
  status: "running",
  pendingRequestCount: 1,
  providerInstanceId: "claudeAgent",
  model: "claude-opus-5-5",
  loading: false,
  error: null,
  items: [
    item(1, "user_message", "Migrate the desktop settings file to the new schema and keep old files readable."),
    item(
      2,
      "assistant_message",
      "I wrote the migration and a test for the old format. Next I need to run the desktop test suite, which writes to a temp directory.",
      "in_progress",
    ),
  ],
};

export const mockMood = {
  attention: 1,
  done: 3,
  working: 3,
  summary: "1 needs you · 3 done · 3 working",
} as const;
