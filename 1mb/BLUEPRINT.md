# Micro-Roguelike — Project Blueprint

A study in constraint: two roguelikes, same core concept, built at radically different size budgets.

---

## Project Overview

| | 1KB Version | 1MB Version |
|---|---|---|
| **File size** | 1,022 bytes | ~82 KB across 2 files (well under the 1MB budget) |
| **Lines** | 1 (all inline) | ~2,212 (index.html + data.js) |
| **Architecture** | HTML + CSS `:target` navigation | HTML + CSS + JS engine, data split into a separate moddable file |
| **Rendering** | Fragment-identifier hypertext | DOM-based grid with fog-of-war |
| **Interaction** | Click links | Keyboard (arrows/WASD) |
| **State** | URL hash only | Full JS game state |

---

## 1KB Version — The Hypertext Roguelike

A single-line HTML file that uses CSS `:target` pseudo-classes to create a choose-your-own-adventure roguelike. Each room is a `<div>` with an `id`; links use `href=#roomid` to navigate between them.

### Rooms (10 total)

- `g` — Gate (start). Left → bones, right → beast, in → hall
- `b` — Bones. Take torch → hall, on → pit
- `e` — Beast. One eye opens → eaten (dead)
- `h` — Hall. Stairs → pit, door → idol, crack → crack, arch → dead
- `p` — Pit. Jump → dead, edge → vault
- `i` — Idol. Gold → dead, bow → crack, back → hall
- `c` — Crack. Squeeze → vault, return → hall
- `v` — Vault. Crown → dead, key → win, leave → gate
- `d` — Dead. Again → gate
- `w` — Win. Gate opens. Dawn. Again → gate

### Design Philosophy

- **No JavaScript.** Pure HTML/CSS. The `:target` selector handles all navigation.
- **One page per state.** Each room is a separate DOM fragment shown/hidden by the URL hash.
- **Death is a room.** The dead-end and beast rooms are just other fragments you can link to.
- **Minimalist prose.** Two to four words per room. "torch burns.dark hugs walls." — that's the whole atmosphere.
- **Branching, not grid.** No coordinates, no movement system. Just choices encoded as links.
- **Replayability via restart.** Every dead-end and the win screen link back to `#g`.

### What it achieves

A complete roguelike loop in 1 KB: explore, find items (torch, key, crown), encounter danger (beast, pit, idol), die, retry, win. The constraint forces every byte to earn its place.

---

## 1MB Version — The Full Roguelike

A proper roguelike with a 12x12 grid, procedural generation, AI enemies, and 6 floors plus an optional postgame floor. Two files, no build step: `index.html` (engine) and `data.js` (all game data — the mod surface). Combined size is well under the 1MB budget (~80KB total).

### Architecture

```
data.js (~1,255 lines) — the mod surface; edit this file to reskin/re-level the game
├── Balance constants (torch drain, beast speed/radius, relic slot counts)
├── Room-variant pools (pits, idols, cracks, halls, escapes, beasts) per floor
├── Level data (7 floors: 6 authored + 1 postgame, room templates, arcs, themes)
├── Game modes & mods (8 modes: standard, iron, greed, dark, daily, heavy, swift, warded)
├── Relics, hazard placement tables, sound effect map
└── ASCII room templates (BASE/BASE2/BASE3)

index.html (~957 lines)
├── <style> (~59 lines)
│   ├── Theme variables (7 floor palettes)
│   ├── Grid & panel layout, mobile D-pad
│   ├── Fog-of-war opacity classes
│   └── Animations (flicker, pulse, step, wardbreak, relicpulse)
├── <div id=s> (DOM shell)
│   ├── #u — Header (floor, mode, stats)
│   ├── #g — 12x12 grid container
│   ├── #i — Info panel (inventory, relics, log)
│   ├── #l — Message log
│   ├── #d — Mobile D-pad (shown ≤780px during play)
│   └── #r — Restart button
├── <script src=data.js> — loaded first, see above
└── <script> (~893 lines, the engine — reads data.js's tables as globals)
    ├── Game state & initialization
    ├── Rendering engine (DOM-based, fog-of-war)
    ├── Player movement & collision
    ├── Enemy AI (beast pursuit; shade/watcher/leech/effigy static hazards)
    ├── Item system (torch, ward, gold, crown, key, relics)
    ├── Death triggers & the dread meter
    ├── Camp system (between-floor upgrades) + localStorage save/continue
    ├── Web Audio sound effects (oscillator beeps, no audio files)
    ├── 8 game modes, including 3 character-class starting kits
    └── Finale system (floor 6 crown-carrying escape) + floor 7 postgame descent
```

