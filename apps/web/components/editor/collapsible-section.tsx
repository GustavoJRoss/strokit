"use client";

import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePersistentState } from "@/lib/use-persistent-state";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  /** Stable id; the open state is remembered per viewer under it. */
  id: string;
  title: string;
  /** Short gray line shown while closed, so the user doesn't have to open it just to check. */
  summary?: ReactNode;
  /** Shown on the trigger even when closed (e.g. layers without stroke). */
  alert?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({
  id,
  title,
  summary,
  alert,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = usePersistentState(`section:${id}`, defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b" data-section={id}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 bg-muted/60 px-4 py-2.5 text-left outline-none transition-colors",
          "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
      >
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-sm">{title}</span>
          {!open && summary ? (
            <span className="truncate text-muted-foreground text-xs">{summary}</span>
          ) : null}
        </span>
        {alert}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
        <div className="flex flex-col gap-4 p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
