---
name: Botanical Commerce
colors:
  surface: '#f8faf4'
  surface-dim: '#d8dbd5'
  surface-bright: '#f8faf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4ee'
  surface-container: '#edefe9'
  surface-container-high: '#e7e9e3'
  surface-container-highest: '#e1e3dd'
  on-surface: '#191c19'
  on-surface-variant: '#414844'
  inverse-surface: '#2e312d'
  inverse-on-surface: '#eff1eb'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#006c48'
  on-secondary: '#ffffff'
  secondary-container: '#92f7c3'
  on-secondary-container: '#00734d'
  tertiary: '#4b1300'
  on-tertiary: '#ffffff'
  tertiary-container: '#702000'
  on-tertiary-container: '#ff8358'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#92f7c3'
  secondary-fixed-dim: '#75daa8'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#822801'
  background: '#f8faf4'
  on-background: '#191c19'
  surface-variant: '#e1e3dd'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Epilogue
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Epilogue
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an earthy, dependable, and refined commercial platform tailored for plant procurement, custom quote requests, and lifecycle order tracking. The visual character merges organic warmth with editorial retail precision, balancing vibrant foliage tones against calm, sunlit neutral surfaces.

The interface targets both residential enthusiasts and commercial interior landscapers who require streamlined browsing, itemized pricing requests, and reliable fulfillment logistics on mobile devices. The emotional response evokes organic vitality, quiet confidence, and frictionless operational clarity.

The visual direction pairs **Modern Organic Minimalism** with **Tactile Utility**:
- Layouts remain light, uncluttered, and grounded in spacious biological imagery.
- Subtle clay and terracotta accents punctuate lush foliage greens to guide conversion actions.
- Touch interactions mimic physical nursery tags, order boards, and tactile specimen logs through soft edge radii and warm ambient shadows.

## Colors

The palette draws directly from living canopies, potting substrates, and unglazed ceramic planters, paired with high-contrast functional status indicators.

### Palette Architecture
- **Primary (`#1B4332` - Deep Evergreen):** The anchor for brand identity, primary navigation headers, high-emphasis text, and primary call-to-action buttons. Delivers rigorous WCAG AAA contrast against light bases.
- **Secondary (`#52B788` - Foliage Green):** Applied to active toggles, secondary interactive accents, progress bars, and subtle supportive indicators.
- **Tertiary (`#C85A32` - Terracotta Clay):** Used purposefully for primary conversions, floating action badges, interactive notification pips, and quote urgency triggers.
- **Neutral Base (`#F4F6F0` - Soft Seedling Canvas):** A warm, desaturated neutral paper surface that eliminates sterile digital glare while maintaining product contrast.

### Functional Roles & Status Codes
- **Surface Layer 0 (Canvas):** `#F4F6F0`
- **Surface Layer 1 (Card/Containers):** `#FFFFFF`
- **Surface Layer 2 (Raised Wells):** `#EAECE4`
- **Border Subtle:** `#D8DDCF`
- **Text Primary:** `#132E22`
- **Text Muted:** `#4D6357`
- **Status Badges:**
  - *Quote Pending:* `#C85A32` (Terracotta / Amber Ochre)
  - *In Propagation / Processing:* `#2D6A4F` (Lush Forest)
  - *Out for Delivery / Ready:* `#1B4332` (Deep Evergreen)
  - *Delivered / Fulfilled:* `#3A7D5C` (Soft Sage)
  - *Needs Revision / Alert:* `#B93826` (Clay Red)

## Typography

The type system blends the characterful, architectural presence of **Epilogue** for display headers with the balanced, open geometry of **Plus Jakarta Sans** for body copy and dense transactional screens.

### Typographic Hierarchy
- **Editorial Brand Presence:** Display and title roles leverage `Epilogue` with tight tracking (-0.02em) to impart confidence and organic structure.
- **Scanning & Data Clarity:** Order specifications, botanical variants, sizing charts, and pricing line-items use `Plus Jakarta Sans` for uncompromised mobile legibility.
- **Labels & Micro-data:** Tracking badges, quote statuses, and specimen classifications utilize uppercase or heavy-weight variants of `label-sm` with slight positive tracking (+0.04em) to ensure immediate recognition at low resolutions.

## Layout & Spacing

A strict **8pt spacing system** governs all distances, calibrated for single-thumb mobile ergonomics and fast item skimming.

### Layout Model
- **Mobile (Base, 360px - 767px):** Single-column fluid view with a 4-column sub-grid for catalog listings. Edge margins are fixed at `1rem` (16px) to maximize screen economy while preventing accidental edge triggers.
- **Tablet (768px - 1023px):** 8-column layout with 24px gutters. Master-detail navigation appears for order logs and specimen directories.
- **Desktop (1024px+):** 12-column layout centered at a maximum content constraint of `1200px`, allocating dedicated spatial anchors for persistent filtering and quote summary drawers.

