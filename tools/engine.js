"use strict"
// Loads the real, unmodified 1MB game into a stubbed browser environment:
// sprites.js, data.js, then the inline engine script from index.html.
// Returns the vm context; engine globals (S, R, O, step, build, ...) live in it.
const fs = require("fs")
const path = require("path")
const vm = require("vm")

function load(gameDir) {
  const html = fs.readFileSync(path.join(gameDir, "index.html"), "utf8")
  const dataSrc = fs.readFileSync(path.join(gameDir, "data.js"), "utf8")
  const spriteSrc = fs.readFileSync(path.join(gameDir, "sprites.js"), "utf8")

  // The engine is the inline <script> block that follows the data.js include.
  const m = html.match(/<script src=data\.js><\/script>\s*<script>([\s\S]*?)<\/script>/)
  if (!m) {
    console.error("engine: could not find the inline engine <script> after the data.js include in index.html")
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
      classList: { toggle() {} },
      insertAdjacentHTML() {},
      insertAdjacentText() {},
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
    vm.runInContext(spriteSrc, ctx, { filename: "1mb/sprites.js" })
    vm.runInContext(dataSrc, ctx, { filename: "1mb/data.js" })
    vm.runInContext(engineSrc, ctx, { filename: "1mb/index.html#engine" })
  } catch (e) {
    console.error("engine: game code failed to evaluate headless — improve the stubs in this harness, do not touch the game.")
    console.error(e && e.stack || e)
    process.exit(2)
  }
  return ctx
}

module.exports = { load }
