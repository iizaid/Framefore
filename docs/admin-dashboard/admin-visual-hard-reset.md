# Admin Visual Hard Reset

Status: implemented.

The previous admin visual refresh was rejected. This hard reset rebuilds the
Admin Console visual direction as a flat production command workspace with a
black navigation rail and table-first pages.

## New direction

- Black sidebar with white and muted-gray text.
- Flat white main workspace.
- No card-soup dashboard layout.
- No centered narrow admin content.
- No grid, canvas, radial, or patterned background.
- No boxed admin loading card.
- Minimal borders used as dividers.
- Minimal radius only where it helps controls.
- Dense table-first Users page.
- Mobile layout keeps the sidebar from crushing content.

## What changed

- `AdminAccessLoading` now uses a black product-style loading screen with the
  Framefore mark, not a centered white card.
- `AdminLayout` is a full viewport app shell with a black sidebar and white
  main workspace.
- `AdminSidebar` was rebuilt as a compact black navigation rail.
- Planned modules are dimmed and use tiny `Soon` text, not white planned pills.
- `AdminTopbar` is a compact flat utility header.
- `/admin` Overview was rebuilt into:
  - a simple page header;
  - one flat metrics strip;
  - row-like operational sections;
  - one compact note about aggregate-only/cloud boundaries.
- `/admin/users` was rebuilt into:
  - a simple page header;
  - a flat real summary strip;
  - one unified table workspace;
  - integrated toolbar, tabs, table, and pagination.

## What did not change

- `AdminGuard` still protects `/admin` and `/admin/users`.
- `AppAccessGuard` still protects `/app`.
- No data contracts changed.
- No RPCs changed.
- No direct frontend admin table reads were added.
- No fake users or fake metrics were added.
- No charts were added.
- No user actions, bulk actions, role actions, or user detail drawer were added.
- No migrations or Edge Functions were added.
- No `service_role` or frontend `admin_has_app_role` was added.
- `/app`, local projects, and cloud-sync behavior were untouched.

## Visual QA checklist

Desktop:

1. Black sidebar with white/muted text.
2. No white planned pills in sidebar.
3. Overview and Users links are clear.
4. Future modules are muted with tiny `Soon` text.
5. Main workspace uses full width.
6. No narrow centered admin content.
7. No canvas/grid/pattern background.
8. Loading state uses product loading language, not a boxed card.
9. Overview is not a grid of metric cards.
10. Overview uses a flat metric strip and row-like sections.
11. Users page is table-first and unified.
12. No row selection or bulk actions.
13. No fake actions or data.

Mobile:

1. `/admin` fits the mobile viewport.
2. `/admin/users` fits the mobile viewport.
3. Sidebar becomes a horizontal black navigation area instead of crushing content.
4. Topbar wraps cleanly.
5. Toolbar stacks cleanly.
6. Table scrolls horizontally inside its workspace.
7. No horizontal page overflow except the table container.

Security:

1. `AdminGuard` remains active.
2. `AppAccessGuard` remains active.
3. No `service_role`.
4. No frontend `admin_has_app_role`.
5. No direct frontend admin table reads.
6. No migrations.
7. No Edge Functions.
8. `/app`, local projects, and cloud sync are untouched.