### Ergonomic Safety Zones
- Mobile interaction structures anchor critical decisions inside the bottom 40% vertical zone ("thumb zone").
- Interactive components mandate a minimum bounding box of 48×48px.
- Lists and quote forms preserve `space-lg` (24px) vertical separation to prevent mis-taps between dense operational buttons.

## Elevation & Depth

Visual depth avoids cold synthetic drop shadows, instead utilizing warm, ambient botanical diffusion tinted with low-opacity forest tones.

### Surface Tiers
- **Tier 0 (Background):** Base canvas in `#F4F6F0`. Receded, non-interactive foundation.
- **Tier 1 (Surface Cards & Panels):** Pure `#FFFFFF` resting on `#F4F6F0` defined by a subtle perimeter boundary: `1px solid rgba(27, 67, 50, 0.08)` and ambient shadow `0 2px 8px -2px rgba(27, 67, 50, 0.06)`.
- **Tier 2 (Sticky Headers & Sheet Drawers):** `0 4px 16px -4px rgba(27, 67, 50, 0.12)`, offering clean separation during content scroll.
- **Tier 3 (Floating Cart & Floating Triggers):** Raised terracotta or emerald surfaces elevated by `0 8px 24px -4px rgba(200, 90, 50, 0.28)`, signaling distinct accessibility above all scrolling planes.

## Shapes

The interface embraces organic curvature without sacrificing functional alignment. 

A roundedness factor of **2 (Rounded)** applies universally:
- Standard UI containers, cards, and input fields feature `0.5rem` (8px) corners.
- Modal drawers, quote summaries, and product display panels use `rounded-lg` at `1rem` (16px).
- Bottom sheets and floating interactive navigation elements deploy `rounded-xl` at `1.5rem` (24px) on their top edges.
- Badges, status chips, and quick-filter pills employ fully pill-shaped radii (9999px) to echo rounded river stones and natural leaf contours.

## Components

### Buttons & Interactive Triggers
- **Primary Action (Add to Quote / Submit Request):** Solid `#1B4332` with `#FFFFFF` text. Minimum height of 48px, horizontal padding `1.5rem`, rounded to 8px. Hover/focus translates to `#2D6A4F`.
- **Accent Conversion Action (Proceed to Checkout / Instant Reserve):** Solid `#C85A32` with `#FFFFFF` text for decisive path actions.
- **Secondary Action:** Outlined with `1.5px solid #1B4332`, background transparent, text `#1B4332`.
- **Touch Affirmation:** Subtle scale contraction (0.98) on press states with high visual feedback.

### Floating Cart / Quote Trigger
- **Placement:** Docked at the bottom-right viewport corner, floating 16px above the navigation safe area.
- **Structure:** 56×56px circle or pill-expanded format (`48px` height) in `#C85A32`.
- **Indicator:** High-contrast white numeral count nested within an emerald green sub-badge positioned at the upper right quadrant.

### Status Chips & Badges
- **Visual Pattern:** Pill-shaped (`rounded-full`), padding `4px 12px`, featuring `label-sm` uppercase text accompanied by a 6px solid status dot.
- **Status Variations:**
  - *Quote Submitted:* `#FEF3EC` background, `#C85A32` text and dot.
  - *Processing:* `#E8F5EE` background, `#2D6A4F` text and dot.
  - *Dispatched:* `#E0EDE6` background, `#1B4332` text and dot.
  - *Attention Required:* `#FCEEEB` background, `#B93826` text and dot.

### Form Inputs & Quote Builders
- **Fields:** Minimum height of 48px, background `#FFFFFF`, border `1.5px solid #D8DDCF`, text `#132E22`.
- **Focus State:** Border shifts to `#2D6A4F` with a soft outer ring `0 0 0 3px rgba(82, 183, 136, 0.25)`.
- **Quantity Adjusters:** Integrated thumb stepper with minimum 44×44px hit-targets for direct unit adjustments on mobile quote lists.

### Order Tracking Cards
- **Structure:** Tier 1 white cards featuring botanical specimen thumbnail (56×56px, 8px rounded), reference ID, live lifecycle stepper, and explicit delivery date.
- **Progress Stepper:** Linear segmented line using `#52B788` for completed intervals and `#D8DDCF` for upcoming steps.

### Checkboxes & Radios
- **Hit Size:** 20×20px visual glyph centered within a 48×48px tap target area.
- **Selected State:** Filled with `#1B4332` and white iconography; unselected state framed with `2px solid #A3AEA6`.