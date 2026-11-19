// Ranking Decision Engine (v0.4 §8.2): verdict per role x country pool, with gates and the Built-70 shield.
import { num } from './util.js';

export function rankingVerdict({ role, country, members, results, shieldedIds, org, rules }) {
  const R = rules.ranking;
  const steps = [];
  const pool = members.filter((e) => !shieldedIds.has(e.emp_id));
  const n = pool.length;
  const inno = num(role.innovation), inter = num(role.interdependence), meas = num(role.measurability);
  let verdict;
  steps.push({ test: `Pool size ≥ ${R.min_pool_any_ranking}?`, value: `${n} comparable (${members.length - n} shielded)`, pass: n >= R.min_pool_any_ranking });
  if (n < R.min_pool_any_ranking) verdict = 'absolute';
  else {
    const blocked = inno >= R.block_if_innovation_at_least || inter >= R.block_if_interdependence_at_least;
    steps.push({ test: `Innovation ≥ ${R.block_if_innovation_at_least} or interdependence ≥ ${R.block_if_interdependence_at_least}?`, value: `innovation ${inno}, interdependence ${inter}`, pass: !blocked });
    if (blocked) verdict = 'absolute';
    else {
      const ok = meas >= R.measurability_at_least && n >= R.min_pool_forced_distribution;
      steps.push({ test: `Measurability ≥ ${R.measurability_at_least} and pool ≥ ${R.min_pool_forced_distribution}?`, value: `measurability ${meas}, pool ${n}`, pass: ok });
      verdict = ok ? 'forced' : 'relative';
    }
  }
  const reason = {
    absolute: n < R.min_pool_any_ranking ? `Only ${n} comparable people: too few to rank fairly` : 'Ranking would hurt collaboration or risk-taking in this role',
    relative: 'Compare people in calibration, but no fixed quotas',
    forced: 'Individual, measurable work in a large pool: tiers for rewards only',
  }[verdict];
  const cutthroat = num(org.pace) >= R.cutthroat_pace_at_least;
  const tierPlan = cutthroat ? R.tiers_cutthroat : R.tiers_default;
  const tiers = {};
  if (verdict === 'forced') {
    const ranked = pool.map((e) => results.get(e.emp_id)).filter(Boolean).sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));
    const nTop = Math.round((tierPlan[0].pct / 100) * ranked.length);
    const nBottom = Math.round((tierPlan[2].pct / 100) * ranked.length);
    const eligibleTop = ranked.filter((r) => r.gatePassed);
    const topIds = new Set(eligibleTop.slice(0, nTop).map((r) => r.emp_id));
    const bottomIds = new Set(ranked.slice(-nBottom).map((r) => r.emp_id));
    ranked.forEach((r, i) => {
      const t = topIds.has(r.emp_id) ? 'Top' : bottomIds.has(r.emp_id) ? 'Bottom' : 'Core';
      tiers[r.emp_id] = { tier: t, position: i + 1, of: ranked.length, note: !r.gatePassed && i < nTop ? 'Ranked high but failed a gate: kept out of the top tier' : '' };
    });
  }
  return {
    role_id: role.role_id, country, verdict, label: R.verdicts[verdict], reason, steps, poolSize: n, members: members.length,
    shielded: members.filter((e) => shieldedIds.has(e.emp_id)).map((e) => e.emp_id),
    tierPlan: verdict === 'forced' ? tierPlan : null, cutthroat, tiers,
    bottomTierAction: verdict === 'forced' ? R.bottom_tier_action[country] : null,
  };
}
