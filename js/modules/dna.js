// M1 Strategy DNA: vision, mission, values, six sliders that each change the engine (data/rules/dna.json), goal cascade.
import * as UI from '../ui.js';
import { radar, animateCharts } from '../charts.js';
const { esc, gsap, RM } = UI;

const SLIDERS = [['pace', 'Pace (steady ↔ cutthroat)'], ['innovation', 'Innovation'], ['cost_focus', 'Cost focus'],
  ['team_orientation', 'Team orientation'], ['risk_appetite', 'Risk appetite'], ['customer_intimacy', 'Customer intimacy']];
const BSC = {
  'ev-auto': [
    ['fin', 'Financial', 'Positive unit economics on core models by FY28; warranty cost < 2% of revenue', '#e0a800'],
    ['cus', 'Customer', 'NPS ≥ 50; delivery within 14 days of booking; charger uptime ≥ 98%', '#1dab84'],
    ['int', 'Internal process', 'First-pass yield ≥ 95%; zero lost-time injuries; OTA crash-free ≥ 99.5%', '#5f7cff'],
    ['lrn', 'Learning & growth', '40% of technical roles HV-certified; 50% of manager roles filled internally; ≥ 2 passport stamps a year per high-potential', '#8b5cf6'],
  ],
};
const DEPTS = [
  ['mfg', 'Manufacturing', ['int', 'fin'], ['ASM-01', 'ASM-02', 'QIN-01']],
  ['rd', 'R&D', ['lrn', 'int'], ['BRD-K1', 'SWE-K1']],
  ['sal', 'Sales', ['cus', 'fin'], ['SAL-01', 'SAL-03']],
  ['svc', 'Service & Charging', ['cus', 'int'], ['CSA-02', 'CFT-01']],
  ['scm', 'Supply Chain', ['fin'], ['SCM-01', 'SCM-02']],
  ['lead', 'People managers', ['lrn'], ['PLM-03', 'PLM-04']],
];
const cap1 = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

