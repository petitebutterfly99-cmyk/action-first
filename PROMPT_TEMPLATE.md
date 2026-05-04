# PROMPT_TEMPLATE.md

A reusable prompt prefix for any change request against this codebase. Paste the
**Scope Guardrails** block at the top of your request, then write the actual
task underneath using the **Request Template**.

This document is co-authoritative with `PRD.md` (§10 Build Principles) and
`ARCHITECTURE.md`. If they disagree, those two win — update this file to match.

---

## 1. How to use

1. Copy the **Scope Guardrails** block (Section 4) verbatim into your prompt.
2. Fill in the **Request Template** (Section 5) below it.
3. Send. The agent will declare the file blast-radius before editing.

Do not edit the guardrails per-request. If a rule genuinely needs to bend for a
task, call it out explicitly in the `OUT OF SCOPE` / notes section.

---

## 2. Project anchor (one line)

> RetainIQ is a **decision + action engine** for CSMs that surfaces accounts
> with no teammate invites within 3–5 days of signup and drives a single next
> action. It is **not** a dashboard.

Every change must serve that loop. If a request would turn the app into a
reporting tool, push back.

---

## 3. Design system reference

There is no external Figma or Storybook. The design system is code-defined:

- **Primitives**: shadcn/ui in `src/components/ui/*` — vendored, treat as
  read-only. Extend via `className` or wrap; do not modify the primitive.
- **Tokens**: semantic HSL variables in `src/index.css`, surfaced through
  `tailwind.config.ts`. Examples: `--primary`, `--muted`, `--risk-high`,
  `--risk-medium`, `--risk-low`, `--badge-urgent-*`, `--sidebar-*`.
- **Never** use raw colors (`text-white`, `bg-red-500`, hex, rgb). If a needed
  token is missing, add it to `:root` **and** `tailwind.config.ts` in the same
  change.
- **Icons**: `lucide-react`. **Font**: Inter (loaded in `src/index.css`).
- **Visual benchmark**: Gainsight-style enterprise SaaS — dense, neutral,
  sidebar + workspace layout. Not a library, just a look-and-feel anchor.

---

## 4. Scope Guardrails (paste this block verbatim)

```
SCOPE GUARDRAILS — read before editing

1. Feature isolation: All new logic lives under
   src/features/<feature-name>/{components, hooks, api, __tests__}. No
   cross-feature imports. Features communicate only via src/shared/* or via
   props passed down from a page.

2. shadcn primitives are vendored: Files in src/components/ui/* must not be
   modified. Need a variant? Extend via className or wrap the primitive.

3. Tokens only: Never introduce hex, rgb, or named colors. Use the semantic
   HSL tokens in src/index.css. If the token you need does not exist, add it
   to :root AND tailwind.config.ts in the same change.

4. Data boundary: Account and queue data flows through
   src/shared/data/accounts/accountsApi.ts and
   src/features/action-queue/api/queueLogic.ts. Do not bypass selectQueue()
   or re-implement risk/sort logic inline in components.

5. RLS is the source of truth: Never filter assigned accounts client-side.
   The database enforces assigned_csm_id = auth.uid(). A client-side filter
   on ownership is a bug.

6. State machine intact: Status transitions
   (needs_action → contacted → snoozed → resolved) and their primary CTAs
   are defined once in queueLogic.ts. New actions extend that map; they do
   not branch inside components.

7. Activity log is append-only: Every user-visible action calls safeLog(...)
   from src/features/activity-log/api/safeLog.tsx. Logging failures must
   never block the action.

8. AI is assistive, never authoritative: Lovable AI calls time out at 2s,
   fall back to template defaults in src/features/outreach/api/template.ts,
   and never overwrite manual user input.

9. Touch only what is named: Before editing, list the exact files you will
   change. If the change requires touching a file outside that list, stop
   and explain why.

10. No new top-level routes or top-level folders unless the task explicitly
    creates a new feature.
```

---

## 5. Request template (fill in for each task)

```
TASK:
  <one sentence describing the user-visible outcome>

FILES I WILL TOUCH:
  - <path/to/file-1>
  - <path/to/file-2>

FILES I WILL NOT TOUCH:
  - <load-bearing nearby files explicitly excluded>

ACCEPTANCE:
  - <observable behavior #1>
  - <observable behavior #2>

OUT OF SCOPE:
  - <explicit non-goals to prevent drift>

NOTES (optional):
  - <any guardrail you are intentionally bending, and why>
```

---

## 6. Canonical references

- `PRD.md` — §4 Hypothesis, §6 Screen Rules, §10 Build Principles
- `ARCHITECTURE.md` — feature-folder layout and data boundaries
- `src/features/action-queue/api/queueLogic.ts` — `selectQueue`, risk order,
  status → CTA map
- `src/features/account-detail/api/timeline.ts` — timeline + insights rules
- `src/features/activity-log/api/safeLog.tsx` — append-only logging
- `src/shared/data/accounts/accountsApi.ts` — single data entry point
- `src/index.css` + `tailwind.config.ts` — design tokens

---

## 7. Anti-patterns (auto-reject)

- New `<div className="bg-blue-500">` style raw colors.
- New `useEffect` that fetches accounts directly from Supabase, bypassing
  `accountsApi`.
- A component computing its own risk badge instead of reading the value
  produced by `queueLogic`.
- Editing a file in `src/components/ui/` to change app behavior.
- A new page added directly under `src/pages/` for a feature that should live
  under `src/features/<name>/`.
- Silent `try/catch` around `safeLog` failures that also swallows the user
  action.
