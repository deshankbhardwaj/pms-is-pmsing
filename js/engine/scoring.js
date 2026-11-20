// Scoring (v0.4 §8.3): KPI → 1-5, OKR 0-1 → rating, gates, Results/Behaviours/Growth composite.
import { clamp, mean, num, round } from './util.js';
import { weightsFor } from './built70.js';

// Strategy DNA switches that change how scores are worked out (data/rules/dna.json).
export function scoringMode(org, dna) {
  const v = (k, d) => num(org?.[k]) ?? d;
  return {
    okr: !dna || v('innovation', 7) >= dna.innovation.okr_scoring_at_least,
    customerBoost: dna && v('customer_intimacy', 5) >= dna.customer_intimacy.boost_at_least ? dna.customer_intimacy.weight_multiplier : 1,
    customerKra: dna?.customer_intimacy.customer_kra || 'Customer',
    strictGates: !!dna && v('risk_appetite', 5) <= dna.risk_appetite.strict_at_most,
  };
}

function linear(kpi, v) {
  const thr = num(kpi.threshold), tgt = num(kpi.target), st = num(kpi.stretch);
  if (thr === null || tgt === null || st === null || thr === tgt || tgt === st) return null;
  const dir = Math.sign(tgt - thr) || 1;      // +1 higher-is-better, -1 lower-is-better
  if ((v - tgt) * dir <= 0) return clamp(1 + (2 * (v - thr)) / (tgt - thr), 1, 3);
  return clamp(3 + (2 * (v - tgt)) / (st - tgt), 3, 5);
}
export function scoreValue(kpi, v, mode = { okr: true }) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  if (kpi.type === 'KR' && mode.okr !== false) {
    const s = v <= 0.7 ? 1 + (v / 0.7) * 2.5 : 3.5 + ((v - 0.7) / 0.3) * 1.5;
    return clamp(s, 1, 5);
  }
  return linear(kpi, v);
}

// One value per KPI for the year: mean of periods for KPIs, latest progress for KRs, all-pass for gates.
// Missing data stays null (never a fail): a gate with no rows is "no data", not "failed".
export function aggregate(kpi, rows) {
  const valid = (rows || []).filter((r) => r.actual !== null && Number.isFinite(r.actual));
  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  if (kpi.type === 'KR') return sorted[sorted.length - 1].actual;
  if (kpi.type === 'Gate') return sorted.every((r) => r.actual >= 1) ? 1 : 0;
  return mean(sorted.map((r) => r.actual));
}

const REL_WEIGHT = { manager: 0.5, peer: 0.2, report: 0.2, customer: 0.1, self: 0 };

export function behaviourScore(rows) {
  if (!rows || !rows.length) return { score: null, byRelationship: {} };
  const byRel = {};
  for (const r of rows) (byRel[r.relationship] ||= []).push(num(r.score));
  let tot = 0, w = 0;
  const out = {};
  for (const [rel, arr] of Object.entries(byRel)) {
    const m = mean(arr.filter((x) => x !== null).map((x) => clamp(x, 1, 5)));
    out[rel] = round(m, 2);
    const wt = REL_WEIGHT[rel] ?? 0.1;
    if (m !== null && wt > 0) { tot += m * wt; w += wt; }
  }
  return { score: w ? tot / w : null, byRelationship: out };
}

export function growthScore(goals) {
  if (!goals || !goals.length) return null;
  const p = mean(goals.map((g) => clamp(num(g.progress_pct) ?? 0, 0, 100)));
  let s = 1 + p / 25;
  if (goals.every((g) => g.feedback_source_id)) s += 0.25;
  return clamp(s, 1, 5);
}

export const RATING_LABELS = { 1: 'Unsatisfactory', 2: 'Developing', 3: 'Solid', 4: 'Strong', 5: 'Outstanding' };

export function gateCap(rules, mode) {
  return mode?.strictGates ? rules.dna.risk_appetite.strict_gate_rating_cap : rules.ranking.gate_fail_rating_cap;
}

export function scoreEmployee(e, idx, rules) {
  const mode = scoringMode(idx.org, rules.dna);
  const kpis = idx.kpisByRole.get(e.role_id) || [];
  const acts = idx.actuals.get(e.emp_id) || new Map();
  const items = [], gates = [], okrFlags = [];
  for (const k of kpis) {
    const rows = acts.get(k.kpi_id) || [];
    const v = aggregate(k, rows);
    if (k.type === 'Gate') {
      const failed = rows.filter((r) => r.actual !== null && r.actual < 1).map((r) => r.period);
      gates.push({ kpi_id: k.kpi_id, name: k.kpi_name, passed: v === null ? null : v === 1, missing: v === null, failedPeriods: failed });
      continue;
    }
    const s = scoreValue(k, v, mode);
    if (k.type === 'KR' && mode.okr && v !== null && v >= 1) okrFlags.push({ kpi_id: k.kpi_id, note: 'Scored 1.0: goal may not have been a stretch' });
    const weight = Math.max(0, num(k.weight_pct) ?? 0);
    const boost = k.kra === mode.customerKra ? mode.customerBoost : 1;
    items.push({ kpi_id: k.kpi_id, name: k.kpi_name, type: k.type, weight, effWeight: weight * boost, boosted: boost !== 1, value: round(v, 2), score: round(s, 2), raw: s });
  }
  // Aggregate from unrounded scores; round only what is shown.
  const wsum = items.reduce((s, i) => s + (i.raw === null ? 0 : i.effWeight), 0);
  const resultsRaw = wsum ? clamp(items.reduce((s, i) => s + (i.raw === null ? 0 : i.raw * i.effWeight), 0) / wsum, 1, 5) : null;
  const beh = behaviourScore(idx.fb.get(e.emp_id));
  const growth = growthScore(idx.devGoals.get(e.emp_id));
  const track = weightsFor(e, idx, rules.built70);
  const parts = [['results', resultsRaw], ['behaviours', beh.score], ['growth', growth]];
  let tot = 0, w = 0;
  for (const [key, val] of parts) if (val !== null && track.weights[key] > 0) { tot += val * track.weights[key]; w += track.weights[key]; }
  const compositeRaw = w ? tot / w : null;
  const gatePassed = gates.every((g) => g.passed !== false);
  const gatesMissing = gates.filter((g) => g.missing).map((g) => g.name);
  let rating = compositeRaw === null ? null : clamp(Math.round(compositeRaw), 1, 5);
  const cap = gateCap(rules, mode);
  const capped = !gatePassed && rating !== null && rating > cap;
  if (capped) rating = cap;
  for (const i of items) delete i.raw;
  return {
    emp_id: e.emp_id, items, gates, gatePassed, gatesMissing, okrFlags,
    results: round(resultsRaw), behaviours: round(beh.score), behaviourByRelationship: beh.byRelationship,
    growth: round(growth), track, composite: round(compositeRaw), compositeRaw, resultsRaw, rating, ratingLabel: RATING_LABELS[rating] || '',
    capped, gateCap: cap, why: capped ? `Gate failed (${gates.filter((g) => g.passed === false).map((g) => g.name).join('; ')}): rating capped at ${cap}` : '',
  };
}
