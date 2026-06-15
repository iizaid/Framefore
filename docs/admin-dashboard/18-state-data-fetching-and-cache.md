# 18 — State, Data Fetching & Cache

## Guiding principle: don't over-engineer

The project has **no TanStack Query** and uses Zustand + direct Supabase calls
([package.json](../../package.json)). The admin console should match that — a
small `useRoleStore` for the one piece of truly global state (the caller's roles)
plus simple per-page fetching. Adding a query library is **not** justified by the
MVP and would diverge from the codebase. Revisit only if caching needs grow.

## Role loading & the admin session

- `useRoleStore.load()` calls `get_current_user_roles()` once after auth
  initializes, caches `roles`, and is reused by `AdminGuard` and every page.
- The admin "session" is just the normal Supabase session — no separate token.
  `useAuthStore` already restores it and binds `onAuthStateChange`.
- **Reset on identity change** (copy the `useProfileStore` subscription pattern):
  on sign-out / account switch, clear `roles` and any admin caches so the next
  user re-fetches from scratch.

## Avoiding flicker (the priority)

```
initialized? ──no──> AdminBootScreen
   │yes
user? ──no──> redirect /login?redirect=...
   │yes
roles loaded? ──no──> kick off load() + AdminBootScreen
   │yes
allowed? ──no──> AdminForbidden   ──yes──> render route
```

Admin chrome renders only after roles resolve. Because roles are cached in the
store, navigating between admin routes does **not** re-trigger the boot screen.

## Per-page fetching pattern

Each page fetches its own data on mount (and when filters/params change), using a
tiny local hook:

```ts
function useAdminQuery<T>(fn: () => Promise<Result<T>>, deps: unknown[]) {
  const [state, set] = useState<{data:T|null; loading:boolean; error:string|null}>(
    { data: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    set(s => ({ ...s, loading: true, error: null }));
    fn().then(r => { if (alive) set({ data: r.data, loading: false, error: r.error }); });
    return () => { alive = false; };  // ignore stale responses
  }, deps);                            // eslint-disable-line
  return state;
}
```

- `alive` flag prevents stale responses overwriting newer ones (race-safe).
- Deps include URL params (`:userId`) and filter/cursor state so deep links and
  filter changes refetch correctly.

## Caching strategy

- **Roles:** cached in `useRoleStore` for the session (small, hot, read often).
- **Lists/details:** **not** cached beyond the page lifecycle in MVP — refetch on
  mount. Admin data must be *fresh* (you don't want a stale role list after a
  grant). Simplicity > micro-optimization here.
- If a specific list proves expensive, add a short in-store TTL cache for that
  list only — don't globally adopt a cache layer.

## Invalidation after mutations

- After `grant/revoke_app_role`: refetch the affected user's roles + the roles
  list + (cheap) the overview role counts. Because there's no global cache,
  "invalidation" = "refetch the few queries on screen".
- After any Edge mutation (future): refetch the relevant page + the audit feed.

## Optimistic updates?

- **No** for role grants/revokes — the DB enforces rules (last-owner, role tier)
  that the client shouldn't presume to predict; show a pending state, then
  reflect the real result. Avoids showing a change that the server rejects.
- Optimism is acceptable only for trivial, non-authorized UI (e.g. expanding a
  row), never for privileged mutations.

## Error handling

- Data layer returns `Result<T>`; pages render error states with retry
  ([20](20-notifications-errors-empty-states.md)).
- Friendly messages only (no raw DB/Edge internals).
- Edge-fn failures surface as "Action unavailable" with a retry, and never leave
  the UI claiming success.

## Stale data & reload behavior

- A full reload re-runs `useAuthStore.init()` → `useRoleStore.load()` → guard,
  so deep links work after refresh.
- After token refresh (`onAuthStateChange`), roles remain valid (same user); no
  forced reload needed.

## Edge-function clients

- One thin wrapper (`src/admin/lib/edge.ts`, `callAdminFn`) over
  `supabase.functions.invoke`, which auto-attaches the access token. No separate
  client, no manual token handling, no service role.
