// Rewards maths (v0.4 §8.4). Reads the Reward_Policy sheet first, falls back to rules/rewards.json.
import { num, round } from './util.js';

function policyRow(idx, country, grade) {
  return idx.policy.find((p) => p.country === country && p.grade === grade && p.target_bonus_pct !== '');
}
function multiplier(idx, rules, country, rating) {
  const row = idx.policy.find((p) => p.country === country && String(p.rating) === String(rating) && p.multiplier !== '');
  return row ? num(row.multiplier) : rules.rewards.rating_multiplier[String(rating)] ?? 0;
}
function band(compa, rules) {
  return rules.rewards.compa_bands.find((b) => compa <= b.max).band;
}
function meritPct(idx, rules, country, rating, b) {
  const row = idx.policy.find((p) => p.country === country && String(p.rating) === String(rating) && p.compa_band === b);
  if (row) return num(row.merit_pct);
  const grade = idx.policy.find((p) => p.country === country && p.merit_budget_pct !== '');
  return (num(grade?.merit_budget_pct) || 0) * (rules.rewards.merit_multiple[String(rating)]?.[b] ?? 0);
}

export function rewardsFor(e, res, tierInfo, idx, rules) {
  if (!res || res.rating === null) return null;
  const pol = policyRow(idx, e.country, e.grade);
  const base = num(e.base_pay), mid = num(e.pay_range_mid) || base;
  const compa = base / mid;
  const b = band(compa, rules);
  const target = num(pol?.target_bonus_pct) || 0;
  const mult = multiplier(idx, rules, e.country, res.rating);
  const cf = rules.rewards.company_factor;
  const bonus = Math.round(base * (target / 100) * cf * mult);
  const merit = meritPct(idx, rules, e.country, res.rating, b);
  const out = {
    currency: e.currency, base, compa: round(compa, 2), compaBand: b, targetBonusPct: target, multiplier: mult, companyFactor: cf,
    bonus, meritPct: round(merit, 2), newBase: Math.round(base * (1 + merit / 100)), learningWallet: num(pol?.learning_wallet) || 0,
    formula: `${base} × ${target}% × ${cf} × ${mult} = ${bonus}`, extras: [],
  };
  if (e.role_id === 'SAL') {
    const s = rules.rewards.sales;
    const unitsPct = res.items.find((i) => i.kpi_id === 'SAL-01')?.value ?? 0;
    const units = Math.round((s.quarterly_target_units[e.country] * 4 * unitsPct) / 100);
    const commission = units * s.commission_per_unit[e.country];
    const kicker = tierInfo?.tier === 'Top' && res.gatePassed ? Math.round(commission * s.top_tier_kicker_pct_of_commission / 100) : 0;
    out.extras.push({ name: 'Sales commission', amount: commission, detail: `${units} units × ${s.commission_per_unit[e.country]}` });
    if (kicker) out.extras.push({ name: 'Top-tier kicker', amount: kicker, detail: `${s.top_tier_kicker_pct_of_commission}% of commission` });
    if (!res.gatePassed) out.extras.push({ name: 'Top-tier kicker', amount: 0, detail: 'Withheld: fair-selling gate failed' });
    out.extras.push({ name: 'Festive / year-end', amount: null, detail: s.festive_contest[e.country] });
  }
  out.total = out.bonus + out.extras.reduce((s, x) => s + (x.amount || 0), 0);
  return out;
}

export function clubTrip(pool, results, rules) {
  const pct = rules.rewards.sales.club_trip_top_pct;
  const ranked = pool.map((e) => results.get(e.emp_id)).filter((r) => r && r.gatePassed).sort((a, b) => b.composite - a.composite);
  const n = Math.max(1, Math.round((pct / 100) * ranked.length));
  return new Set(ranked.slice(0, n).map((r) => r.emp_id));
}

// Plant gainsharing: share of productivity above standard, split by attendance-adjusted weight.
export function gainsharing(team, results, rules) {
  const out = [];
  const rs = team.map((e) => results.get(e.emp_id)).filter(Boolean);
  const outPct = rs.map((r) => r.items.find((i) => i.kpi_id === 'ASM-01')?.value).filter((v) => v != null);
  const avg = outPct.reduce((s, v) => s + v, 0) / (outPct.length || 1);
  const payroll = team.reduce((s, e) => s + (num(e.base_pay) || 0), 0);
  const savings = Math.max(0, (avg - 100) / 100) * payroll * 0.5;
  const pool = Math.round(savings * rules.rewards.gainsharing.pool_share_of_savings_pct / 100);
  const weights = team.map((e) => (results.get(e.emp_id)?.items.find((i) => i.kpi_id === 'ASM-05')?.value ?? 95) / 100);
  const wsum = weights.reduce((s, w) => s + w, 0) || 1;
  team.forEach((e, i) => out.push({ emp_id: e.emp_id, amount: Math.round(pool * weights[i] / wsum) }));
  return { avgOutputPct: round(avg, 1), pool, perHead: out };
}

export function budgetGuard(employees, rewards) {
  let target = 0, paid = 0;
  for (const e of employees) {
    const r = rewards.get(e.emp_id);
    if (!r) continue;
    target += r.base * r.targetBonusPct / 100;
    paid += r.bonus;
  }
  return { targetPool: Math.round(target), paid: Math.round(paid), utilisationPct: target ? round(paid / target * 100, 1) : 0 };
}
