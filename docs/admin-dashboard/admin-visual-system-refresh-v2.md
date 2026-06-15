# Admin Visual System Refresh V2

Status: implemented.

V2 is a visual and layout redesign only. It keeps the existing guards, data
contracts, RPC helpers, TanStack Query/Table usage, and local-first `/app`
behavior unchanged.

## Why V1 failed

The first refresh moved the Admin Console toward a cleaner palette, but the
result still felt too centered, card-heavy, narrow, and landing-page-like. The
workspace did not yet read as a practical operations console: content sat inside
a constrained column, overview sections felt like separate showcase cards, and
the Users table was not the primary visual anchor.

## Design target

V2 follows a Shopify-like production backoffice philosophy:

- slim light sidebar;
- full-width workspace area;
- light gray admin canvas;
- white rounded table/panel surfaces;
- compact controls;
- muted filter tabs;
- dense practical rows;
- black primary action accents;
- no decorative canvas/grid/pattern background.

The screenshot reference was used only for layout philosophy. No Shopify
branding, labels, product data, icons, or copyrighted UI were copied.

## Full-width workspace rules

- Admin content fills the remaining viewport width after the sidebar.
- No centered `max-width` wrapper is used for admin pages.
- Desktop page padding is practical and compact.
- Main background is a continuous neutral admin canvas.
- Panels are embedded in the page flow, not floating marketing cards.

## Sidebar and topbar rules

- Sidebar width is slim and fixed/sticky on desktop.
- Sidebar background is a slightly darker light gray.
- Active items use a white rounded pill.
- Planned items are muted and include a very small `Planned` chip.
- Overview and Users are the only real links.
- Topbar is compact, sticky, white, and utility-focused.
- Topbar shows route context, MVP access, role badges, Back to app, and Profile.
- No fake global search was added.

## Overview redesign rules

- The page starts with a compact title/subtitle and real Refresh button.
- A horizontal summary strip shows only real values:
  - Total users
  - New users 7d
  - Completed profiles
  - Admin audit 24h
- Platform, Profiles, and Roles are compact operational panels.
- Contract and cloud boundary copy remains visible without becoming a hero card.
- Events, Cloud database rows, and Storage are compact panels.
- No fake trends, charts, or percentages were added. Profile completion remains
  computed from real profile totals only.

## Users table redesign rules

- Users is the visual benchmark for the admin system.
- The page uses a small practical header plus a real current-query summary strip.
- The table is one large white full-width panel.
- Toolbar, role tabs, table, and pagination are integrated into the same shell.
- Role tabs map to the real role filter.
- Search, profile filter, page size, and reset remain real controls.
- Rows are compact, with subtle dividers and hover state.
- There are no selection checkboxes, bulk action bars, action columns, or row
  detail links because no real user actions/detail page exist yet.

## What was not changed

- No fake data.
- No fake users.
- No fake metrics.
- No charts.
- No admin actions.
- No user detail drawer/page.
- No role grant/revoke UI.
- No new RPCs.
- No migrations.
- No Edge Functions.
- No `service_role`.
- No frontend `admin_has_app_role`.
- No direct frontend admin table reads.
- No cloud sync.
- `/admin` and `/admin/users` remain protected by `AdminGuard`.
- `/app` remains protected by `AppAccessGuard` and local-first after access.

## QA checklist

At desktop width:

1. Sidebar is visible on the left, light gray, slim, and compact.
2. Main workspace fills the remaining width.
3. There is no narrow centered content column.
4. There is no grid/canvas/pattern background.
5. `/admin` has a top summary strip and practical panels.
6. `/admin/users` reads as a real admin table page.
7. Users table panel is large, white, rounded, and full-width.
8. Toolbar is integrated into the table shell.
9. Role tabs change the real role filter.
10. No fake row selection or bulk actions appear.
11. No fake numbers or charts appear.
12. `/admin` and `/admin/users` remain protected.
13. `/app` remains protected and local-first.
14. `npm run build` passes.
