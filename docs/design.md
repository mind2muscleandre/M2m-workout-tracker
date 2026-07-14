# M2M Ecosystem Design System

Single source of truth for visual language across **Perform**, **Tracker**, **Macro**, **Goalsetter**, and **Coach**.

> App-specific token files should **import or mirror** these values — do not fork colors or typography.

---

## Color tokens

| Token | Value | Usage |
|-------|-------|-------|
| `yellow` | `#F7E928` | Data values, active states, primary CTAs **only** |
| `yellow-dim` | `rgba(247,233,40,0.13)` | Subtle accent backgrounds |
| `bg` | `#1a1d21` → `#22262b` gradient | App shell |
| `fg1` | `#FFFFFF` | Primary text |
| `fg2` | `rgba(255,255,255,0.72)` | Secondary text |
| `fg3` | `rgba(255,255,255,0.44)` | Labels, hints |
| `fg4` | `rgba(255,255,255,0.24)` | Disabled, placeholders |
| `border` | `rgba(255,255,255,0.10)` | Glass borders |
| `good` | `#4ADE80` | Positive data |
| `mid` | `#FB923C` | Warning data |
| `bad` | `#F87171` | Negative data |
| `info` | `#60A5FA` | Informational data (e.g. Perform funnel) |

### Macro colors (Macro + Coach nutrition views)

| Macro | Color |
|-------|-------|
| Protein | `#4ADE80` |
| Carbs | `#60A5FA` |
| Fat | `#FB923C` |

**Rule:** Semantic colors are for **data only**, never chrome or navigation.

### Glass panel

```css
background: linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02) 40%, rgba(20,22,25,.35));
backdrop-filter: blur(18px) saturate(160%);
border: 1px solid rgba(255,255,255,.10);
box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 8px 28px rgba(0,0,0,.28);
border-radius: 22px; /* cards */
```

### Ambient background

Faint yellow radial gradient top-right on all app shells:

```css
background:
  radial-gradient(90% 40% at 80% -5%, rgba(247,233,40,.08), transparent 60%),
  linear-gradient(180deg, #22262b 0%, #1a1d21 50%, #17191d 100%);
```

---

## Typography

| Role | Family | Weight | Notes |
|------|--------|--------|-------|
| Display | D-DIN Condensed Bold | 700 | Numbers, headings — **ALL CAPS** |
| Display fallback | Oswald | 600–700 | When D-DIN unavailable |
| Body | DM Sans | 400–700 | UI copy, buttons |
| Mono | JetBrains Mono | 400–500 | Labels, chips — `letter-spacing: 0.10–0.22em` |

### Scale

- Section labels: 9px mono, `letter-spacing: 0.2em`, uppercase
- Body: 12–14px
- Display headings: 21–26px condensed
- Timer digits: 64px+ condensed

---

## Shared components

Build these per app before screen PRs. APIs should be consistent; implementation varies by stack.

### GlassCard

Raised glass surface. Props: `children`, `accent?` (yellow border tint), `padding?`, `onPress?`.

### StickyCTA

Fixed bottom CTA above tab bar. States: `locked` (muted, disabled), `ready` (yellow fill). Respects safe area.

### SectionLabel

Mono uppercase label above content blocks. Text in Swedish.

### BottomSheet

Modal sheet from bottom with drag handle, backdrop blur, glass surface. Used for pickers, confirmations, settings.

### ProgressBar

Horizontal fill bar. Yellow fill on dark track. Optional label row.

### TogglePill

On/off pill toggle. Active = yellow fill; inactive = glass border.

### SkeletonRow

Shimmer placeholder matching list row height. Used during loading states.

---

## Glow rule (non-negotiable)

Glow and colored shadows **only** on circular elements:

| Platform | Correct | Wrong |
|----------|---------|-------|
| CSS | `box-shadow` on element with `border-radius: 50%` | Shadow on square wrapper around circle |
| CSS pseudo | `border-radius: inherit` on `::before`/`::after` | Glow on parent without radius |
| SVG | `filter: drop-shadow(...)` on SVG/shape | `box-shadow` on SVG container |
| React Native | `shadow*` props on `View` with `borderRadius: width/2` | `elevation` on Android square wrapper |

Audit every PR: search for `box-shadow`, `shadowColor`, `elevation` on non-circular parents.

---

## Onboarding psychology

All onboarding flows follow these principles:

1. **Value before account** — Show the personalized plan/profile fully **before** the account gate. CTA: *"Spara min plan/profil — skapa konto"*, never *"Registrera dig"* first.
2. **Endowed progress** — Step indicators never start at zero (e.g. step 2 of 4 shown as partially filled).
3. **Goal gradient** — Concrete projections with dates (*"68,0 kg ≈ 24 oktober"*, *"3:00/1:30/0:45-profil"*).
4. **Social proof at decision point** — Behavior-specific, real aggregates only. Hide behind `FEATURE_SOCIAL_PROOF` until data exists.
5. **Explain the math** — *"Så räknade vi"* wherever an algorithm sets a number.

---

## i18n & content rules

- All UI text in **Swedish** (å, ä, ö correct).
- No emoji in UI chrome. **Exception:** 🔥 for streaks only.
- No debug info in user-facing UI.
- Display numbers use Swedish locale (comma decimals where appropriate).

---

## Per-app token mapping

| App | Stack | Token file |
|-----|-------|------------|
| Perform | Next.js | `M2M-Perform/ai-screening-live/ai-screening-nextjs/src/styles/perform/perform.css` |
| Tracker | Vite + React | `M2M-Tracker(fd.Timer)/styles/app.css` |
| Macro | Next.js | `M2M-macro/M2M-macro/styles/mf/mf.css` |
| Goalsetter | Expo RN | `M2M-Goalsetter/src/lib/theme.ts` |
| Coach | Expo RN | `M2M-Coach/src/lib/theme.ts` |

Each app README links here. When updating tokens, change `docs/design.md` first, then sync app files.

---

## Energy system colors (Tracker)

| System | Rest default | Color |
|--------|-------------|-------|
| ATP-PC | 3:00 | `#F7E928` (yellow) |
| Glykolys | 1:30 | `#FF5F1F` (orange) |
| Aerob | 0:45 | `#00D4AA` (teal) |

Used for timer cards and recovery readouts only.

---

## Z-index scale

| Layer | Value |
|-------|-------|
| Tab bar | 100 |
| Sticky CTA | 99 |
| Modal / sheet | 200 |
| Toast | 300 |

---

## Layout

- Mobile canvas: **390px** (max **430px** centered)
- Tab bar: floating pill, glass, bottom safe area
- Screen padding: 18px horizontal
- Card gap: 9–12px vertical
