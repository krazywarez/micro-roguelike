#!/usr/bin/env node
// Headless playthrough for the 1MB roguelike.
// Usage: node tools/playthrough.js [seedCount] [mode] [gameDir]
//        node tools/playthrough.js --seeds <base36,...> [mode] [gameDir]
//
// Plays full runs through the real engine: floors 1-5 with a camp choice
// between each, the finale (floor 6), then the postgame floor 7. Each floor
// is split into goals (torch, bow, crown + key into the beast den, leave)
// and each goal is a best-first search over real game states (most torch
// first), keeping the best end state per flag combination and backtracking
// when a later goal fails. Every winning
// input sequence is then replayed from a fresh run through key(), the real
// input handler, and must end in a win on floor 7.
"use strict"
const path = require("path")
const vm = require("vm")

const only = process.argv[2] == "--seeds" ? process.argv.splice(2, 2)[1].split(",").map(v => parseInt(v, 36)) : null
const seedCount = only ? only.length : Math.max(1, parseInt(process.argv[2], 10) || 50)
const mode = process.argv[3] || "standard"
const gameDir = process.argv[4] || path.join(__dirname, "..", "1mb")
const ctx = require("./engine").load(gameDir)

vm.runInContext(`
const BOT_ACTS={U:()=>step(0,-1),D:()=>step(0,1),L:()=>step(-1,0),R:()=>step(1,0),".":()=>wait(),t:()=>dropTorch()}
const BOT_KEYS={U:"ArrowUp",D:"ArrowDown",L:"ArrowLeft",R:"ArrowRight",".":".",t:"t"}
const LEG_LIMIT=2000000
let botBudget=0,botDeep=[0,0]
const GOAL_NAMES=["torch","bow","crown and key into the den","leave"]
function botBits(){let b="";for(const k in O)for(const o of O[k])b+=o.on?1:0;return b}
// Position, flags, overlays, and the turn parity and beast only where they act; torch, ward, dread and chase are compared by dominance.
function botKey(){const f=S.flags,d=S.drop;return [S.r,S.x,S.y,dark()&&!f.torch?S.turn&3:"",S.gameState,S.level,!!f.torch,f.ash,f.idol,f.gold,f.crown,f.key,f.mask,f.relic,f.relicPlus,S.r=="e"?S.beast.x+","+S.beast.y:"",d?[d.r,d.x,d.y,d.fuel].join():"",botBits()].join("|")}
function botRes(){return [S.flags.torch,S.flags.ward,-S.dread,-S.chase]}
// Records the state; false when a recorded state with the same key is at least as good in every resource.
function botNew(seen){
  const k=botKey(),v=botRes(),list=seen.get(k)
  if(!list){seen.set(k,[v]);return true}
  if(list.some(o=>o.every((x,i)=>x>=v[i])))return false
  list.push(v);return true
}
function botSnap(){return JSON.stringify(S)+"\\u0000"+botBits()}
function botRestore(p,world){
  R=world.R;O=world.O;V=world.V
  const i=p.lastIndexOf("\\u0000"),b=p.slice(i+1)
  S=JSON.parse(p.slice(0,i))
  let j=0;for(const k in O)for(const o of O[k])o.on=b[j++]=="1"
}
function botFull(){return JSON.stringify({S,R,O,V})}
function botLoad(f){const x=JSON.parse(f);S=x.S;R=x.R;O=x.O;V=x.V}
// Distinct end states by route-relevant flags, keeping the most torch for each.
function botSig(){const f=S.flags;return [S.gameState,S.level,S.r,f.gold,f.mask,f.ward>0,f.relic].join()}
function botLeg(goal,last){
  if(goal())return [[botFull(),""]]
  const world={R,O,V},start=botSnap(),seen=new Map(),buckets=[],ends=new Map()
  const push=(p,path)=>{const t=Math.min(S.flags.torch,63);(buckets[t]=buckets[t]||{h:0,a:[]}).a.push([p,path])}
  botNew(seen);push(start,"")
  let n=0
  for(;;){
    let b=buckets.length-1;while(b>=0&&!(buckets[b]&&buckets[b].h<buckets[b].a.length))b--
    if(b<0||n>=LEG_LIMIT)break
    const bk=buckets[b],[p,path]=bk.a[bk.h];bk.a[bk.h++]=null
    for(const a in BOT_ACTS){
      botRestore(p,world)
      if((a=="."||a=="t")&&S.r!="e")continue
      BOT_ACTS[a]();n++
      if(!S.alive||S.gameState=="dead")continue
      if(!botNew(seen))continue
      // Only the last goal (the escape) may wander the beast den.
      const hit=goal()
      if(!last&&!hit&&S.r=="e")continue
      if(hit){
        const g=botSig(),e=ends.get(g)
        if(!e||S.flags.torch>e[2])ends.set(g,[botFull(),path+a,S.flags.torch])
        continue
      }
      push(botSnap(),path+a)
    }
  }
  botBudget-=n
  botRestore(start,world)
  return [...ends.values()].sort((a,b)=>b[2]-a[2])
}
function botGoals(L){
  const done=()=>S.gameState!="play"||S.level!=L
  return L==6?[done]:[()=>S.flags.torch>0,()=>S.flags.idol,()=>S.flags.crown&&S.flags.key&&(S.r=="e"||!R.e),done]
}
function botSolve(goals,i,cont){
  if(botBudget<0)return null
  if(i==goals.length)return cont()
  const at=[S.level,goals.length==1?3:i];if(at[0]>botDeep[0]||at[0]==botDeep[0]&&at[1]>botDeep[1])botDeep=at
  for(const [f,path] of botLeg(goals[i],i==goals.length-1)){
    botLoad(f)
    const rest=botSolve(goals,i+1,cont)
    if(rest!=null)return path+rest
  }
  return null
}
function botRun(){
  const L=S.level
  return botSolve(botGoals(L),0,()=>{
    if(S.gameState=="win"){
      if(S.level>=7)return ""
      startPostgame()
      const r=botRun()
      return r==null?null:"|p"+r
    }
    if(S.gameState=="camp"){
      const f=botFull()
      for(const c of "1423"){
        botLoad(f);applyCampChoice(c)
        const r=botRun()
        if(r!=null)return "|"+c+r
      }
      return null
    }
    if(S.level==6&&S.gameState=="play")return botRun()
    return null
  })
}
function botPlay(s,mode,budget){
  seed=s;startRun(mode,0);botBudget=budget;botDeep=[0,0]
  const moves=botRun()
  return {moves,left:botBudget,stuck:"floor "+botDeep[0]+" "+GOAL_NAMES[botDeep[1]]}
}
function botReplay(s,mode,moves){
  muted=1
  seed=s;startRun(mode,0)
  for(let i=0;i<moves.length;i++){
    const c=moves[i]
    if(c=="|"){key({key:moves[++i]});continue}
    key({key:BOT_KEYS[c]})
  }
  return {state:S.gameState,level:S.level,turns:moves.replace(/\\|./g,"").length}
}
`, ctx, { filename: "playthrough-bot" })

