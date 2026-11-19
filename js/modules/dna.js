// M1 Strategy DNA: vision, mission, values, sliders that reset every downstream default, goal cascade.
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

function personality(ctx) {
  const o = ctx.out.org, R = ctx.rules.ranking;
  const pace = Number(o.pace), risk = Number(o.risk_appetite), inn = Number(o.innovation), team = Number(o.team_orientation), cust = Number(o.customer_intimacy), cost = Number(o.cost_focus);
  const sales = ctx.out.pools.find((p) => p.role_id === 'SAL' && p.homeCountry === 'IN');
  const asm = ctx.out.pools.find((p) => p.role_id === 'ASM' && p.homeCountry === 'IN');
  const tiers = (pace >= R.cutthroat_pace_at_least ? R.tiers_cutthroat : R.tiers_default).map((t) => t.pct).join(' / ');
  return [
    ['cadence', 'Review rhythm', pace >= 8 ? 'Monthly check-ins, quarterly reviews' : pace >= 5 ? 'Monthly check-ins, half-yearly reviews' : 'Quarterly check-ins, annual review'],
    ['pip', 'Improvement-plan length', pace >= 8 ? '45–60 days' : pace >= 5 ? '60–90 days' : '90 days'],
    ['tiers', 'Reward tiers where ranking is allowed', `${tiers}${pace >= R.cutthroat_pace_at_least ? ' (cutthroat)' : ''}`],
    ['sales', 'Sales India verdict', `${sales?.label || '—'}`],
    ['blend', 'Assembly method blend', `${asm?.methods.label || '—'} (${asm?.methods.items.map((i) => `${i.name} ${i.pct}`).join(' / ') || ''})`],
    ['learn', 'Protected learning time', `${ctx.out.protectedLearningPct}% of hours (never 0)`],
    ['gates', 'Compliance gates', risk <= 4 ? 'On by default for every role' : 'On for safety and selling roles'],
    ['okr', 'R&D goals', inn >= 7 ? 'OKRs with a stretch shield' : 'KPIs with milestone reviews'],
    ['team', 'Team rewards', team >= 7 ? 'Bigger gainsharing pool for plant teams' : 'Standard gainsharing'],
    ['cust', 'Customer weight', cust >= 7 ? 'NPS / CSAT weighted up in sales and service' : 'Standard customer weights'],
    ['cost', 'Budget guard', cost >= 8 ? 'Strict: payouts rescale to the pool' : 'Advisory'],
  ];
}
const personalityHtml = (ctx) => personality(ctx).map(([k, l, v]) => `<div class="hbar" data-k="${k}" style="grid-template-columns:200px 1fr"><span class="lab">${esc(l)}</span><b style="font-size:13px">${esc(v)}</b></div>`).join('');
const SHORT = { pace: 'Pace', innovation: 'Innovation', cost_focus: 'Cost', team_orientation: 'Team', risk_appetite: 'Risk', customer_intimacy: 'Customer' };
const radarHtml = (o) => radar(SLIDERS.map(([k]) => ({ label: SHORT[k], value: Number(o[k]) || 0 })), { max: 10, color: '#ff5a5f', size: 280 });

