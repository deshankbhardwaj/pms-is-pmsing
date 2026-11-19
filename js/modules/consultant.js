// M9 PMS Consultant: health check (12 questions × 6 dimensions), bias detector, development-room audit, rollout plan, risks, printable report.
import * as UI from '../ui.js';
import { radar } from '../charts.js';
const { esc, gsap, RM } = UI;
const LEVELS = ['', 'Ad hoc', 'Basic', 'Defined', 'Managed', 'Optimised'];
const DIMS = ['Strategy alignment', 'Goal quality', 'Fairness', 'Feedback & coaching', 'Development', 'Rewards linkage'];
const REC = {
  'Strategy alignment': 'Re-run the goal cascade each quarter so every KPI still traces to a scorecard objective.',
  'Goal quality': 'Fix weights that do not add to 100 and set threshold / target / stretch for every KPI before the year starts.',
  Fairness: 'Hold calibration before ratings are final and act on every bias flag; keep forced tiers for rewards only.',
  'Feedback & coaching': 'Move to monthly check-ins (pace 9) and train managers on SBI and GROW.',
  Development: 'Give everyone at least one 70-20-10 goal with a feedback source; evaluate training at L3 and L4.',
  'Rewards linkage': 'Publish the bonus formula and run the budget guard before payouts.',
};