const seeds = only || JSON.parse(vm.runInContext(
  `JSON.stringify((() => { const r = rng(1), out = []; for (let i = 0; i < ${seedCount}; i++) out.push(Math.floor(r() * 1e9)); return out })())`,
  ctx, { filename: "playthrough-seeds" }))

const t0 = Date.now()
const fails = []
let totalMoves = 0
for (const s of seeds) {
  const res = JSON.parse(vm.runInContext(`JSON.stringify(botPlay(${s}, ${JSON.stringify(mode)}, 30000000))`, ctx))
  if (res.moves == null) {
    fails.push({ seed: s, why: `${res.left < 0 ? "search budget exhausted" : "no winning line found"}, deepest: ${res.stuck}` })
    console.log(`  seed ${s.toString(36)}: NOT WON, ${fails[fails.length - 1].why}`)
    continue
  }
  const rep = JSON.parse(vm.runInContext(`JSON.stringify(botReplay(${s}, ${JSON.stringify(mode)}, ${JSON.stringify(res.moves)}))`, ctx))
  if (rep.state != "win" || rep.level != 7) {
    fails.push({ seed: s, why: `replay ended ${rep.state} on floor ${rep.level}` })
    console.log(`  seed ${s.toString(36)}: NOT WON, ${fails[fails.length - 1].why}`)
    continue
  }
  totalMoves += rep.turns
  console.log(`  seed ${s.toString(36)}: won in ${rep.turns} moves`)
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const won = seeds.length - fails.length
if (fails.length) {
  console.error(`playthrough: ${fails.length}/${seeds.length} ${mode} runs NOT WON (${elapsed}s)`)
  for (const f of fails.slice(0, 20)) console.error(`  seed ${f.seed.toString(36)}: ${f.why}`)
  process.exit(1)
}
console.log(`playthrough: OK — ${won}/${seeds.length} ${mode} runs won floors 1-7 and replayed through key() (avg ${Math.round(totalMoves / won)} moves, ${elapsed}s)`)
