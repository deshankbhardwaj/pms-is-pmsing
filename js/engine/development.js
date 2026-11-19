// Development (v0.4 §7 M8, §8.5): 9-box, tracks, three-level TNA, Kirkpatrick.
import { mean, num, round } from './util.js';

const BOX = {
  '3-high': ['Star', 'Accelerate'], '3-mid': ['Future star', 'Accelerate'], '3-low': ['Rough diamond', 'Grow'],
  '2-high': ['High performer', 'Accelerate'], '2-mid': ['Core player', 'Grow'], '2-low': ['Inconsistent', 'Stabilise'],
  '1-high': ['Trusted professional', 'Specialist'], '1-mid': ['Effective', 'Grow'], '1-low': ['Under-performer', 'Stabilise'],
};
export function nineBox(e, res) {
  if (!res || res.composite === null) return null;
  const perf = res.capped ? 'low' : res.composite >= 3.75 ? 'high' : res.composite >= 2.5 ? 'mid' : 'low';
  const pot = num(e.potential) || 2;
  const [label, track] = BOX[`${pot}-${perf}`];
  return { performance: perf, potential: pot, label, track, topThree: ['Star', 'Future star', 'High performer'].includes(label) };
}

export function tna(e, res, idx, rules) {
  const T = rules.training;
  const gaps = [];
  for (const i of res?.items || []) if (i.score !== null && i.score < T.gap_score_below) gaps.push({ level: 'person', source: i.name, kpi_id: i.kpi_id, score: i.score, courses: T.kpi_course_map[i.kpi_id] || [] });
  for (const g of res?.gates || []) if (!g.passed) gaps.push({ level: 'person', source: g.name, kpi_id: g.kpi_id, score: null, courses: T.kpi_course_map[g.kpi_id] || [] });
  const fbRows = (idx.fb.get(e.emp_id) || []).filter((r) => r.relationship === 'manager');
  const byComp = {};
  for (const r of fbRows) (byComp[r.comp_id] ||= []).push(Number(r.score));
  for (const [c, arr] of Object.entries(byComp)) if (mean(arr) < T.gap_score_below) gaps.push({ level: 'person', source: idx.competency.get(c)?.name || c, comp_id: c, score: round(mean(arr)), courses: T.competency_course_map[c] || [] });
  const done = new Set((idx.training.get(e.emp_id) || []).filter((t) => t.completed_on).map((t) => t.course_id));
  const assigned = (idx.training.get(e.emp_id) || []).filter((t) => !t.completed_on).map((t) => t.course_id);
  for (const g of gaps) g.courses = g.courses.map((id) => ({ id, name: idx.course.get(id)?.capability, mode: idx.course.get(id)?.mode, gap_type: idx.course.get(id)?.gap_type, status: done.has(id) ? 'done' : assigned.includes(id) ? 'assigned' : 'suggested' }));
  return { gaps, assigned };
}

export function taskLevelTna(role) {
  return { level: 'task', knowledge: role.knowledge, skills: role.skills, abilities: role.abilities, other: role.other };
}

export function kirkpatrick(idx) {
  const by = new Map();
  for (const t of idx.data.Training_Records || []) {
    if (!t.completed_on) continue;
    if (!by.has(t.course_id)) by.set(t.course_id, []);
    by.get(t.course_id).push(t);
  }
  return [...by.entries()].map(([id, rows]) => ({
    course_id: id, name: idx.course.get(id)?.capability, completions: rows.length,
    l1: round(mean(rows.map((r) => num(r.kirkpatrick_l1)).filter((x) => x !== null)), 2),
    l2: round(mean(rows.map((r) => num(r.l2_score)).filter((x) => x !== null)), 1),
    l3Pct: round(rows.filter((r) => r.l3_observed === 'Y').length / rows.length * 100, 0),
    l4Kpi: rows.find((r) => r.l4_kpi_link)?.l4_kpi_link || '',
  })).sort((a, b) => b.completions - a.completions);
}
