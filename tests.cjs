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
for (let n = 1; n <= 4; n++) for (const type of ['D','JK']) {
  for (let trial = 0; trial < 200; trial++) {
    const table = Array.from({length:2 ** n}, () => Array.from({length:n}, () => Math.floor(random()*3)-1));
    const result = L.synthesize(table,n,type);
    table.forEach((row,s) => row.forEach((v,i) => { if(v !== -1) assert.equal(L.bit(result.nextStates[s],i),v); }));
    assert.equal(result.equations.length,n*(type === 'D' ? 1 : 2));
  }
  const count = Array.from({length:2 ** n}, (_,s) => Array.from({length:n},(_,i) => L.bit((s+1)%(2**n),i)));
  assert.deepEqual(L.synthesize(count,n,type).nextStates, count.map((_,s)=>(s+1)%(2**n)));
  const free = Array.from({length:2 ** n},()=>Array(n).fill(-1));
  assert.deepEqual(L.synthesize(free,n,type).nextStates,free.map((_,s)=>type === 'D' ? 0 : s));
}
// Exercise the same event handlers as the UI without a browser or dependencies.
const elements = new Map(), registrations = [];
const element = id => { if (!elements.has(id)) elements.set(id,{innerHTML:'',textContent:'',value:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},focus(){}}); return elements.get(id); };
const context = vm.createContext({CounterLogic:L,document:{getElementById:element,querySelector:()=>({focus(){}}),modelContext:{registerTool(tool){registrations.push(tool);}}},window:{addEventListener(){}},AbortController});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
assert.equal(registrations.length,1);
const tool = registrations[0];
assert.equal(tool.name,'configure_counter');
assert.equal(tool.annotations.readOnlyHint,false);
for (let bits=1;bits<=4;bits++) for(const flipFlop of ['D','JK']) {
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
console.log(`OK: ${checked} funções com mínimo conferido por algoritmo independente; 1.600 contadores aleatórios; contagem binária, indiferenças, controles e contrato WebMCP.`);
