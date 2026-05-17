# ADR 0008 · Frontend role switcher with UI permission gating

**Status:** Accepted · 2026-05-15

## Context

The SPEC describes two personas — Clinical Staff and Practice Administrator
— with different capabilities. Real authentication is explicitly out of
scope (SPEC §2). But shipping the app with no role distinction at all
hides what is otherwise a load-bearing design choice: which affordances
*should* belong to which role.

Three plausible shapes:

1. **Single unauthenticated UI; both personas can do everything.** What
   the v0.1 SPEC said. Cheapest. But it conflates the personas and offers
   nothing useful when auth lands later.
2. **Frontend-only role gating with an in-app switcher.** Honest demo of
   role-aware UI without pretending to enforce anything.
3. **Full auth.** Out of scope.

## Decision

Option 2. Add a sidebar avatar popover that toggles between Clinical Staff
and Administrator. The selection persists to `localStorage` and gates
affordances across the app via a `useCan(permission)` hook.

Permission table (matches SPEC §3):

| Action                            | Staff | Admin |
|-----------------------------------|:-----:|:-----:|
| View patients, notes, summary     |  ✅   |  ✅   |
| Add / delete clinical notes       |  ✅   |  ✅   |
| Create / edit / delete patients   |  ❌   |  ✅   |

Implementation:

- `apps/web/src/lib/role.ts` exports a Zustand store (`useRole`), a
  permission table keyed by `Permission` union type, and a `useCan(perm)`
  selector hook.
- `apps/web/src/app/layout/RoleSwitcher.tsx` renders the popover as a
  proper a11y `radiogroup` with `aria-checked` states.
- Gates today: Topbar's "+ New patient" button, PatientHeader's Edit /
  Delete buttons, PatientNewPage's auth-failure render path.
- Switching roles triggers a `window.location.reload()` on the next tick
  so that any in-flight server state is hydrated against the new role
  cleanly. The `setTimeout(0)` is intentional — it lets the persist
  middleware flush before the navigation event fires.

## Consequences

- **Honest framing.** The popover's own UI says "Demo: role gates UI
  only. Real enforcement requires auth." A determined user can flip the
  store via devtools or hit the API directly; we don't pretend otherwise.
- **Clear seam for real auth.** When auth lands, `useCan` becomes the
  integration point. The component-level call sites (`{canEdit && ...}`)
  don't change. The store either gets backed by a JWT-decoded role claim
  or wrapped in a query that asks the server.
- **Tests are seam-aware.** The Playwright happy-path seeds
  `localStorage.ascertain-role = "admin"` before navigating so the
  patient-create affordances render. A future auth-backed implementation
  would replace that seed with a real login flow.
- **No backend changes today.** The backend doesn't reject mutations
  based on role; that's the explicit non-enforcement trade-off. When
  auth lands, the server-side gate is the load-bearing one; this UI
  gate stays as a UX optimization.

## Notes for the auth follow-up

- Add an `Authorization` header to the API client.
- Replace `useRole`'s persistence with a server-issued session and a
  `whoami` query.
- The `useCan` permission table moves server-side; the frontend reads it
  from the session payload instead of declaring it locally.
- Role mismatch on the frontend then degrades gracefully: a 403 from any
  mutation surfaces the same "Not authorized" view that the route guard
  already shows.
