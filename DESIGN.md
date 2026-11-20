# ResumeLens design system

## Direction and authority

The user pinned the complete supplied direction: “Linear — Style Reference”, “midnight precision instrument”, with a dark theme, compact product controls, a fixed top navigation bar, and a product interface as the landing-page visual. This replaces the earlier pale teal dashboard identity. `DESIGN-REFERENCE.md` is the source reference; this document records its implementation in ResumeLens.

## Palette and surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--color-void` | `#08090a` | Canvas |
| `--color-carbon` | `#0f1011` | Product frames and contained surfaces |
| `--color-obsidian` | `#161718` | Raised interactive surfaces |
| `--color-graphite` | `#23252a` | Hairline borders |
| `--color-smoke` | `#383b3f` | Stronger borders and dividers |
| `--color-fog` | `#8a8f98` | Reading-safe secondary text and placeholders |
| `--color-mist` | `#d0d6e0` | Body text and control labels |
| `--color-bone` | `#e5e5e6` | Near-white emphasis |
| `--color-paper` | `#ffffff` | Primary headings |
| `--color-acid-lime` | `#e4f222` | The single primary action per view |

Ash (`#62666d`) is reserved for nonessential decorative elements, not reading copy. Supporting chromatic tokens exist for compatibility with the reference, but do not become additional action colors. Analytical charts and score meters are neutral. Semantic states use text, labels, and icons rather than color alone.

## Typography

Inter Variable is self-hosted through `next/font` as `--font-inter`. Use 400 for reading copy, 510 for headings and controls, and at most 590 for emphasis. OpenType features are `"cv01" on, "ss03" on, "zero" on`. Display tracking is `-.022em`; body tracking is around `-.01em`. Marketing headings are 64–72px at desktop; task headings use a fixed 40px scale, stepping to 32px on small screens.

JetBrains Mono 400 is the documented substitute for Berkeley Mono, self-hosted through `next/font` as `--font-mono`. Reserve it for measurements, identifiers, file metadata, and keyboard hints. Headings remain Inter.

## Geometry and layout

- Maximum content width: 1200px.
- Base spacing unit: 4px; favor 8, 12, 24, 48, and 96px groups.
- Section separation: 96px on spacious landing-page regions.
- Controls and inputs: 6px radii. Panels: 12px. Pills: 9999px.
- Elevation uses .5px borders and the progression of dark surfaces, not ambient glows or large drop shadows.
- Desktop navigation is a top bar, never a sidebar. Mobile navigation preserves the same destinations and accessible state.
- The landing page is left aligned and presents one large product example. Do not add stock imagery, invented customer strips, three-column marketing card grids, decorative gradients, or gradient type.
- The analyzer and history are task surfaces: clear controls, restrained density, legible data, and structurally responsive layouts.

## Component vocabulary

Primary buttons are acid lime with dark text. All secondary buttons are neutral outline or carbon. The shared button height is 40px on desktop and at least 44px on mobile. Inputs use a faint neutral surface, a smoke border, and a bright neutral focus outline. Error and account messages are readable neutral callouts with explicit recovery copy.

Reports use typographic scores, real score-component meters, and structured evidence and recommendations. Landing-page sample data must be explicitly labeled as an example. There are no decorative score rings, arbitrary section numbers, or heading kickers.

## Interaction and accessibility

Use 150ms transitions for hover and focus feedback. Motion conveys loading or changes in state; the interface is visible without entrance choreography. Honor reduced-motion settings. Body and placeholder text must reach 4.5:1 contrast, large text 3:1, and focus outlines remain clearly visible. Selection, caret, and native dark browser surfaces follow the neutral palette. Every interactive component needs keyboard focus, disabled, loading, error, and empty states where applicable.

## Files

`web/src/app/globals.css` owns tokens and shared controls. `marketing.css` owns the shell, landing page, and authentication surfaces. `workspace.css` owns analyzer, reports, history, and resources. The app layout loads these in that order.
