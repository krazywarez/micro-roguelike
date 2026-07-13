#!/usr/bin/env node
// Headless solver harness for the 1MB roguelike.
// Usage: node tools/validate.js [seedCount] [gameDir]
//
// Loads the real, unmodified game: evaluates 1mb/data.js and the inline
// engine script from 1mb/index.html inside a stubbed browser environment,
// then sweeps seedCount seeds x floors 2-6 asserting escapeSolve() finds a
// path — the same check the in-game validateSeeds() runs.
"use strict"
const fs = require("fs")
const path = require("path")
const vm = require("vm")

const seedCount = Math.max(1, parseInt(process.argv[2], 10) || 200)
const gameDir = process.argv[3] || path.join(__dirname, "..", "1mb")

const html = fs.readFileSync(path.join(gameDir, "index.html"), "utf8")
const dataSrc = fs.readFileSync(path.join(gameDir, "data.js"), "utf8")

// The engine is the inline <script> block that follows the data.js include.
const m = html.match(/<script src=data\.js><\/script>\s*<script>([\s\S]*?)<\/script>/)
if (!m) {
  console.error("validate: could not find the inline engine <script> after the data.js include in index.html")
  process.exit(2)
}
const engineSrc = m[1]

// Minimal inert DOM node — enough surface for the engine's load-time render().
function el() {
  return {
    dataset: {},
    textContent: "",
    innerHTML: "",
    className: "",
    hidden: false,
    appendChild() {},
    onclick: null,
  }
}

const sandbox = {
  document: {
    getElementById: () => el(),
    createElement: () => el(),
  },
  addEventListener() {},
  localStorage: {
    _mem: Object.create(null),
    getItem(k) { return k in this._mem ? this._mem[k] : null },
    setItem(k, v) { this._mem[k] = String(v) },
    removeItem(k) { delete this._mem[k] },
  },
  window: { AudioContext: function () { throw new Error("SFX must not run headless") } },
  console,
}
const ctx = vm.createContext(sandbox)

try {
  vm.runInContext(dataSrc, ctx, { filename: "1mb/data.js" })
  vm.runInContext(engineSrc, ctx, { filename: "1mb/index.html#engine" })
} catch (e) {
  console.error("validate: game code failed to evaluate headless — improve the stubs in this harness, do not touch the game.")
  console.error(e && e.stack || e)
  process.exit(2)
}

// Runs in the same context, so it sees the engine's top-level let/const
// bindings (S, V) and functions (build, pickMods, escapeSolve) directly.
const driver = vm.runInContext(`(function (seeds) {
  const fails = []
  for (const s0 of seeds) {
    for (const level of [2, 3, 4, 5, 6]) {
      S = { level, mods: pickMods(s0) }
      build(s0)
      const p = escapeSolve(level, V.escape, V.beast, level >= 3 ? 8 : 6)
      if (!p) fails.push({ seed: s0, level, escape: V.escape, beast: V.beast, hall: V.hall, pit: V.pit, crack: V.crack })
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
const checks = seedCount * 5

if (fails.length) {
  console.error(`validate: ${fails.length}/${checks} escape rooms UNSOLVABLE (${seedCount} seeds x floors 2-6, ${elapsed}s)`)
  for (const f of fails.slice(0, 20)) {
    console.error(`  seed ${f.seed.toString(36)} floor ${f.level}: escape variant ${f.escape}, beast variant ${f.beast} (hall ${f.hall}, pit ${f.pit}, crack ${f.crack})`)
  }
  if (fails.length > 20) console.error(`  ... and ${fails.length - 20} more`)
  process.exit(1)
}
console.log(`validate: OK — ${checks} escape rooms solvable (${seedCount} seeds x floors 2-6, ${elapsed}s)`)
