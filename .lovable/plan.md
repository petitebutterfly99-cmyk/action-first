# Update README.md and PRD.md to match current prototype

Light additive edits — both docs are ~90% current; this fills the gaps without rewriting accurate sections.

## README.md

- **Section 2 (Action Queue)**: add bullet for structured error states (offline / timeout / server) with Retry.
- **New Section 12 (Analytics)**: short entry covering the KPI row + CSM performance panel from `features/analytics/`.
- **Section 11 (Settings)**: reword to mention `useUserSettings` persists user preferences (not yet consumed by risk recomputation).
- **Main Build Decisions**: add one bullet for global offline banner + session-expiry toast.

## PRD.md

- **6.4 Action Queue empty states**: add bullet distinguishing timeout-specific "Service Temporarily Unavailable" copy from generic load error.
- **New 6.14 Analytics Panel**: purpose + brief contents (KPI row, CSM performance panel).
- **Section 7 User Flow**: add a short resilience step covering offline banner, offline sign-out, and structured error UI.
- **9.1 Real**: three new bullets — `OfflineBanner`, session-expiry toast in `AuthProvider`, `classifyError` in `useAccountsData`.
- **9.3 Not yet built**: append cross-reference to HANDOFF.md "Known gaps".
- **Section 10 Build Principles**: tighten the "explicit edge states" line to include offline + timeout paths.

## Out of scope

- No code changes, no other doc files (`ARCHITECTURE.md`, `Integration Plan.md`, `HANDOFF.md`) touched.
- No restructuring of accurate sections (hypothesis, data model, tech stack, modals).
