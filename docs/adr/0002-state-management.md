# ADR 0002 · TanStack Query for server state, Zustand for UI state

**Status:** Accepted · 2026-05-14

## Context

The web app has two distinct kinds of state:

- **Server state** — patient lists, individual patients, notes, summary,
  dashboard stats. It is owned by the API, may be stale, and needs caching,
  background refetching, optimistic updates, and invalidation.
- **Client UI state** — theme, sidebar collapse, modal open/closed. It is
  local to the browser session, never persisted past `localStorage`, and has
  no remote source of truth.

A single global store (Redux Toolkit, even with RTK Query) bundles both into
one mental model and one type tree. That overhead doesn't pay off for a
small surface area.

## Decision

- **Server state:** TanStack Query v5. One query key per resource, manual
  invalidation on mutations. `placeholderData: keepPreviousData` for the
  paginated list to avoid flicker between pages.
- **Client UI state:** Zustand. One small store per concern (`useTheme`
  today; future stores added per feature). `persist` middleware for state
  that should survive reload (currently just theme).

## Consequences

- Server state has cache + refetch + retry + optimistic semantics for free.
- Client state has 1KB of overhead per store, no boilerplate.
- The two libraries have no overlap or coordination cost — they each own
  their slice cleanly.
- Future contributors don't have to learn the Redux DevTools, slices,
  selectors, or middleware patterns.

## Alternatives considered

- **Redux Toolkit + RTK Query:** more features, more boilerplate, more
  bundle. Wins if the team is already deep on Redux; we aren't.
- **TanStack Query + `useState` only:** works for now but breaks the moment
  a second component needs the same UI state (e.g. theme toggle in sidebar
  and a settings page) — better to set the pattern upfront.
