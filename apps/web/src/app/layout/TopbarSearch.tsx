import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const DEBOUNCE_MS = 250;

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function TopbarSearch() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // The list page owns the canonical search state. When we're already on
  // /patients, mirror the URL into our local input so they stay in lockstep.
  const urlSearch = pathname.startsWith("/patients") ? params.get("search") ?? "" : "";
  const [draft, setDraft] = useState(urlSearch);

  useEffect(() => {
    setDraft(urlSearch);
  }, [urlSearch]);

  // Debounced commit: while typing, after 250 ms of idle, navigate to
  // /patients with the new search param. On a different page this also
  // takes the user to the list view.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft === urlSearch) return;
      const next = new URLSearchParams(params);
      if (draft) next.set("search", draft);
      else next.delete("search");
      next.set("page", "1");
      const qs = next.toString();
      nav(`/patients${qs ? `?${qs}` : ""}`);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // ⌘K / Ctrl+K from anywhere focuses the input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Flush immediately without waiting for the debounce.
    const next = new URLSearchParams(params);
    if (draft) next.set("search", draft);
    else next.delete("search");
    next.set("page", "1");
    const qs = next.toString();
    nav(`/patients${qs ? `?${qs}` : ""}`);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && draft) {
      e.preventDefault();
      setDraft("");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex flex-1 items-center gap-2 rounded-md border border-border bg-bg-subtle px-2.5 py-1.5 text-[13px] focus-within:border-border-strong focus-within:bg-bg-elev md:flex-initial"
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search patients…"
        aria-label="Search patients"
        className="w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-fg-muted md:w-44 lg:w-64"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            inputRef.current?.focus();
          }}
          className="shrink-0 text-fg-subtle hover:text-fg"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="ml-2 hidden shrink-0 rounded border border-border-strong bg-bg-elev px-1.5 py-px font-mono text-[10.5px] text-fg-subtle md:inline">
          {isMac() ? "⌘K" : "Ctrl+K"}
        </span>
      )}
    </form>
  );
}
