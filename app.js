'use strict';
const L = CounterLogic;
const $ = id => document.getElementById(id);
let n = 3, type = 'JK', selected = 'Ja', selectedTerm = -1, selectedState = 0;
let table = makeExample(n), result;
function makeExample(bits) {
  const count = 2 ** bits, modulo = Math.min(6, count);
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
  $('example').textContent = 'Exemplo módulo ' + Math.min(6, 2 ** n);
  renderTable(); renderEquations(); renderMap(); renderGraph();
}
function renderTable() {
  const cols = indices();
  $('transition-table').innerHTML = `<table><caption class="sr-only">Tabela de estados. Qa é o bit menos significativo.</caption><thead><tr><th rowspan="2" scope="col">Nº</th><th class="group-label" colspan="${n}" scope="colgroup">Estado atual</th><th class="group-label divider" colspan="${n}" scope="colgroup">Próximo estado</th></tr><tr>${cols.map(i => `<th scope="col">${L.names[i]}</th>`).join('')}${cols.map((i, j) => `<th scope="col" class="${j === 0 ? 'divider' : ''}">${L.names[i]}⁺</th>`).join('')}</tr></thead><tbody>${table.map((row, s) => `<tr><td class="decimal">${s}</td>${cols.map(i => `<td>${L.bit(s, i)}</td>`).join('')}${cols.map((i, j) => `<td class="${j === 0 ? 'divider' : ''}"><button class="bit-button ${row[i] === -1 ? 'x' : ''}" data-state="${s}" data-bit="${i}" aria-label="Estado ${s}, próximo ${L.names[i]}: ${row[i] === -1 ? 'X, resolvido como ' + L.bit(result.nextStates[s], i) : row[i]}. Clique para alternar.">${row[i] === -1 ? 'X<sub>' + L.bit(result.nextStates[s], i) + '</sub>' : row[i]}</button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderEquations() {
  $('equations').innerHTML = result.equations.map(e => `<button class="equation ${e.name === selected ? 'active' : ''}" data-equation="${e.name}" aria-pressed="${e.name === selected}"><span class="equation-name">${pinLabel(e.name)} =</span><span class="formula">${e.text}</span></button>`).join('');
  $('map-select').innerHTML = result.equations.map(e => `<option value="${e.name}" ${e.name === selected ? 'selected' : ''}>${e.name}</option>`).join('');
}
function selectEquation(name) { selected = name; selectedTerm = -1; renderEquations(); renderMap(); }
function renderMap() {
  const e = result.equations.find(e => e.name === selected);
  const colBits = Math.ceil(n / 2), rowBits = n - colBits;
  const gray = k => Array.from({length:2 ** k}, (_, i) => i ^ (i >> 1));
  const axis = indices(), rowNames = axis.slice(0, rowBits).map(i => L.names[i]).join(''), colNames = axis.slice(rowBits).map(i => L.names[i]).join('');
  const labels = (v, k) => k ? v.toString(2).padStart(k, '0') : '—';
  $('kmap').innerHTML = `<div class="map-content"><table class="kmap"><caption class="sr-only">Mapa de Karnaugh de ${e.name}, em ordem Gray. Linhas ${rowNames || 'única'}, colunas ${colNames}.</caption><thead><tr><th scope="col">${rowNames ? rowNames + ' ↓' : ''}<br>${colNames} →</th>${gray(colBits).map(c => `<th scope="col">${labels(c, colBits)}</th>`).join('')}</tr></thead><tbody>${gray(rowBits).map(r => `<tr><th scope="row">${labels(r, rowBits)}</th>${gray(colBits).map(c => {
    const s = (r << colBits) | c, dc = e.values[s] === -1;
    const active = selectedTerm >= 0 && e.terms[selectedTerm] && L.matches(e.terms[selectedTerm], s);
    return `<td class="${dc ? 'dc' : ''} ${active ? 'in-group' : ''}" aria-label="Estado ${s}: ${dc ? 'X, resolvido como ' + L.evaluate(e.terms, s) : e.values[s]}"><span class="state-id">${s}</span>${dc ? 'X<sub>' + L.evaluate(e.terms, s) + '</sub>' : e.values[s]}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('groups').innerHTML = e.terms.length ? e.terms.map((t, i) => `<button class="group-button ${selectedTerm === i ? 'active' : ''}" data-term="${i}" aria-pressed="${selectedTerm === i}">${L.termText(t)} <span>· ${2 ** t.filter(v => v === -1).length} cél.</span></button>`).join('') : '<p class="hint">Função constante 0. Nenhum agrupamento necessário.</p>';
}
function renderGraph() {
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
}
$('transition-table').addEventListener('click', event => {
  const button = event.target.closest('[data-state]'); if (!button) return;
  const s = Number(button.dataset.state), i = Number(button.dataset.bit);
  table[s][i] = table[s][i] === 0 ? 1 : table[s][i] === 1 ? -1 : 0;
  selectedTerm = -1; compute();
  document.querySelector(`[data-state="${s}"][data-bit="${i}"]`).focus({preventScroll:true});
});
$('equations').addEventListener('click', event => { const button = event.target.closest('[data-equation]'); if (button) { const name = button.dataset.equation; selectEquation(name); document.querySelector(`[data-equation="${name}"]`).focus({preventScroll:true}); } });
$('map-select').addEventListener('change', event => selectEquation(event.target.value));
$('groups').addEventListener('click', event => { const button = event.target.closest('[data-term]'); if (button) { const i = Number(button.dataset.term); selectedTerm = selectedTerm === i ? -1 : i; renderMap(); document.querySelector(`[data-term="${i}"]`).focus({preventScroll:true}); } });
function chooseNode(event) {
  const node = event.target.closest('[data-node]'); if (!node) return;
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault(); selectedState = Number(node.dataset.node); renderGraph();
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
