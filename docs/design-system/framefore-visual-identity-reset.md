# Framefore Visual Identity Reset

## References Read

- `public/design/DESIGN.md`
- `public/design/theme.css`
- `public/design/tokens.json`
- `public/design/variables.css`
- Uploaded palette reference with Electric Violet, Turbo Yellow, Haiti, and Blue Chalk.

## Adopted Design Philosophy

- Product cockpit layout with compact, readable UI.
- Bold Plus Jakarta Sans display hierarchy and Inter for dense product UI.
- Flat white/Paper surfaces with subtle blue-tinted shadows.
- Violet used as the brand accent for focus, active states, and scene identity.
- Carbon/Haiti used for primary action contrast.
- Blue Chalk used as the soft app/canvas foundation.
- Turbo Yellow reserved for signal, warning, and missing-item moments.

## Framefore Palette

- Electric Violet: `#834DFB`
- Violet Base: `#7B68EE`
- Violet Deep: `#6647F0`
- Turbo Yellow: `#F0E100`
- Haiti Dark: `#18102B`
- Ink: `#090C1D`
- Carbon: `#202023`
- Blue Chalk: `#F5F3FF`
- Paper: `#F8F9FA`
- Linen: `#E9EBF0`

## Hero Video Removal

The landing hero no longer renders or references the previous background video. The current hero is centered, text-first, removes the small pill/badge entirely, and keeps the existing CTA destinations.

## Canvas Background

The workspace canvas now uses the Blue Chalk foundation with a subtle dotted grid. React Flow keeps existing pan, zoom, drag, selection, connection, and keyboard behavior.

## Scene Auto-Color Logic

`src/lib/sceneColors.ts` provides a deterministic Framefore palette for scenes whose `scene.color` is `"none"`. It hashes `scene.id` with `index` as fallback, uses no random values, requires no schema change, and does not mutate stored scene data.

User-assigned scene colors still go through the existing `sceneColor(scene.color)` path.

## Timeline Color Linking

Canvas scene nodes, board scene cards, and timeline segments resolve color with the same rule:

- `scene.color !== "none"`: use the existing user-assigned color.
- `scene.color === "none"`: use `getAutoSceneColor(scene.id, index)`.

Timeline/export order logic was not changed.

## Admin, Auth, And App Alignment

Admin layout, sidebar, topbar, users shell, role popover, auth layout, auth form, workspace rail, toolbar, and shared primitives were aligned to the new palette. Admin guards, role RPCs, auth routing, database behavior, and local project persistence were not changed.

## QA Checklist

- Hero has no video/background media reference.
- Global tokens map existing variables to Framefore identity tokens.
- Canvas background is Blue Chalk with subtle dots.
- Scene cards and timeline segments share stable accents.
- User-assigned scene colors remain respected.
- Turbo Yellow appears only for signal/warning states.
- Admin, auth, and app surfaces avoid harsh full-screen white where practical.
- No Supabase migrations or database changes.
- No auth/security/RPC changes.
- No cloud sync changes.
- `npm run build` passes.
