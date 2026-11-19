// PRISM engine entry point: runAll(data, rules) → everything the screens need.
import { indexData } from './util.js';
import { scoreEmployee } from './scoring.js';
import { isShielded, helix, protectedLearningPct, isLeadershipTrack } from './built70.js';
import { methodBlend } from './methods.js';
import { rankingVerdict } from './ranking.js';
import { rewardsFor, clubTrip, gainsharing, budgetGuard } from './rewards.js';
import { raterBias } from './bias.js';
import { nineBox, tna, kirkpatrick } from './development.js';
import { lens, compare, bottomTierAction } from './country.js';

export function runAll(data, rules, opts = {}) {
  const idx = indexData(data);
  const org = idx.org;
  const people = [...idx.emp.values()].filter((e) => e.role_id !== 'EXE');
  const results = new Map(people.map((e) => [e.emp_id, scoreEmployee(e, idx, rules)]));
  const shielded = new Set(people.filter((e) => isShielded(e, idx, rules.built70).shielded).map((e) => e.emp_id));

  // pools = role x country (or a forced country for the lens)
  const pools = [];
  const poolOf = new Map();
  const groups = new Map();
  for (const e of people) {
    const key = `${e.role_id}|${e.country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const [key, members] of groups) {
    const [roleId, country] = key.split('|');
    const lensCountry = opts.countryOverride || country;
    const v = rankingVerdict({ role: idx.role.get(roleId), country: lensCountry, members, results, shieldedIds: shielded, org, rules });
    v.homeCountry = country;
    v.methods = methodBlend(idx.role.get(roleId), org, rules.methods, v.verdict);
    if (roleId === 'SAL') v.clubTrip = [...clubTrip(members.filter((m) => !shielded.has(m.emp_id)), results, rules)];
    pools.push(v);
    for (const m of members) poolOf.set(m.emp_id, v);
  }
  const rewards = new Map();
  for (const e of people) rewards.set(e.emp_id, rewardsFor(e, results.get(e.emp_id), poolOf.get(e.emp_id)?.tiers[e.emp_id], idx, rules));
  const gain = {};
  for (const mgr of new Set(people.filter((e) => e.role_id === 'ASM').map((e) => e.manager_id))) {
    gain[mgr] = gainsharing(people.filter((e) => e.role_id === 'ASM' && e.manager_id === mgr), results, rules);
  }
  const employees = people.map((e) => {
    const res = results.get(e.emp_id);
    const pool = poolOf.get(e.emp_id);
    const country = opts.countryOverride || e.country;
    const tier = pool?.tiers[e.emp_id] || null;
    return {
      emp: e, title: idx.meta.titles?.[e.emp_id] || idx.role.get(e.role_id)?.title, result: res,
      leadershipTrack: isLeadershipTrack(e, idx), shielded: shielded.has(e.emp_id),
      helix: helix(e, idx, rules.built70), nineBox: nineBox(e, res), tier,
      bottomTierAction: tier?.tier === 'Bottom' ? bottomTierAction(idx, country) : null,
      clubTrip: pool?.clubTrip?.includes(e.emp_id) || false,
      rewards: rewards.get(e.emp_id), tna: tna(e, res, idx, rules),
    };
  });
  return {
    idx, org, asOf: idx.asOf, employees, pools, bias: raterBias(idx), gainsharing: gain,
    budget: { IN: budgetGuard(people.filter((e) => e.country === 'IN'), rewards), CN: budgetGuard(people.filter((e) => e.country === 'CN'), rewards) },
    kirkpatrick: kirkpatrick(idx), protectedLearningPct: protectedLearningPct(org, rules.built70),
    lens: { IN: lens(idx, 'IN'), CN: lens(idx, 'CN') }, compare: compare(idx),
    personas: idx.personas.map((p) => ({ ...p, row: employees.find((x) => x.emp.emp_id === p.emp_id) })),
  };
}

export async function loadRules(base = 'data/rules/') {
  const names = ['methods', 'ranking', 'rewards', 'built70', 'training'];
  const out = {};
  await Promise.all(names.map(async (n) => { out[n] = await (await fetch(`${base}${n}.json`)).json(); }));
  return out;
}
