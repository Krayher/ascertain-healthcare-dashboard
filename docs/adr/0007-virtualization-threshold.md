# ADR 0007 · Virtualization above 50 rows, standard table below

**Status:** Accepted · 2026-05-14

## Context

The patient list is paginated server-side (page_size = 20). At default
settings, a page never exceeds 20 rows, and a standard `<table>` renders it
faster than any virtualizer can — virtualization adds layout cost (absolute
positioning, manual scroll measurement) that only pays off when the row
count is large enough that browser layout becomes the bottleneck.

But the API supports `page_size` up to 100, and future filters may return
larger result sets (e.g. an exported view, or a power-user filter). At 200+
rows, scrolling the standard table becomes noticeably janky on lower-end
hardware.

## Decision

Two implementations live side by side:

- `PatientTable.tsx` — standard `<table>` with sortable column headers.
- `PatientTableVirtual.tsx` — TanStack Virtual with `ROW_HEIGHT = 64`,
  `overscan = 8`, scroll-container capped at 640px. Sort headers are
  dropped from the virtual variant (the use case for virtualization is
  scrolling, not column-by-column re-sorting).

`PatientListPage` picks between them with a single constant:

```ts
const VIRTUALIZATION_THRESHOLD = 50;
```

If the current page holds more than 50 rows, the virtual variant renders.

## Consequences

- Default flow (20 rows/page) uses the standard table — preserves sorting,
  keeps the bundle small for the common case.
- Power-user flow (`page_size=100`) automatically switches to virtualized
  rendering — preserves scroll perf for large result sets.
- The threshold is one constant; tuning is a one-line change after
  profiling.

## Alternatives considered

- **Always virtualized:** loses column-header sorting in the common case.
- **Never virtualized:** breaks down past ~200 rows on a slow machine.
- **`react-window`:** equally valid; TanStack Virtual just matches the rest
  of the `@tanstack/*` family already in the stack.
