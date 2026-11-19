// Born 30 · Built 70 (v0.4 §8.6). Never measures anything genetic: the helix counts *built* development only.
import { monthsBetween, num } from './util.js';

export function isShielded(e, idx, b70) {
  const lp = idx.lp.get(e.emp_id);
  const months = monthsBetween(e.role_start_date, idx.asOf);
  const on = b70.shield_enabled !== false;   // Forge toggle: switch the ramp-up / stretch shield off to see what it protects
  return { shielded: on && (months < b70.rampup_months || lp?.on_stretch === 'Y'), monthsInRole: Math.round(months * 10) / 10, onStretch: lp?.on_stretch === 'Y' };
}

export function isLeadershipTrack(e, idx) {
  const role = idx.role.get(e.role_id);
  return role?.leadership_track === 'Y' || idx.lp.has(e.emp_id) || (idx.meta.leadership_track_ids || []).includes(e.emp_id);
}

export function weightsFor(e, idx, b70) {
  const sh = isShielded(e, idx, b70);
  if (sh.shielded) {
    return { track: 'rampup', weights: b70.weights.rampup,
      why: sh.onStretch ? 'On a stretch assignment: results count less, growth counts more' : `In role ${sh.monthsInRole} months (< ${b70.rampup_months}): ramp-up weights` };
  }
  if (isLeadershipTrack(e, idx)) return { track: 'leadership', weights: b70.weights.leadership, why: 'Leadership track: growth carries 20%' };
  return { track: 'standard', weights: b70.weights.standard, why: 'Standard weights: growth still carries 10%' };
}

export function helix(e, idx, b70) {
  const h = b70.helix;
  const needFb = b70.stamp_needs_feedback !== false;   // Forge toggle: stretch + feedback pairing
  const ok = (x) => x.status === 'done' && x.reflection_logged === 'Y' && (!needFb || x.feedback_source_id);
  const exps = (idx.experiences.get(e.emp_id) || []).filter(ok);
  const seen = new Set();
  const stamps = [];
  for (const x of exps.sort((a, b) => String(a.end).localeCompare(String(b.end)))) {
    if (seen.has(x.experience_type)) continue;
    seen.add(x.experience_type);
    stamps.push({ type: x.experience_type, label: b70.passport_experiences[x.experience_type] || x.experience_type, date: x.end, kind: 'experience' });
  }
  const expRungs = Math.min(h.experience_rungs, stamps.length);
  const coaching = (idx.checkins.get(e.emp_id) || []).filter((c) => c.type === 'coaching');
  const coachRung = coaching.length >= h.coaching_sessions_for_rung ? 1 : 0;
  const courses = (idx.training.get(e.emp_id) || []).filter((t) => t.completed_on);
  const learnRung = courses.length >= h.courses_for_rung ? 1 : 0;
  const rungs = [];
  stamps.slice(0, expRungs).forEach((s) => rungs.push({ ...s, bucket: 70 }));
  if (coachRung) rungs.push({ kind: 'coaching', label: `Coaching × ${coaching.length}`, date: coaching.map((c) => c.date).sort().at(-1), bucket: 20 });
  if (learnRung) {
    const c = courses.sort((a, b) => String(a.completed_on).localeCompare(String(b.completed_on))).at(-1);
    rungs.push({ kind: 'learning', label: idx.course.get(c.course_id)?.capability || c.course_id, date: c.completed_on, bucket: 10 });
  }
  return {
    born: h.born_rungs, built: rungs.length, max: h.built_rungs, builtPct: rungs.length * 10, rungs: rungs.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    missingForStamp: (idx.experiences.get(e.emp_id) || []).filter((x) => !ok(x))
      .map((x) => ({ type: x.experience_type, label: b70.passport_experiences[x.experience_type] || x.experience_type, missing: [x.status !== 'done' && 'not finished', x.reflection_logged !== 'Y' && 'no reflection', needFb && !x.feedback_source_id && 'no feedback source'].filter(Boolean) })),
    experiences: (idx.experiences.get(e.emp_id) || []).map((x) => ({ ...x, label: b70.passport_experiences[x.experience_type] || x.experience_type, stamped: ok(x) })),
  };
}

export function protectedLearningPct(org, b70) {
  const p = b70.protected_learning_pct;
  return num(org.pace) >= p.when_pace_at_least ? Math.max(p.reduced_to, p.never_below) : p.default;
}
