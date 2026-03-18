# Components

Shared component patterns across Backproto, Buildlog, and VR.

## Nav

- Height: 56px
- Background: var(--bg) with no blur
- Font: mono, 0.82rem
- Links: text-muted, hover → accent
- Logo: project name in mono bold, left-aligned
- Layout: logo left, links center (desktop) or hamburger (mobile), GitHub icon right

## Footer

- Two rows: links row + copyright row
- Links: GitHub, Basescan (or project-specific), Buildlog, VR
- Social icons: SVG, 16×16, currentColor fill
- Copyright: mono, text-dim, 0.72rem

## Button — Primary

- Font: mono, 0.82rem
- Background: accent (#d97706)
- Color: white
- Padding: 0.55rem 1.25rem
- Radius: 5px
- Hover: accent-hover (#f59e0b)
- No border

## Button — Secondary

- Font: mono, 0.82rem
- Background: transparent
- Color: text-muted
- Border: 1px solid border-bright
- Padding: 0.55rem 1.25rem
- Radius: 5px
- Hover: bg-hover background, accent border, white text

## Section label

- Font: mono, 0.72rem, uppercase
- Letter-spacing: 0.1em
- Color: text-dim
- Left border: 2px solid accent
- Padding-left: 0.75rem
- Margin-bottom: 1.5rem

## Card

- Border: 1px solid border-bright
- Radius: 8px
- Padding: 1rem 1.1rem
- Hover: border → accent, background → accent-dim
- Title: mono, 0.82rem, bold, white
- Description: sans, 0.78rem, text-muted
- CTA link: mono, 0.72rem, accent

## Terminal block

- Outer: bg-elevated, 1px solid border, radius 8px
- Top bar: bg-surface, 3 dots (red/yellow/green, opacity 0.6, 10px)
- Body padding: 1rem 1.25rem
- Font: mono throughout
- Prompt: 0.75rem, text-dim
- Code: 0.75rem, text for names, text-dim for addresses

## Stat bar

- Horizontal flex, equal width
- Value: mono, 2.2rem, bold, accent
- Label: mono, 0.75rem, uppercase, text-dim
- Divider: 1px solid border, vertical
- Mobile: stack vertically, bottom border instead

## Comparison table

- Font: mono throughout
- Header: 0.7rem, uppercase, text-dim
- Cells: 0.78rem, text-muted
- Feature column: text color, font-weight 500
- Highlight column: accent color, left border

## Grain overlay

Applied to body::after. Fixed position, full viewport, pointer-events none, z-index 9999, opacity 0.025. SVG feTurbulence noise pattern, 256px tile.
