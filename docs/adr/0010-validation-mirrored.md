# ADR 0010 · Validation rules mirrored across Zod (client) and Pydantic (server)

**Status:** Accepted · 2026-05-15

## Context

SPEC FR8 requires both client-side and server-side validation, with HTTP
422 on the server and meaningful error messages mapped back to specific
form fields. The initial implementation only checked the basics
(required, max length, future-DOB) and accepted any string for the
`contact`, `conditions`, and `allergies` fields. A reviewer pasting prose
into `contact` would see it accepted. Conditions arrays could contain
empty entries.

Two questions to settle:

1. **Where do the rules live?** Three options: server-only, client-only,
   or mirrored on both. Server-only is the safest, but error feedback is
   slow (round-trip per keystroke). Client-only is fast but bypassable.
   Mirrored is duplicated.
2. **What rules?** `contact` is a single freeform string in SPEC §8 (we
   merged phone + email in the SPEC-alignment pass). A strict regex would
   reject the seed data's `+1415... | name@example.com` format. We need
   a permissive shape that still rejects prose.

## Decision

Mirror the same rules on both sides. The duplication is small enough to
hand-write and keeps the contract obvious.

Rules applied on both sides:

| Field | Rule |
|---|---|
| `contact` | 1–200 chars; must contain a phone-shaped token (7+ digits with optional +/-/()/spaces) **or** an email-shaped token |
| `conditions` / `allergies` | each entry non-empty after trim, max 80 chars; list max 50 entries; trimmed on accept |

Implementation:

- **Server** (`apps/api/app/schemas/patient.py`): two new `@field_validator`
  methods. `_contact_has_phone_or_email` runs two regexes
  (`_PHONE_RE = r"\+?\d[\d\s().\-]{6,}"` and a permissive email regex)
  and accepts if either matches. `_validate_list` enforces the array
  caps and trims each entry on accept.
- **Client** (`apps/web/src/features/patients/schema.ts`): same regex
  shapes via Zod `.refine` and `.superRefine`. The list refines emit
  issues at the specific array index so the form can target the right
  CSV input.
- **Error surfacing** (`PatientForm.tsx`): a `conditionsError(err)`
  helper flattens either an array-level message (e.g., "At most 50
  entries") or the first per-element message into the `Field` slot.
  Server 422 errors get mapped to the offending field via
  `setError(detail.loc[-1], { message: detail.msg })`.

## Consequences

- **Same wire-level contract.** A user typing "please call me" into
  `contact` sees the error inline before submit. A determined user
  bypassing the client check gets the same message back as HTTP 422
  with the right `loc` — the form maps it back to the contact field.
- **Tests cover both.** `test_validation_rules.py` (8 backend tests)
  hits the regex with phone-only / email-only / combined / prose inputs
  and verifies the 422 `loc` is correct. `PatientForm.test.tsx` adds a
  client-blocking case for prose contact.
- **Drift risk.** Two regexes mean two places to update. Acceptable for
  this scope; the test pairs (one client, one server, same input) will
  catch divergence. A long-term version would publish a single schema
  source — JSON Schema generated from Pydantic, then read by the
  client — but the dependency cost outweighs the benefit at this size.
- **Permissive by design.** The phone regex accepts US-style phone
  numbers and many international shapes; the email regex doesn't try to
  RFC-validate. We're rejecting prose, not validating deliverability.
  Real contact verification belongs in the user invite flow, not the
  edit form.

## Alternatives considered

- **`zod-to-json-schema` → OpenAPI bridge.** Single source of truth at
  the cost of a build step and a runtime dependency. Considered for
  later; not worth it for two fields' worth of rules.
- **`react-hook-form` + manual onChange validation.** No Zod, no schema
  object. Faster to write but harder to reuse in tests; the
  client/server symmetry is also less obvious without a declarative
  schema on both sides.
