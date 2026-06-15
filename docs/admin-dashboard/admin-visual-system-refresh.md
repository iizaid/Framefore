# Admin Visual System Refresh

Status: implemented.

This refresh changes the Admin Console presentation only. It does not add admin
actions, new data producers, migrations, Edge Functions, cloud sync, role
management, user detail pages, fake metrics, or fake users.

## Design direction

The Admin Console now follows a clean production backoffice direction:

- white and very light neutral gray surfaces;
- light sidebar instead of a dark/canvas-like rail;
- white cards and tables with subtle borders;
- black or near-black only for primary actions and active emphasis;
- muted chips and compact status badges;
- dense but readable table rows;
- no decorative grid, dotted, radial, or technical backgrounds;
- no neon, glassmorphism, or AI-style gradients.

Reference images were interpreted as product/admin inspiration only: calm
Shopify-like navigation, compact operational tables, soft cards, and clear
toolbar hierarchy. No brand, layout, copy, numbers, or visual assets were copied.

## What changed

- `AdminLayout` now uses a plain `#f7f7f5` shell and no `dot-canvas`.
- `AdminSidebar` is a light neutral operations rail with Overview and Users as
  real links and all future modules visibly disabled.
- `AdminNavItem` uses a white active pill and muted planned chips.
- `AdminTopbar` uses a white surface, bottom border, route-aware section context,
  role badges, MVP access badge, Back to app, and Profile.
- Overview metric cards, status panels, skeletons, error states, and guardrail
  panels were restyled as embedded white backoffice cards.
- Users page header, toolbar, table, pagination, skeleton, empty, and error
  states were restyled as a compact production users table.
- Role/profile chips were muted and aligned with the neutral system.
- Admin access states were aligned with the same white/light-gray system.

## Sidebar and topbar rules

- Sidebar background is light neutral gray.
- Active links use a white selected row with subtle border/shadow.
- Planned modules are disabled and expose `aria-disabled`.
- Planned modules use a small `Planned` chip and no broken links.
- Topbar does not include fake global search.
- Topbar keeps only real controls: role badges, MVP access status, Back to app,
  and Profile.

## Table and card rules

- Tables live inside white bordered containers.
- Toolbar controls are integrated above the table.
- Rows have compact spacing and subtle hover.
- Header labels are muted and uppercase.
- Pagination is integrated below the table.
- No row selection exists because there are no bulk actions.
- No row action buttons exist because user management actions are not built.
- Metric cards show real values only.
- Overview charts were not added because no real historical series exists.

## What was not changed

- `AppAccessGuard` still gates `/app`.
- `AdminGuard` still gates `/admin` and `/admin/users`.
- `/app` remains local-first after authenticated verified access.
- Users list data still comes only from `loadAdminUsers()` and
  `admin_list_users`.
- Overview metrics still come only from `admin_get_overview_metrics`.
- No browser `service_role` usage was added.
- No frontend `admin_has_app_role` usage was added.
- No migrations or Edge Functions were added.
- No cloud sync was added.

## QA checklist

- `/admin` has no grid, dotted, canvas, radial, or decorative background.
- `/admin/users` has no grid, dotted, canvas, radial, or decorative background.
- Sidebar resembles a production backoffice nav and stays usable on mobile.
- Overview cards are white, compact, and show only real RPC values.
- Users table is white, compact, horizontally scrolls only inside the table
  container, and has no row selection or fake actions.
- Planned modules remain disabled with clear planned chips.
- Error/loading/empty/admin-access states match the white/light-gray system.
- `/admin` and `/admin/users` remain protected by `AdminGuard`.
- `/app` remains protected by `AppAccessGuard` and remains local-first.
- `npm run build` passes.