### Key Systems

**Grid & Movement**
- 12x12 grid with authored room templates per floor
- Arrow keys / WASD for movement
- Collision with walls, enemies, and hazards
- Fog-of-war: only visible tiles are rendered; explored tiles are dimmed

**Enemies**
- **Beast** — Pursues player using signed-distance chase logic with collision-aware routing. Gets faster on deeper floors. The only enemy with per-turn movement AI.
- **Shades** — Static hazard tiles placed per floor. Trigger an effect when stepped on. Can be warded/broken with the right relic.
- **Watchers** — Static hazard tiles that raise dread when stepped on.
- **Leeches** — Static hazard tiles that drain torch/ward when stepped on.
- **Poisoned Effigies** — Decoy relic-lookalikes, un-telegraphed (render identically to a real relic). Touching one is instant death; the real relic in the same room still works normally.

**Items & Resources**
- **Torch** — Fuel-based light source. Drop with `t`. Burns out.
- **Ward** — Temporary protection. Repels shades.
- **Gold** — Currency for camp upgrades.
- **Crown** — Required to win. Carried to floor 6 exit.
- **Key** — Opens the final gate.
- **Relics** (12 types) — Equippable items with upsides and downsides. Tempered at camp.
- **Curses** — Negative modifiers applied on certain floors or events.

**Floors (7 total: 6 authored + 1 postgame)**
1. Foundation — "stale rite," entry-level tension
2. Pressure — "ember choke," ruin tightens
3. Ward — "cold liturgy," shrines cut both ways
4. Hunt — "rose alarm," watchers turn noise into pursuit
5. Hollow — "ash hush," everything merely-enough is stripped away
6. Finale — "crown weather," crown escape with 4 named gate variants
7. Afterglow — "borrowed dawn," optional postgame descent unlocked after winning (press `p` on the win screen). Doesn't renumber or gate the existing finale — floors 1-6 are untouched.

Each floor reuses the same room templates (gate, bones, hall, pit, idol, crack, vault, beast den) with per-floor variants — the room IDs aren't floor names.

**Camp System**
Between floors, choose one:
- **Temper** — Upgrade a relic
- **Trade** — Swap gold for items
- **Sacrifice** — Remove a curse or downside

**Game Modes**
- **Standard** — Full campaign, default experience
- **Iron** — Beast starts hotter/more aggressive (`wake` mod). Camp still runs between floors like any other mode.
- **Greed** — More relics surface (`rich` mod), but gold costs more
- **Dark** — Weaker flame, faster dread buildup (`thin`, `gloom` mods)
- **Daily** — Fixed shared seed for the day
- **Heavy** — Character class: starts with a lit torch and extra fuel
- **Swift** — Character class: pits never catch you (bypasses the pit-death check)
- **Warded** — Character class: starts with ward already up, holds longer (`grace` mod)

**Sound**
Minimalist Web Audio oscillator beeps (no audio files) driven by the existing `fx` event field — hit, beast, win, relic, ward, floor transitions, and death each get a distinct tone. Mute with `m`.

**Save & Continue**
localStorage save scoped to camp checkpoints (between floors) only — the exact moment a run's item/hazard state is fully derivable from its seed and floor number again, so no fragile mid-floor snapshot is needed. Press `c` on the title screen to continue a saved run. Clears automatically on death or win.

### Design Philosophy

- **No build step, no dependencies.** Two hand-authored files (engine + data), no framework, no bundler. The only real constraint is staying under the 1MB budget and being original work — splitting data out of the engine file is fine and makes the game moddable.
- **DOM-based rendering.** No canvas. Each tile is a `<div>` with CSS classes for state (visible, explored, wall, floor, enemy, item).
- **Authored levels, not procedural.** Floors use hand-authored room templates rather than pure procedural generation. This gives intentional pacing.
- **Atmosphere through theme.** Each floor has its own color palette defined in CSS variables. The dark theme and fog-of-war create tension without graphics.
- **Keyboard-first.** No click interface. Pure keyboard controls for immersion.

---

## Design Philosophy — Across Both Versions

### What unites them

