#!/usr/bin/env node
// Headless solver harness for the 1MB roguelike.
// Usage: node tools/validate.js [seedCount] [gameDir]
//
// Loads the real, unmodified game: evaluates 1mb/data.js and the inline
// engine script from 1mb/index.html inside a stubbed browser environment,
// then sweeps seedCount seeds x floors 1-7 asserting floorSolve() proves
// each full floor completable (gate -> torch -> bow -> vault -> escape
// room -> gate) — the same check the in-game validateSeeds() runs.
"use strict"
const path = require("path")
const vm = require("vm")

const seedCount = Math.max(1, parseInt(process.argv[2], 10) || 200)
const gameDir = process.argv[3] || path.join(__dirname, "..", "1mb")

const ctx = require("./engine").load(gameDir)

// Runs in the same context, so it sees the engine's top-level let/const
// bindings (S, V) and functions (build, pickMods, escapeSolve) directly.
const driver = vm.runInContext(`(function (seeds) {
  const fails = []
  for (const s0 of seeds) {
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      S = { level, mods: pickMods(s0) }
      if (!floorSolve(s0, level)) {
        S = { level, mods: pickMods(s0) }
        build(s0)
        fails.push({ seed: s0, level, escape: V.escape, beast: V.beast, hall: V.hall, pit: V.pit, crack: V.crack, idol: V.idol })
      }
    }
  }
  return JSON.stringify(fails)
})`, ctx, { filename: "validate-driver" })

// Deterministic seed sweep using the game's own rng, same range as rollSeed().
const seedsJson = vm.runInContext(
  `JSON.stringify((() => { const r = rng(1), out = []; for (let i = 0; i < ${seedCount}; i++) out.push(Math.floor(r() * 1e9)); return out })())`,
  ctx, { filename: "validate-seeds" })
const seeds = JSON.parse(seedsJson)

const t0 = Date.now()
const fails = JSON.parse(driver(seeds))
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const checks = seedCount * 7

if (fails.length) {
  console.error(`validate: ${fails.length}/${checks} floors NOT COMPLETABLE (${seedCount} seeds x floors 1-7, ${elapsed}s)`)
  for (const f of fails.slice(0, 20)) {
    console.error(`  seed ${f.seed.toString(36)} floor ${f.level}: escape variant ${f.escape}, beast variant ${f.beast} (hall ${f.hall}, pit ${f.pit}, crack ${f.crack}, idol ${f.idol})`)
  }
  if (fails.length > 20) console.error(`  ... and ${fails.length - 20} more`)
  process.exit(1)
}
console.log(`validate: OK — ${checks} full floors solvable (${seedCount} seeds x floors 1-7, ${elapsed}s)`)

// Every interactable that can appear on floors 1-7 needs a LEGEND line and
// every exit destination a ROOM_NAMES entry. Room d kills on entry, so its
// contents are never shown.
const missing = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  const miss = {}
  for (const s0 of ${seedsJson}) {
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      S = { level, mods: pickMods(s0), flags: {}, drop: null, seen: {} }
      build(s0)
      for (const r in R) {
        if (r[0] == "d") continue
        for (const ch in R[r].ex) if (!ROOM_NAMES[R[r].ex[ch].replace("!", "")[0]]) miss["exit " + r + ":" + ch] = level
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const t = tile(x, y, r)
          if (t != "." && t != "#" && t != ">" && !(t in R[r].ex) && !LEGEND[t]) miss["tile " + t] = level
        }
        if (O.effigies.some(o => o.r == r) && !LEGEND.effigy) miss.effigy = level
      }
    }
  }
  return miss
})())`, ctx, { filename: "validate-legend" }))
const gaps = Object.keys(missing)
if (gaps.length) {
  console.error(`validate: ${gaps.length} interactables without a legend entry: ${gaps.map(g => `${g} (floor ${missing[g]})`).join(", ")}`)
  process.exit(1)
}
console.log("validate: OK — every interactable has a legend entry")
