// M13 About & Method: how it works, the rules in plain English, brief coverage, glossary, references, fictional-data notice.
import * as UI from '../ui.js';
const { esc } = UI;
const BRIEF = [
  ['KPIs, job analysis, JD and parameters', 'jobs', 'Job Architecture Studio + KPI & OKR Library'],
  ['Traditional vs contemporary appraisal tools, per role and sector', 'methods', 'Method Mixer'],
  ['Rewards & recognition, and how they are delivered', 'rewards', 'Rewards & Recognition (calculator, delivery planner, wall)'],
  ['Performance, and how to deliver it', 'review', 'Review & Delivery (check-ins, conversations, calibration)'],
  ['Consulting & planning on performance', 'consultant', 'PMS Consultant (health check, bias, rollout, risks)'],
  ['Development plan tied to the vision', 'develop', 'Development Studio (9-box, IDP, capability map)'],
  ['Room for development: 30% born, 70% built', 'forge', 'Leadership Forge + growth weight in every scorecard'],
  ['Training mechanisms', 'develop', 'Training Engine: three-level TNA → mechanism → Kirkpatrick'],
  ['Forced ranking: yes or no, per role', 'ranking', 'Ranking Decision Engine'],
  ['Vision and mission drive the decisions (cutthroat → faster)', 'dna', 'Strategy DNA'],
  ['India vs China, as an editable country PMS', 'lens', 'Country Lens (off / compare / built-in) + top-bar toggle'],
  ['A central PMS with smaller PMSs per industry', 'overview', 'One core, many lenses: industry presets (EV built first)'],
  ['An online app with no presenter', 'overview', 'Guided tour, "why" lines on every screen, this page'],
  ['Sample organisation and data ingestion', 'data', 'VoltBridge sample + Excel template + Data Hub'],
];
const GLOSS = [
  ['KRA', 'Key result area: a broad area of the job (e.g. Quality).'], ['KPI', 'Key performance indicator: a measured result with threshold, target and stretch.'],
  ['OKR', 'Objectives and key results: ambitious goals where 0.7 counts as success.'], ['Gate', 'A pass/fail compliance check. Fail it and the rating is capped.'],
  ['BARS', 'Behaviourally anchored rating scale: each score has a concrete example.'], ['Calibration', 'Managers compare ratings across teams to make them consistent.'],
  ['Compa-ratio', 'Pay divided by the midpoint of the pay range.'], ['9-box', 'Performance × potential grid used to choose a development track.'],
  ['TNA', 'Training needs analysis at organisation, task and person level.'], ['70-20-10', 'Development mix: experience, exposure (coaching), education.'],
  ['Gainsharing', 'A team shares part of the savings when it beats standard.'], ['PIP', 'Performance improvement plan.'],
];
const REFS = [
  'Aguinis, H. (2019). Performance management (4th ed.). Chicago Business Press. ⚠️ edition to confirm',
  'Arvey, R. D., Rotundo, M., Johnson, W., Zhang, Z., & McGue, M. (2006). The determinants of leadership role occupancy: Genetic and personality factors. The Leadership Quarterly, 17(1), 1–20.',
  'Arvey, R. D., Zhang, Z., Avolio, B. J., & Krueger, R. F. (2007). Developmental and genetic determinants of leadership role occupancy among women. Journal of Applied Psychology, 92(3), 693–706.',
  'Charan, R., Drotter, S., & Noel, J. (2001). The leadership pipeline. Jossey-Bass.',
  'DeRue, D. S., & Wellman, N. (2009). Developing leaders via experience. Journal of Applied Psychology, 94(4), 859–875.',
  'Kirkpatrick, D. L., & Kirkpatrick, J. D. (2006). Evaluating training programs: The four levels (3rd ed.). Berrett-Koehler.',
  'McCall, M. W., Lombardo, M. M., & Morrison, A. M. (1988). The lessons of experience. Lexington Books.',
  'McGehee, W., & Thayer, P. W. (1961). Training in business and industry. Wiley.',
  'Meyer, H. H., Kay, E., & French, J. R. P. (1965). Split roles in performance appraisal. Harvard Business Review, 43(1), 123–129.',
  "O'Boyle, E., & Aguinis, H. (2012). The best and the rest: Revisiting the norm of normality of individual performance. Personnel Psychology, 65(1), 79–119.",
  'Supreme People\'s Court of China. (2013). Guiding Case No. 18: ZTE (Hangzhou) Co., Ltd. v. Wang Peng, labour contract dispute. ⚠️ confirm the English case title',
];