function questions(ctx) {
  const out = ctx.out, emps = out.employees, d = ctx.data;
  const roles = [...ctx.idx.role.keys()].filter((r) => r !== 'EXE');
  const wOk = roles.filter((r) => (ctx.idx.kpisByRole.get(r) || []).filter((k) => k.type !== 'Gate').reduce((s, k) => s + Number(k.weight_pct), 0) === 100).length / roles.length;
  const ord = d.KPIs.filter((k) => k.type !== 'Gate').filter((k) => { const a = Number(k.threshold), b = Number(k.target), c = Number(k.stretch); return (a < b && b < c) || (a > b && b > c); }).length / d.KPIs.filter((k) => k.type !== 'Gate').length;
  const pace = Number(out.org.pace), ciTarget = pace >= 8 ? 12 : 4;
  const ciPer = d.CheckIns.length / emps.length;
  const multi = emps.filter((r) => Object.keys(r.result.behaviourByRelationship || {}).length >= 3).length / emps.length;
  const goals = emps.filter((r) => (ctx.idx.devGoals.get(r.emp.emp_id) || []).length).length / emps.length;
  const l3 = out.kirkpatrick.reduce((s, k) => s + k.l3Pct, 0) / (out.kirkpatrick.length || 1);
  const flagged = out.bias.managers.filter((m) => m.flags.length).length;
  const calibrated = Object.keys(ctx.state.calib).length;
  const overBudget = ['IN', 'CN'].some((c) => out.budget[c].utilisationPct > 100);
  const to5 = (x) => Math.max(1, Math.min(5, Math.round(1 + x * 4)));
  return [
    ['s1', 0, 'Do KPIs trace back to the vision and the scorecard?', 4, 'Cascade exists for every department'],
    ['s2', 0, 'Does the strategy (pace, risk) set the review rhythm and rules?', 5, `Pace ${pace} drives check-ins, tiers and PIP length`],
    ['g1', 1, 'Do weights add up to 100 for every role?', to5(wOk), `${Math.round(wOk * 100)}% of roles`],
    ['g2', 1, 'Does every KPI have threshold, target and stretch?', to5(ord), `${Math.round(ord * 100)}% of KPIs`],
    ['f1', 2, 'Is forced ranking used only where the pool and the role allow?', 5, `${out.pools.filter((p) => p.verdict === 'forced').length} of ${out.pools.length} pools`],
    ['f2', 2, 'Are rater biases checked and calibrated before ratings are final?', flagged ? (calibrated ? 4 : 2) : 5, `${flagged} manager(s) flagged; ${calibrated ? 'calibration started' : 'not calibrated yet'}`],
    ['c1', 3, 'Do people get regular check-ins?', to5(Math.min(1, ciPer / ciTarget)), `${UI.fmt(ciPer, 1)} per person vs ${ciTarget} expected`],
    ['c2', 3, 'Is feedback collected from several directions (360°)?', to5(multi), `${Math.round(multi * 100)}% have 3+ rater groups`],
    ['d1', 4, 'Does everyone have a development goal?', to5(goals), `${Math.round(goals * 100)}% of people`],
    ['d2', 4, 'Is training checked for behaviour change (Kirkpatrick L3/L4)?', to5(l3 / 100), `${Math.round(l3)}% behaviour observed`],
    ['r1', 5, 'Is pay clearly linked to the rating through a published formula?', 5, 'Bonus and merit formulas shown to employees'],
    ['r2', 5, 'Does the payout stay within the bonus pool?', overBudget ? 2 : 5, `IN ${out.budget.IN.utilisationPct}% · CN ${out.budget.CN.utilisationPct}% used`],
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
      const lb = m?.result.items.find((i) => i.kpi_id === 'PLM-03')?.score ?? null;
      const flags = [];
      if (withGoals < 0.5) flags.push('few growth goals');
      if (lb !== null && lb <= 1.8) flags.push('low "leaders built"');
      if (team.length >= 10 && shielded === 0 && !team.some((r) => ctx.idx.lp.get(r.emp.emp_id)?.on_stretch === 'Y')) flags.push('no one on a stretch');
      return { id, name: ctx.idx.emp.get(id)?.name, n: team.length, withGoals, shielded, lb, flags };
    }).filter(Boolean).sort((a, b) => b.flags.length - a.flags.length || b.n - a.n);
    const GANTT = [['Pilot: Pune assembly + Shenzhen R&D', 0, 4, '#e0a800', 'Awareness'], ['Train raters (SBI, GROW, bias)', 2, 4, '#ff9f43', 'Knowledge'], ['Launch to all sites', 6, 2, '#1dab84', 'Desire'], ['First check-in cycle', 7, 5, '#20b8e0', 'Ability'], ['Calibration round', 11, 2, '#5f7cff', 'Ability'], ['Review, adjust, communicate', 13, 3, '#8b5cf6', 'Reinforcement']];
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
      ${UI.pageHead({ eyebrow: 'M9 · PMS Consultant', title: 'A second opinion <em>on the whole system.</em>', sub: 'Answers are pre-filled from VoltBridge\'s data; click any score to change it. The radar, maturity level and recommendations update, and the whole page prints as a one-page consultant\'s report.' })}
      <div class="row no-print mb"><button class="btn" id="printBtn">🖨 Print the consultant's report</button><span class="why">Uses your browser's Print → Save as PDF.</span></div>
      <div class="grid g12">
        <div class="card" style="text-align:center"><h4>PMS maturity</h4><div class="mat"><b>${UI.counter(maturity, { dec: 1 })}</b><span>/ 5 · ${esc(LEVELS[Math.round(maturity)])}</span></div>
          <div id="hcRadar">${radar(DIMS.map((d, i) => ({ label: d.split(' ')[0], value: dim[i] })), { max: 5, color: '#e0457b', size: 290, second: DIMS.map(() => 4), secondColor: '#8d91a6' })}</div>
          <div class="legend" style="justify-content:center"><span><i style="background:#e0457b"></i>VoltBridge</span><span><i style="background:#8d91a6"></i>Target (4)</span></div></div>
        <div class="card"><h4>Health check · 12 questions</h4><div class="hc">${qs.map((q) => `<div class="hq"><div><small>${esc(DIMS[q[1]])}</small><b>${esc(q[2])}</b><span class="muted small">${esc(q[4])}</span></div><div class="seg sm">${[1, 2, 3, 4, 5].map((v) => `<button class="${v === val(q) ? 'on' : ''}" data-q="${q[0]}" data-v="${v}">${v}</button>`).join('')}</div></div>`).join('')}</div></div>
      </div>
      <div class="card mt"><h3 class="s">Recommendations</h3>${recs.length ? `<ol class="recs">${recs.map(([d, v]) => `<li><b>${esc(d)} (${UI.fmt(v, 1)})</b> ${esc(REC[d])}</li>`).join('')}</ol>` : '<p class="why">Every dimension is at 4 or above. Keep calibrating each cycle.</p>'}</div>
      <div class="grid g2 mt">
        <div class="card"><h3 class="s">Rater-bias detector</h3><p class="why">Company average of manager-given scores: <b>${bias.orgMean}</b> (spread ${bias.orgSpread}). Managers with ${4}+ reports.</p>
          <table class="tbl mt"><thead><tr><th>Manager</th><th>Team</th><th>Avg</th><th>Spread</th><th>Flags</th></tr></thead><tbody>
          ${bias.managers.map((m) => `<tr class="click" data-person="${m.manager_id}"><td><b>${esc(m.name)}</b></td><td>${m.reports}</td><td>${m.mean}</td><td>${m.spread}</td><td>${m.flags.map((f) => `<span class="tag bad wob" title="${esc(f.text)}">⚑ ${esc(f.type)}</span>`).join(' ') || '<span class="tag good">ok</span>'}</td></tr>`).join('')}</tbody></table>
          <p class="why mt">Checks leniency, severity, central tendency and halo. ${esc(bias.note)}</p></div>
        <div class="card"><h3 class="s">Development-room audit</h3><p class="why">Does each team leave room to grow?</p>
          <table class="tbl mt"><thead><tr><th>Manager</th><th>Team</th><th>With goals</th><th>Shielded</th><th>Leaders built</th><th>Flags</th></tr></thead><tbody>
          ${mgrs.slice(0, 12).map((m) => `<tr class="click" data-person="${m.id}"><td><b>${esc(m.name)}</b></td><td>${m.n}</td><td>${Math.round(m.withGoals * 100)}%</td><td>${m.shielded}</td><td>${m.lb === null ? '—' : UI.fmt(m.lb, 1)}</td><td>${m.flags.map((f) => `<span class="tag warn wob">${esc(f)}</span>`).join(' ') || '<span class="tag good">ok</span>'}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card mt"><h3 class="s">Rollout plan · 16 weeks (ADKAR lens)</h3><div class="gantt" id="gantt">
        <div></div><div class="weeks">${Array.from({ length: 16 }, (_, i) => `<span>W${i + 1}</span>`).join('')}</div>
        ${GANTT.map(([l, s, w, c, a]) => `<div><b>${esc(l)}</b></div><div class="gtrack"><div class="gb" style="--gc:${c};margin-left:${(s / 16) * 100}%;width:${(w / 16) * 100}%">${esc(a)}</div></div>`).join('')}</div>
        <p class="why mt">Kotter's advice applies too: a guiding coalition (plant heads in Pune and Changsha), quick wins from the pilot, and anchoring the new rules in standing orders (India) and through democratic consultation (China).</p></div>
      <div class="card mt"><h3 class="s">Risk register</h3><table class="tbl"><thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation in PRISM</th></tr></thead><tbody>
        ${RISKS.map(([r, l, i, m]) => `<tr><td><b>${esc(r)}</b></td><td>${chip(l)}</td><td>${chip(i)}</td><td class="small">${esc(m)}</td></tr>`).join('')}</tbody></table></div>`;
  },
  mount(root, ctx, { soft }) {
    root.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      ctx.state.health = { ...(ctx.state.health || {}), [b.dataset.q]: Number(b.dataset.v) };
      ctx.rerender();
    }));
    root.querySelector('#printBtn').addEventListener('click', () => window.print());
    if (RM || soft) return;
    gsap.from(root.querySelectorAll('.wob'), { rotation: -8, scale: 0.6, opacity: 0, duration: 0.6, ease: 'elastic.out(1,0.4)', stagger: 0.05, delay: 0.5 });
    gsap.from(root.querySelectorAll('.gb'), { scaleX: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.4 });
  },
};
