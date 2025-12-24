"use client";

import * as React from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

type PersonSearchRow = { slug: string; name: string; avatarUrl?: string };

function useDebouncedValue<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function PeopleSearchPopover(props: { className?: string; inputClassName?: string }) {
  const router = useRouter();

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);

  const dq = useDebouncedValue(q, 120);
  const hasQuery = dq.trim().length > 0;

  const [results, setResults] = React.useState<PersonSearchRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const query = normalize(dq);
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const r = await fetch(
          `/api/people/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: ac.signal }
        );
        if (!r.ok) throw new Error(`search failed: ${r.status}`);
        const json = (await r.json()) as { people: PersonSearchRow[] };
        setResults(Array.isArray(json.people) ? json.people : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setResults([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [dq]);

  function close() {
    setOpen(false);
    setActive(0);
  }

  function goToSearch(query: string) {
    const s = query.trim();
    if (!s) return;
    close();
    router.push(`/search?q=${encodeURIComponent(s)}`);
  }

  function goToPersonSlug(slug: string) {
    const s = String(slug || "").trim();
    if (!s) return;
    close();
    router.push(`/u/${s}`);
  }

  const handleOpenChange = React.useCallback((v: boolean) => {
    const el = inputRef.current;
    const focused = !!el && document.activeElement === el;
    if (!v && focused) return;
    setOpen(v);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn("relative w-full md:w-120", props.className)}>
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search for people..."
            className={cn(
              "pl-2 h-7 bg-white rounded-md border-none text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-muted-foreground/50 text-sm",
              props.inputClassName
            )}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
                inputRef.current?.blur();
                return;
              }
              if (!open) setOpen(true);

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const hit = results[active];
                if (hit?.slug) goToPersonSlug(hit.slug);
                else if (hasQuery) goToSearch(dq);
              }
            }}
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-120 p-0 rounded-sm border border-border shadow-lg bg-white z-[9999]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const t = e.target as HTMLElement | null;
          if (t?.closest?.("[data-search-root]")) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          const t = e.target as HTMLElement | null;
          if (t?.closest?.("[data-search-root]")) e.preventDefault();
        }}
      >
        <div data-search-root className="outline-none">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => hasQuery && goToSearch(dq)}
            disabled={!hasQuery}
          >
            See results for <span className="font-semibold">{hasQuery ? dq : "…"}</span>
          </button>

          <div className="py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              People
            </div>

            {!hasQuery ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Type a name…</div>
            ) : loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No people found.</div>
            ) : (
              <div className="flex flex-col">
                {results.map((row, idx) => {
                  const isActive = idx === active;
                  const name = row.name;

                  return (
                    <button
                      key={row.slug}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3",
                        isActive && "bg-muted"
                      )}
                      onMouseEnter={() => setActive(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToPersonSlug(row.slug)}
                    >
                      <Avatar className="h-9 w-9 rounded-sm overflow-hidden">
                        <AvatarImage
                          src={row.avatarUrl || undefined}
                          className="rounded-sm object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "";
                          }}
                        />
                        <AvatarFallback className="rounded-sm">
                          {initialsFromName(name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">Person</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Press <span className="font-semibold">Enter</span> to open the first match.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}