export default {
  nextNote: 'Back to the start',
  render(ctx) {
    const R = ctx.rules, b = R.built70, rk = R.ranking;
    const CYCLE = [['Plan', 'dna', '#ff5a5f'], ['Coach', 'review', '#ff9f43'], ['Assess', 'methods', '#feca57'], ['Review', 'ranking', '#1dd1a1'], ['Reward', 'rewards', '#48dbfb'], ['Develop', 'develop', '#5f7cff'], ['Renew', 'consultant', '#a55eea']];
    return `
      ${UI.pageHead({ eyebrow: 'M13 · About & Method', title: 'How PRISM works, <em>in plain English.</em>', sub: 'For the evaluator: the cycle, the rules each engine runs, where every part of the brief lives, and the sources.' })}
      <div class="card"><h4>The performance cycle (adapted from Aguinis)</h4><div class="cycle">${CYCLE.map(([l, m, c], i) => `<button data-go="${m}" style="--c:${c}"><span>${i + 1}</span>${l}</button>`).join('<i>→</i>')}</div>
        <p class="why mt">One core, many lenses: industry → organisation (Strategy DNA) → role → country → employee. Each layer sets defaults for the next; every screen runs the same engine on the same data.</p></div>
      <div class="grid g2 mt">
        <div class="card"><h3 class="s">The rules</h3><ul class="dots">
          <li><b>Scoring.</b> KPIs: threshold = 1, target = 3, stretch = 5. OKR key results: 0.7 = 3.5. Behaviours: 360° weighted manager 50%, peers 20%, reports 20%, customers 10%, self 0%.</li>
          <li><b>Composite.</b> Results / Behaviours / Growth = ${b.weights.standard.results}/${b.weights.standard.behaviours}/${b.weights.standard.growth} standard, ${b.weights.leadership.results}/${b.weights.leadership.behaviours}/${b.weights.leadership.growth} leadership track, ${b.weights.rampup.results}/${b.weights.rampup.behaviours}/${b.weights.rampup.growth} in ramp-up. A failed gate caps the rating at ${rk.gate_fail_rating_cap}.</li>
          <li><b>Ranking.</b> Pools under ${rk.min_pool_any_ranking} → absolute standards. Innovation or interdependence ≥ ${rk.block_if_innovation_at_least} → absolute. Measurability ≥ ${rk.measurability_at_least} and pool ≥ ${rk.min_pool_forced_distribution} → forced tiers for rewards; else relative calibration. Pace ≥ ${rk.cutthroat_pace_at_least} → ${rk.tiers_cutthroat.map((t) => t.pct).join('/')} tiers.</li>
          <li><b>Built-70 shield.</b> Under ${b.rampup_months} months in role or on a stretch assignment → out of ranking pools, ramp-up weights.</li>
          <li><b>Methods.</b> Affinity = bias + Σ coefficient × (trait − 3); top ${R.methods.top_n} blended, rounded to ${R.methods.round_to}%.</li>
          <li><b>Rewards.</b> Bonus = base × target % × company factor × rating multiplier. Merit from a rating × compa-ratio matrix. Sales: commission + top-tier kicker after the gate.</li>
          <li><b>Training.</b> A KPI or competency under ${R.training.gap_score_below} → a training need, matched to a mechanism by gap type.</li>
          <li><b>Helix.</b> 3 grey "born" rungs, never measured. 7 built rungs: up to 5 passport stamps (finished + reflection + feedback source), coaching × 6, one course.</li></ul></div>
        <div class="card"><h3 class="s">Brief coverage</h3><table class="tbl"><tbody>${BRIEF.map(([req, m, where]) => `<tr class="click" data-go="${m}"><td><span class="tick">✓</span></td><td><b>${esc(req)}</b><div class="small muted">${esc(where)}</div></td><td class="small">Open →</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><h3 class="s">Glossary</h3><div class="kv">${GLOSS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</div></div>
        <div class="card"><h3 class="s">References</h3><ol class="refs">${REFS.map((r) => `<li>${esc(r)}</li>`).join('')}</ol><p class="why mt">⚠️ marks items still to verify before submission. Country rows carry their own ✅ / ⚠️ status in the Country Lens.</p></div>
      </div>
      <div class="card mt notice"><h4>Fictional data</h4><p class="why">VoltBridge Mobility, its ${ctx.state.sample.Employees.length} people, their names and every number are invented for an MDI Gurgaon PGDM-HRM performance management course project. Any resemblance to a real company or person is a coincidence. Money figures are placeholders, not market benchmarks. Built as a static web app (HTML, ES modules, GSAP); nothing is sent to a server. Spec v0.4.</p></div>`;
  },
};
