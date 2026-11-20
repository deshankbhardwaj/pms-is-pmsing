// M3 KPI & OKR Library: weights, threshold/target/stretch, gates, SMART checks, live weight donut.
import * as UI from '../ui.js';
import { donut } from '../charts.js';
import { isLeadersBuiltKpi } from '../engine/util.js';
const { esc, gsap, RM } = UI;
const COLORS = ['#e0a800', '#ff9f43', '#ff5a5f', '#1dab84', '#5f7cff', '#8b5cf6', '#20b8e0'];
const n = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const sum100 = (t) => Math.abs(t - 100) < 0.01;   // one rule for the importer, this screen and the Consultant

function ordered(k) {
  const thr = n(k.threshold), tgt = n(k.target), st = n(k.stretch);
  return thr !== null && tgt !== null && st !== null && ((thr < tgt && tgt < st) || (thr > tgt && tgt > st));
}
function smart(k) {
  return [
    ['S', 'Specific', !!(k.kpi_name && k.kra)],
    ['M', 'Measurable', !!k.unit && (k.type === 'Gate' || ordered(k))],
    ['A', 'Achievable', k.type === 'Gate' || ordered(k)],
    ['R', 'Relevant', !!k.kra],
    ['T', 'Time-bound', !!k.frequency],
  ];
}
// value → 1-5 using the same rule as the engine (OKR curve only when key results are scored as OKRs)
function curve(k, okr) {
  const W = 300, H = 150, p = 26;
  const thr = n(k.threshold), tgt = n(k.target), st = n(k.stretch);
  const useOkr = k.type === 'KR' && okr;
  if (!useOkr && !ordered(k)) return '<p class="why">This measure has no threshold → target → stretch range, so it has no scoring curve.</p>';
  let pts = [], xs;
  if (useOkr) {
    xs = [0, 1];
    for (let i = 0; i <= 40; i++) { const v = i / 40; pts.push([v, v <= 0.7 ? 1 + (v / 0.7) * 2.5 : 3.5 + ((v - 0.7) / 0.3) * 1.5]); }
  } else {
    const lo = Math.min(thr, st), hi = Math.max(thr, st), pad = (hi - lo) * 0.15;
    xs = [lo - pad, hi + pad];
    const dir = Math.sign(tgt - thr) || 1;
    for (let i = 0; i <= 40; i++) {
      const v = xs[0] + ((xs[1] - xs[0]) * i) / 40;
      const s = (v - tgt) * dir <= 0 ? Math.max(1, Math.min(3, 1 + (2 * (v - thr)) / (tgt - thr))) : Math.max(3, Math.min(5, 3 + (2 * (v - tgt)) / (st - tgt)));
      pts.push([v, s]);
    }
  }
  const X = (v) => p + ((v - xs[0]) / (xs[1] - xs[0])) * (W - p - 8), Y = (s) => H - 20 - ((s - 1) / 4) * (H - 34);
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join('');
  const marks = useOkr ? [[0.7, '0.7 = success']] : [[thr, 'threshold'], [tgt, 'target'], [st, 'stretch']];
  const alt = useOkr ? 'Scoring curve: progress 0 scores 1, 0.7 scores 3.5, 1.0 scores 5' : `Scoring curve: ${thr} scores 1, ${tgt} scores 3, ${st} scores 5`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" data-anim="curve" role="img" aria-label="${esc(alt)}">
    ${[1, 3, 5].map((s) => `<line x1="${p}" x2="${W - 8}" y1="${Y(s)}" y2="${Y(s)}" stroke="rgba(120,120,140,.15)"/><text x="4" y="${Y(s) + 4}">${s}</text>`).join('')}
    <path class="ln" d="${d}" fill="none" stroke="var(--mc)" stroke-width="3"/>
    ${marks.map(([v, l]) => `<line x1="${X(v)}" x2="${X(v)}" y1="10" y2="${H - 20}" stroke="#8d91a6" stroke-dasharray="3 3"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`).join('')}</svg>`;
}

export default {
  nextNote: 'Now choose how each role is appraised',
  render(ctx) {
    const rid = ctx.pickRole('role', 'ASM');
    if (!rid) return `${UI.pageHead({ eyebrow: 'M3 · KPI & OKR Library', title: 'No roles yet', sub: 'The loaded workbook has no roles. Add them in the Roles sheet and upload again in the Data Hub.' })}`;
    ctx.state.sel.role = rid;
    const roles = ctx.roles();
    const kpis = ctx.idx.kpisByRole.get(rid) || [];
    const scored = kpis.filter((k) => k.type !== 'Gate');
    const total = scored.reduce((s, k) => s + (n(k.weight_pct) ?? 0), 0);
    const lbOff = !ctx.state.toggles.leadersBuilt && kpis.some(isLeadersBuiltKpi);
    const selId = ctx.sel('kpi', null);
    const kSel = kpis.find((k) => k.kpi_id === selId) || scored[0] || kpis[0];
    const all = ctx.data.KPIs || [];
    const types = ['KPI', 'KR', 'Gate'].map((t) => [t, all.filter((k) => k.type === t).length]).filter(([, c]) => c);
    const mode = ctx.out.mode;
    const capNow = mode.strictGates ? ctx.rules.dna.risk_appetite.strict_gate_rating_cap : ctx.rules.ranking.gate_fail_rating_cap;
    const attain = (kid) => {
      const rs = ctx.out.employees.filter((r) => r.emp.role_id === rid).map((r) => r.result.items.find((i) => i.kpi_id === kid)?.score).filter((v) => v != null);
      return rs.length ? rs.reduce((s, v) => s + v, 0) / rs.length : null;
    };
    const karan = ctx.personaId('karan');
    const gates = all.filter((k) => k.type === 'Gate');
    return `
      ${UI.pageHead({ eyebrow: 'M3 · KPI & OKR Library', title: 'What gets measured, <em>and how much it counts.</em>', sub: `${all.length} measures across ${roles.length} roles: ${types.map(([t, c]) => `${c} ${t === 'KR' ? 'OKR key results' : t === 'Gate' ? 'gates' : 'KPIs'}`).join(', ')}. KPIs score threshold = 1, target = 3, stretch = 5. ${mode.okr ? 'Key results are scored as OKRs: progress 0.7 = 3.5.' : 'Key results are scored like KPIs right now (Strategy DNA innovation is below the OKR threshold).'}` })}
      <div class="chips mb" id="rolePick" role="group" aria-label="Choose a role">${roles.map((r) => `<button class="chipbtn${r.role_id === rid ? ' on' : ''}" data-role="${esc(r.role_id)}" aria-pressed="${r.role_id === rid}">${esc(r.title)}</button>`).join('')}</div>
      ${lbOff ? '<div class="tip mb">The "leaders built" KPI is switched off in the Leadership Forge, so its weight is spread over this role\'s other KPIs (shown below). Switch it back on in the Forge to edit these weights.</div>' : ''}
      ${mode.customerBoost > 1 ? `<div class="tip mb">Strategy DNA customer intimacy is high: KPIs in the "${esc(mode.customerKra)}" KRA count ×${mode.customerBoost} inside each role's Results score. The sheet weights below are unchanged.</div>` : ''}
      <div class="card pad0"><div class="tbl-wrap"><table class="tbl" id="kpiTbl"><caption class="sr-only">Measures for ${esc(ctx.idx.role.get(rid).title)}</caption><thead><tr><th scope="col">KRA</th><th scope="col">Measure</th><th scope="col">Type</th><th scope="col">Weight</th><th scope="col">Threshold → target → stretch</th><th scope="col">SMART</th><th scope="col">Avg score</th></tr></thead><tbody>
        ${kpis.map((k) => { const a = attain(k.kpi_id); return `<tr class="click${k.kpi_id === kSel?.kpi_id ? ' sel' : ''}" data-k="${esc(k.kpi_id)}"><td class="muted small">${esc(k.kra)}</td><td><b>${esc(k.kpi_name)}</b><div class="small muted">${esc(k.unit)} · ${k.polarity === 'lower' ? '↓ lower is better' : '↑ higher is better'} · ${esc(k.frequency)} · ${esc(k.data_source)}</div></td>
          <td><span class="tag ${k.type === 'Gate' ? 'bad' : k.type === 'KR' ? 'purple' : 'warn'}">${k.type === 'KR' ? 'OKR · KR' : esc(k.type)}</span></td>
          <td>${k.type === 'Gate' ? '<span class="muted">pass/fail</span>' : `<input type="number" class="wt" min="0" max="100" step="5" value="${esc(k.weight_pct)}" data-k="${esc(k.kpi_id)}" aria-label="Weight for ${esc(k.kpi_name)}"${lbOff ? ' disabled' : ''}>`}</td>
          <td class="small">${k.type === 'Gate' ? 'Must pass every period' : `${esc(k.threshold)} → <b>${esc(k.target)}</b> → ${esc(k.stretch)}`}</td>
          <td><span class="smart">${smart(k).map(([l, t, ok]) => `<i class="${ok ? 'ok' : 'no'}" title="${t}: ${ok ? 'yes' : 'missing'}" aria-label="${t}: ${ok ? 'yes' : 'missing'}">${l}</i>`).join('')}</span></td>
          <td>${k.type === 'Gate' ? `${ctx.out.employees.filter((r) => r.emp.role_id === rid && r.result.gates.some((g) => g.kpi_id === k.kpi_id && g.passed === false)).length} failed` : a === null ? '—' : UI.fmt(a, 2)}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="grid g3 mt">
        <div class="card" style="text-align:center"><h2 class="h4">Weights (gates excluded)</h2><div id="donutBox">${donut(scored.map((k, i) => ({ label: k.kpi_name, value: n(k.weight_pct) ?? 0, color: COLORS[i % 7] })), { label: String(Math.round(total * 100) / 100) })}</div>
          <div class="wsum ${sum100(total) ? 'ok' : 'bad'}" id="wsum" role="status">${sum100(total) ? '✓ Weights = 100' : `Weights = ${Math.round(total * 100) / 100} (must be 100)`}</div>
          <div class="row mt" style="justify-content:center"><button class="btn sm" id="wApply" disabled>Apply weights & re-score</button><button class="btn light sm" id="wReset"${lbOff ? ' disabled' : ''}>Reset</button></div></div>
        <div class="card">${kSel?.type === 'Gate'
          ? `<h2 class="h4">Gate · ${esc(kSel.kpi_name)}</h2><div class="gate-card"><b>Pass / fail, every period</b><p>A gate has no 1–5 curve. Pass every period and nothing changes. Fail any period and the rating is capped at ${capNow} and the person is kept out of the top reward tier. No data at all means no penalty: it shows as "no gate data".</p></div>`
          : `<h2 class="h4">Scoring rule · ${esc(kSel?.kpi_name || '')}</h2>${kSel ? curve(kSel, mode.okr) : ''}<p class="why">${kSel?.type === 'KR' && mode.okr ? 'OKR key results are scored on progress 0–1. 0.7 is a success (rating 3.5), so people are not punished for aiming high.' : 'Below threshold scores 1, target scores 3, stretch scores 5, in a straight line between.'}</p>`}</div>
        <div class="card"><h2 class="h4">KPI or OKR?</h2><ul class="dots">
          <li><b>KPI</b> when the work is known and repeatable: assembly output, CSAT, uptime. Targets are expected to be hit.</li>
          <li><b>OKR</b> when the work is new and uncertain: battery cells, OTA software. Key results are set to stretch; 0.7 counts as success.</li>
          <li><b>Behaviour</b> is scored through BARS and 360° feedback, not KPIs.</li></ul></div>
      </div>
      ${gates.length ? `<div class="card mt"><h2 class="h4">Gates: how matters as much as what</h2><ul class="dots">
          ${gates.map((k) => `<li><b>${esc(ctx.idx.role.get(k.role_id)?.title || k.role_id)}:</b> ${esc(k.kpi_name)}</li>`).join('')}</ul>
          <p class="why mt">A failed gate caps the rating at ${capNow} and keeps the person out of the top reward tier.${karan ? ' Karan Sethi is #2 on units and still fails.' : ''}</p>
          ${karan ? `<button class="btn light sm mt" data-person="${esc(karan)}">See Karan →</button>` : ''}</div>` : ''}`;
  },
  mount(root, ctx) {
    const rid = ctx.state.sel.role;
    if (!rid || !root.querySelector('#kpiTbl')) return;
    root.querySelectorAll('#rolePick [data-role]').forEach((b) => b.addEventListener('click', () => { ctx.state.sel.kpi = null; ctx.setSel('role', b.dataset.role); }));
    root.querySelectorAll('#kpiTbl tr[data-k]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') ctx.setSel('kpi', tr.dataset.k); }));
    const inputs = [...root.querySelectorAll('input.wt')];
    const applyBtn = root.querySelector('#wApply');
    const redraw = () => {
      const vals = inputs.map((i) => n(i.value)), tot = vals.reduce((s, v) => s + (v ?? 0), 0);
      const bad = vals.some((v) => v === null || v < 0 || v > 100);
      const ks = inputs.map((i) => ctx.idx.kpi.get(i.dataset.k));
      inputs.forEach((i, j) => i.setAttribute('aria-invalid', String(vals[j] === null || vals[j] < 0 || vals[j] > 100)));
      root.querySelector('#donutBox').innerHTML = donut(ks.map((k, j) => ({ label: k.kpi_name, value: Math.max(0, vals[j] ?? 0), color: COLORS[j % 7] })), { label: String(Math.round(tot * 100) / 100) });
      const ws = root.querySelector('#wsum');
      const ok = !bad && sum100(tot);
      ws.className = `wsum ${ok ? 'ok' : 'bad'}`;
      ws.textContent = bad ? 'Each weight must be a number from 0 to 100' : ok ? '✓ Weights = 100' : `Weights = ${Math.round(tot * 100) / 100} (must be 100)`;
      const changed = inputs.some((i) => n(i.value) !== n(ctx.idx.kpi.get(i.dataset.k).weight_pct));
      applyBtn.disabled = !ok || !changed;
      if (!RM) gsap.fromTo(ws, { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    };
    inputs.forEach((i) => i.addEventListener('input', redraw));
    applyBtn.addEventListener('click', () => {
      if (applyBtn.disabled) return;
      const before = ctx.out;
      inputs.forEach((i) => { const k = ctx.state.data.KPIs.find((x) => x.kpi_id === i.dataset.k); if (k) k.weight_pct = n(i.value); });
      ctx.rerun(true);
      ctx.changes(`<b>${esc(ctx.idx.role.get(rid).title)}: new weights applied</b>`, before);
    });
    root.querySelector('#wReset').addEventListener('click', () => {
      const before = ctx.out;
      const baseK = new Map((ctx.base.KPIs || []).map((k) => [k.kpi_id, k]));
      let changed = 0;
      for (const k of ctx.state.data.KPIs) if (k.role_id === rid && baseK.has(k.kpi_id) && k.weight_pct !== baseK.get(k.kpi_id).weight_pct) { k.weight_pct = baseK.get(k.kpi_id).weight_pct; changed++; }
      ctx.rerun(true);
      if (changed) ctx.changes(`<b>${esc(ctx.idx.role.get(rid).title)}: weights reset to the loaded values</b>`, before);
      else UI.toast('These weights already match the loaded data.');
    });
    // Animate the scoring curve
    if (!RM) root.querySelectorAll('svg[data-anim="curve"] .ln').forEach((p) => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out', delay: 0.3 }); });
  },
};
