// Born 30 · Built 70 (v0.4 §8.6). Never measures anything genetic: the helix counts *built* development only.
import { monthsBetween, num } from './util.js';

export function isShielded(e, idx, b70) {
  const lp = idx.lp.get(e.emp_id);
  const months = monthsBetween(e.role_start_date, idx.asOf);
  const on = b70.shield_enabled !== false;   // Forge toggle: switch the ramp-up / stretch shield off to see what it protects
  return { shielded: on && (months < b70.rampup_months || lp?.on_stretch === 'Y'), monthsInRole: Math.round(months * 10) / 10, onStretch: lp?.on_stretch === 'Y' };
}

// Leadership track (v0.4 §8.6 rule 1): people managers (role flag), anyone flagged in the data
// (Leadership_Profile or meta.leadership_track_ids), and the top three 9-box boxes.
// The 9-box depends on the weights, so it is judged once on standard weights (idx.boxTrack, set in runAll).
export function leadershipReason(e, idx) {
  const role = idx.role.get(e.role_id);
  if (role?.leadership_track === 'Y') return 'People manager';
  if (idx.lp.has(e.emp_id) || (idx.meta.leadership_track_ids || []).includes(e.emp_id)) return 'Flagged for the leadership track';
  if (idx.boxTrack?.has(e.emp_id)) return 'Top-three 9-box box (judged on standard weights)';
  return null;
}
export function isLeadershipTrack(e, idx) {
  return leadershipReason(e, idx) !== null;
}

export function weightsFor(e, idx, b70) {
  const sh = isShielded(e, idx, b70);
  const g = (t) => b70.weights[t].growth;
  if (sh.shielded) {
    return { track: 'rampup', weights: b70.weights.rampup,
      why: sh.onStretch ? `On a stretch assignment: results count less, growth carries ${g('rampup')}%` : `In role ${sh.monthsInRole} months (< ${b70.rampup_months}): ramp-up weights, growth carries ${g('rampup')}%` };
  }
  const lead = leadershipReason(e, idx);
  if (lead) return { track: 'leadership', weights: b70.weights.leadership, why: `Leadership track (${lead.toLowerCase()}): growth carries ${g('leadership')}%` };
  return { track: 'standard', weights: b70.weights.standard, why: `Standard weights: growth carries ${g('standard')}%` };
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