1. **Constraint as creative fuel.** Both versions start from a size budget and let that shape every decision.
2. **Minimalist prose.** The 1KB version proves that "torch burns.dark hugs walls." is enough. The 1MB version extends this to environmental storytelling through room descriptions.
3. **Death is part of the loop.** Both versions embrace frequent death as core to the roguelike experience. The 1KB version makes death a single click away; the 1MB version makes it a genuine loss.
4. **No external dependencies.** Both are fully self-contained. Open in a browser and play.
5. **Terminal aesthetic.** Monospace font, dark background, text-based rendering. The 1KB version is pure hypertext; the 1MB version renders a grid of Unicode/ASCII characters.

### Where they diverge

| Aspect | 1KB | 1MB |
|---|---|---|
| **Interaction model** | Point-and-click (links) | Keyboard (real-time grid movement) |
| **State complexity** | Stateless (URL hash only) | Full game state (dread, torch, gold, relics, floor) |
| **Replayability** | Same rooms every time | 7 floors (6 + postgame) with room variants, 8 modes, daily seed |
| **Depth** | 10 rooms, one path to win | ~50+ rooms across 6-7 floors, branching paths |
| **Learning curve** | Minutes | Hours |
| **Scope** | A proof of concept | A complete game |

---

## Technical Decisions

### Why no canvas?
The DOM-based approach means each tile is a styled `<div>`. This gives free accessibility (screen readers can navigate the grid), CSS animations for free, and no canvas API learning curve. The trade-off is performance at scale — but for a 12x12 grid it's instant.

### Why authored levels?
Pure procedural generation can produce boring or broken layouts. Authored room templates guarantee every room is interesting and solvable. The variety comes from which templates appear on each floor and how they connect.

### Why split into index.html + data.js?
The project's real constraint was never "must be one file" — it's staying under 1MB and being original work. Splitting the data tables (floors, relics, hazards, balance numbers, sound map) into `data.js` and loading it via `<script src>` keeps zero build tooling and zero dependencies (opening `index.html` directly still just works — `<script src>` for a same-directory file loads fine over `file://`, unlike `fetch()`), while making the game directly moddable: edit `data.js`, reload, done. No import/export UI needed.

### Why the 1KB version exists
The 1KB version is not a prototype for the 1MB version. It's a separate artifact that explores a completely different interaction model (hypertext vs. grid movement) under an extreme constraint. It proves that a roguelike can exist in 1 KB of HTML.

---

## Roadmap / Future Directions

### Short-term (what's next)
- [x] **Bug fixes & polish** — Fixed an exit-tile exploit that bypassed the beast-collision death check, and a shadow-twist turn that skipped torch consumption
- [x] **Balance tuning** — Torch/beast/relic constants extracted into named values; fixed a floor-2 beast-enrage precedence bug
- [x] **Mobile support** — On-screen D-pad, shown at ≤780px during play, wired through the existing key handler

### Medium-term
- [x] **More floors** — Optional floor 7 postgame descent, unlocked after winning, doesn't renumber the existing finale
- [x] **More enemies** — Poisoned Effigy: a decoy relic-lookalike hazard, un-telegraphed, kills on touch
- [x] **Sound** — Minimalist Web Audio oscillator beeps driven by the existing fx event field
- [x] **Save system** — localStorage save/continue, scoped to camp checkpoints between floors

### Long-term
- [ ] **Boss fights** — Declined for now; the existing floor-6 finale already serves as the game's climactic set-piece, and a second one risks diluting it
- [x] **Character classes** — Three new starting-kit modes: heavy torch, swift (pits never catch you), warded
- [x] **Mod support** — Game data (floors, relics, hazards, balance) lives in `data.js`, loaded before the engine — edit that file directly to mod the run
- [ ] **Multiplayer?** — Declined; the roadmap text itself already said "probably not"

### The 1KB path
- [ ] **More room layouts** — Alternate paths through the hypertext dungeon
- [ ] **Random elements** — JS-free randomization via CSS animations or pre-rolled variants
- [ ] **The 500-byte challenge** — Can the same concept fit in half the space?

---

## How to Run

```bash
# 1KB version
open /Users/cmc/git/zerolabsco/micro-roguelike/1kb/index.html

# 1MB version
open /Users/cmc/git/zerolabsco/micro-roguelike/1mb/index.html
```

Or just double-click the file in Finder.

---

*Blueprint generated 2026-07-12*
