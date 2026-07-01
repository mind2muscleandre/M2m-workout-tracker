# Mind2Muscle — Brand Spec

## Source
Extracted from Mind2Muscle Website.html and Design System zip (fonts only).

## Color System

| Token | Hex | OKLch | Role |
|-------|-----|-------|------|
| `--bg` | `#2A2E33` | `oklch(22% 0.012 240)` | Page background |
| `--surface` | `#3A3F45` | `oklch(29% 0.012 240)` | Cards, panels |
| `--surface-alt` | `#50565D` | `oklch(38% 0.010 240)` | Elevated surfaces, inputs |
| `--fg` | `#FFFFFF` | `oklch(100% 0 0)` | Primary text |
| `--muted` | `rgba(255,255,255,0.55)` | — | Secondary text |
| `--border` | `rgba(255,255,255,0.10)` | — | Hairline borders |
| `--accent` | `#F7E928` | `oklch(90% 0.18 98)` | Primary accent, ATP-PC color |

## Light Theme Overrides
| Token | Value |
|-------|-------|
| `--bg` | `#F2F2EF` |
| `--surface` | `#FFFFFF` |
| `--surface-alt` | `#E5E5E2` |
| `--fg` | `#1A1D21` |
| `--muted` | `rgba(26,29,33,0.50)` |
| `--border` | `rgba(26,29,33,0.10)` |
| `--accent` | `#C8A800` (darkened for contrast on light bg) |

## Energy System Colors
| System | Color | Hex |
|--------|-------|-----|
| ATP-PC (Phosphocreatine) | Electric yellow | `#F7E928` |
| Glycolytic (Anaerobic) | Electric orange | `#FF5F1F` |
| Aerobic (Oxidative) | Electric teal | `#00D4AA` |

## Typography
- **Display/Numbers**: `'D-DIN Condensed'`, weight 700 — big timers, percentages, headings
- **Body/UI**: `'DM Sans'`, weight 300/400/500/600 — labels, descriptions, buttons
- **Mono/Data**: `'JetBrains Mono'` — system labels, timestamps, technical values

## Layout Posture
- Mobile-first: 390px primary canvas, max 430px
- Dark canvas, no gradients on backgrounds
- Cards with `border-radius: 16px`, `1px` border at 10% white opacity
- One accent (yellow) used sparingly — CTA button + active state + primary system ring
- No shadows on cards — borders + spacing do the work
- Accent used at most twice per screen

## Visual Character
- Sport/performance aesthetic: dense but breathable
- D-DIN Condensed gives athletic numerical weight
- Minimal chrome, maximum readiness information
- Electric color accents on dark charcoal = premium training feel

## Glass System (Liquid Glass — v2)
Added to all M2M products. See `M2MGoalsetter/styles/gs.css` for canonical variables.

### Canvas
- `--bg: #1E2228` (deepened from #2A2E33 for more contrast under glass)
- `--screen-bg: #22262C` (per-screen background)

### Surfaces (semi-transparent for glass layering)
- `--surface: rgba(58,63,69,0.78)` — base surface, slightly translucent
- `--surface-hi: rgba(69,76,84,0.82)` — elevated surface
- `--surface-solid: #3A3F45` — use where opacity must be 100%

### Glass Tokens
```css
--glass-bg:          rgba(50,55,62,0.58);     /* card backgrounds */
--glass-bg-hi:       rgba(62,68,76,0.65);     /* hover/active state */
--glass-bg-accent:   rgba(247,233,40,0.09);   /* accent-tinted card */
--glass-bg-teal:     rgba(0,212,170,0.08);    /* coach-tinted card */
--glass-border:      rgba(255,255,255,0.13);  /* default card border */
--glass-border-hi:   rgba(255,255,255,0.22);  /* hero card border */
--glass-blur:        blur(22px) saturate(180%) brightness(1.07);
--glass-shadow:      0 4px 28px rgba(0,0,0,0.36), 0 1px 6px rgba(0,0,0,0.22), inset 0 1.5px 0 rgba(255,255,255,0.12);
--glass-shadow-accent: (same + yellow tint)
--glass-shadow-teal:   (same + teal tint)
```

### Ambient Background
Each screen uses `.ambient-bg` (position: absolute, inset: 0) with radial gradients:
- Athlete/onboarding: yellow top-left (9% opacity) + teal bottom-right (7%)
- Coach: teal top-left (9%) + yellow bottom-right (7%)

### Glow
- `--glow-accent`: applied to `.btn-primary`, active nav items
- `.ring-arc`: double drop-shadow for bright yellow/teal ring glow
- `.progress-fill`: box-shadow glow matches fill color
- `.badge-icon.earned-bg`, `.s-dot.done`: accent glow rings

### Usage Rules
- `backdrop-filter: var(--glass-blur)` on all card-level elements
- `box-shadow: var(--glass-shadow)` on all card-level elements
- `inset 0 1.5px 0 rgba(255,255,255,0.12)` creates the top-edge glass highlight
- One element per screen may use `--glass-shadow-accent` (the hero card)
- Never stack more than two backdrop-filter elements in the same stacking layer
