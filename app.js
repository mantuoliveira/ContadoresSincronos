'use strict';
const L = CounterLogic;
const $ = id => document.getElementById(id);
let n = 3, type = 'JK', selected = 'Ja', selectedTerm = -1, selectedState = 0;
let table = makeExample(n), result;
let clockRunning = true, clockDelay = 1000, clockTimer = null;
function exampleModulo(bits) { return bits === 4 ? 10 : Math.min(6, 2 ** bits); }
function makeExample(bits) {
  const count = 2 ** bits, modulo = exampleModulo(bits);
  return Array.from({length:count}, (_, s) => Array.from({length:bits}, (_, i) => s < modulo ? L.bit((s + 1) % modulo, i) : -1));
}
function binary(s) { return s.toString(2).padStart(n, '0'); }
function indices() { return Array.from({length:n}, (_, i) => n - i - 1); }
function pinLabel(name) { return name[0] + '<sub>' + name[1] + '</sub>'; }
function compute() {
  result = L.synthesize(table, n, type);
  if (!result.equations.some(e => e.name === selected)) selected = result.equations[0].name;
  selectedState = Math.min(selectedState, table.length - 1);
  $('order').textContent = 'Leitura: ' + indices().map(i => L.names[i]).join(' ') + ' (MSB → LSB)';
  $('state-count').textContent = table.length + ' estados';
  $('graph-count').textContent = table.length + ' estados · ' + table.length + ' transições';
  $('example').textContent = 'Exemplo módulo ' + exampleModulo(n) + (n === 4 ? ' · década' : '');
  renderTable(); renderEquations(); renderMap(); renderGraph(); renderDisplay(); scheduleClock();
}
function renderTable() {
  const cols = indices();
  const inputs = cols.flatMap(i => result.equations.filter(e => e.bit === i));
  $('transition-table').innerHTML = `<table class="state-table"><caption class="sr-only">Tabela de estados e entradas de excitação dos flip-flops. Qa é o bit menos significativo. As entradas são calculadas, não editáveis.</caption><thead><tr><th rowspan="2" scope="col">Nº</th><th class="group-label" colspan="${n}" scope="colgroup">Estado atual</th><th class="group-label divider" colspan="${n}" scope="colgroup">Próximo estado</th><th class="group-label divider excitation-heading" colspan="${inputs.length}" scope="colgroup">Entradas dos flip-flops · ${type}</th></tr><tr>${cols.map(i => `<th scope="col">${L.names[i]}</th>`).join('')}${cols.map((i,j) => `<th scope="col" class="${j === 0 ? 'divider' : ''}">${L.names[i]}⁺</th>`).join('')}${inputs.map((e,j) => `<th scope="col" class="excitation-heading ${j === 0 || (type === 'JK' && j % 2 === 0) ? 'divider' : ''}">${pinLabel(e.name)}</th>`).join('')}</tr></thead><tbody>${table.map((row,s) => `<tr><td class="decimal">${s}</td>${cols.map(i => `<td>${L.bit(s,i)}</td>`).join('')}${cols.map((i,j) => `<td class="${j === 0 ? 'divider' : ''}"><button class="bit-button ${row[i] === -1 ? 'x' : ''}" data-state="${s}" data-bit="${i}" aria-label="Estado ${s}, próximo ${L.names[i]}: ${row[i] === -1 ? 'X, resolvido como ' + L.bit(result.nextStates[s],i) : row[i]}. Clique para alternar.">${row[i] === -1 ? 'X<sub>' + L.bit(result.nextStates[s],i) + '</sub>' : row[i]}</button></td>`).join('')}${inputs.map((e,j) => {
    const value = e.values[s], actual = L.evaluate(e.terms,s);
    return `<td class="excitation-cell ${j === 0 || (type === 'JK' && j % 2 === 0) ? 'divider' : ''} ${value === -1 ? 'excitation-dc' : ''}" data-excitation="${e.name}" data-row="${s}" aria-label="Estado ${s}, ${e.name}: ${value === -1 ? 'X, saída da equação ' + actual : value}">${value === -1 ? 'X<sub>' + actual + '</sub>' : value}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
  $('excitation-note').textContent = type === 'JK'
    ? 'JK (J, K): 0 → 0 = (0, X) · 0 → 1 = (1, X) · 1 → 0 = (X, 1) · 1 → 1 = (X, 0).'
    : 'Flip-flop D: a entrada D é igual ao próximo valor de Q.';
}
function renderEquations() {
  $('equations').innerHTML = result.equations.map(e => `<div class="equation ${e.name === selected ? 'active' : ''}" data-equation="${e.name}"><button class="equation-name equation-picker" data-equation="${e.name}" aria-pressed="${e.name === selected}" aria-label="Ver mapa de ${e.name}">${pinLabel(e.name)} =</button><span class="formula">${e.terms.length ? e.terms.map((t,i) => `<button class="formula-term ${e.name === selected && i === selectedTerm ? 'active' : ''}" data-equation-term="${i}" data-entry="${e.name}" aria-pressed="${e.name === selected && i === selectedTerm}" aria-label="Destacar ${L.termText(t)} no mapa de ${e.name}">${L.termText(t)}</button>`).join(' + ') : `<button class="formula-term" data-equation="${e.name}" aria-label="Ver mapa de ${e.name}, constante zero">0</button>`}</span></div>`).join('');
  $('map-select').innerHTML = result.equations.map(e => `<option value="${e.name}" ${e.name === selected ? 'selected' : ''}>${e.name}</option>`).join('');
}
function selectEquation(name) { selected = name; selectedTerm = -1; renderEquations(); renderMap(); }
// Row coordinates are Qa,Qb; column coordinates are Qc,Qd.
// Both axes use Gray order 00,01,11,10; Qa remains the state LSB.
function mapLayout(bits) {
  const gray = k => Array.from({length:2 ** k}, (_,i) => i ^ (i >> 1));
  const rowBits = Math.min(bits,2), colBits = Math.max(bits-2,0);
  const rows = gray(rowBits).map(v => ({a: (v >> (rowBits-1)) & 1, b: rowBits === 2 ? v & 1 : 0}));
  const cols = gray(colBits).map(v => ({c: colBits ? (v >> (colBits-1)) & 1 : 0, d: colBits === 2 ? v & 1 : 0}));
  return {rows,cols,states:rows.map(r => cols.map(c => r.a | (r.b << 1) | (c.c << 2) | (c.d << 3)))};
}
function renderMap(message = '') {
  const e = result.equations.find(e => e.name === selected);
  const {rows,cols,states} = mapLayout(n);
  const activeTerm = selectedTerm >= 0 ? e.terms[selectedTerm] : null;
  const matched = activeTerm ? states.flat().filter(s => L.matches(activeTerm,s)) : [];
  $('kmap').innerHTML = `<div class="map-content"><div class="kmap-frame">
    <span class="map-axis axis-left">Qa</span>${n >= 2 ? '<span class="map-axis axis-right">Qb</span>' : ''}${n >= 3 ? '<span class="map-axis axis-top">Qc</span>' : ''}${n === 4 ? '<span class="map-axis axis-bottom">Qd</span>' : ''}
    <table class="kmap" aria-label="Mapa de Karnaugh de ${e.name}"><caption class="sr-only">Qa à esquerda, ${n >= 2 ? 'Qb à direita, ' : ''}${n >= 3 ? 'Qc acima, ' : ''}${n === 4 ? 'Qd abaixo, ' : ''}em ordem Gray. Os números nas bordas indicam o valor de cada variável.</caption>
    <colgroup><col class="axis-col">${cols.map(() => '<col>').join('')}<col class="axis-col"></colgroup>
    ${n >= 3 ? `<thead><tr><th></th>${cols.map(c => `<th scope="col" aria-label="Qc ${c.c}">${c.c}</th>`).join('')}<th></th></tr></thead>` : ''}
    <tbody>${rows.map((r,ri) => `<tr><th scope="row" aria-label="Qa ${r.a}">${r.a}</th>${cols.map((c,ci) => {
      const state = states[ri][ci], dc = e.values[state] === -1, active = matched.includes(state);
      const groupCount = e.terms.filter(t => L.matches(t,state)).length;
      return `<td data-map-state="${state}" class="${dc ? 'dc' : ''} ${active ? 'in-group' : ''}" aria-label="Estado ${state}: ${dc ? 'X, resolvido como ' + L.evaluate(e.terms,state) : e.values[state]}${active ? ', pertence ao grupo selecionado' : ''}"><button class="map-cell" data-map-cell="${state}" aria-pressed="${active}" aria-label="Estado ${state}, ${groupCount ? groupCount + ' grupo(s). Clique para destacar ou alternar os grupos.' : 'sem grupo nesta expressão.'}"><span class="state-id">${state}</span>${dc ? 'X<sub>' + L.evaluate(e.terms,state) + '</sub>' : e.values[state]}${active ? '<span class="group-check" aria-hidden="true">●</span>' : ''}</button></td>`;
    }).join('')}<th scope="row" aria-label="${n >= 2 ? 'Qb ' + r.b : ''}">${n >= 2 ? r.b : ''}</th></tr>`).join('')}</tbody>
    ${n === 4 ? `<tfoot><tr><th></th>${cols.map(c => `<th scope="col" aria-label="Qd ${c.d}">${c.d}</th>`).join('')}<th></th></tr></tfoot>` : ''}
    </table></div></div>`;
  $('groups').innerHTML = (e.terms.length ? e.terms.map((t,i) => `<button class="group-button ${selectedTerm === i ? 'active' : ''}" data-term="${i}" aria-pressed="${selectedTerm === i}">${L.termText(t)} <span>· ${2 ** t.filter(v => v === -1).length} cél.</span></button>`).join('') : '<p class="hint">Função constante 0. Nenhum agrupamento necessário.</p>') + `<p class="group-status" role="status">${message || (activeTerm ? `${L.termText(activeTerm)}: ${matched.length} células destacadas · estados ${matched.join(', ')}.` : 'Nenhum termo selecionado.')}</p>`;
}
function renderGraph() {
  const focusedNode = document.activeElement?.closest?.('[data-node]')?.dataset.node;
  const count = 2 ** n, cx = 390, cy = 310, radius = count <= 2 ? 135 : 235, nodeRadius = n === 4 ? 26 : 30;
  const points = Array.from({length:count}, (_, s) => { const angle = -Math.PI / 2 + s * 2 * Math.PI / count; return {x:cx + radius * Math.cos(angle), y:cy + radius * Math.sin(angle), angle}; });
  function path(s, t) {
    const a = points[s], b = points[t];
    if (s === t) {
      const ux = Math.cos(a.angle), uy = Math.sin(a.angle), vx = -uy, vy = ux;
      const p = (u, v) => `${a.x + ux * u + vx * v},${a.y + uy * u + vy * v}`;
      return `M ${p(18, -18)} C ${p(86, -65)} ${p(86, 65)} ${p(18, 18)}`;
    }
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const bend = result.nextStates[t] === s ? 45 : 16;
    const mx = (a.x + b.x) / 2 - dy / len * bend, my = (a.y + b.y) / 2 + dx / len * bend;
    const al = Math.hypot(mx - a.x, my - a.y), bl = Math.hypot(mx - b.x, my - b.y);
    return `M ${a.x + (mx-a.x)/al*nodeRadius},${a.y+(my-a.y)/al*nodeRadius} Q ${mx},${my} ${b.x+(mx-b.x)/bl*(nodeRadius+5)},${b.y+(my-b.y)/bl*(nodeRadius+5)}`;
  }
  const edges = result.nextStates.map((t, s) => ({s,t})).sort((a,b) => Number(a.s === selectedState) - Number(b.s === selectedState));
  $('diagram').innerHTML = `<svg viewBox="0 0 780 630" role="group" aria-label="Diagrama de todos os estados. Rótulos binários em ordem ${indices().map(i => L.names[i]).join(', ')}."><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a8bfb4"/></marker><marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#087651"/></marker></defs>${edges.map(({s,t}) => `<path class="edge ${s === selectedState ? 'active' : ''}" d="${path(s,t)}" marker-end="url(#${s === selectedState ? 'arrow-active' : 'arrow'})"/>`).join('')}${points.map((p,s) => `<g class="node ${s === selectedState ? 'active' : ''}" transform="translate(${p.x},${p.y})" tabindex="0" role="button" data-node="${s}" aria-label="Estado ${s}, ${binary(s)}, próximo estado ${result.nextStates[s]}" aria-pressed="${s === selectedState}"><circle r="${nodeRadius}"/><text y="0">${binary(s)}</text><text class="node-id" y="15">${s}</text></g>`).join('')}</svg>`;
  const next = result.nextStates[selectedState];
  $('selected-transition').textContent = `${binary(selectedState)} (${selectedState}) → ${binary(next)} (${next})${selectedState === next ? ' · autoenlace' : ''}`;
  $('transition-list').innerHTML = result.nextStates.map((t,s) => `<span>${binary(s)} → ${binary(t)}</span>`).join('');
  if (focusedNode !== undefined) document.querySelector(`[data-node="${focusedNode}"]`)?.focus({preventScroll:true});
}
// Segment names follow the physical display: a top, then b/c right,
// d bottom, e/f left and g middle. Hex b/d are intentionally lowercase.
const hexDigits = '0123456789AbCdEF';
const segmentMasks = ['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg','abcefg','cdefg','adef','bcdeg','adefg','aefg'];
const segmentShapes = {
  a:'24,10 76,10 84,18 76,26 24,26 16,18',
  b:'80,29 88,21 96,29 96,79 88,87 80,79',
  c:'80,101 88,93 96,101 96,151 88,159 80,151',
  d:'24,154 76,154 84,162 76,170 24,170 16,162',
  e:'4,101 12,93 20,101 20,151 12,159 4,151',
  f:'4,29 12,21 20,29 20,79 12,87 4,79',
  g:'24,82 76,82 84,90 76,98 24,98 16,90'
};
function renderDisplay() {
  const digit = hexDigits[selectedState], mask = segmentMasks[selectedState];
  $('seven-segment').innerHTML = `<svg viewBox="0 0 100 180" role="img" aria-label="Display: ${digit}, estado decimal ${selectedState}">${Object.entries(segmentShapes).map(([name,points]) => `<polygon data-segment="${name}" class="segment ${mask.includes(name) ? 'lit' : ''}" points="${points}"/>`).join('')}</svg>`;
  $('display-state').textContent = `${digit}₁₆ · ${selectedState}₁₀ · ${binary(selectedState)}₂`;
  $('clock-status').textContent = clockRunning ? 'Em execução' : 'Pausado';
  $('play-pause').textContent = clockRunning ? 'Pausar' : 'Continuar';
}
function scheduleClock() {
  if (clockTimer !== null) clearTimeout(clockTimer);
  clockTimer = null;
  if (clockRunning) clockTimer = setTimeout(() => {
    clockTimer = null;
    advanceClock(); scheduleClock();
  }, clockDelay);
}
function advanceClock() {
  selectedState = result.nextStates[selectedState];
  renderGraph(); renderDisplay();
}
$('play-pause').addEventListener('click', () => {
  clockRunning = !clockRunning; renderDisplay(); scheduleClock();
});
$('clock-step').addEventListener('click', () => {
  clockRunning = false; scheduleClock(); advanceClock();
});
$('clock-speed').addEventListener('change', event => {
  const delay = Number(event.target.value);
  if (![500,1000,2000].includes(delay)) return;
  clockDelay = delay; scheduleClock();
});
window.addEventListener('pagehide', () => { if (clockTimer !== null) clearTimeout(clockTimer); clockTimer = null; });
window.addEventListener('pageshow', () => scheduleClock());
$('transition-table').addEventListener('click', event => {
  const button = event.target.closest('[data-state]'); if (!button) return;
  const s = Number(button.dataset.state), i = Number(button.dataset.bit);
  table[s][i] = table[s][i] === 0 ? 1 : table[s][i] === 1 ? -1 : 0;
  selectedTerm = -1; compute();
  document.querySelector(`[data-state="${s}"][data-bit="${i}"]`).focus({preventScroll:true});
});
$('equations').addEventListener('click', event => {
  const term = event.target.closest('[data-equation-term]');
  if (term) {
    const name = term.dataset.entry, i = Number(term.dataset.equationTerm);
    selectedTerm = selected === name && selectedTerm === i ? -1 : i; selected = name;
    renderEquations(); renderMap();
    document.querySelector(`[data-entry="${name}"][data-equation-term="${i}"]`).focus({preventScroll:true});
    return;
  }
  const button = event.target.closest('[data-equation]');
  if (button) { const name = button.dataset.equation; selectEquation(name); document.querySelector(`button[data-equation="${name}"]`).focus({preventScroll:true}); }
});
$('map-select').addEventListener('change', event => selectEquation(event.target.value));
$('groups').addEventListener('click', event => { const button = event.target.closest('[data-term]'); if (button) { const i = Number(button.dataset.term); selectedTerm = selectedTerm === i ? -1 : i; renderEquations(); renderMap(); document.querySelector(`[data-term="${i}"]`).focus({preventScroll:true}); } });
$('kmap').addEventListener('click', event => {
  const cell = event.target.closest('[data-map-cell]'); if (!cell) return;
  const state = Number(cell.dataset.mapCell);
  const equation = result.equations.find(e => e.name === selected);
  const groups = equation.terms.map((term,index) => L.matches(term,state) ? index : -1).filter(index => index >= 0);
  // Cycle overlapping groups, then clear; a single group toggles on/off.
  const next = groups.indexOf(selectedTerm) + 1;
  selectedTerm = next < groups.length ? groups[next] : -1;
  renderEquations();
  renderMap(groups.length ? '' : `O estado ${state} não pertence a nenhum grupo desta expressão.`);
  document.querySelector(`[data-map-cell="${state}"]`).focus({preventScroll:true});
});
function chooseNode(event) {
  const node = event.target.closest('[data-node]'); if (!node) return;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault(); selectedState = Number(node.dataset.node); clockRunning = true;
  renderGraph(); renderDisplay(); scheduleClock();
  document.querySelector(`[data-node="${selectedState}"]`).focus({preventScroll:true});
}
$('diagram').addEventListener('click', chooseNode); $('diagram').addEventListener('keydown', chooseNode);
// Keep one draft for each width so changing the dropdown does not erase an exercise.
const drafts = new Map();
$('bits').addEventListener('change', event => { drafts.set(n, table.map(row => [...row])); n = Number(event.target.value); table = drafts.get(n)?.map(row => [...row]) || makeExample(n); selectedTerm = -1; compute(); });
$('type').addEventListener('change', event => { type = event.target.value; selectedTerm = -1; compute(); });
$('example').addEventListener('click', () => { table = makeExample(n); selectedTerm = -1; compute(); });
$('clear').addEventListener('click', () => { table = Array.from({length:2 ** n}, () => Array(n).fill(-1)); selectedTerm = -1; compute(); });
compute();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try { Promise.resolve(document.modelContext.registerTool({
    name:'configure_counter', title:'Configurar contador síncrono',
    description:'Substitui a tabela visível e calcula equações, mapas e transições. Cada linha usa ordem Qa, Qb, Qc, Qd; -1 representa X.',
    inputSchema:{type:'object', properties:{bits:{type:'integer',minimum:1,maximum:4},flipFlop:{type:'string',enum:['D','JK']},nextBits:{type:'array',items:{type:'array',items:{type:'integer',enum:[-1,0,1]}}}},required:['bits','flipFlop','nextBits'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input) {
      if (!input || !Number.isInteger(input.bits) || input.bits < 1 || input.bits > 4 || !['D','JK'].includes(input.flipFlop) || !Array.isArray(input.nextBits) || input.nextBits.length !== 2 ** input.bits || !input.nextBits.every(row => Array.isArray(row) && row.length === input.bits && row.every(v => [-1,0,1].includes(v)))) throw new Error('Tabela inválida. Informe 2^bits linhas, cada uma com bits valores 0, 1 ou -1.');
      drafts.set(n,table.map(row => [...row])); n = input.bits; type = input.flipFlop; table = input.nextBits.map(row => [...row]); selectedTerm = -1;
      $('bits').value = String(n); $('type').value = type; compute();
      return {equations:result.equations.map(e => ({name:e.name,expression:e.text})),nextStates:result.nextStates};
    }
  }, {signal:lifecycle.signal})).catch(() => {}); } catch (_) { /* Optional browser capability. */ }
  window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
}
