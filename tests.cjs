const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const L = require('./logic.js');
let checked = 0;
// Independent dynamic program over all legal product terms (not only primes).
function referenceCost(values, n) {
  const ones = values.map((v,s) => v === 1 ? s : -1).filter(s => s >= 0);
  const cubes = [];
  for (let mask = 0; mask < 1 << n; mask++) for (let val = 0; val < 1 << n; val++) {
    if (val & ~mask) continue;
    if (values.some((v,s) => v === 0 && (s & mask) === val)) continue;
    const cover = ones.reduce((a,s,i) => (s & mask) === val ? a | (1 << i) : a, 0);
    if (cover) cubes.push({cover, cost:100 + mask.toString(2).replace(/0/g,'').length});
  }
  const dp = Array(1 << ones.length).fill(Infinity); dp[0] = 0;
  for (let mask = 0; mask < dp.length; mask++) if (Number.isFinite(dp[mask])) for (const c of cubes) dp[mask | c.cover] = Math.min(dp[mask | c.cover], dp[mask] + c.cost);
  return dp.at(-1);
}
function checkFunction(values,n,optimal) {
  const terms = L.minimize(values,n);
  values.forEach((v,s) => { if (v !== -1) assert.equal(L.evaluate(terms,s),v); });
  if (optimal) assert.equal(terms.length * 100 + terms.flat().filter(v => v !== -1).length, referenceCost(values,n));
  checked++;
}
for (let n = 1; n <= 3; n++) for (let code = 0; code < 3 ** (2 ** n); code++) {
  let x = code;
  checkFunction(Array.from({length:2 ** n}, () => { const v = x % 3 - 1; x = Math.floor(x / 3); return v; }),n,true);
}
let seed = 42017;
const random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
for (let trial = 0; trial < 300; trial++) checkFunction(Array.from({length:16},()=>Math.floor(random()*3)-1),4,true);
for (let n = 1; n <= 4; n++) for (const type of ['D','JK','T']) {
  for (let trial = 0; trial < 200; trial++) {
    const table = Array.from({length:2 ** n}, () => Array.from({length:n}, () => Math.floor(random()*3)-1));
    const result = L.synthesize(table,n,type);
    table.forEach((row,s) => row.forEach((v,i) => { if(v !== -1) assert.equal(L.bit(result.nextStates[s],i),v); }));
    assert.equal(result.equations.length,n*(type === 'JK' ? 2 : 1));
  }
  const count = Array.from({length:2 ** n}, (_,s) => Array.from({length:n},(_,i) => L.bit((s+1)%(2**n),i)));
  assert.deepEqual(L.synthesize(count,n,type).nextStates, count.map((_,s)=>(s+1)%(2**n)));
  const free = Array.from({length:2 ** n},()=>Array(n).fill(-1));
  assert.deepEqual(L.synthesize(free,n,type).nextStates,free.map((_,s)=>type === 'D' ? 0 : s));
}
assert.throws(() => L.synthesize([[0]],1,'SR'), /inválido/);
// Exercise the same event handlers as the UI without a browser or dependencies.
const elements = new Map(), registrations = [];
const timers = new Map(); let timerId = 0;
const element = id => { if (!elements.has(id)) elements.set(id,{innerHTML:'',textContent:'',value:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},focus(){}}); return elements.get(id); };
const context = vm.createContext({CounterLogic:L,document:{getElementById:element,querySelector:()=>({focus(){}}),modelContext:{registerTool(tool){registrations.push(tool);}}},window:{addEventListener(){}},setTimeout(fn,delay){const id=++timerId; timers.set(id,{fn,delay}); return id;},clearTimeout(id){timers.delete(id);},AbortController});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
assert.equal(registrations.length,1);
const tool = registrations[0];
assert.equal(tool.name,'configure_counter');
assert.equal(tool.annotations.readOnlyHint,false);
for (let bits=1;bits<=4;bits++) for(const flipFlop of ['D','JK','T']) {
  const nextBits = Array.from({length:2**bits},(_,s)=>Array.from({length:bits},(_,i)=>L.bit((s+1)%(2**bits),i)));
  const result = tool.execute({bits,flipFlop,nextBits});
  assert.deepEqual(Array.from(result.nextStates),nextBits.map((_,s)=>(s+1)%(2**bits)));
  assert.equal((element('diagram').innerHTML.match(/data-node=/g)||[]).length,2**bits);
  assert.equal((element('transition-table').innerHTML.match(/data-state=/g)||[]).length,2**bits*bits);
}
const before = element('transition-table').innerHTML;
assert.throws(()=>tool.execute({bits:4,flipFlop:'SR',nextBits:[]}));
assert.equal(element('transition-table').innerHTML,before);
tool.execute({bits:1,flipFlop:'D',nextBits:[[0],[0]]});
const fakeButton = {dataset:{state:'0',bit:'0'}};
const click = () => element('transition-table').handlers.click({target:{closest:()=>fakeButton}});
click(); assert.equal(vm.runInContext('table[0][0]',context),1);
click(); assert.equal(vm.runInContext('table[0][0]',context),-1);
click(); assert.equal(vm.runInContext('table[0][0]',context),0);
element('type').handlers.change({target:{value:'JK'}});
assert.equal(vm.runInContext('result.equations.length',context),2);
element('bits').handlers.change({target:{value:'4'}});
element('bits').handlers.change({target:{value:'1'}});
assert.equal(vm.runInContext('table[0][0]',context),0);
// Classroom orientation: rows Qa,Qb and columns Qc,Qd, not binary significance order.
const expectedMaps = {
  1:[[0],[1]],
  2:[[0],[2],[3],[1]],
  3:[[0,4],[2,6],[3,7],[1,5]],
  4:[[0,8,12,4],[2,10,14,6],[3,11,15,7],[1,9,13,5]]
};
for (let bits=1;bits<=4;bits++) {
  const layout = vm.runInContext(`mapLayout(${bits})`,context);
  assert.deepEqual(JSON.parse(JSON.stringify(layout.states)),expectedMaps[bits]);
  const rows=layout.states.length, cols=layout.states[0].length;
  const oneBit = v => v !== 0 && (v & (v-1)) === 0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
    if(rows>1) assert(oneBit(layout.states[r][c]^layout.states[(r+1)%rows][c]));
    if(cols>1) assert(oneBit(layout.states[r][c]^layout.states[r][(c+1)%cols]));
  }
}
for (const flipFlop of ['D','JK','T']) {
  element('bits').handlers.change({target:{value:'4'}});
  element('type').handlers.change({target:{value:flipFlop}});
  element('example').handlers.click();
  assert.match(element('example').textContent,/módulo 10/);
  assert.deepEqual(Array.from(vm.runInContext('result.nextStates.slice(0,10)',context)),[1,2,3,4,5,6,7,8,9,0]);
  assert(vm.runInContext('table.slice(10).every(row => row.every(v => v === -1))',context));
  // Verify every product group for every input, and that a second click clears it.
  const equations = vm.runInContext('result.equations',context);
  for(const e of equations) for(let i=0;i<e.terms.length;i++) {
    const termButton = {dataset:{entry:e.name,equationTerm:String(i)}};
    element('equations').handlers.click({target:{closest:selector => selector === '[data-equation-term]' ? termButton : null}});
    const selectedCells = Array.from(element('kmap').innerHTML.matchAll(/data-map-state="(\d+)" class="[^"]*in-group/g),m=>Number(m[1])).sort((a,b)=>a-b);
    const expected = Array.from({length:16},(_,s)=>s).filter(s=>L.matches(e.terms[i],s));
    assert.deepEqual(selectedCells,expected);
    assert.match(element('groups').innerHTML,new RegExp(`${expected.length} células destacadas`));
    const groupButton={dataset:{term:String(i)}};
    element('groups').handlers.click({target:{closest:()=>groupButton}});
    assert(!element('kmap').innerHTML.includes('in-group'));
    element('groups').handlers.click({target:{closest:()=>groupButton}});
    assert.equal((element('kmap').innerHTML.match(/in-group/g)||[]).length,expected.length);
    // Reset before testing next term so each first click always selects.
    element('groups').handlers.click({target:{closest:()=>groupButton}});
  }
}
// Direct map selection: overlapping groups, clear, and cells outside all groups.
tool.execute({bits:2,flipFlop:'D',nextBits:[[0,0],[1,0],[1,0],[1,0]]});
vm.runInContext("selectEquation('Da')",context);
const unchangedTable = vm.runInContext('JSON.stringify(table)',context);
const mapClick = state => element('kmap').handlers.click({target:{closest:()=>({dataset:{mapCell:String(state)}})}});
mapClick(3); assert.equal(vm.runInContext('selectedTerm',context),0);
mapClick(3); assert.equal(vm.runInContext('selectedTerm',context),1);
assert.equal((element('kmap').innerHTML.match(/in-group/g)||[]).length,2);
mapClick(3); assert.equal(vm.runInContext('selectedTerm',context),-1);
mapClick(1); assert(vm.runInContext('selectedTerm >= 0',context));
mapClick(1); assert.equal(vm.runInContext('selectedTerm',context),-1);
mapClick(0); assert.match(element('groups').innerHTML,/não pertence a nenhum grupo/);
assert.equal(vm.runInContext('JSON.stringify(table)',context),unchangedTable);
// Simulated clock uses the computed sequence, not a numeric increment.
const custom = Array.from({length:16},(_,s)=>Array.from({length:4},(_,i)=>L.bit(({0:10,10:11,11:13,13:15,15:0})[s] ?? s,i)));
tool.execute({bits:4,flipFlop:'D',nextBits:custom});
const chooseState = state => element('diagram').handlers.click({type:'click',target:{closest:()=>({dataset:{node:String(state)}})},preventDefault(){}});
const tick = () => { assert.equal(timers.size,1); const [id,timer]=timers.entries().next().value; timers.delete(id); timer.fn(); };
chooseState(0);
assert.equal(element('display-state').textContent,'0₁₆ · 0₁₀ · 0000₂');
for(const state of [10,11,13,15,0]) { tick(); assert.equal(vm.runInContext('selectedState',context),state); }
element('play-pause').handlers.click(); assert.equal(timers.size,0);
assert.equal(element('clock-status').textContent,'Pausado');
element('clock-step').handlers.click(); assert.equal(vm.runInContext('selectedState',context),10); assert.equal(timers.size,0);
chooseState(13); assert.equal(timers.size,1); assert.match(element('display-state').textContent,/^d/);
tick(); assert.equal(vm.runInContext('selectedState',context),15);
element('clock-speed').handlers.change({target:{value:'500'}}); assert.equal(timers.size,1); assert.equal(timers.values().next().value.delay,500);
const patterns = ['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg','abcefg','cdefg','adef','bcdeg','adefg','aefg'];
for(let state=0;state<16;state++) {
  chooseState(state);
  const lit = Array.from(element('seven-segment').innerHTML.matchAll(/data-segment="([a-g])" class="segment lit"/g),m=>m[1]).sort().join('');
  assert.equal(lit,patterns[state]);
  assert.equal((element('seven-segment').innerHTML.match(/<polygon/g)||[]).length,7);
}
chooseState(14); tick(); assert.equal(vm.runInContext('selectedState',context),14); // self-loop
// A new bit width clamps the current state and schedules only one timer.
element('bits').handlers.change({target:{value:'1'}});
assert(vm.runInContext('selectedState < 2',context)); assert.equal(timers.size,1);
element('play-pause').handlers.click(); assert.equal(timers.size,0);
// Excitation columns follow bit order and each flip-flop's excitation table.
for(let bits=1;bits<=4;bits++) for(const flipFlop of ['D','JK','T']) {
  const nextBits=Array.from({length:2**bits},(_,state)=>Array.from({length:bits},(_,bit)=>(state+bit)%3-1));
  tool.execute({bits,flipFlop,nextBits});
  const cells=Array.from(element('transition-table').innerHTML.matchAll(/data-excitation="([DJKT][a-d])" data-row="(\d+)"[^>]*>(.*?)<\/td>/g));
  const names=Array.from({length:bits},(_,i)=>'abcd'[bits-i-1]).flatMap(letter=>(flipFlop==='JK'?['J','K']:[flipFlop]).map(pin=>pin+letter));
  assert.deepEqual(cells.filter(m=>m[2]==='0').map(m=>m[1]),names);
  assert.equal(cells.length,2**bits*names.length);
  for(const [,name,row,html] of cells) {
    const state=Number(row), bit='abcd'.indexOf(name[1]), q=L.bit(state,bit), next=nextBits[state][bit];
    const expected=next===-1 ? -1 : name[0]==='D' ? next : name[0]==='T' ? q^next : name[0]==='J' ? (q===0?next:-1) : (q===1?1-next:-1);
    if(expected===-1) assert.match(html,/^X<sub>[01]<\/sub>$/); else assert.equal(html,String(expected));
    const eq=vm.runInContext('result.equations',context).find(e=>e.name===name);
    if(expected===-1) assert.equal(Number(html.match(/<sub>([01])/)[1]),L.evaluate(eq.terms,state));
  }
}
for(const [zeroNext,oneNext] of [[0,0],[0,1],[1,0],[1,1]]) {
  tool.execute({bits:1,flipFlop:'JK',nextBits:[[zeroNext],[oneNext]]});
  const values=Object.fromEntries(Array.from(element('transition-table').innerHTML.matchAll(/data-excitation="([JK]a)" data-row="([01])"[^>]*>(.*?)<\/td>/g),m=>[m[1]+m[2],m[3][0]]));
  assert.equal(values.Ja0,String(zeroNext)); assert.equal(values.Ka0,'X');
  assert.equal(values.Ja1,'X'); assert.equal(values.Ka1,String(1-oneNext));
}
for(const [zeroNext,oneNext] of [[0,0],[0,1],[1,0],[1,1]]) {
  tool.execute({bits:1,flipFlop:'T',nextBits:[[zeroNext],[oneNext]]});
  const values=Object.fromEntries(Array.from(element('transition-table').innerHTML.matchAll(/data-excitation="(Ta)" data-row="([01])"[^>]*>(.*?)<\/td>/g),m=>[m[1]+m[2],m[3][0]]));
  assert.equal(values.Ta0,String(zeroNext)); assert.equal(values.Ta1,String(1-oneNext));
}
console.log(`OK: ${checked} funções com mínimo conferido por algoritmo independente; 2.400 contadores aleatórios; contagem binária, indiferenças, controles, grupos do mapa, simulação do clock, 16 dígitos de sete segmentos e contrato WebMCP.`);
