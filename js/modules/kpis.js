// M3 KPI & OKR Library: weights, threshold/target/stretch, gates, SMART checks, live weight donut.
import * as UI from '../ui.js';
import { donut } from '../charts.js';
const { esc, gsap, RM } = UI;
const COLORS = ['#e0a800', '#ff9f43', '#ff5a5f', '#1dab84', '#5f7cff', '#8b5cf6', '#20b8e0'];
const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function smart(k) {
  const thr = n(k.threshold), tgt = n(k.target), st = n(k.stretch);
  const ordered = thr !== null && tgt !== null && st !== null && ((thr < tgt && tgt < st) || (thr > tgt && tgt > st));
  return [
    ['S', 'Specific', !!(k.kpi_name && k.kra)],
    ['M', 'Measurable', !!k.unit && (k.type === 'Gate' || ordered)],
    ['A', 'Achievable', k.type === 'Gate' || k.type === 'KR' || ordered],
    ['R', 'Relevant', !!k.kra],
    ['T', 'Time-bound', !!k.frequency],
  ];
}
// value → 1-5 using the same rule as the engine
function curve(k) {
  const W = 300, H = 150, p = 26;
  const thr = n(k.threshold), tgt = n(k.target), st = n(k.stretch);
  let pts = [], xs;
  if (k.type === 'KR') {
    xs = [0, 1];
    for (let i = 0; i <= 40; i++) { const v = i / 40; pts.push([v, v <= 0.7 ? 1 + (v / 0.7) * 2.5 : 3.5 + ((v - 0.7) / 0.3) * 1.5]); }
  } else {
    const lo = Math.min(thr, st), hi = Math.max(thr, st), pad = (hi - lo) * 0.15;
    xs = [lo - pad, hi + pad];
    for (let i = 0; i <= 40; i++) {
      const v = xs[0] + ((xs[1] - xs[0]) * i) / 40, dir = Math.sign(tgt - thr) || 1;
      const s = (v - tgt) * dir <= 0 ? Math.max(1, Math.min(3, 1 + (2 * (v - thr)) / (tgt - thr))) : Math.max(3, Math.min(5, 3 + (2 * (v - tgt)) / (st - tgt)));
      pts.push([v, s]);
    }
  }
  const X = (v) => p + ((v - xs[0]) / (xs[1] - xs[0])) * (W - p - 8), Y = (s) => H - 20 - ((s - 1) / 4) * (H - 34);
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(1)},${Y(q[1]).toFixed(1)}`).join('');
  const marks = k.type === 'KR' ? [[0.7, '0.7 = success']] : [[thr, 'threshold'], [tgt, 'target'], [st, 'stretch']];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" data-anim="curve">
    ${[1, 3, 5].map((s) => `<line x1="${p}" x2="${W - 8}" y1="${Y(s)}" y2="${Y(s)}" stroke="rgba(120,120,140,.15)"/><text x="4" y="${Y(s) + 4}">${s}</text>`).join('')}
    <path class="ln" d="${d}" fill="none" stroke="var(--mc)" stroke-width="3"/>
    ${marks.map(([v, l]) => `<line x1="${X(v)}" x2="${X(v)}" y1="10" y2="${H - 20}" stroke="#8d91a6" stroke-dasharray="3 3"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`).join('')}</svg>`;
}