// Every line here is read from the engine's own output, so the card can never promise something the PMS doesn't do.
function personality(ctx) {
  const out = ctx.out, o = out.org, R = ctx.rules.ranking, D = ctx.rules.dna, c = out.cadence, mode = out.mode;
  const pace = Number(o.pace);
  const tiers = (pace >= R.cutthroat_pace_at_least ? R.tiers_cutthroat : R.tiers_default).map((t) => t.pct).join(' / ');
  const firstRole = ctx.pickRole('__dnaRole', 'ASM');
  const blendPool = out.pools.find((p) => p.role_id === firstRole && p.homeCountry === 'IN') || out.pools.find((p) => p.role_id === firstRole);
  const counts = ['forced', 'relative', 'absolute'].map((v) => [v, out.pools.filter((p) => p.verdict === v).length]).filter(([, n]) => n);
  const share = Object.values(out.gainsharing)[0]?.sharePct ?? ctx.rules.rewards.gainsharing.pool_share_of_savings_pct;
  const scaled = ['IN', 'CN'].filter((x) => out.budget[x]?.factor < 1);
  const gc = mode.strictGates ? D.risk_appetite.strict_gate_rating_cap : R.gate_fail_rating_cap;
  return [
    ['cadence', 'pace', 'Review rhythm', `${cap1(c.checkins)} check-ins, ${c.reviews} reviews`, 'Review & Delivery, Consultant'],
    ['pip', 'pace', 'Improvement-plan length (India)', c.pip_days, 'Bottom-tier step in Ranking, Country Lens, the drawer'],
    ['tiers', 'pace', 'Reward tiers where ranking is allowed', `${tiers}${pace >= R.cutthroat_pace_at_least ? ' (cutthroat)' : ''}`, 'Ranking, Rewards'],
    ['verdicts', 'pace', 'Ranking verdicts', counts.map(([v, n]) => `${n} ${UI.VERDICT_SHORT[v].toLowerCase()}`).join(' · '), 'Ranking'],
    ['blend', 'pace', `${blendPool ? ctx.idx.role.get(blendPool.role_id)?.title || '' : 'Role'} method blend`, blendPool ? `${blendPool.methods.label} (${blendPool.methods.items.map((i) => `${i.name} ${i.pct}`).join(' / ')})` : '—', 'Method Mixer'],
    ['learn', 'pace', 'Protected learning time', `${out.protectedLearningPct}% of hours (never 0)`, 'Development, Forge'],
    ['okr', 'innovation', 'Key results (R&D, software)', mode.okr ? `Scored as OKRs: 0.7 = 3.5 (innovation ≥ ${D.innovation.okr_scoring_at_least})` : `Scored like KPIs: threshold / target / stretch (innovation < ${D.innovation.okr_scoring_at_least})`, 'Scores everywhere'],
    ['cost', 'cost_focus', 'Budget guard', out.budget.IN?.strict ? (scaled.length ? `Strict: bonuses rescaled to the pool in ${scaled.join(', ')}` : 'Strict: bonuses rescale if a pool is exceeded') : `Advisory: warns only (cost focus < ${D.cost_focus.strict_budget_guard_at_least})`, 'Rewards'],
    ['team', 'team_orientation', 'Plant gainsharing', `${share}% of savings shared${share > ctx.rules.rewards.gainsharing.pool_share_of_savings_pct ? ' (bigger pool for teams)' : ''}`, 'Rewards'],
    ['gates', 'risk_appetite', 'Failed compliance gate', `Caps the rating at ${gc}${mode.strictGates ? ' (strict: low risk appetite)' : ''}`, 'Scores, Ranking, Rewards'],
    ['cust', 'customer_intimacy', 'Customer KPIs (NPS, CSAT…)', mode.customerBoost > 1 ? `Count ×${mode.customerBoost} in sales and service` : `Standard weights (×${D.customer_intimacy.weight_multiplier} from ${D.customer_intimacy.boost_at_least})`, 'Scores, Ranking, Rewards'],
  ];
}
const personalityHtml = (ctx) => personality(ctx).map(([k, , l, v, where]) => `<div class="pline" data-k="${k}"><span class="lab">${esc(l)}</span><b>${esc(v)}</b><small>${esc(where)}</small></div>`).join('');
const SHORT = { pace: 'Pace', innovation: 'Innovation', cost_focus: 'Cost', team_orientation: 'Team', risk_appetite: 'Risk', customer_intimacy: 'Customer' };
const radarHtml = (o) => radar(SLIDERS.map(([k]) => ({ label: SHORT[k], value: Number(o[k]) || 0 })), { max: 10, color: '#ff5a5f', size: 280 });

function cascadeCols(ctx) {
  const o = ctx.out.org, bsc = BSC[o.industry];
  const kpi = (id) => ctx.idx.kpi.get(id);
  if (bsc && DEPTS.every((d) => d[3].some((id) => kpi(id)))) {
    return [
      [{ n: 'vision', cc: '#14151c', html: `<b>VISION</b>${esc(o.vision)}` }],
      bsc.map((b) => ({ n: b[0], from: ['vision'], cc: b[3], html: `<b>${esc(b[1].toUpperCase())}</b>${esc(b[2])}` })),
      DEPTS.map((d) => ({ n: d[0], from: d[2], cc: bsc.find((b) => b[0] === d[2][0])[3], html: `<b>${esc(d[1].toUpperCase())}</b>${d[2].map((x) => esc(bsc.find((b) => b[0] === x)[1])).join(' · ')}` })),
      DEPTS.map((d) => ({ from: [d[0]], cc: '#c6c8d6', html: d[3].map((id) => (kpi(id) ? `• ${esc(kpi(id).kpi_name)} <span class="muted">(${esc(kpi(id).role_id)})</span>` : '')).filter(Boolean).join('<br>') })),
    ];
  }
  // Any other organisation: vision → roles → KRAs → KPIs, straight from the uploaded sheets.
  const roles = ctx.roles().filter((r) => (ctx.idx.kpisByRole.get(r.role_id) || []).length).slice(0, 6);
  const COLS = ['#ff5a5f', '#ff9f43', '#e0a800', '#1dab84', '#5f7cff', '#8b5cf6'];
  return [
    [{ n: 'vision', cc: '#14151c', html: `<b>VISION</b>${esc(o.vision || 'Add a vision in the Org sheet')}` }],
    roles.map((r, i) => ({ n: `r${i}`, from: ['vision'], cc: COLS[i % 6], html: `<b>${esc(String(r.title).toUpperCase())}</b>${esc(r.purpose || '')}` })),
    roles.map((r, i) => ({ n: `k${i}`, from: [`r${i}`], cc: COLS[i % 6], html: `<b>KRAs</b>${esc([...new Set((ctx.idx.kpisByRole.get(r.role_id) || []).map((k) => k.kra))].join(' · '))}` })),
    roles.map((r, i) => ({ from: [`k${i}`], cc: '#c6c8d6', html: (ctx.idx.kpisByRole.get(r.role_id) || []).slice(0, 3).map((k) => `• ${esc(k.kpi_name)}`).join('<br>') })),
  ];
}

