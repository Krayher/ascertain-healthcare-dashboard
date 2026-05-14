# ADR 0004 · Pluggable summarizer (template default, Claude optional)

**Status:** Accepted · 2026-05-14

## Context

The take-home asks for a `GET /patients/{id}/summary` endpoint that
synthesizes a narrative from the patient profile and notes. It says an LLM is
acceptable but optional. Two requirements pull in opposite directions:

- A reviewer should be able to `docker compose up` and immediately get a
  summary back, without provisioning an API key.
- The reviewer should also be able to *see* an LLM-generated summary if they
  want — that's a more interesting demo of the code's seams.

## Decision

Introduce a `Summarizer` interface with two implementations:

```python
class Summarizer(ABC):
    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult: ...
```

- `TemplateSummarizer` (always available) — string template with patient
  identifiers, conditions, allergies, note count, and the most recent note
  excerpt.
- `ClaudeSummarizer` (only when `ANTHROPIC_API_KEY` is set) — uses
  `claude-haiku-4-5-20251001` with an 8-second timeout and a max-token cap.
  On timeout, network failure, or API error, it falls back silently to the
  template implementation and logs a warning.

`build_summarizer()` picks the implementation at startup based on settings.
The router depends on `Summarizer` via FastAPI `Depends`, so flipping
implementations requires no route changes.

The response always includes a `"source"` field (`"template"` or `"claude"`),
so the UI can show a badge and the reviewer can confirm which path executed.

## Consequences

- `docker compose up` Just Works without a key.
- Provisioning a key + restart switches every summary call to Claude.
- The fallback path means transient API outages don't break the endpoint —
  the user sees a slightly less polished summary, not a 500.
- Testing is straightforward: `TemplateSummarizer` is pure and unit-tested;
  `ClaudeSummarizer` is not unit-tested (would require mocking the SDK or
  hitting the real API) and is documented as an integration-tier concern.

## Alternatives considered

- **Template only:** simpler, but the seam itself is a demonstration of
  the design judgment we want the reviewer to see.
- **LLM only:** forces a key, drops the project's "just works" bar.
