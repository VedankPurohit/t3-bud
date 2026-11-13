import type { CompanionState, ModelSelection, ProjectSummary } from "@shared/types";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";
import { Composer } from "./Composer";
import { ProjectMark } from "./ProjectMark";

const LAST_PROJECT_KEY = "t3-companion:last-project";
const LAST_MODEL_KEY = "t3-companion:last-model";

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Pick a project, then type the first message; the thread starts on send. */
export function NewThread(props: {
  state: CompanionState;
  onLaunched: (threadId: string) => void;
  onError: (message: string) => void;
}) {
  const { projects, providers } = props.state;
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string | null>(() => {
    const last = readStored<string>(LAST_PROJECT_KEY);
    return projects.some((project) => project.id === last) ? last : (projects[0]?.id ?? null);
  });
  // The last model picked here, else the one the most recent thread used.
  const [selection, setSelection] = useState<ModelSelection | null>(() => {
    const stored = readStored<ModelSelection>(LAST_MODEL_KEY);
    if (stored && providers.some((p) => p.providerInstanceId === stored.instanceId)) return stored;
    const latest = [...props.state.working, ...props.state.inbox]
      .filter((thread) => thread.providerInstanceId && thread.model)
      .toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    return latest?.providerInstanceId && latest.model
      ? { instanceId: latest.providerInstanceId, model: latest.model }
      : null;
  });
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? projects.filter((project) => project.title.toLowerCase().includes(needle))
    : projects;
  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sidebar">
      <label className="mx-2 mt-2 flex h-8 items-center gap-2 rounded-lg border border-border bg-input px-2.5 text-[13px] focus-within:border-primary/50">
        <SearchIcon className="size-3.5 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a project"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
      </label>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {matches.map((candidate: ProjectSummary) => (
          <li key={candidate.id}>
            <button
              type="button"
              onClick={() => setProjectId(candidate.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent",
                candidate.id === projectId && "bg-accent",
              )}
            >
              <ProjectMark title={candidate.title} size={16} />
              <span className="min-w-0 flex-1 truncate">{candidate.title}</span>
              {candidate.id === projectId ? <CheckIcon className="size-3.5 text-primary" /> : null}
            </button>
          </li>
        ))}
        {matches.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted">
            {projects.length === 0 ? "Add a project in T3 Code first." : "No matching projects"}
          </li>
        ) : null}
      </ul>
      <div className="bg-background pt-2">
        <Composer
          placeholder={project ? `Start a thread in ${project.title}…` : "Pick a project first"}
          providers={providers}
          selection={selection}
          autoFocus
          onSelectionChange={(next) => {
            setSelection(next);
            store(LAST_MODEL_KEY, next);
          }}
          onSubmit={async (message) => {
            if (!project) {
              props.onError("Pick a project first.");
              return false;
            }
            store(LAST_PROJECT_KEY, project.id);
            const result = await window.companion.launch({
              projectId: project.id,
              message,
              modelSelection: selection,
            });
            if (!result.ok) {
              props.onError(result.error);
              return false;
            }
            props.onLaunched(result.value.threadId);
            return true;
          }}
        />
      </div>
    </div>
  );
}
