# 16 — UI/UX Design System

## Direction

Premium, minimal, trustworthy internal SaaS console. **Not** a generic
purple/blue "AI dashboard." Monochrome-first (black / white / warm grays), dense
but readable, calm. The look should reuse Framefore's existing CSS-variable theme
(`--color-bg`, `--color-ink`, `--color-ink-soft`, `--color-charcoal`,
`--color-midnight`, `--color-surface`, `--color-border-strong`,
`--color-stone-surface`, `--radius-card`, `card-surface`, `dot-canvas`) already
used in [AdminPage.tsx](../../src/pages/AdminPage.tsx) and across the app, so the
console feels native and we don't fork the design language.

## Color & tone

- **Surfaces:** white/`--color-surface` cards on `--color-bg`; hairline borders
  (`--color-border-strong`).
- **Text:** `--color-ink` primary, `--color-ink-soft` secondary.
- **Accent:** `--color-midnight` (the existing dark accent) for primary actions —
  no new brand color.
- **Semantic:** reserve red strictly for destructive/danger; amber for warnings;
  a muted green only for confirmed-healthy states. Use sparingly.
- **Role badges:** distinct but quiet — `owner` (solid dark/`--color-midnight`),
  `admin` (outlined dark), `support` (neutral gray), `reviewer` (neutral gray,
  different glyph). Consistent everywhere via `AdminRoleBadge`.

## Layout

```
┌────────────┬──────────────────────────────────────────────┐
│            │  Topbar: breadcrumb · env · avatar+role · ⏻   │
│  Sidebar   ├──────────────────────────────────────────────┤
│  (grouped  │  Page header (title + primary action)         │
│   nav)     │                                              │
│            │  Content: cards / tables / detail drawer      │
│            │                                              │
└────────────┴──────────────────────────────────────────────┘
```

- **Sidebar:** grouped (People / Trust & Safety / Infrastructure / Settings),
  active-route highlight, role-hidden items. Collapsible to icons on narrow
  desktops.
- **Topbar:** breadcrumb (left), environment pill (`staging`/`prod`), admin
  identity + role badge, sign-out, "Back to app".
- **Content max-width** for readability; tables can go full-width.

## Components & patterns

- **Cards (`AdminMetricCard`):** label, big number, small sub-label/delta. Future
  metrics use a visually distinct "not available yet" variant (dashed border,
  muted), never a fake number.
- **Tables (`AdminDataTable`):** the workhorse. Sticky header, zebra-free with
  hairline row separators, right-aligned numerics, monospace for ids/timestamps,
  row hover, click-through to detail. Built-in loading skeleton, empty, and error
  rows. Column-level alignment and truncation with tooltip on overflow.
- **Filters (`AdminFilterBar`):** inline above tables — search input, date range,
  role/provider/status selects. Reflects state to the URL query string so filters
  are shareable/deep-linkable.
- **Search (`AdminSearchInput`):** debounced; clear affordance; searches the
  fields named per table in [19](19-search-filter-sort-pagination.md).
- **Badges (`AdminRoleBadge`, status badges):** small, uppercase-tracking labels.
- **Modals/confirmations (`AdminConfirmDialog`):** every mutation confirms. Danger
  variant (`AdminDangerZone`) uses red, requires an explicit confirm, and for the
  most destructive actions a type-to-confirm (e.g. type the nickname).
- **Audit timeline (`AdminAuditTimeline`):** vertical, reverse-chron, actor →
  action → target with relative + absolute time on hover.
- **Detail drawer (`UserDetailDrawer`):** slide-over for quick inspection from a
  table without losing list context; the full `/admin/users/:userId` page is the
  canonical deep-link view.
- **Empty states (`AdminEmptyState`):** icon + one-line explanation + (optional)
  action. Used heavily — many sections are legitimately empty today (projects,
  security, abuse). Empty must read as *intentional*, with a note on when it
  populates.
- **Skeletons (`AdminSkeleton`):** for every async surface; prevents layout shift
  and the role-flicker problem ([05](05-admin-routes-and-navigation.md)).

## Motion

Subtle only (the app already uses framer-motion). Drawer slide, dialog fade,
skeleton shimmer. No decorative animation; nothing that delays an admin's read.

## Mobile

Desktop-first, but functional on mobile: sidebar → drawer; tables → stacked cards
(label/value pairs); filters → collapsible sheet; confirm dialogs full-width.

## Accessibility

- Reuse existing `src/components/ui` primitives (`Modal`, `toast`, `primitives`,
  `ErrorState`) so focus management/escaping are consistent.
- Keyboard: full tab order, `Esc` closes dialogs/drawers, focus trap in modals,
  focus returns to trigger on close.
- Semantic tables (`<th scope>`), `aria-live` for toasts, role badges have text
  (not color-only) meaning, AA contrast (the monochrome palette helps).
- Danger actions are never color-only — include an icon + explicit label.
