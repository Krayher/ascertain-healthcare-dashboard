# ADR 0009 · Responsive layout with sidebar drawer

**Status:** Accepted · 2026-05-17

## Context

The brief asks for the app to be "responsive for lower resolution
screens" (Part 2). The v0.1 build interpreted that as laptop widths: a
fixed 232 px sidebar column plus rigid `1fr_320px` and `2fr_1fr` grids
across the patient detail and dashboard pages. At 390 px (iPhone 13) the
layout broke — fixed sidebar consumed 60 % of the viewport, content
overflowed, and there was no nav affordance once the sidebar was hidden.

Sidebar behavior on small screens was the key choice:

1. **Drawer with hamburger.** Hidden off-canvas; a hamburger button opens
   it as an overlay. Standard mobile pattern.
2. **Collapse to icons-only rail.** Narrow rail with tooltips, always
   visible. Less screen room for content but no extra click to reach nav.
3. **Bottom tab bar.** Most native-feeling on phones but a noticeable
   design departure from desktop.

## Decision

Option 1 — drawer with hamburger, targeting widths down to 320 px.

Implementation:

- `AppShell.tsx` switches the root grid from `[232px_1fr]` to `grid-cols-1
  md:grid-cols-[232px_1fr]`. Below `md` (768 px) the sidebar becomes a
  `fixed` overlay with `transform: translate-x-full` when closed.
- `sidebar-state.ts` is a tiny in-memory Zustand store (`useSidebar`) for
  drawer open/close. The Topbar's hamburger toggles it; sidebar links
  close it on click; Escape and a backdrop tap close it.
- `aria-hidden` on the drawer is gated by a media-query hook
  (`useIsDesktop`) so screen readers on desktop don't treat the
  always-visible sidebar as hidden. The hook listens on
  `matchMedia("(min-width: 768px)")` for live response to viewport
  changes.
- Every page grid that was previously fixed gets a responsive variant:
  - `PatientDetailPage`: `1fr_320px` → single column below `md`.
  - `DashboardPage`: 4-up stats → 2-up below `md`; 2:1 panel grid stacks.
  - `PatientForm` section: `[220px_1fr]` → stacked below `md`; fields go
    1-col below `sm`.
  - `PatientHeader`: hero block flex-stacks vertically below `md`.
- Topbar collapses the breadcrumb trail to just the current page name on
  phones, and renders "+ New patient" as an icon-only `+` button.
- TopbarSearch becomes flex-1 below `md` so it stretches to fill the
  remaining row.

## Consequences

- **Down to 320 px usable.** Playwright runs at 390×844 and asserts no
  horizontal scroll on dashboard or list, the drawer toggles correctly,
  and the patient detail stacks. See `apps/web/e2e/responsive.spec.ts`.
- **Server-rendering safe.** `useIsDesktop` initializes from
  `window.matchMedia` in a way that handles `typeof window === "undefined"`
  for any future SSR.
- **Trade-off: tablet portrait (~768 px) sits awkwardly.** Just above the
  drawer breakpoint, the sidebar takes its full 232 px and there's less
  room for content than feels right. A `lg` breakpoint shift for the
  sidebar (e.g., drawer below 1024 px) would help but penalize the
  desktop case. Left as-is; documented under "known gaps".
- **`aria-hidden` correctness matters.** Earlier attempts set
  `aria-hidden={!open}` unconditionally. On desktop, where the sidebar is
  always visible, that incorrectly hid the entire nav from screen
  readers. The `useIsDesktop` gate fixes this — verified by Playwright's
  `getByRole("link", { name: "Patients" })` becoming visible only after
  opening the drawer on mobile.
- **One a11y test pattern emerged.** When asserting "this element is
  hidden in the drawer state," prefer `aria-hidden`-based assertions over
  CSS-transform-based ones; Playwright's `toBeHidden` reads
  accessibility tree state, not bounding boxes.

## Alternatives considered

- **Container queries** instead of viewport media queries. Cleaner per
  component, but Tailwind's container-query support is plugin-only and
  the cross-component "drawer or not" decision is genuinely viewport-
  scoped. Stuck with media queries.
- **A drawer component library** (Radix, vaul). Adds a dependency for
  ~30 lines of code we needed. Native `<button>` + transform-translate
  was simpler and tests cleanly.