export default {
  nextNote: 'Strategy set. Now define the jobs',
  render(ctx) {
    const o = ctx.out.org;
    const sample = ctx.isSampleOrg();
    const cols = cascadeCols(ctx);
    return `
      ${UI.pageHead({ eyebrow: 'M1 · Strategy DNA', title: 'Vision first. <em>Everything else follows.</em>', sub: 'Each of the six sliders changes the engine, not just this page: review rhythm, PIP length, ranking tiers, method blends, learning time, how key results are scored, the budget guard, gainsharing, gate strictness and customer weights. The "What changed" panel lists every screen a move affects.' })}
      <div class="grid g2">
        <div class="card"><div class="cap"></div><h2 class="h4">Vision</h2><p style="font-family:var(--display);font-size:22px;line-height:1.3">${esc(o.vision || '—')}</p>
          <h2 class="h4 mt">Mission</h2><p class="why" style="color:inherit">${esc(o.mission || '—')}</p>
          <h2 class="h4 mt">Values${sample ? ' · SPARK' : ''}</h2><div class="chips">${String(o.values || '').split(';').filter((v) => v.trim()).map((v) => `<span class="tag info">${esc(v.trim())}</span>`).join('')}</div></div>
        <div class="card" id="dnaSliders"><h2 class="h4">Strategy DNA (1–10)</h2>
          ${SLIDERS.map(([k, l]) => `<div class="slider-row"><label for="s-${k}">${esc(l)}</label><input type="range" min="1" max="10" step="1" id="s-${k}" data-k="${k}" value="${esc(o[k])}"><output id="o-${k}" for="s-${k}">${esc(o[k])}</output></div>`).join('')}
          <div class="row mt"><button class="btn light sm" id="dnaReset">${sample ? 'Reset to VoltBridge' : 'Reset to the uploaded values'}</button><span class="why small">Changes re-run the engine for every screen.</span></div></div>
      </div>
      <div class="grid g12 mt">
        <div class="card"><h2 class="h4">DNA shape</h2><div id="dnaRadar">${radarHtml(o)}</div></div>
        <div class="card"><h2 class="h4">Your PMS personality (live, from the engine)</h2><div id="persona" class="plines">${personalityHtml(ctx)}</div></div>
      </div>
      <div class="card mt"><h2 class="s">Goal cascade: ${cols[1][0]?.n === 'fin' ? 'vision → scorecard → departments → KPIs' : 'vision → roles → KRAs → KPIs'}</h2>
        <div class="cascade" id="cascade"><svg class="links" id="links" aria-hidden="true"></svg>
          ${cols.map((col) => `<div>${col.map((c) => `<div class="ccard"${c.n ? ` data-n="${esc(c.n)}"` : ''}${c.from ? ` data-from="${esc(c.from.join(' '))}"` : ''} style="--cc:${c.cc}">${c.html}</div>`).join('')}</div>`).join('')}
        </div></div>`;
  },
  mount(root, ctx) {
    let drawn = false;
    const drawLinks = (animate) => {
      const box = root.querySelector('#cascade'), svg = root.querySelector('#links');
      if (!box || !svg || !box.isConnected) return;
      if (innerWidth < 900) { svg.innerHTML = ''; drawn = false; return; }
      const B = box.getBoundingClientRect();
      const node = (n) => box.querySelector(`[data-n="${CSS.escape(n)}"]`);
      const paths = [];
      box.querySelectorAll('[data-from]').forEach((card) => card.dataset.from.split(' ').forEach((f) => {
        const a = node(f); if (!a) return;
        const ra = a.getBoundingClientRect(), rb = card.getBoundingClientRect();
        const x1 = ra.right - B.left, y1 = ra.top + ra.height / 2 - B.top, x2 = rb.left - B.left, y2 = rb.top + rb.height / 2 - B.top, mx = (x1 + x2) / 2;
        const color = getComputedStyle(a).getPropertyValue('--cc') || '#8d91a6';
        paths.push(`<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity=".55"/>`);
      }));
      svg.innerHTML = paths.join('');
      if (!RM && animate && !drawn) svg.querySelectorAll('path').forEach((p, i) => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.9, delay: 0.1 + i * 0.03, ease: 'power2.out' }); });
      drawn = true;
    };
    const t0 = setTimeout(() => drawLinks(true), RM ? 0 : 350);
    let rt;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => drawLinks(false), 120); };
    addEventListener('resize', onResize);
    ctx.onCleanup(() => { clearTimeout(t0); clearTimeout(rt); removeEventListener('resize', onResize); });

    const refresh = (beforeLines, title, before) => {
      root.querySelector('#persona').innerHTML = personalityHtml(ctx);
      root.querySelector('#dnaRadar').innerHTML = radarHtml(ctx.out.org);
      animateCharts(root.querySelector('#dnaRadar'));
      const lines = [];
      personality(ctx).forEach(([k, , l, v]) => {
        if (beforeLines[k] !== v) {
          lines.push(`<span>${esc(l)}:</span> ${esc(beforeLines[k])} → <b>${esc(v)}</b>`);
          const el = root.querySelector(`#persona [data-k="${k}"]`);
          if (el && !RM) gsap.fromTo(el, { backgroundColor: 'rgba(255,90,95,.18)' }, { backgroundColor: 'rgba(255,90,95,0)', duration: 1.6 });
        }
      });
      // The engine-wide diff covers screens beyond this one; personality lines already listed are not repeated.
      const extra = ctx.diffOut(before, ctx.out).filter((x) => !/Method blends|Protected learning|Review rhythm|Improvement-plan|Key results scored|Customer KPIs|Failed gate caps|Gainsharing share/.test(x));
      const all = [...lines, ...extra];
      UI.showChanges([title, ...(all.length ? all : ['<span>No rule or number changed at this value. Thresholds are in data/rules/dna.json.</span>'])]);
    };
    root.querySelectorAll('input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => { root.querySelector(`#o-${inp.dataset.k}`).textContent = inp.value; });
      inp.addEventListener('change', () => {
        const beforeLines = Object.fromEntries(personality(ctx).map(([k, , , v]) => [k, v]));
        const before = ctx.out;
        ctx.state.data.Org[0][inp.dataset.k] = Number(inp.value);
        ctx.rerun(false);
        refresh(beforeLines, `<b>${esc(SLIDERS.find((s) => s[0] === inp.dataset.k)[1])} → ${esc(inp.value)}</b>`, before);
      });
    });
    root.querySelector('#dnaReset').addEventListener('click', () => {
      const baseOrg = ctx.base.Org?.[0] || {};
      for (const [k] of SLIDERS) ctx.state.data.Org[0][k] = baseOrg[k];
      ctx.rerun(true);
      UI.toast(ctx.isSampleOrg() ? 'Strategy DNA reset to the VoltBridge defaults.' : 'Strategy DNA reset to the values in your workbook.');
    });
  },
};
