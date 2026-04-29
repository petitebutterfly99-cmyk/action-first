## Goal

Make the signed-in user and sign out action more prominent and discoverable by promoting them from the bottom of the sidebar into the top header — the standard SaaS pattern (and what users naturally look for).

## Change

Move the avatar + name/email + sign out control out of `AppSidebar` and into `AppLayout`'s header (top-right), as a compact user menu.

### Header (top-right, in this order)
1. Demo badge (unchanged, when applicable)
2. New **user menu**: avatar circle with initials + name (email below on hover/in menu), opens a dropdown containing:
   - Name + email (read-only header)
   - Settings (links to `/settings`)
   - Sign out

The trigger itself shows: avatar + name (email truncated below on wider viewports). On narrow widths it collapses to just the avatar.

### Sidebar footer
Remove the user block and Sign out button entirely. Keeps the sidebar focused on navigation only, giving more vertical breathing room.

## Files

- **Edit** `src/shared/components/AppLayout.tsx`
  - Add a `UserMenu` rendered to the right of the demo badge.
  - Use existing `DropdownMenu` from `@/components/ui/dropdown-menu`, `Avatar` from `@/components/ui/avatar`, and `useAuth().signOut`.
  - Navigate to `/login` after sign out (use `useNavigate`).
- **Edit** `src/shared/components/AppSidebar.tsx`
  - Remove the bottom user block + Sign out button and its imports (`LogOut`, `Button`, `useAuth`, `useNavigate`, `initials` helper).
  - Keep the top logo and nav list. Footer becomes empty (or removed entirely so nav fills the height).

## Visual sketch

```text
┌─ Sidebar ────────┐ ┌─ Header ──────────────────────────────────────┐
│ ▣ RetainIQ       │ │ Action Queue            [Demo · Jane]  [JD ▾] │
│                  │ ├───────────────────────────────────────────────┤
│ • Action Queue ! │ │                                               │
│   Accounts       │ │  main content                                 │
│   Activity Log   │ │                                               │
│   Settings       │ │                                               │
│                  │ │                                               │
│                  │ │                                               │
└──────────────────┘ └───────────────────────────────────────────────┘
```

Dropdown contents:
```text
┌──────────────────────────┐
│ Jane Doe                 │
│ jane@demo.app            │
├──────────────────────────┤
│ ⚙  Settings              │
│ ⎋  Sign out              │
└──────────────────────────┘
```

## Notes

- No behavior change to sign out itself — still calls `useAuth().signOut()` and routes to `/login`.
- No changes to auth, routes, or guided tour.
- Reuses shadcn primitives already in the project; no new deps.