export default {
  nextNote: 'Now choose how each role is appraised',
  render(ctx) {
    const rid = ctx.sel('role', 'ASM');
    const roles = [...ctx.idx.role.values()].filter((r) => r.role_id !== 'EXE');
    const kpis = ctx.idx.kpisByRole.get(rid) || [];
    const scored = kpis.filter((k) => k.type !== 'Gate');
    const total = scored.reduce((s, k) => s + Number(k.weight_pct), 0);
    const selK = ctx.sel('kpi', null) && kpis.find((k) => k.kpi_id === ctx.sel('kpi')) ? ctx.sel('kpi') : (scored[0]?.kpi_id);
    const kSel = kpis.find((k) => k.kpi_id === selK);
    const all = ctx.data.KPIs;
    const types = ['KPI', 'KR', 'Gate'].map((t) => [t, all.filter((k) => k.type === t).length]);
    const attain = (kid) => {
      const rs = ctx.out.employees.filter((r) => r.emp.role_id === rid).map((r) => r.result.items.find((i) => i.kpi_id === kid)?.score).filter((v) => v != null);
      return rs.length ? rs.reduce((s, v) => s + v, 0) / rs.length : null;
    };
    return `
      ${UI.pageHead({ eyebrow: 'M3 · KPI & OKR Library', title: 'What gets measured, <em>and how much it counts.</em>', sub: `${all.length} measures across ${roles.length} roles: ${types.map(([t, c]) => `${c} ${t === 'KR' ? 'OKR key results' : t === 'Gate' ? 'gates' : 'KPIs'}`).join(', ')}. Every score maps to 1–5 the same way: threshold = 1, target = 3, stretch = 5.` })}
      <div class="chips mb" id="rolePick">${roles.map((r) => `<button class="chipbtn${r.role_id === rid ? ' on' : ''}" data-role="${r.role_id}">${esc(r.title)}</button>`).join('')}</div>
      <div class="grid g21">
        <div class="card pad0" style="overflow-x:auto"><table class="tbl" id="kpiTbl"><thead><tr><th>KRA</th><th>Measure</th><th>Type</th><th>Weight</th><th>Threshold → target → stretch</th><th>Freq.</th><th>Source</th><th>SMART</th><th>Avg score</th></tr></thead><tbody>
          ${kpis.map((k) => { const a = attain(k.kpi_id); return `<tr class="click${k.kpi_id === selK ? ' sel' : ''}" data-k="${k.kpi_id}"><td class="muted small">${esc(k.kra)}</td><td><b>${esc(k.kpi_name)}</b><div class="small muted">${esc(k.unit)} · ${k.polarity === 'lower' ? '↓ lower is better' : '↑ higher is better'}</div></td>
            <td><span class="tag ${k.type === 'Gate' ? 'bad' : k.type === 'KR' ? 'purple' : 'warn'}">${k.type === 'KR' ? 'OKR · KR' : esc(k.type)}</span></td>
            <td>${k.type === 'Gate' ? '<span class="muted">pass/fail</span>' : `<input type="number" class="wt" min="0" max="100" step="5" value="${esc(k.weight_pct)}" data-k="${k.kpi_id}" style="width:62px">`}</td>
            <td class="small">${k.type === 'Gate' ? 'Must pass every period' : `${esc(k.threshold)} → <b>${esc(k.target)}</b> → ${esc(k.stretch)}`}</td><td class="small">${esc(k.frequency)}</td><td class="small muted">${esc(k.data_source)}</td>
            <td><span class="smart">${smart(k).map(([l, t, ok]) => `<i class="${ok ? 'ok' : 'no'}" title="${t}">${l}</i>`).join('')}</span></td>
            <td>${k.type === 'Gate' ? `${ctx.out.employees.filter((r) => r.emp.role_id === rid && !r.result.gatePassed).length} failed` : a === null ? '—' : UI.fmt(a, 2)}</td></tr>`; }).join('')}
        </tbody></table></div>
        <div>
          <div class="card" style="text-align:center"><h4>Weights (gates excluded)</h4><div id="donutBox">${donut(scored.map((k, i) => ({ label: k.kpi_name, value: Number(k.weight_pct), color: COLORS[i % 7] })), { label: String(total) })}</div>
            <div class="wsum ${total === 100 ? 'ok' : 'bad'}" id="wsum">${total === 100 ? '✓ Weights = 100' : `Weights = ${total} (must be 100)`}</div>
            <div class="row mt" style="justify-content:center"><button class="btn sm" id="wApply" ${total === 100 ? 'disabled' : ''}>Apply weights & re-score</button><button class="btn light sm" id="wReset">Reset</button></div></div>
        </div>
      </div>
      <div class="grid g3 mt">
        <div class="card"><h4>Scoring rule · ${esc(kSel?.kpi_name || '')}</h4>${kSel ? curve(kSel) : ''}<p class="why">${kSel?.type === 'KR' ? 'OKR key results are scored on progress 0–1. 0.7 is a success (rating 3.5), so people are not punished for aiming high.' : 'Below threshold scores 1, target scores 3, stretch scores 5, in a straight line between.'}</p></div>
        <div class="card"><h4>KPI or OKR?</h4><ul class="dots">
          <li><b>KPI</b> when the work is known and repeatable: assembly output, CSAT, uptime. Targets are expected to be hit.</li>
          <li><b>OKR</b> when the work is new and uncertain: battery cells, OTA software. Key results are set to stretch; 0.7 counts as success.</li>
          <li><b>Behaviour</b> is scored through BARS and 360° feedback, not KPIs.</li></ul></div>
        <div class="card"><h4>Gates: how matters as much as what</h4><ul class="dots">
          ${all.filter((k) => k.type === 'Gate').map((k) => `<li><b>${esc(ctx.idx.role.get(k.role_id)?.title)}:</b> ${esc(k.kpi_name)}</li>`).join('')}</ul>
          <p class="why mt">A failed gate caps the rating at ${ctx.rules.ranking.gate_fail_rating_cap} and keeps the person out of the top reward tier. Karan Sethi is #2 on units and still fails.</p>
          <button class="btn light sm mt" data-person="${ctx.out.personas.find((p) => p.key === 'karan')?.emp_id}">See Karan →</button></div>
      </div>`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#rolePick [data-role]').forEach((b) => b.addEventListener('click', () => { ctx.state.sel.kpi = null; ctx.setSel('role', b.dataset.role); }));
    root.querySelectorAll('#kpiTbl tr[data-k]').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') ctx.setSel('kpi', tr.dataset.k); }));
    const rid = ctx.sel('role', 'ASM');
    const inputs = [...root.querySelectorAll('input.wt')];
    const redraw = () => {
      const vals = inputs.map((i) => Number(i.value) || 0), tot = vals.reduce((s, v) => s + v, 0);
      const ks = inputs.map((i) => ctx.idx.kpi.get(i.dataset.k));
      root.querySelector('#donutBox').innerHTML = donut(ks.map((k, j) => ({ label: k.kpi_name, value: vals[j], color: COLORS[j % 7] })), { label: String(tot) });
      const ws = root.querySelector('#wsum');
      ws.className = `wsum ${tot === 100 ? 'ok' : 'bad'}`;
      ws.textContent = tot === 100 ? '✓ Weights = 100' : `Weights = ${tot} (must be 100)`;
      root.querySelector('#wApply').disabled = tot !== 100;
      if (!RM) gsap.fromTo(ws, { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    };
    inputs.forEach((i) => i.addEventListener('input', redraw));
    root.querySelector('#wApply').addEventListener('click', () => {
      const before = new Map(ctx.out.employees.filter((r) => r.emp.role_id === rid).map((r) => [r.emp.emp_id, r.result.rating]));
      inputs.forEach((i) => { ctx.state.data.KPIs.find((k) => k.kpi_id === i.dataset.k).weight_pct = Number(i.value); });
      ctx.rerun(true);
      const moved = ctx.out.employees.filter((r) => r.emp.role_id === rid && before.get(r.emp.emp_id) !== r.result.rating).length;
      UI.showChanges([`<b>${esc(ctx.idx.role.get(rid).title)}: new weights applied</b>`, `<span>People whose rating moved:</span> <b>${moved}</b> of ${before.size}`]);
    });
    root.querySelector('#wReset').addEventListener('click', () => {
      for (const k of ctx.state.data.KPIs) if (k.role_id === rid) k.weight_pct = ctx.state.sample.KPIs.find((x) => x.kpi_id === k.kpi_id).weight_pct;
      ctx.rerun(true); UI.toast('Weights reset to the VoltBridge defaults.');
    });
    // Animate the scoring curve
    root.querySelectorAll('svg[data-anim="curve"] .ln').forEach((p) => { if (RM) return; const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out', delay: 0.3 }); });
  },
};
