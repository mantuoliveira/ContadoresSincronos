(function (root) {
  'use strict';
  const bit = (state, i) => (state >> i) & 1;
  const names = ['Qa', 'Qb', 'Qc', 'Qd'];
  const matches = (cube, state) => cube.every((v, i) => v === -1 || v === bit(state, i));
  function minimize(values, n) {
    const ones = values.reduce((mask, v, s) => v === 1 ? mask | (1 << s) : mask, 0);
    if (!ones) return [];
    const candidates = [];
    for (let code = 0; code < 3 ** n; code++) {
      let x = code;
      const cube = Array.from({length:n}, () => { const v = x % 3 - 1; x = Math.floor(x / 3); return v; });
      let cover = 0, invalid = false;
      for (let s = 0; s < values.length; s++) if (matches(cube, s)) {
        if (values[s] === 0) { invalid = true; break; }
        if (values[s] === 1) cover |= 1 << s;
      }
      if (!invalid && cover) candidates.push({cube, cover, literals:cube.filter(v => v !== -1).length});
    }
    const primes = candidates.filter(p => !candidates.some(q => q !== p && q.literals < p.literals && q.cube.every((v, i) => v === -1 || v === p.cube[i])));
    const memo = new Map();
    function solve(remaining) {
      if (!remaining) return {terms:[], literals:0};
      if (memo.has(remaining)) return memo.get(remaining);
      let choices = null;
      for (let s = 0; s < values.length; s++) if (remaining & (1 << s)) {
        const options = primes.filter(p => p.cover & (1 << s));
        if (choices === null || options.length < choices.length) choices = options;
      }
      let best = null;
      for (const p of choices) {
        const tail = solve(remaining & ~p.cover);
        const result = {terms:[p.cube, ...tail.terms], literals:p.literals + tail.literals};
        if (!best || result.terms.length < best.terms.length || (result.terms.length === best.terms.length && result.literals < best.literals)) best = result;
      }
      memo.set(remaining, best);
      return best;
    }
    return solve(ones).terms;
  }
  const evaluate = (terms, state) => Number(terms.some(cube => matches(cube, state)));
  const termText = cube => cube.map((v, i) => v === -1 ? '' : (v === 0 ? '¬' : '') + names[i]).filter(Boolean).join('·') || '1';
  const expression = terms => terms.map(termText).join(' + ') || '0';
  function synthesize(table, n, type) {
    const pins = {D:['D'], JK:['J', 'K'], T:['T']}[type];
    if (!pins) throw new Error('Tipo de flip-flop inválido.');
    const equations = [];
    for (let i = 0; i < n; i++) for (const pin of pins) {
      const values = table.map((row, s) => {
        const next = row[i], q = bit(s, i);
        if (next === -1) return -1;
        if (pin === 'T') return q ^ next;
        if ((pin === 'J' && q === 1) || (pin === 'K' && q === 0)) return -1;
        return pin === 'K' ? 1 - next : next;
      });
      const terms = minimize(values, n);
      equations.push({name:pin + 'abcd'[i], bit:i, pin, values, terms, text:expression(terms)});
    }
    const nextStates = table.map((row, s) => {
      let next = 0;
      for (let i = 0; i < n; i++) {
        const eq = equations.filter(e => e.bit === i);
        const input = evaluate(eq[0].terms, s);
        const value = type === 'D' ? input : type === 'T' ? bit(s, i) ^ input : bit(s, i) ? 1 - evaluate(eq[1].terms, s) : input;
        next |= value << i;
      }
      return next;
    });
    return {equations, nextStates};
  }
  root.CounterLogic = {bit, names, matches, minimize, evaluate, expression, termText, synthesize};
  if (typeof module !== 'undefined') module.exports = root.CounterLogic;
})(typeof globalThis !== 'undefined' ? globalThis : window);