export default {
  render(ctx) {
    const o = ctx.out.org;
    const bsc = BSC[o.industry] || BSC['ev-auto'];
    const kpi = (id) => ctx.idx.kpi.get(id);
    return `
      ${UI.pageHead({ eyebrow: 'M1 · Strategy DNA', title: 'Vision first. <em>Everything else follows.</em>', sub: 'Move a slider and the PMS re-tunes itself: review rhythm, ranking tiers, method blends and learning time all come from the strategy, not from habit.' })}
      <div class="grid g2">
        <div class="card"><div class="cap"></div><h4>Vision</h4><p style="font-family:var(--display);font-size:22px;line-height:1.3">${esc(o.vision)}</p>
          <h4 class="mt">Mission</h4><p class="why" style="color:inherit">${esc(o.mission)}</p>
          <h4 class="mt">Values · SPARK</h4><div class="chips">${String(o.values || '').split(';').map((v) => `<span class="tag info">${esc(v)}</span>`).join('')}</div></div>
        <div class="card" id="dnaSliders"><h4>Strategy DNA (1–10)</h4>
          ${SLIDERS.map(([k, l]) => `<div class="slider-row"><label for="s-${k}">${esc(l)}</label><input type="range" min="1" max="10" step="1" id="s-${k}" data-k="${k}" value="${esc(o[k])}"><output id="o-${k}">${esc(o[k])}</output></div>`).join('')}
          <div class="row mt"><button class="btn light sm" id="dnaReset">Reset to VoltBridge</button><span class="why small">Changes re-run the engine for every screen.</span></div></div>
      </div>
      <div class="grid g12 mt">
        <div class="card"><h4>DNA shape</h4><div id="dnaRadar">${radarHtml(o)}</div></div>
        <div class="card"><h4>Your PMS personality (live)</h4><div id="persona">${personalityHtml(ctx)}</div></div>
      </div>
      <div class="card mt"><h3 class="s">Goal cascade: vision → scorecard → departments → KPIs</h3>
        <div class="cascade" id="cascade"><svg class="links" id="links"></svg>
          <div><div class="ccard" data-n="vision" style="--cc:#14151c"><b>VISION</b>${esc(o.vision)}</div></div>
          <div>${bsc.map((b) => `<div class="ccard" data-n="${b[0]}" style="--cc:${b[3]}"><b>${esc(b[1].toUpperCase())}</b>${esc(b[2])}</div>`).join('')}</div>
          <div>${DEPTS.map((d) => `<div class="ccard" data-n="${d[0]}" data-from="${d[2].join(' ')}" style="--cc:${bsc.find((b) => b[0] === d[2][0])[3]}"><b>${esc(d[1].toUpperCase())}</b>${d[2].map((x) => esc(bsc.find((b) => b[0] === x)[1])).join(' · ')}</div>`).join('')}</div>
          <div>${DEPTS.map((d) => `<div class="ccard" data-from="${d[0]}" style="--cc:#c6c8d6">${d[3].map((id) => kpi(id) ? `• ${esc(kpi(id).kpi_name)} <span class="muted">(${esc(kpi(id).role_id)})</span>` : '').join('<br>')}</div>`).join('')}</div>
        </div></div>`;
  },
  mount(root, ctx) {
    const drawLinks = () => {
      const box = root.querySelector('#cascade'), svg = root.querySelector('#links');
      if (!box || !svg || innerWidth < 900) return;
      const B = box.getBoundingClientRect();
      const node = (n) => box.querySelector(`[data-n="${n}"]`);
      const paths = [];
      const link = (a, b, color) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const x1 = ra.right - B.left, y1 = ra.top + ra.height / 2 - B.top, x2 = rb.left - B.left, y2 = rb.top + rb.height / 2 - B.top, mx = (x1 + x2) / 2;
        paths.push(`<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity=".55"/>`);
      };
      const bscCards = [...box.children[2].children];
      bscCards.forEach((c) => link(node('vision'), c, '#14151c'));
      const deptCards = [...box.children[3].children];
      deptCards.forEach((d) => d.dataset.from.split(' ').forEach((f) => link(node(f), d, getComputedStyle(node(f)).getPropertyValue('--cc'))));
      [...box.children[4].children].forEach((k) => link(node(k.dataset.from), k, '#8d91a6'));
      svg.innerHTML = paths.join('');
      if (!RM) svg.querySelectorAll('path').forEach((p, i) => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 0.9, delay: 0.3 + i * 0.03, ease: 'power2.out' }); });
    };
    setTimeout(drawLinks, RM ? 0 : 350);
    root.querySelectorAll('input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => { root.querySelector(`#o-${inp.dataset.k}`).textContent = inp.value; });
      inp.addEventListener('change', () => {
        const before = Object.fromEntries(personality(ctx).map(([k, , v]) => [k, v]));
        ctx.state.org[inp.dataset.k] = Number(inp.value);
        ctx.rerun(false);
        root.querySelector('#persona').innerHTML = personalityHtml(ctx);
        root.querySelector('#dnaRadar').innerHTML = radarHtml(ctx.out.org);
        animateCharts(root.querySelector('#dnaRadar'));
        const changed = [];
        personality(ctx).forEach(([k, l, v]) => { if (before[k] !== v) { changed.push(`<span>${esc(l)}:</span> ${esc(before[k])} → <b>${esc(v)}</b>`); const el = root.querySelector(`#persona [data-k="${k}"]`); if (el && !RM) gsap.fromTo(el, { backgroundColor: 'rgba(255,90,95,.18)' }, { backgroundColor: 'rgba(255,90,95,0)', duration: 1.6 }); } });
        if (changed.length) UI.showChanges([`<b>${esc(inp.dataset.k.replace('_', ' '))} → ${inp.value}</b>`, ...changed]);
      });
    });
    root.querySelector('#dnaReset').addEventListener('click', () => { ctx.state.org = {}; ctx.rerun(true); UI.toast('Strategy DNA reset to the VoltBridge defaults.'); });
  },
};
