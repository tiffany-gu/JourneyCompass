# Design Guidelines: Conversational Maps Journey Assistant

## Design Approach

**System-Based Approach**: Material Design 3 foundation with Linear-inspired modern productivity aesthetics. This combines Google's familiar patterns (fitting for Maps integration) with contemporary, efficient UI suitable for navigation and conversation.

**Key Design Principles**:
- Clarity over decoration - information must be instantly scannable
- Conversational flow - chat feels natural, not robotic
- Spatial context - map is always visible and interactive
- Smart density - compact but breathable layouts

---

## Core Design Elements

### A. Typography

**Font Family**: Inter (via Google Fonts)
- Primary: Inter 400, 500, 600
- Monospace numbers: Inter Tabular for metrics/times

**Hierarchy**:
- Page Title: text-2xl font-semibold (not needed, app loads directly to interface)
- Chat Messages User: text-base font-medium
- Chat Messages AI: text-base font-normal
- Route Cards Title: text-lg font-semibold
- Stop Cards Title: text-sm font-semibold
- Metrics/Stats: text-2xl font-semibold tabular-nums
- Secondary Info: text-sm font-normal
- Captions/Labels: text-xs font-medium uppercase tracking-wide
- Buttons: text-sm font-medium

### B. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12
- Micro spacing (gaps, padding in tight areas): 2, 4
- Standard component spacing: 6, 8
- Section separation: 12

**Grid Structure**:
- Split-screen: 40% chat panel / 60% map viewport (desktop)
- Mobile: Stacked - collapsible chat drawer over full-screen map
- Container: No max-width on panels, each fills assigned space

**Panel Specifications**:
- Chat Panel: Fixed height viewport, scrollable message area, fixed input at bottom
- Map Panel: Full height, fills remaining width
- Route Cards: Full-width within chat panel, stack vertically

### C. Component Library

**Navigation/Header**:
- Minimal top bar with app logo/name (left), voice recording indicator (center when active), settings icon (right)
- Height: h-16, border-b with subtle divider
- No traditional navigation - single-screen app

**Chat Interface**:
- Message bubbles: Rounded-2xl, asymmetric alignment (user right, AI left)
- User messages: More compact, minimal styling
- AI messages: Slightly wider, contains structured data
- Voice input button: Large circular FAB at bottom-right of chat panel
- Text input: Single line with send button, rounded-full, shadow-sm

**Route Comparison Cards**:
- Horizontal stats row: "Google Fastest" vs "Your Route" with time difference highlighted
- Use grid-cols-2 for side-by-side comparison
- Cost estimates below time metrics
- Green positive indicators, amber for tradeoffs

**Stop Cards** (Gas, Restaurant, Scenic):
- Compact horizontal layout: Icon (left), Info (center), Distance off route (right)
- Two-line structure: Name + Category (top), Rating + Price + Hours (bottom)
- "Why this stop?" collapsible section with AI reasoning
- One-click actions: "Add to route", "Skip", "Find alternative"

**Map Interface**:
- Interactive Google Map instance
- Custom pin markers: Differentiate start (green), end (red), gas (blue), food (orange), scenic (purple)
- Route polyline with subtle shadow for depth
- Info windows: Match stop card design for consistency

**Forms/Inputs**:
- Initial trip form (on first load): Origin, Destination, Fuel level, Preferences
- Inline conversational inputs: No heavy forms, extract from chat
- Chips for quick filters: Cuisine types, Price ranges, Rating thresholds

**Data Displays**:
- Trip summary sidebar (collapsible): Total time, distance, stops, estimated cost
- Stop list: Vertical timeline with connecting lines between stops
- Metrics dashboard (optional enhancement): Cards showing time saved/added, cost breakdown

**Overlays**:
- Voice recording modal: Pulsing animation during recording, waveform visualization
- Route recalculating indicator: Subtle progress bar at map top
- Confirmation dialogs: Centered, rounded-xl, with clear actions

### D. Animations

Use very sparingly:
- Message send: Subtle slide-up animation for new chat bubbles (200ms ease-out)
- Stop card additions: Fade-in when added to route (300ms)
- Voice recording: Pulsing glow on active microphone button
- NO scroll-triggered animations
- NO route polyline drawing animations (instant display)

---

## Layout Specifications

**Desktop Layout (≥1024px)**:
```
┌─────────────────────────────────────────────────┐
│ Header: Logo | Voice Indicator | Settings       │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Chat Panel      │     Map Viewport             │
│  (40% width)     │     (60% width)              │
│                  │                              │
│  [Messages]      │     [Interactive Map]        │
│  [Scrollable]    │     [Route + Pins]           │
│                  │                              │
│  ─────────────   │                              │
│  [Voice Input]   │                              │
│  [Text Input]    │                              │
└──────────────────┴──────────────────────────────┘
```

**Mobile Layout**:
- Full-screen map
- Floating chat drawer (slides up from bottom, 60% screen height)
- Swipe to expand/collapse chat
- Voice button: Fixed bottom-right FAB above map controls

**Message Flow**:
- Chat messages stack vertically with 4-unit gaps
- Timestamp labels every few messages (not every message)
- Auto-scroll to bottom on new message

---

## Images

**No Hero Section**: This is a utility app - users land directly in the working interface.

**Map Imagery**: Primary visual element is the interactive Google Map itself. No decorative imagery needed.

**Icons**: Use Material Icons CDN for consistency with Material Design approach
- Navigation, location, local_gas_station, restaurant, landscape, schedule, attach_money, star

**Stop Card Icons**: Small 20px icons in subtle treatment, positioned left of card content

---

## Critical Implementation Notes

- Chat panel must maintain scroll position when new stops added to route
- Map should center on full route extent initially, then allow manual pan/zoom
- Voice button disabled state when recording or processing
- Stop cards should show loading skeleton while Places API queries resolve
- Route comparison always visible at top of chat panel (sticky or always in view)
- Mobile: Ensure map controls don't overlap with chat drawer toggle