// M9 PMS Consultant: health check (12 questions × 6 dimensions), bias detector, development-room audit, rollout plan, risks, printable report.
import * as UI from '../ui.js';
import { radar } from '../charts.js';
import { isLeadersBuiltKpi } from '../engine/util.js';
const { esc, gsap, RM } = UI;
const LEVELS = ['', 'Ad hoc', 'Basic', 'Defined', 'Managed', 'Optimised'];
const DIMS = ['Strategy alignment', 'Goal quality', 'Fairness', 'Feedback & coaching', 'Development', 'Rewards linkage'];
const REC = {
  'Strategy alignment': 'Re-run the goal cascade each quarter so every KPI still traces to a scorecard objective.',
  'Goal quality': 'Fix weights that do not add to 100 and set threshold / target / stretch for every KPI before the year starts.',
  Fairness: 'Hold calibration before ratings are final and act on every bias flag; keep forced tiers for rewards only.',
  'Feedback & coaching': (ctx) => `Hold the ${ctx.out.cadence.checkins} check-ins the pace calls for (${ctx.out.cadence.checkins_per_year} a year at pace ${ctx.out.cadence.pace}) and train managers on SBI and GROW.`,
  Development: 'Give everyone at least one 70-20-10 goal with a feedback source; evaluate training at L3 and L4.',
  'Rewards linkage': 'Publish the bonus formula and run the budget guard before payouts.',
};

function questions(ctx) {
  const out = ctx.out, emps = out.employees, d = ctx.data;
  const roles = [...ctx.idx.role.keys()].filter((r) => r !== 'EXE');
  const wOk = roles.length ? roles.filter((r) => Math.abs((ctx.idx.kpisByRole.get(r) || []).filter((k) => k.type !== 'Gate').reduce((s, k) => s + (Number(k.weight_pct) || 0), 0) - 100) < 0.01).length / roles.length : 0;
  const scoredK = (d.KPIs || []).filter((k) => k.type !== 'Gate');
  const ord = scoredK.length ? scoredK.filter((k) => { const a = Number(k.threshold), b = Number(k.target), c = Number(k.stretch); return (a < b && b < c) || (a > b && b > c); }).length / scoredK.length : 0;
  const pace = out.cadence.pace, ciTarget = out.cadence.checkins_per_year;
  const ciPer = (d.CheckIns || []).length / (emps.length || 1);
  const multi = emps.filter((r) => Object.keys(r.result.behaviourByRelationship || {}).length >= 3).length / (emps.length || 1);
  const goals = emps.filter((r) => (ctx.idx.devGoals.get(r.emp.emp_id) || []).length).length / (emps.length || 1);
  const l3 = out.kirkpatrick.reduce((s, k) => s + k.l3Pct, 0) / (out.kirkpatrick.length || 1);
  const flagged = out.bias.managers.filter((m) => m.flags.length).length;
  const calibrated = Object.keys(ctx.state.calib).length;
  const overBudget = ['IN', 'CN'].some((c) => out.budget[c].utilisationBeforePct > 100);
  const to5 = (x) => Math.max(1, Math.min(5, Math.round(1 + x * 4)));
  return [
    ['s1', 0, 'Do KPIs trace back to the vision and the scorecard?', 4, 'Cascade exists for every department'],
    ['s2', 0, 'Does the strategy (pace, risk) set the review rhythm and rules?', 5, `Pace ${pace} sets ${out.cadence.checkins} check-ins, tiers and a ${out.cadence.pip_days} PIP`],
    ['g1', 1, 'Do weights add up to 100 for every role?', to5(wOk), `${Math.round(wOk * 100)}% of roles`],
    ['g2', 1, 'Does every KPI have threshold, target and stretch?', to5(ord), `${Math.round(ord * 100)}% of KPIs`],
    ['f1', 2, 'Is forced ranking used only where the pool and the role allow?', 5, `${out.pools.filter((p) => p.verdict === 'forced').length} of ${out.pools.length} pools`],
    ['f2', 2, 'Are rater biases checked and calibrated before ratings are final?', flagged ? (calibrated ? 4 : 2) : 5, `${flagged} manager(s) flagged; ${calibrated ? 'calibration started' : 'not calibrated yet'}`],
    ['c1', 3, 'Do people get regular check-ins?', to5(Math.min(1, ciPer / ciTarget)), `${UI.fmt(ciPer, 1)} per person vs ${ciTarget} expected (${out.cadence.checkins})`],
    ['c2', 3, 'Is feedback collected from several directions (360°)?', to5(multi), `${Math.round(multi * 100)}% have 3+ rater groups`],
    ['d1', 4, 'Does everyone have a development goal?', to5(goals), `${Math.round(goals * 100)}% of people`],
    ['d2', 4, 'Is training checked for behaviour change (Kirkpatrick L3/L4)?', to5(l3 / 100), `${Math.round(l3)}% behaviour observed`],
    ['r1', 5, 'Is pay clearly linked to the rating through a published formula?', 5, 'Bonus and merit formulas shown to employees'],
    ['r2', 5, 'Does the payout stay within the bonus pool?', overBudget ? (out.budget.IN.strict ? 4 : 2) : 5, `IN ${out.budget.IN.utilisationBeforePct}% · CN ${out.budget.CN.utilisationBeforePct}% of the pool before the guard${overBudget && out.budget.IN.strict ? ' (strict guard rescaled the payouts)' : ''}`],
  ];
}

