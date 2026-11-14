import type { ProjectSummary, ThreadSearchInput } from "@shared/types";
import { CheckIcon, FolderIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button, InlineButton } from "../t3/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSearchInput,
  ComboboxTrigger,
} from "../t3/ui/combobox";
import { Input } from "../t3/ui/input";
import { useIsland } from "./context";
import { ProjectGlyph } from "./project-icon";

/* T3 Code's SidebarThreadHeader search and Sidebar project scope picker, MIT, adapted to the companion. */
export function ThreadSearchHeader(props: {
  value: ThreadSearchInput;
  onChange: (value: ThreadSearchInput) => void;
}) {
  const { state } = useIsland();
  const input = useRef<HTMLInputElement>(null);
  const { query, projectIds } = props.value;
  const selected = state.projects.filter((project) => projectIds.includes(project.id));
  const items = [
    { value: "all", label: "All projects", project: null as ProjectSummary | null },
    ...state.projects.map((project) => ({ value: project.id, label: project.title, project })),
  ];
  const choice = items.find((item) => item.value === projectIds[0]) ?? items[0];
  // The floating window owns this shortcut only while it has keyboard focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="shrink-0 px-2.5 pb-1.5">
      <div className="flex items-center gap-1">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground focus-within:bg-sidebar-row-hover focus-within:text-sidebar-foreground focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70">
          <SearchIcon aria-hidden className="size-4 shrink-0 text-(--sidebar-icon-color)" />
          <Input
            ref={input}
            nativeInput
            unstyled
            type="search"
            aria-label="Search threads"
            placeholder="Search"
            value={query}
            maxLength={200}
            onChange={(event) =>
              props.onChange({ ...props.value, query: event.currentTarget.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                props.onChange({ ...props.value, query: "" });
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                document
                  .getElementById("companion-thread-results")
                  ?.querySelector<HTMLElement>("[role=button]")
                  ?.focus();
              }
            }}
            className="min-w-0 flex-1 [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:p-0 [&_[data-slot=input]]:font-medium [&_[data-slot=input]]:text-sidebar-foreground [&_[data-slot=input]]:text-sm [&_[data-slot=input]]:leading-normal [&_[data-slot=input]]:placeholder:text-sidebar-muted-foreground"
          />
          {query ? (
            <Button
              size="icon-micro"
              variant="ghost-muted"
              aria-label="Clear thread search"
              onClick={() => {
                props.onChange({ ...props.value, query: "" });
                input.current?.focus();
              }}
            >
              <XIcon className="size-3" />
            </Button>
          ) : null}
        </div>
        <Combobox
          items={items}
          itemToStringLabel={(item) => item.label}
          isItemEqualToValue={(a, b) => a.value === b.value}
          value={choice}
          onValueChange={(item, details) => {
            if (!item) return;
            if (item.value === "all") props.onChange({ ...props.value, projectIds: [] });
            else if (details.event instanceof MouseEvent && details.event.shiftKey) {
              details.cancel();
              props.onChange({
                ...props.value,
                projectIds: projectIds.includes(item.value)
                  ? projectIds.filter((id) => id !== item.value)
                  : [...projectIds, item.value],
              });
            } else props.onChange({ ...props.value, projectIds: [item.value] });
          }}
        >
          <ComboboxTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost-muted"
                aria-label={
                  selected.length
                    ? `Filter threads by project: ${selected.map((project) => project.title).join(", ")}`
                    : "Filter threads by project"
                }
              />
            }
          >
            {selected.length ? (
              <span className="flex shrink-0">
                {selected.slice(0, 2).map((project, index) => (
                  <span
                    key={project.id}
                    className={
                      index ? "-ml-1 flex rounded-[25%] bg-sidebar ring-2 ring-sidebar" : "flex"
                    }
                  >
                    <ProjectGlyph project={project} className="size-4" />
                  </span>
                ))}
              </span>
            ) : (
              <ListFilterIcon className="size-4" />
            )}
          </ComboboxTrigger>
          <ComboboxPopup
            align="end"
            className="w-[min(18rem,var(--available-width))] overflow-hidden"
            finalFocus={(closeType) => closeType === "keyboard"}
          >
            <ComboboxSearchInput aria-label="Search projects" placeholder="Search projects..." />
            <ComboboxEmpty>No matching projects.</ComboboxEmpty>
            <ComboboxList aria-multiselectable>
              {(item: (typeof items)[number]) => {
                const isSelected =
                  item.value === "all" ? projectIds.length === 0 : projectIds.includes(item.value);
                return (
                  <ComboboxItem
                    key={item.value}
                    value={item}
                    selectedFill={false}
                    aria-selected={isSelected}
                  >
                    <span className="relative flex shrink-0">
                      {item.project ? (
                        <ProjectGlyph project={item.project} className="size-4" />
                      ) : (
                        <FolderIcon className="size-4" />
                      )}
                      {isSelected ? (
                        <span className="pointer-events-none absolute -right-1 -bottom-1 grid size-3 place-items-center rounded-full bg-primary ring-2 ring-popover">
                          <CheckIcon
                            className="size-2 text-primary-foreground"
                            strokeWidth={4}
                            aria-hidden
                          />
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 truncate text-sm">{item.label}</span>
                  </ComboboxItem>
                );
              }}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      </div>
      {selected.length ? (
        <div className="flex items-center gap-2 px-2 pt-1 pb-0.5 text-xs text-muted-foreground">
          <span
            className="min-w-0 flex-1 truncate"
            title={selected.map((project) => project.title).join(", ")}
          >
            {selected.map((project) => project.title).join(", ")}
          </span>
          <InlineButton
            tone="muted"
            onClick={() => props.onChange({ ...props.value, projectIds: [] })}
          >
            Clear filters
          </InlineButton>
        </div>
      ) : null}
    </div>
  );
}
