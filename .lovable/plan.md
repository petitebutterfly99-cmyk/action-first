# Add `PROMPT_TEMPLATE.md`

Create a single new file at the project root: **`PROMPT_TEMPLATE.md`**.

No code changes, no edits to existing files. It will sit alongside `PRD.md`, `ARCHITECTURE.md`, and `HANDOFF.md` as a paste-ready prompt prefix.

## File contents (outline)

1. **How to use** — one paragraph: paste the "Scope Guardrails" block at the top of any request, then write the actual task underneath.
2. **Project anchor (1-liner)** — the hypothesis: decision + action engine for CSMs, not a dashboard.
3. **Design system reference**
   - shadcn/ui primitives in `src/components/ui/*` (vendored — do not modify)
   - Tokens in `src/index.css` + `tailwind.config.ts` (semantic HSL only)
   - Visual benchmark: Gainsight-style enterprise SaaS
   - Icons: `lucide-react`; Font: Inter
4. **Scope Guardrails block** (the 10 rules, copy-pasteable verbatim) — feature isolation, no shadcn edits, tokens only, data boundary via `accountsApi` + `queueLogic`, RLS as source of truth, status state machine intact, append-only activity log via `safeLog`, AI assistive only, list-files-first, no new top-level routes.
5. **Request template** — fill-in-the-blank skeleton:
   ```
   TASK: <one sentence>
   FILES I WILL TOUCH: <bulleted list>
   FILES I WILL NOT TOUCH: <anything load-bearing nearby>
   ACCEPTANCE: <observable behavior>
   OUT OF SCOPE: <explicit non-goals>
   ```
6. **Canonical references** — pointers to `PRD.md` §10, `ARCHITECTURE.md`, `queueLogic.ts`, `safeLog.tsx`, `accountsApi.ts`.

## Technical details
- Single new markdown file, ~150–200 lines.
- No imports, no code, no dependency changes.
- Root location so it shows up next to other governance docs.
