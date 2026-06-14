# 06 — Row Level Security (RLS) Plan

RLS is the **real** security boundary — the anon key is public, so without RLS
any user could read any row. Reference SQL only; do not auto-run this phase.

## Rules
1. **Enable RLS on every user-owned table.** A table without RLS but reachable
   by the anon key is fully exposed.
2. **Every policy filters by `auth.uid() = user_id`** (or `= id` for `profiles`).
3. Separate policies per command (`select`, `insert`, `update`, `delete`) — be
   explicit, avoid `for all` where possible.
4. **`insert` needs `with check`**, not `using`. Forgetting `with check` lets a
   user insert rows owned by someone else.
5. Child tables (`scenes`, `canvas_*`, `scene_assets`) carry a denormalized
   `user_id` so policies are a simple equality check (no join needed) — faster
   and harder to get wrong.

## profiles
```sql
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- insert is handled by the security-definer trigger handle_new_user();
-- no public insert policy is granted.
```

## projects
```sql
alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);
```

## scenes (and the same pattern for scene_links, canvas_notes, canvas_sections, canvas_links, scene_assets)
```sql
alter table public.scenes enable row level security;

create policy "scenes_select_own" on public.scenes
  for select using (auth.uid() = user_id);
create policy "scenes_insert_own" on public.scenes
  for insert with check (auth.uid() = user_id);
create policy "scenes_update_own" on public.scenes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scenes_delete_own" on public.scenes
  for delete using (auth.uid() = user_id);
```

> Apply the identical four policies to: `scene_links`, `scene_assets`,
> `canvas_notes`, `canvas_sections`, `canvas_links`. Each has its own `user_id`.

### Defense-in-depth (optional): verify the parent project too
If you prefer not to fully trust the denormalized `user_id` on inserts, add an
EXISTS check that the parent project belongs to the user:
```sql
create policy "scenes_insert_own_strict" on public.scenes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
```
Costs a join per insert; acceptable for write paths. Decide per
[20](20-open-questions-and-decisions.md).

## user_settings
```sql
alter table public.user_settings enable row level security;
create policy "settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "settings_upsert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## security_events (if used)
```sql
alter table public.security_events enable row level security;
create policy "events_insert_own" on public.security_events
  for insert with check (auth.uid() = user_id);
create policy "events_select_own" on public.security_events
  for select using (auth.uid() = user_id);
-- no update/delete from client (append-only)
```

## Storage bucket policies (`reference-images`, private)
Storage RLS lives on `storage.objects`. Path convention `userId/projectId/...`
lets us authorize by the first path segment:
```sql
-- read own files
create policy "ri_read_own" on storage.objects
  for select using (
    bucket_id = 'reference-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- write own files
create policy "ri_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'reference-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "ri_delete_own" on storage.objects
  for delete using (
    bucket_id = 'reference-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```
Full storage plan: [15](15-storage-and-reference-images-plan.md).

## Common RLS mistakes to avoid
| Mistake | Consequence |
|---|---|
| Forgetting `enable row level security` | Table is wide open to anon key |
| `using` on an INSERT policy instead of `with check` | Insert checks nothing |
| No `with check` on UPDATE | User can move a row to another `user_id` |
| Trusting `user_id` from the client without `with check` | Spoofed ownership |
| `for all` blanket policy | Hard to reason about; easy to over-grant |
| Relying on app filters instead of RLS | Anon key bypasses app entirely |
| Service-role key in client to "fix" RLS pain | Total bypass — never do this |
| Storage path not starting with `auth.uid()` | Cross-user file access |

## Verification (manual QA — doc 19)
- Sign in as User A, create a project; as User B, attempt to `select`/`update`
  that project id → must return 0 rows / fail.
- Attempt insert with a forged `user_id` → rejected by `with check`.
- Attempt to read `reference-images/<otherUser>/…` → denied.
