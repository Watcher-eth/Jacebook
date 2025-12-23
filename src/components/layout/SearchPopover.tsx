"use client";

import * as React from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getAllCelebrities, slugifyName } from "@/lib/people";
import type { CelebrityAppearance } from "@/lib/celebrityData";
import { fileUrl } from "@/lib/workerClient";

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

type Appearance = { file: string; page: number; confidence?: number };

function conf(a: Appearance) {
  return typeof a.confidence === "number" ? a.confidence : 0;
}

function pickTopAppearances(appearances: Appearance[], minConf: number, n: number) {
  const hi = (appearances || []).filter((a) => a?.file && a?.page && conf(a) >= minConf);
  hi.sort((a, b) => {
    const dc = conf(b) - conf(a);
    if (dc !== 0) return dc;
    return (a.page ?? 999999) - (b.page ?? 999999);
  });

  const out: Appearance[] = [];
  const seen = new Set<string>();
  for (const a of hi) {
    const k = `${a.file}::${a.page}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

function pageJpegKeyFast(pdfKey: string, page: number) {
  const base = pdfKey.replace(/\.pdf$/i, "");
  const p = String(page).padStart(3, "0");
  return `pdfs-as-jpegs/${base}/page-${p}.jpg`;
}

function avatarUrlForCelebrity(appearances: CelebrityAppearance[] | any, minConf = 99.7) {
  const top = pickTopAppearances((appearances || []) as any as Appearance[], minConf, 1)[0];
  if (!top) return null;
  return fileUrl(pageJpegKeyFast(top.file, top.page));
}

function pickTopPeople(q: string, limit = 8) {
  const query = normalize(q);
  if (!query) return [];

  const all = getAllCelebrities();
  return all
    .map((p) => {
      const n = normalize(p.name || "");
      let score = 0;
      if (n === query) score = 100;
      else if (n.startsWith(query)) score = 80;
      else if (n.includes(query)) score = 50;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => ({
      ...x,
      avatarUrl: avatarUrlForCelebrity(x.p.appearances as any),
    }));
}

export function PeopleSearchPopover(props: { className?: string; inputClassName?: string }) {
  const router = useRouter();

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);

  const results = React.useMemo(() => pickTopPeople(q, 8), [q]);

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

  function goToPerson(name: string) {
    const slug = slugifyName(name);
    close();
    router.push(`/u/${slug}`);
  }

  const handleOpenChange = React.useCallback((v: boolean) => {
    const el = inputRef.current;
    const focused = !!el && document.activeElement === el;
    if (!v && focused) return;
    setOpen(v);
  }, []);

  const hasQuery = q.trim().length > 0;

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
                if (results[active]?.p?.name) goToPerson(results[active].p.name);
                else if (hasQuery) goToSearch(q);
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
            onClick={() => hasQuery && goToSearch(q)}
            disabled={!hasQuery}
          >
            See results for <span className="font-semibold">{hasQuery ? q : "…"}</span>
          </button>

          <div className="py-1">
            <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              People
            </div>

            {!hasQuery ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Type a name…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No people found.</div>
            ) : (
              <div className="flex flex-col">
                {results.map((row, idx) => {
                  const name = row.p.name;
                  const isActive = idx === active;

                  if(row.avatarUrl)
                  return (
                    <button
                      key={name}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3",
                        isActive && "bg-muted"
                      )}
                      onMouseEnter={() => setActive(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToPerson(name)}
                    >
                      <Avatar className="h-9 w-9 rounded-sm overflow-hidden">
                        <AvatarImage
                          src={row.avatarUrl || undefined}
                          className="rounded-sm object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "";
                          }}
                        />
                        <AvatarFallback className="rounded-sm">{initialsFromName(name)}</AvatarFallback>
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