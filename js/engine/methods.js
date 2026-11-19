// Method Mixer (v0.4 §8.1): traditional vs contemporary blend per role.
import { num } from './util.js';

const DIMS = { M: 'measurability', I: 'interdependence', S: 'standardisation', N: 'innovation', D: 'digital_access', L: 'seniority', R: 'regulatory_criticality', T: 'talent_supply' };

export function methodBlend(role, org, rules, rankingVerdict) {
  const k = ((num(org.pace) ?? 5.5) - 5.5) / 2.25;
  const x = (d) => (d === 'K' ? k : (num(role[DIMS[d]]) ?? 3) - 3);
  const scored = [];
  for (const m of rules.methods) {
    if (m.public_sector_only && org.sector !== 'public') continue;
    if (m.requires_ranking_verdict && ![].concat(m.requires_ranking_verdict).includes(rankingVerdict)) continue;
    let a = m.bias;
    const contrib = [];
    for (const [d, c] of Object.entries(m.coef)) { a += c * x(d); contrib.push({ dim: d, effect: c * x(d) }); }
    scored.push({ id: m.id, name: m.name, family: m.family, affinity: a, why: m.why, drivers: contrib.sort((p, q) => Math.abs(q.effect) - Math.abs(p.effect)).slice(0, 2) });
  }
  const top = scored.filter((s) => s.affinity > 0).sort((a, b) => b.affinity - a.affinity).slice(0, rules.top_n);
  const total = top.reduce((s, t) => s + t.affinity, 0) || 1;
  const step = rules.round_to;
  // largest-remainder rounding to multiples of `step`, summing to 100
  const raw = top.map((t) => (t.affinity / total) * 100 / step);
  const base = raw.map(Math.floor);
  let left = 100 / step - base.reduce((s, v) => s + v, 0);
  raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { base[i]++; left--; } });
  const items = top.map((t, i) => ({ ...t, pct: base[i] * step }));
  const contemporaryPct = items.filter((i) => i.family === 'contemporary').reduce((s, i) => s + i.pct, 0);
  const label = contemporaryPct >= 65 ? 'Contemporary' : contemporaryPct <= 35 ? 'Traditional-heavy' : 'Hybrid';
  return { role_id: role.role_id, items, contemporaryPct, traditionalPct: 100 - contemporaryPct, label, all: scored.sort((a, b) => b.affinity - a.affinity) };
}
