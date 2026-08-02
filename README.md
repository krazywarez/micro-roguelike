# Micro-Roguelike

Two tiny roguelikes, built at two very different size limits. Explore, grab loot, don't die, try to make it out.

Pick one and open it in your browser — no install, no account, nothing to download but the file itself.

---

## 1MB Version — the full game

**[Play it](https://rogue.krz.sh/1mb/)**

A proper dungeon crawl: a 12x12 grid, torches and shadows, a beast that hunts you, and six floors between you and daylight (plus a secret seventh, if you make it out alive).

### Goal
Reach the gate on floor 6 carrying the crown and the key. Survive long enough to use them.

### Controls
| Key | Action |
|---|---|
| Arrow keys / WASD | Move |
| Space or `.` | Wait a turn |
| `t` | Drop your torch |
| `m` | Mute / unmute sound |
| `r` | Restart |
| `c` | Continue a saved run (from the title screen) |

On mobile, an on-screen D-pad appears automatically.

### The basics
- **Torch** — keeps the dark at bay. It burns down over time and can be refueled at braziers.
- **Ward** — a temporary shield. Shrines can raise one for you.
- **Relics** — pick one up for a real edge, with a real cost. Only one at a time.
- **Curses, shades, watchers, leeches** — the ruin's hazards. Learn to read them.
- **The beast** — always out there, always listening. It gets faster the deeper you go.

Between floors, you'll stop at a camp and choose an upgrade for the road ahead. Your progress is saved automatically at each camp, so you can pick up where you left off.

### Game modes
From the title screen, press a number to start:

1. **Standard** — the full campaign, as intended
2. **Iron** — the beast wakes up early
3. **Greed** — richer loot, steeper prices
4. **Dark** — a weaker flame and faster dread
5. **Daily** — everyone gets the same seed today
6. **Heavy** — start with a lit torch and extra fuel
7. **Swift** — pits can't catch you
8. **Warded** — start already shielded

Win once, and a hidden seventh floor opens up — for anyone who isn't done yet.

### Budget & verification
The whole game is the two raw files in `1mb/` — no build step, no minification, ever — and together they must stay under 1,048,576 bytes (1 MiB). `tools/check.sh` is the gate: it prints the byte ledger and proves every escape room stays winnable across hundreds of seeds (ledger history lives in [docs/SIZES.md](docs/SIZES.md)).

```sh
tools/check.sh
```

To run it automatically before each commit: `ln -s ../../tools/pre-commit .git/hooks/pre-commit`

---

## 1KB Version — the hypertext original

**[Play it](https://rogue.krz.sh/1kb/#g)**

The whole game fits in about a kilobyte of HTML. No JavaScript — just links between rooms. Click your way through the ruin: find the torch, dodge the beast, don't reach for the wrong thing.

### Controls
Click the links. That's it.

### Goal
Find the key and the crown, and make it back out through the gate. Die, and you're one click from trying again.

---

*Both versions are free and open source, licensed under the GPLv3 — see [LICENSE](LICENSE).*
