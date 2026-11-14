import type { ProjectSummary } from "@shared/types";
import { FolderCodeIcon } from "lucide-react";
import { createElement, lazy, Suspense, useEffect, useState } from "react";

import { deriveProjectIdentity } from "../t3/projectIdentity";
import { ProjectMonogram } from "../t3/ProjectMonogram";
import { PROJECT_ICON_COLORS, projectIconColorClassName } from "../t3/projectIconColors";
import { cn } from "../t3/lib/utils";
import { useIsland } from "./context";

const LucideProjectIcon = lazy(() =>
  import("../t3/lib/lucideIconByName").then(({ lucideIconByName }) => ({
    default: ({ name, className }: { name: string; className?: string }) =>
      createElement(lucideIconByName(name) ?? FolderCodeIcon, { className }),
  })),
);

function colorOf(color: string) {
  return PROJECT_ICON_COLORS.find((candidate) => candidate.value === color)?.value ?? "blue";
}

function Monogram({ project, className }: { project: ProjectSummary; className?: string }) {
  const identity = deriveProjectIdentity(project.title);
  return <ProjectMonogram text={identity.monogram} color={identity.color} className={className} />;
}

function AutomaticIcon({ project, className }: { project: ProjectSummary; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  // Resolve the authenticated environment's asset once; the main process caches image bytes.
  useEffect(() => {
    let active = true;
    setSrc(null);
    void window.companion
      .projectIcon(project.id)
      .then((next) => {
        if (active) setSrc(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [project.id, project.workspaceRoot, project.faviconPath]);
  return src ? (
    <img
      src={src}
      alt=""
      className={cn("size-4 shrink-0 rounded-[25%] object-contain", className)}
      onError={() => setSrc(null)}
    />
  ) : (
    <Monogram project={project} className={className} />
  );
}

export function ProjectGlyph(props: {
  project?: ProjectSummary;
  projectId?: string;
  className?: string;
}) {
  const lookups = useIsland();
  const project = props.project ?? lookups.projectById.get(props.projectId ?? "");
  if (!project)
    return (
      <FolderCodeIcon
        aria-hidden
        className={cn("size-4 shrink-0 text-icon-muted", props.className)}
      />
    );
  const icon = project.projectIcon;
  if (icon?.kind === "monogram")
    return (
      <ProjectMonogram text={icon.text} color={colorOf(icon.color)} className={props.className} />
    );
  if (icon?.kind === "emoji")
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center leading-none",
          props.className,
        )}
      >
        {icon.emoji}
      </span>
    );
  if (icon?.kind === "lucide") {
    const legacyText = icon.monogramText ?? icon.monogram;
    if (legacyText)
      return (
        <ProjectMonogram
          text={legacyText}
          color={colorOf(icon.color)}
          className={props.className}
        />
      );
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-4 shrink-0",
          projectIconColorClassName(colorOf(icon.color)),
          props.className,
        )}
      >
        <Suspense fallback={<FolderCodeIcon className="size-full" />}>
          <LucideProjectIcon name={icon.name} className="size-full" />
        </Suspense>
      </span>
    );
  }
  return (
    <AutomaticIcon
      key={`${project.id}:${project.faviconPath ?? ""}`}
      project={project}
      className={props.className}
    />
  );
}