export default {
  nextNote: 'One more lens: the country',
  render(ctx) {
    const qs = questions(ctx);
    const ans = ctx.state.health || {};
    const val = (q) => ans[q[0]] ?? q[3];
    const dim = DIMS.map((d, i) => { const v = qs.filter((q) => q[1] === i).map(val); return v.reduce((s, x) => s + x, 0) / v.length; });
    const maturity = dim.reduce((s, x) => s + x, 0) / dim.length;
    const recs = DIMS.map((d, i) => [d, dim[i]]).filter(([, v]) => v < 4).sort((a, b) => a[1] - b[1]);
    const bias = ctx.out.bias;
    const mgrs = [...new Set(ctx.out.employees.map((r) => r.emp.manager_id).filter(Boolean))].map((id) => {
      const team = ctx.out.employees.filter((r) => r.emp.manager_id === id);
      if (team.length < 3) return null;
      const m = ctx.row(id);
      const withGoals = team.filter((r) => (ctx.idx.devGoals.get(r.emp.emp_id) || []).length).length / team.length;
      const shielded = team.filter((r) => r.shielded).length;
      const lb = m?.result.items.find((i) => isLeadersBuiltKpi({ kpi_id: i.kpi_id, kpi_name: i.name }))?.score ?? null;
      const flags = [];
      if (withGoals < 0.5) flags.push('few growth goals');
      if (lb !== null && lb <= 1.8) flags.push('low "leaders built"');
      if (team.length >= 10 && shielded === 0 && !team.some((r) => ctx.idx.lp.get(r.emp.emp_id)?.on_stretch === 'Y')) flags.push('no one on a stretch');
      return { id, name: ctx.idx.emp.get(id)?.name, n: team.length, withGoals, shielded, lb, flags };
    }).filter(Boolean).sort((a, b) => b.flags.length - a.flags.length || b.n - a.n);
    const sample = ctx.isSampleOrg();
    const GANTT = [[sample ? 'Pilot: Pune assembly + Shenzhen R&D' : 'Pilot: one plant team + one R&D team', 0, 4, '#e0a800', 'Awareness'], ['Train raters (SBI, GROW, bias)', 2, 4, '#ff9f43', 'Knowledge'], ['Launch to all sites', 6, 2, '#1dab84', 'Desire'], ['First check-in cycle', 7, 5, '#20b8e0', 'Ability'], ['Calibration round', 11, 2, '#5f7cff', 'Ability'], ['Review, adjust, communicate', 13, 3, '#a78bfa', 'Reinforcement']];
    const RISKS = [
      ['Managers inflate ratings', 'H', 'M', 'Bias detector + calibration board before ratings are final'],
      ['Forced ranking seen as unfair', 'M', 'H', 'Only where the engine allows; tiers for rewards, never exits'],
      ['China: low rank used as an exit ground', 'M', 'H', 'Training or reassignment first (Guiding Case 18); legal review'],
      ['Sales gaming (fake bookings)', 'M', 'H', 'Fair-selling gate caps the rating and the kicker'],
      ['Cutthroat pace burns people out', 'H', 'M', 'Hours guardrail; protected learning time never below 1%'],
      ['Employee data crosses borders', 'M', 'M', 'In-browser by default; DPDP / PIPL checks before any server'],
    ];
    const chip = (x) => `<span class="tag ${x === 'H' ? 'bad' : x === 'M' ? 'warn' : 'good'}">${x}</span>`;
    return `
      ${UI.pageHead({ eyebrow: 'M9 · PMS Consultant', title: 'A second opinion <em>on the whole system.</em>', sub: `Answers are pre-filled from ${esc(ctx.out.org.org_name || 'the loaded')} data; click any score to change it. The radar, maturity level and recommendations update, and the page prints as a consultant's report.` })}
      <div class="row no-print mb"><button class="btn" id="printBtn">🖨 Print the consultant's report</button><span class="why">Uses your browser's Print → Save as PDF.</span></div>
      <div class="grid g12">
        <div class="card" style="text-align:center"><h2 class="h4">PMS maturity</h2><div class="mat"><b>${UI.counter(maturity, { dec: 1 })}</b><span>/ 5 · ${esc(LEVELS[Math.round(maturity)])}</span></div>
          <div id="hcRadar">${radar(DIMS.map((d, i) => ({ label: d.split(' ')[0], value: dim[i] })), { max: 5, color: '#e0457b', size: 290, second: DIMS.map(() => 4), secondColor: '#8d91a6' })}</div>
          <div class="legend" style="justify-content:center"><span><i style="background:#e0457b"></i>${esc(ctx.out.org.org_name || 'This organisation')}</span><span><i style="background:#8d91a6"></i>Target (4)</span></div></div>
        <div class="card"><h2 class="h4">Health check · 12 questions</h2><div class="hc">${qs.map((q) => `<div class="hq"><div><small>${esc(DIMS[q[1]])}</small><b id="hq-${q[0]}">${esc(q[2])}</b><span class="muted small">${esc(q[4])}</span></div><div class="seg sm" role="group" aria-labelledby="hq-${q[0]}">${[1, 2, 3, 4, 5].map((v) => `<button class="${v === val(q) ? 'on' : ''}" data-q="${q[0]}" data-v="${v}" aria-pressed="${v === val(q)}" aria-label="Score ${v}">${v}</button>`).join('')}</div></div>`).join('')}</div></div>
      </div>
      <div class="card mt"><h2 class="s">Recommendations</h2>${recs.length ? `<ol class="recs">${recs.map(([d, v]) => `<li><b>${esc(d)} (${UI.fmt(v, 1)})</b> ${esc(typeof REC[d] === 'function' ? REC[d](ctx) : REC[d])}</li>`).join('')}</ol>` : '<p class="why">Every dimension is at 4 or above. Keep calibrating each cycle.</p>'}</div>
      <div class="grid g2 mt print-break">
        <div class="card"><h2 class="s">Rater-bias detector</h2><p class="why">Company average of manager-given scores: <b>${bias.orgMean}</b> (spread ${bias.orgSpread}). Managers with 4+ reports. Executives are listed but have no profile of their own.</p>
          <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th scope="col">Manager</th><th scope="col">Team</th><th scope="col">Avg</th><th scope="col">Spread</th><th scope="col">Flags</th></tr></thead><tbody>
          ${bias.managers.map((m) => `<tr${ctx.row(m.manager_id) ? ` class="click" data-person="${esc(m.manager_id)}"` : ''}><td><b>${esc(m.name || m.manager_id)}</b>${ctx.row(m.manager_id) ? '' : ' <span class="muted small">(executive)</span>'}</td><td>${m.reports}</td><td>${m.mean}</td><td>${m.spread}</td><td>${m.flags.map((f) => `<span class="tag bad wob" title="${esc(f.text)}">⚑ ${esc(f.type)}</span>`).join(' ') || '<span class="tag good">ok</span>'}</td></tr>`).join('')}</tbody></table></div>
          <p class="why mt">Checks leniency, severity, central tendency and halo. ${esc(bias.note)}</p></div>
        <div class="card"><h2 class="s">Development-room audit</h2><p class="why">Does each team leave room to grow?</p>
          <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th scope="col">Manager</th><th scope="col">Team</th><th scope="col">With goals</th><th scope="col">Shielded</th><th scope="col">Leaders built</th><th scope="col">Flags</th></tr></thead><tbody>
          ${mgrs.slice(0, 12).map((m) => `<tr${ctx.row(m.id) ? ` class="click" data-person="${esc(m.id)}"` : ''}><td><b>${esc(m.name || m.id)}</b>${ctx.row(m.id) ? '' : ' <span class="muted small">(executive)</span>'}</td><td>${m.n}</td><td>${Math.round(m.withGoals * 100)}%</td><td>${m.shielded}</td><td>${m.lb === null ? '—' : UI.fmt(m.lb, 1)}</td><td>${m.flags.map((f) => `<span class="tag warn wob">${esc(f)}</span>`).join(' ') || '<span class="tag good">ok</span>'}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div class="card mt print-break"><h2 class="s">Rollout plan · 16 weeks (ADKAR lens)</h2><div class="tbl-wrap"><div class="gantt" id="gantt">
        <div></div><div class="weeks">${Array.from({ length: 16 }, (_, i) => `<span>W${i + 1}</span>`).join('')}</div>
        ${GANTT.map(([l, s, w, c, a]) => `<div><b>${esc(l)}</b></div><div class="gtrack"><div class="gb" style="--gc:${c};margin-left:${(s / 16) * 100}%;width:${(w / 16) * 100}%" title="Weeks ${s + 1}–${s + w}">${esc(a)}</div></div>`).join('')}</div></div>
        <p class="why mt">Kotter's advice applies too: a guiding coalition (${sample ? 'plant heads in Pune and Changsha' : 'the heads of the pilot sites'}), quick wins from the pilot, and anchoring the new rules in standing orders (India) and through democratic consultation (China).</p></div>
      <div class="card mt"><h2 class="s">Risk register</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Risk</th><th scope="col">Likelihood</th><th scope="col">Impact</th><th scope="col">Mitigation in PRISM</th></tr></thead><tbody>
        ${RISKS.map(([r, l, i, m]) => `<tr><td><b>${esc(r)}</b></td><td>${chip(l)}</td><td>${chip(i)}</td><td class="small">${esc(m)}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  mount(root, ctx, { soft }) {
    root.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      ctx.state.health = { ...(ctx.state.health || {}), [b.dataset.q]: Number(b.dataset.v) };
      ctx.markDirty();
      ctx.rerender();
    }));
    root.querySelector('#printBtn').addEventListener('click', () => window.print());
    if (RM || soft) return;
    gsap.from(root.querySelectorAll('.wob'), { rotation: -8, scale: 0.6, opacity: 0, duration: 0.6, ease: 'elastic.out(1,0.4)', stagger: 0.05, delay: 0.5 });
    gsap.from(root.querySelectorAll('.gb'), { scaleX: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.4 });
  },
};
