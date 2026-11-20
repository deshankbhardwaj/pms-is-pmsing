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
    const R = ctx.rules, b = R.built70, rk = R.ranking, D = R.dna || {}, W = R.rewards;
    const o = ctx.out;
    const CYCLE = [['Plan', 'dna', '#ff5a5f'], ['Coach', 'review', '#ff9f43'], ['Assess', 'methods', '#feca57'], ['Review', 'ranking', '#1dd1a1'], ['Reward', 'rewards', '#48dbfb'], ['Develop', 'develop', '#5f7cff'], ['Renew', 'consultant', '#a55eea']];
    const sampleName = ctx.state.sample.Org?.[0]?.org_name || 'VoltBridge Mobility';
    const sample = ctx.isSampleOrg() && ctx.state.baseIsSample !== false;
    const wt = (k) => `${b.weights[k].results}/${b.weights[k].behaviours}/${b.weights[k].growth}`;
    return `
      ${UI.pageHead({ eyebrow: 'M13 · About & Method', title: 'How PRISM works, <em>in plain English.</em>', sub: 'For the evaluator: the cycle, the rules each engine runs, where every part of the brief lives, and the sources.' })}
      <div class="card"><h2 class="h4">The performance cycle (adapted from Aguinis)</h2><div class="cycle">${CYCLE.map(([l, m, c], i) => `<button data-go="${m}" style="--c:${c}"><span>${i + 1}</span>${l}</button>`).join('<i aria-hidden="true">→</i>')}</div>
        <p class="why mt">One core, many lenses: industry → organisation (Strategy DNA) → role → country → employee. Each layer sets defaults for the next; every screen runs the same engine on the same data.</p></div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="s">The rules</h2><p class="why">Read live from the rule files (data/rules/*.json) and the loaded data, so this list changes when they do.</p><ul class="dots">
          <li><b>Scoring.</b> KPIs: threshold = 1, target = 3, stretch = 5, straight-line in between. Key results: scored as OKRs (0.7 = 3.5) when Strategy DNA innovation is ${D.innovation?.okr_scoring_at_least ?? 7} or more, otherwise like KPIs (now: <b>${o.mode?.okr ? 'OKRs' : 'like KPIs'}</b>). Behaviours: 360° weighted manager 50%, peers 20%, reports 20%, customers 10%, self 0%.</li>
          <li><b>Composite.</b> Results / Behaviours / Growth = ${wt('standard')} standard, ${wt('leadership')} leadership track, ${wt('rampup')} in ramp-up. A failed gate caps the rating at ${rk.gate_fail_rating_cap} (at ${D.risk_appetite?.strict_gate_rating_cap ?? 1} when risk appetite is ${D.risk_appetite?.strict_at_most ?? 4} or less). No gate data means no penalty: the gate shows as "no data".</li>
          <li><b>Leadership track.</b> ${esc(b.leadership_track)}. The 9-box is judged on standard weights first, so the track cannot flip itself.</li>
          <li><b>Ranking.</b> Pools under ${rk.min_pool_any_ranking} → absolute standards. Innovation ≥ ${rk.block_if_innovation_at_least} or interdependence ≥ ${rk.block_if_interdependence_at_least ?? rk.block_if_innovation_at_least} → absolute. Measurability ≥ ${rk.measurability_at_least} and pool ≥ ${rk.min_pool_forced_distribution} → forced tiers for rewards; else relative calibration. Pace ≥ ${rk.cutthroat_pace_at_least} → ${rk.tiers_cutthroat.map((t) => t.pct).join('/')} tiers (else ${rk.tiers_default.map((t) => t.pct).join('/')}). The bottom-tier step comes from the Country Lens.</li>
          <li><b>Built-70 shield.</b> Under ${b.rampup_months} months in role (counted to the review date, ${esc(o.asOf)}) or on a stretch assignment → out of ranking pools, ramp-up weights.</li>
          <li><b>Methods.</b> Affinity = bias + Σ coefficient × (trait − 3); top ${R.methods.top_n} blended, rounded to ${R.methods.round_to}%.</li>
          <li><b>Rewards.</b> Bonus = base × target % × company factor (${W.company_factor}) × rating multiplier. Merit from a rating × compa-ratio matrix. Sales: commission, plus a kicker for the top ${W.sales?.kicker_top_pct ?? 20}% who passed the gate. Plant gainsharing: ${o.gainsharing && Object.values(o.gainsharing)[0] ? Object.values(o.gainsharing)[0].sharePct : W.gainsharing?.pool_share_of_savings_pct}% of the saving above standard output. Learning wallet from Reward_Policy, topped up for high potential and training gaps. Budget guard: strict (bonuses rescaled to the pool) when cost focus is ${D.cost_focus?.strict_budget_guard_at_least ?? 8} or more, otherwise a warning.</li>
          <li><b>Rhythm.</b> Pace ${o.cadence.pace} → ${esc(o.cadence.checkins)} check-ins, ${esc(o.cadence.reviews)} reviews, a ${esc(o.cadence.pip_days)} improvement plan in India.</li>
          <li><b>Training.</b> A KPI or competency under ${R.training.gap_score_below} → a training need, matched to a mechanism by gap type.</li>
          <li><b>Helix.</b> 3 grey "born" rungs, never measured. 7 built rungs: up to 5 passport stamps (finished + reflection + feedback source), coaching × 6, one course.</li></ul></div>
        <div class="card"><h2 class="s">Brief coverage</h2><div class="tbl-wrap"><table class="tbl"><tbody>${BRIEF.map(([req, m, where]) => `<tr class="click" data-go="${m}"><td><span class="tick" aria-hidden="true">✓</span></td><td><b>${esc(req)}</b><div class="small muted">${esc(where)}</div></td><td class="small">Open →</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="s">Glossary</h2><dl class="kv">${GLOSS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></div>
        <div class="card"><h2 class="s">References</h2><ol class="refs">${REFS.map((r) => `<li>${esc(r)}</li>`).join('')}</ol><p class="why mt">⚠️ marks items still to verify before submission. Country rows carry their own ✅ / ⚠️ status in the Country Lens.</p></div>
      </div>
      <div class="card mt notice"><h2 class="h4">${sample ? 'Fictional data' : 'Data loaded now'}</h2>
        ${sample ? '' : `<p class="why"><b>${esc(o.org.org_name)}</b> (${esc(ctx.state.source)}): ${o.employees.length} scored people, loaded in this browser from your file. Its names and numbers are yours; PRISM has not changed them.</p>`}
        <p class="why">${sample ? '' : 'The built-in sample, '}${esc(sampleName)}, its ${ctx.state.sample.Employees.length} people, their names and every number are invented for an MDI Gurgaon PGDM-HRM performance management course project. Any resemblance to a real company or person is a coincidence. Money figures are placeholders, not market benchmarks. Built as a static web app (HTML, ES modules, GSAP); nothing is sent to a server. Spec v0.4.</p></div>`;
  },
};
