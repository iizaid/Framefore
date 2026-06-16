# Warm Studio Theme Refresh

## Background
The Framefore UI initially relied heavily on pure white and high-contrast grey/black. While clean, this became visually tiring during extended use, particularly on the bright canvas surface.

The "Warm Studio" refresh deepens the app's palette into warmer, cinematic tones, making long planning sessions more comfortable and visually distinct.

## Global Tokens
Global palette tokens were shifted in `src/index.css`:
- **`--color-bg`**: Shifted from off-white `#fbfaf9` to warm ivory `#F6F1E8`.
- **`--color-surface`**: Shifted from pure white to `#FFFCF7`.
- **`--color-surface-2`**: Softened to `#EFE8DC`.
- **`--color-border` & `--color-border-strong`**: Warmed from cold greys to stone tones.

## Canvas Improvements
The primary workspace (Board / Canvas) uses `.dot-canvas`. This was updated to:
- Inherit the new, warmer `--color-canvas-bg` (`#F6F1E8`).
- Use slightly stronger, warm-brown radial dots for the grid instead of harsh grey.
- The `react-flow` canvas background is also tied to these tokens.

## Dynamic Scene Color System (Auto-palette)
A core addition is the deterministic auto-color system for scenes. 

### The Problem
Previously, scenes with `color: "none"` (the default) appeared as neutral grey boxes. This made scenes hard to distinguish on the canvas and entirely disconnected from their representative blocks in the timeline.

### The Solution (`src/lib/sceneColors.ts`)
We introduced an 8-color "Studio Palette" (Sage, Amber, Clay, Teal, Slate Blue, Olive, Rose Brown, Graphite). 
- When `scene.color === "none"`, the UI assigns a color based on the scene's *index* in the timeline (`index % 8`).
- **No Randomization**: Colors are stable and deterministic. No `Math.random()`.
- **Backward Compatible**: Old local projects load normally with no schema migrations required. 
- **User Preference**: If a user explicitly assigns a color label (e.g., "blue"), that choice always overrides the auto-palette.

### UI Integration
This color is surfaced across the interface to visually link a scene card with its timeline representation:
1. **CanvasCard**: Adds a 3px colored top border and colors the scene number badge.
2. **CompactSceneCard**: The left-edge timeline rail node circle assumes the scene's color.
3. **TimelineStrip**: The timeline segment gets a soft-tinted background and a matching top border. Hover/Selection states emphasize this color instead of defaulting to pure black.

*(Note: Tailwind purges dynamically constructed class names like `bg-${color}`, so these dynamic accents are applied using React inline styles with static hex values from the palette.)*

## What Was Intentionally Preserved
- **Export Logic**: The timeline array remains the single source of truth for video export order. Canvas positioning does not affect export order.
- **Security / DB**: No Supabase migrations, auth changes, or RPC modifications were introduced. The refresh is strictly visual.
- **Interactions**: Drag-and-drop, pan/zoom, and all editing features function exactly as before.
