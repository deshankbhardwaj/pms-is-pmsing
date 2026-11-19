// Scoring (v0.4 §8.3): KPI → 1-5, OKR 0-1 → rating, gates, Results/Behaviours/Growth composite.
import { clamp, mean, num, round } from './util.js';
import { weightsFor } from './built70.js';

export function scoreValue(kpi, v) {
  if (v === null) return null;
  if (kpi.type === 'KR') {
    const s = v <= 0.7 ? 1 + (v / 0.7) * 2.5 : 3.5 + ((v - 0.7) / 0.3) * 1.5;
    return clamp(s, 1, 5);
  }
  const thr = num(kpi.threshold), tgt = num(kpi.target), st = num(kpi.stretch);
  const dir = Math.sign(tgt - thr) || Math.sign(st - tgt) || 1;      // +1 higher-is-better, -1 lower-is-better
  if ((v - tgt) * dir <= 0) return clamp(1 + (2 * (v - thr)) / (tgt - thr), 1, 3);
  return clamp(3 + (2 * (v - tgt)) / (st - tgt || 1e-9), 3, 5);
}

// One value per KPI for the year: mean of periods for KPIs, latest progress for KRs, all-pass for gates.
export function aggregate(kpi, rows) {
  if (!rows || !rows.length) return null;
  const sorted = [...rows].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  if (kpi.type === 'KR') return sorted[sorted.length - 1].actual;
  if (kpi.type === 'Gate') return sorted.every((r) => r.actual >= 1) ? 1 : 0;
  return mean(sorted.map((r) => r.actual).filter((x) => x !== null));
}

const REL_WEIGHT = { manager: 0.5, peer: 0.2, report: 0.2, customer: 0.1, self: 0 };

export function behaviourScore(rows) {
  if (!rows || !rows.length) return { score: null, byRelationship: {} };
  const byRel = {};
  for (const r of rows) (byRel[r.relationship] ||= []).push(num(r.score));
  let tot = 0, w = 0;
  const out = {};
  for (const [rel, arr] of Object.entries(byRel)) {
    const m = mean(arr.filter((x) => x !== null));
    out[rel] = round(m, 2);
    const wt = REL_WEIGHT[rel] ?? 0.1;
    if (m !== null && wt > 0) { tot += m * wt; w += wt; }
  }
  return { score: w ? tot / w : null, byRelationship: out };
}

export function growthScore(goals) {
  if (!goals || !goals.length) return null;
  const p = mean(goals.map((g) => num(g.progress_pct) ?? 0));
  let s = 1 + p / 25;
  if (goals.every((g) => g.feedback_source_id)) s += 0.25;
  return clamp(s, 1, 5);
}

export const RATING_LABELS = { 1: 'Unsatisfactory', 2: 'Developing', 3: 'Solid', 4: 'Strong', 5: 'Outstanding' };

export function scoreEmployee(e, idx, rules) {
  const kpis = idx.kpisByRole.get(e.role_id) || [];
  const acts = idx.actuals.get(e.emp_id) || new Map();
  const items = [], gates = [], okrFlags = [];
  for (const k of kpis) {
    const rows = acts.get(k.kpi_id) || [];
    const v = aggregate(k, rows);
    if (k.type === 'Gate') {
      const failed = rows.filter((r) => r.actual < 1).map((r) => r.period);
      gates.push({ kpi_id: k.kpi_id, name: k.kpi_name, passed: v === 1, failedPeriods: failed });
      continue;
    }
    const s = scoreValue(k, v);
    if (k.type === 'KR' && v !== null && v >= 1) okrFlags.push({ kpi_id: k.kpi_id, note: 'Scored 1.0: goal may not have been a stretch' });
    items.push({ kpi_id: k.kpi_id, name: k.kpi_name, type: k.type, weight: num(k.weight_pct), value: round(v, 2), score: round(s, 2) });
  }
  const wsum = items.reduce((s, i) => s + (i.score === null ? 0 : i.weight), 0);
  const results = wsum ? items.reduce((s, i) => s + (i.score === null ? 0 : i.score * i.weight), 0) / wsum : null;
  const beh = behaviourScore(idx.fb.get(e.emp_id));
  const growth = growthScore(idx.devGoals.get(e.emp_id));
  const track = weightsFor(e, idx, rules.built70);
  const parts = [['results', results], ['behaviours', beh.score], ['growth', growth]];
  let tot = 0, w = 0;
  for (const [key, val] of parts) if (val !== null) { tot += val * track.weights[key]; w += track.weights[key]; }
  const composite = w ? tot / w : null;
  const gatePassed = gates.every((g) => g.passed);
  let rating = composite === null ? null : clamp(Math.round(composite), 1, 5);
  const cap = rules.ranking.gate_fail_rating_cap;
  const capped = !gatePassed && rating !== null && rating > cap;
  if (capped) rating = cap;
  return {
    emp_id: e.emp_id, items, gates, gatePassed, okrFlags,
    results: round(results), behaviours: round(beh.score), behaviourByRelationship: beh.byRelationship,
    growth: round(growth), track, composite: round(composite), rating, ratingLabel: RATING_LABELS[rating] || '',
    capped, why: capped ? `Gate failed (${gates.filter((g) => !g.passed).map((g) => g.name).join('; ')}): rating capped at ${cap}` : '',
  };
}
