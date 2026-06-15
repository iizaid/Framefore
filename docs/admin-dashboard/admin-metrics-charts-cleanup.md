# Admin Metrics & Charts Cleanup

This patch removes all decorative UI noise from the Admin Dashboard to enforce a strict, data-forward command console aesthetic.

## Changes Implemented

- **Removed Metric Icons**: Stripped out `Users`, `UserCheck`, `Activity`, `TrendingUp`, `TrendingDown`, and `Minus` icons from the top summary metrics.
- **Removed Trend Graphics**: Removed all colored icon backgrounds, mini sparklines, and trend icons (up/down arrows).
- **Flat Summary Strip**: Redesigned the top 4 metric cards into a single, cohesive horizontal summary strip (`divide-x` on desktop, `divide-y` on mobile). This reduces visual clutter and shadow overlap.
- **Number Alignment**: Updated `DataRow` components across the dashboard to use strict `justify-between` and `tabular-nums` alignment. All values are right-aligned and guaranteed not to collide with labels.
- **Clean Chart Axes**: Removed tiny, illegible X and Y axis labels from `AdminAreaTrendChart` and `AdminBarTrendChart` (`tick={false}`). Charts now rely cleanly on Tooltips for specific values and maintain a minimalist grid.
- **Simplified Card Containers**: Reduced nested shadows and heavy borders inside `SectionCard` and `AdminChartShell`, creating a flatter, more mature dashboard layout.

## Strict Constraints Followed
- **No data logic changes**: The metrics and chart generation logic remains completely untouched.
- **No security changes**: `AdminGuard` and RLS policies are untouched.
- **No RPC/migration changes**: `0012` chart aggregation remains as-is.
- **No fake data**: Empty states remain honest and functional.
