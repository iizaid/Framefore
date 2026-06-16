# Framefore Visual Hard Reset

## References Read

- `public/design/DESIGN.md`
- `public/design/theme.css`
- `public/design/tokens.json`
- `public/design/variables.css`

## Direction

Framefore now uses the `public/design` system as the visual source of truth, adapted to the Framefore palette:

- Electric Violet for brand accents, selected states, focus rings, and scene identity.
- Haiti and Midnight Ink for strong text and dark UI.
- Blue Chalk for the app and canvas foundation.
- Turbo Yellow only for warnings, missing essentials, and small signal markers.
- Carbon for primary generic actions.
- White and Paper for dense product UI surfaces.

The target is a compact SaaS product cockpit: bold Plus Jakarta Sans hierarchy, dense UI rhythm, 1200px landing content, 12px cards, 9px buttons, 54px pills, and subtle blue-tinted shadows.

## Removed Legacy Patterns

- Warm Studio beige/stony visual direction is deprecated.
- The landing hero pill label was removed.
- The landing hero background video/media was removed.
- The unused landing video lightbox and old canvas showcase component were removed.
- Admin/user table legacy hex styling was replaced with Framefore tokens.
- Timeline blocks were rebuilt from simple rectangles into compact editor segments.

## Core UI Applications

- Landing: centered text-first hero, product-cockpit canvas showcase, denser feature/export/pricing sections, no hero video.
- Canvas: Blue Chalk workspace with dot grid and larger 180px structure grid.
- Scene cards: deterministic accent, top strip, number badge, richer hierarchy, warning signal treatment.
- Timeline: same color resolver as canvas cards, title/duration/number hierarchy, selected state, editor strip rhythm.
- Admin: black sidebar remains, main workspace uses flat white/Paper surfaces, compact tables, tokenized empty/error/loading states.
- Auth/profile: aligned to Blue Chalk, Ink, Carbon, Violet focus, and 9px button system without changing auth behavior.

## Scene Color Rule

Scenes with a user-selected color continue to use `sceneColor(scene.color)`.

Scenes with `scene.color === "none"` use `getAutoSceneColor(scene.id, index)`. The result is deterministic, uses no random values, does not mutate stored scene data, and avoids dynamic Tailwind class names.

## Boundaries Preserved

- Timeline order remains the source of truth for export order.
- Canvas positions do not affect export order.
- No Supabase migrations were added.
- No auth, security, AdminGuard, RPC, database, cloud sync, or local project persistence behavior was changed.
