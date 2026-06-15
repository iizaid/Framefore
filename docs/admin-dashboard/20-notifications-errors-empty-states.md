# 20 — Notifications, Errors & Empty States

Every async surface in the console must explicitly handle each state below.
Reuse the existing `src/components/ui/{toast,ErrorState,Modal}` primitives for
consistency with the rest of the app.

## State catalog

| State | When | Treatment |
|---|---|---|
| **Loading** | any fetch in flight | `AdminSkeleton` matching the final layout (no spinners-on-blank, no layout shift) |
| **Boot / role-checking** | auth or roles not resolved | `AdminBootScreen` (neutral, no admin chrome) — prevents flicker ([05](05-admin-routes-and-navigation.md)) |
| **Empty (intentional)** | table legitimately has 0 rows (security/abuse/projects today) | `AdminEmptyState`: icon + "No X yet" + *why/when it populates* — must read as intentional, not broken |
| **Empty (filtered)** | filters exclude everything | "No results for these filters" + a **Clear filters** action (distinct from intentional-empty) |
| **Forbidden** | signed-in non-admin, or admin lacking a specific role | `AdminForbidden` 403 panel + "Back to app"; for sub-area role gaps, explain which role is required |
| **Unauthenticated** | no session | redirect to `/login?redirect=…` (not an inline error) |
| **Supabase not configured** | `!isSupabaseConfigured` | treat as unauthenticated → `/login` (which already explains config); admin never shows fake data offline |
| **Edge-function failure** | `functions.invoke` error / timeout | "This action is temporarily unavailable" + retry; never claim success; log raw error in DEV only |
| **Insufficient role (mutation)** | server rejects a grant/revoke | map to friendly copy (e.g. "Only an owner can do that", "You can't remove the last owner") |
| **Network error** | fetch throws | `ErrorState` with retry; keep prior data visible if a refresh failed (don't blank the screen) |
| **Partial data** | one of several panels fails | render the panels that succeeded; show an inline error on the failed panel only |
| **Dangerous-action confirm** | before any mutation | `AdminConfirmDialog` / `AdminDangerZone`; destructive = red + explicit confirm (type-to-confirm for the worst) |
| **Success** | mutation succeeded | toast; for privileged mutations include "Audit entry written" |
| **Audit-written confirmation** | after grant/revoke/Edge mutation | success toast references the audit record; the new row appears in `/admin/audit` |

## Copy principles

- **Honest empties:** "No security events recorded yet — event capture is enabled
  in a later phase." Not "0 events" styled like a metric.
- **Friendly errors:** mirror `friendlyDbError()` ([lib/profile.ts](../../src/lib/profile.ts)).
  Known DB codes → human copy; unknown → generic + DEV-only console log. Never
  surface raw Postgres/Storage/Edge internals.
- **Actionable:** errors offer retry; filtered-empties offer clear-filters;
  forbidden offers a way back.
- **No false success:** a mutation toast fires only after the server confirms.

## Specific honest-empty messages (today)

| Section | Message |
|---|---|
| Projects | "Project oversight isn't available yet — Framefore is local-first until cloud sync." |
| Security events | "No security events yet — event capture lands in a later phase." |
| Abuse | "No custom rate-limit events — auth abuse protection is configured in Supabase/Cloudflare (see links)." |
| Storage (reference images) | "Reference-image data appears after cloud sync." |
| Users (pre-Edge-fn) | email/last-login columns simply absent — not shown as blank/"N/A". |

## Acceptance criteria

- Every page renders correctly in loading, empty, error, and forbidden states
  (verifiable by toggling network/role).
- No surface ever shows fabricated data in place of an empty/error state.
- Privileged-mutation success messages reference the audit entry, and that entry
  is real.
- Raw backend error text never reaches the DOM.
