# Agent prompt: Design system implementation

You are implementing a unified dark-theme design system across three projects: Backproto (backproto.io), Buildlog (buildlog.ai), and VR (vr.dev).

## Design tokens

Load and use the tokens from `designsystem/tokens.json`. All color, font, spacing, and layout values come from this file.

## Key rules

1. Dark theme only. Background: #09090b. No light mode.
2. Fonts: Geist (sans) for body, Geist Mono for code/labels/buttons/nav.
3. Accent: amber #d97706. Used for links, primary buttons, borders on active/highlighted elements, section label left-borders, stat values.
4. Text hierarchy: #fff for headings, #e4e4e7 for body, #a1a1aa for secondary, #71717a for tertiary/labels.
5. Borders: #27272a default, #3f3f46 for card/button borders.
6. No gradients. No drop shadows except the subtle amber glow on specific elements.
7. Grain texture overlay on body (SVG feTurbulence, opacity 0.025).
8. Letter-spacing: -0.03em to -0.04em for headings. 0.1em for uppercase labels.
9. Line-height: 1.18 for hero titles, 1.3 for headings, 1.7 for body.
10. Border-radius: 4px for code badges, 5px for buttons, 8px for cards.

## Component patterns

See `designsystem/components.md` for exact specs on nav, footer, buttons, cards, terminal blocks, stat bars, comparison tables, and section labels.

## CSS approach

- Use CSS modules (`.module.css` files) for component styles.
- Define CSS custom properties in globals.css matching token values.
- No Tailwind. No CSS-in-JS. Plain CSS modules.
- Responsive: single breakpoint at 768px. Stack grids to single column.

## Voice and content rules

All visible content must comply with the AISLOP writing rules (see `gtm/AISLOP.md` if available in the project):
- No emoji in prose
- No bold-colon pattern ("**Word:** Description")
- No rule-of-three lists for rhetorical effect
- No "we" — use third person for public content
- Sentence case for headings
- Numbers over vague quantifiers

## Project-specific notes

- Each project has its own identity but shares the visual language
- Backproto: payment routing for AI agents (primary amber accent)
- Buildlog: agent workflow capture (may use teal #0d9488 as secondary accent)
- VR: outcome verification (may use indigo #6366f1 as secondary accent)
- Footer includes cross-links to all three projects
- "The Stack" narrative: Buildlog captures. VR verifies. Backproto pays.

## Implementation checklist

When applying this design system to a new project:

1. Install Geist fonts (`geist` npm package)
2. Copy `designsystem/tokens.json` values into a `globals.css` as custom properties
3. Add grain overlay to body::after
4. Build Nav component (56px height, mono font, project logo left)
5. Build Footer component (links row + copyright, cross-links to other projects)
6. Apply button styles (primary amber, secondary ghost)
7. Apply card styles (border-bright border, 8px radius)
8. Apply section label pattern (mono uppercase, accent left border)
9. Test at 768px breakpoint
