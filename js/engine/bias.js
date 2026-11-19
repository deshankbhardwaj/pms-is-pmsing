// Rater-bias detector (v0.4 §7 M9). Uses manager-given behaviour ratings.
import { mean, sd, round } from './util.js';

export function raterBias(idx, minReports = 4) {
  const mgrScores = new Map();
  const all = [];
  for (const e of idx.emp.values()) {
    if (!e.manager_id) continue;
    const rows = (idx.fb.get(e.emp_id) || []).filter((r) => r.relationship === 'manager');
    if (!rows.length) continue;
    const scores = rows.map((r) => Number(r.score));
    const personMean = mean(scores);
    all.push(personMean);
    if (!mgrScores.has(e.manager_id)) mgrScores.set(e.manager_id, []);
    mgrScores.get(e.manager_id).push({ personMean, within: sd(scores) });
  }
  const orgMean = mean(all), orgSd = sd(all);
  const out = [];
  for (const [mgr, arr] of mgrScores) {
    if (arr.length < minReports) continue;
    const m = mean(arr.map((a) => a.personMean)), s = sd(arr.map((a) => a.personMean));
    const within = mean(arr.map((a) => a.within));
    const flags = [];
    if (m > orgMean + 0.5) flags.push({ type: 'leniency', text: `Average ${round(m, 2)} vs company ${round(orgMean, 2)}` });
    if (m < orgMean - 0.5) flags.push({ type: 'severity', text: `Average ${round(m, 2)} vs company ${round(orgMean, 2)}` });
    if (s < 0.4 && !flags.length) flags.push({ type: 'central tendency', text: `Spread ${round(s, 2)} across the team is very narrow` });
    if (within < 0.25) flags.push({ type: 'halo', text: 'Same score on every competency for most people' });
    out.push({ manager_id: mgr, name: idx.emp.get(mgr)?.name, reports: arr.length, mean: round(m, 2), spread: round(s, 2), flags });
  }
  return { orgMean: round(orgMean, 2), orgSpread: round(orgSd, 2), managers: out.sort((a, b) => b.mean - a.mean),
    note: 'Recency bias needs ratings per period; not computed from this data.' };
}
