// PRISM engine entry point: runAll(data, rules) → everything the screens need.
import { indexData, num } from './util.js';
import { scoreEmployee, scoringMode } from './scoring.js';
import { isShielded, helix, protectedLearningPct, isLeadershipTrack } from './built70.js';
import { methodBlend } from './methods.js';
import { rankingVerdict } from './ranking.js';
import { rewardsFor, clubTrip, gainsharing, budgetGuard, applyBudgetScale } from './rewards.js';
import { raterBias } from './bias.js';
import { nineBox, tna, kirkpatrick } from './development.js';
import { lens, compare, bottomTierAction } from './country.js';

// Review rhythm and PIP length from the company's pace (dna.json cadence table; one rule for every screen).
export function cadenceFor(org, rules) {
  const pace = num(org?.pace) ?? 5;
  const table = rules.dna?.cadence || [];
  return { pace, ...(table.find((c) => pace >= c.pace_at_least) || table[table.length - 1] || { checkins: 'quarterly', checkins_per_year: 4, reviews: 'annual', pip_days: '90 days' }) };
}

export function runAll(data, rules, opts = {}) {
  const idx = indexData(data);
  const org = idx.org;
  const cadence = cadenceFor(org, rules);
  const people = [...idx.emp.values()].filter((e) => e.role_id !== 'EXE');
  // Leadership track includes the top three 9-box boxes (§8.6 rule 1). The box is judged on standard weights first,
  // then those people are re-scored on leadership weights, so the track cannot flip itself.
  const prelim = new Map(people.map((e) => [e.emp_id, scoreEmployee(e, idx, rules)]));
  idx.boxTrack = new Set(people.filter((e) => prelim.get(e.emp_id).track.track === 'standard' && nineBox(e, prelim.get(e.emp_id))?.topThree).map((e) => e.emp_id));
  const results = new Map(people.map((e) => [e.emp_id, idx.boxTrack.has(e.emp_id) ? scoreEmployee(e, idx, rules) : prelim.get(e.emp_id)]));
  const shielded = new Set(people.filter((e) => isShielded(e, idx, rules.built70).shielded).map((e) => e.emp_id));

  // pools = role x country, or one pool per role across India and China when the rules say "together".
  // (A lens country only changes which country's rules apply, never who is compared with whom.)
  const together = rules.ranking.pool_scope === 'together';
  const pools = [];
  const poolOf = new Map();
  const groups = new Map();
  for (const e of people) {
    const key = `${e.role_id}|${together ? 'ALL' : e.country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const [key, members] of groups) {
    const [roleId, country] = key.split('|');
    const lensCountry = opts.countryOverride || country;
    // a pooled India + China pool has no single bottom-tier step: each person gets their own country's (see below)
    const bt = (c) => bottomTierAction(idx, c, cadence, rules.ranking.bottom_tier_action).text;
    const bottomText = lensCountry === 'ALL' ? `Each person's own country: India → ${bt('IN')}; China → ${bt('CN')}` : bt(lensCountry);
    const v = rankingVerdict({ role: idx.role.get(roleId), country: lensCountry, members, results, shieldedIds: shielded, org, rules, bottomText });
    v.homeCountry = country;
    v.key = key;
    v.countries = [...new Set(members.map((m) => m.country))].sort((a, b) => (a === 'IN' ? -1 : b === 'IN' ? 1 : a.localeCompare(b)));
    v.methods = methodBlend(idx.role.get(roleId), org, rules.methods, v.verdict);
    if (roleId === 'SAL') v.clubTrip = [...clubTrip(members.filter((m) => !shielded.has(m.emp_id)), results, rules)];
    pools.push(v);
    for (const m of members) poolOf.set(m.emp_id, v);
  }
  const needs = new Map(people.map((e) => [e.emp_id, tna(e, results.get(e.emp_id), idx, rules)]));
  const rewards = new Map();
  for (const e of people) rewards.set(e.emp_id, rewardsFor(e, results.get(e.emp_id), poolOf.get(e.emp_id)?.tiers[e.emp_id], idx, rules, { gapCount: needs.get(e.emp_id).gaps.length }));
  // Budget guard per country. Strict (cost focus ≥ threshold): bonuses are scaled so the pool is used exactly.
  const strict = !!rules.dna && (num(org.cost_focus) ?? 0) >= rules.dna.cost_focus.strict_budget_guard_at_least;
  const budget = {};
  for (const c of ['IN', 'CN']) {
    const inC = people.filter((e) => e.country === c);
    const before = budgetGuard(inC, rewards);
    let factor = 1;
    if (strict && before.utilisationPct > 100 && before.paid > 0) {
      factor = before.targetPool / before.paid;
      applyBudgetScale(inC.map((e) => rewards.get(e.emp_id)), factor);
    }
    const after = budgetGuard(inC, rewards);
    budget[c] = { ...after, strict, factor, utilisationBeforePct: before.utilisationPct, paidBefore: before.paid };
  }
  const gain = {};
  for (const mgr of new Set(people.filter((e) => e.role_id === 'ASM').map((e) => e.manager_id))) {
    gain[mgr] = gainsharing(people.filter((e) => e.role_id === 'ASM' && e.manager_id === mgr), results, rules, org);
  }
  const employees = people.map((e) => {
    const res = results.get(e.emp_id);
    const pool = poolOf.get(e.emp_id);
    const country = opts.countryOverride || e.country;
    const tier = pool?.tiers[e.emp_id] || null;
    return {
      emp: e, title: idx.meta.titles?.[e.emp_id] || idx.role.get(e.role_id)?.title, result: res,
      leadershipTrack: isLeadershipTrack(e, idx), shielded: shielded.has(e.emp_id),
      helix: helix(e, idx, rules.built70), nineBox: nineBox(e, res), tier, poolKey: pool?.key || null,
      bottomTierAction: tier?.tier === 'Bottom' ? bottomTierAction(idx, country, cadence, rules.ranking.bottom_tier_action) : null,
      clubTrip: pool?.clubTrip?.includes(e.emp_id) || false,
      rewards: rewards.get(e.emp_id), tna: needs.get(e.emp_id),
    };
  });
  return {
    idx, org, asOf: idx.asOf, employees, pools, bias: raterBias(idx), gainsharing: gain, cadence, mode: scoringMode(org, rules.dna),
    budget,
    kirkpatrick: kirkpatrick(idx), protectedLearningPct: protectedLearningPct(org, rules.built70),
    lens: { IN: lens(idx, 'IN'), CN: lens(idx, 'CN') }, compare: compare(idx),
    personas: idx.personas.map((p) => ({ ...p, row: employees.find((x) => x.emp.emp_id === p.emp_id) })),
  };
}

export async function loadRules(base = 'data/rules/') {
  const names = ['methods', 'ranking', 'rewards', 'built70', 'training', 'dna'];
  const out = {};
  await Promise.all(names.map(async (n) => {
    const r = await fetch(`${base}${n}.json`);
    if (!r.ok) throw new Error(`Could not load ${base}${n}.json (${r.status})`);
    out[n] = await r.json();
  }));
  return out;
}
