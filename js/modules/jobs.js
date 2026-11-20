// M2 Job Architecture Studio: job analysis → JD → job specification → role profile (feeds M4 + M5).
import * as UI from '../ui.js';
import { radar, animateCharts } from '../charts.js';
const { esc, gsap, RM } = UI;
const list = (v) => String(v ?? '').split(';').map((s) => s.trim()).filter(Boolean);

export const PROFILE = [
  ['measurability', 'Measurability', 'Can output be counted fairly?'],
  ['interdependence', 'Interdependence', 'Does success depend on the team?'],
  ['standardisation', 'Standardisation', 'Is the work done to a fixed standard?'],
  ['innovation', 'Innovation', 'Is the work new and uncertain?'],
  ['talent_supply', 'Talent supply', 'How easy is it to hire for?'],
  ['digital_access', 'Digital access', 'Does the person work at a screen?'],
  ['seniority', 'Seniority', 'How senior is the role?'],
  ['regulatory_criticality', 'Regulatory criticality', 'Can a mistake hurt someone or break a law?'],
];
const JA_METHODS = {
  'Observation': 'Watching the work being done, station by station.',
  'time study': 'Timing each task against standard work.',
  'critical incidents': 'Collecting stories of moments that went very well or very badly.',
  'Interview': 'Structured interviews with job holders and their managers.',
  'questionnaire': 'A structured questionnaire (PAQ-style) filled by job holders.',
  'O*NET': 'Using the O*NET occupational database as a reference profile.',
  'functional job analysis': 'Breaking the job into what it does with data, people and things.',
  'Work sample': 'Scoring a realistic sample of the work.',
};
const poolOf = (ctx, rid) => ctx.out.pools.find((p) => p.role_id === rid && p.homeCountry === 'IN') || ctx.out.pools.find((p) => p.role_id === rid);

function profileRadar(role) {
  return radar(PROFILE.map(([k, l]) => ({ label: l.split(' ')[0], value: Number(role[k]) || 0 })), { max: 5, color: '#ff9f43', size: 300 });
}

export default {
  nextNote: 'Each JD becomes a weighted scorecard',
  render(ctx) {
    const rid = ctx.pickRole('role', 'ASM');
    if (!rid) return `${UI.pageHead({ eyebrow: 'M2 · Job Architecture Studio', title: 'No roles yet', sub: 'The loaded workbook has no roles. Add them in the Roles sheet and upload again in the Data Hub.' })}`;
    ctx.state.sel.role = rid;
    const role = ctx.idx.role.get(rid);
    const kpis = ctx.idx.kpisByRole.get(rid) || [];
    const comps = [...ctx.idx.competency.values()].filter((c) => list(c.role_ids).includes(rid));
    const depts = list(role.dept_id).map((d) => (ctx.data.Departments || []).find((x) => x.dept_id === d)).filter(Boolean);
    const n = ctx.out.employees.filter((r) => r.emp.role_id === rid);
    const pool = poolOf(ctx, rid);
    const persona = ctx.out.personas.find((p) => p.row?.emp.role_id === rid);
    const ja = Object.entries(JA_METHODS).filter(([k]) => String(role.job_analysis_method).toLowerCase().includes(k.toLowerCase()));
    const vc = pool ? UI.VERDICT_COLOR[pool.verdict] : '#8d91a6';
    return `
      ${UI.pageHead({ eyebrow: 'M2 · Job Architecture Studio', title: 'Job analysis first. <em>Then the JD, then the KPIs.</em>', sub: 'Every scorecard starts from what the job really is. The role profile at the bottom is what the Method Mixer and the Ranking Engine read.' })}
      <div class="chips mb" id="rolePick" role="group" aria-label="Choose a role">${ctx.roles().map((r) => `<button class="chipbtn${r.role_id === rid ? ' on' : ''}" data-role="${esc(r.role_id)}" aria-pressed="${r.role_id === rid}">${esc(r.title)}</button>`).join('')}</div>
      <div class="grid g21">
        <div class="flipwrap"><div class="flip" id="jdFlip">
          <div class="face front">
            <div class="row between"><div><div class="eyebrow" style="margin-bottom:4px">Job description · ${esc(role.role_id)}</div><h2 class="s" style="font-size:28px;margin:0">${esc(role.title)}</h2></div><button class="btn sm" id="flipBtn">Flip: KPIs & profile ↻</button></div>
            <div class="row mt"><span class="tag info">${esc(role.job_family)}</span><span class="tag">Grades ${esc(role.grade_band)}</span><span class="tag">${n.length} people</span>${role.leadership_track === 'Y' ? '<span class="tag purple">Leadership track</span>' : ''}</div>
            <h3 class="h4 mt">Purpose</h3><p style="font-family:var(--display);font-size:19px;line-height:1.35">${esc(role.purpose || '—')}</p>
            <h3 class="h4 mt">Key responsibilities</h3><ul class="dots">${list(role.responsibilities).map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Not given in the Roles sheet</li>'}</ul>
            <h3 class="h4 mt">Reports to</h3><p class="why">${depts.map((d) => { const head = ctx.idx.emp.get(d.head_emp_id); return `${esc(d.dept_name)} (${esc(d.site)}${head ? `, head: ${esc(head.name)}` : ''})`; }).join(' · ') || 'No department listed'}</p>
            <h3 class="h4 mt">Job specification (KSAOs)</h3>
            <div class="ksao">${[['K', 'Knowledge', role.knowledge], ['S', 'Skills', role.skills], ['A', 'Abilities', role.abilities], ['O', 'Other', role.other]].map(([k, l, v]) => `<div><b>${k}</b><span>${esc(l)}</span><div class="chips">${list(v).map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></div>`).join('')}</div>
          </div>
          <div class="face back" inert>
            <div class="row between"><div><div class="eyebrow" style="margin-bottom:4px">Scorecard · ${esc(role.role_id)}</div><h2 class="s" style="margin:0">${esc(role.title)}</h2></div><button class="btn light sm" id="flipBack">↻ Back to JD</button></div>
            <div class="grid g2 mt"><div>${kpis.map((k) => `<div class="hbar kpi-w"><span class="lab">${k.type === 'Gate' ? '🔒 ' : ''}${esc(k.kpi_name)}</span>${k.type === 'Gate' ? '<span class="tag bad">gate</span>' : UI.bar(Number(k.weight_pct), k.type === 'KR' ? '#8b5cf6' : '#ff9f43')}<span class="val">${k.type === 'Gate' ? '' : esc(k.weight_pct)}</span></div>`).join('') || '<p class="why">No KPIs for this role yet.</p>'}
              <p class="why mt">${kpis.some((k) => k.type === 'Gate') ? `A gate is pass/fail. Fail it and the rating is capped at ${ctx.out.mode.strictGates ? ctx.rules.dna.risk_appetite.strict_gate_rating_cap : ctx.rules.ranking.gate_fail_rating_cap}, however good the numbers.` : 'Weights add up to 100.'}</p></div>
              <div>${profileRadar(role)}</div></div>
            <h3 class="h4 mt">Competency profile (BARS anchors 1 → 5)</h3>
            ${comps.map((c) => `<div class="bars-row"><b>${esc(c.name)}</b><span>${esc(c.bars_1)}</span><span>${esc(c.bars_3)}</span><span>${esc(c.bars_5)}</span></div>`).join('') || '<p class="why">No competencies mapped to this role.</p>'}
          </div>
        </div></div>
        <div>
          <div class="card"><h2 class="h4">Job analysis method</h2><p style="font-weight:800">${esc(role.job_analysis_method || '—')}</p>
            <ul class="dots mt">${ja.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('') || '<li>Interview + questionnaire</li>'}</ul>
            <p class="why mt">Method chosen to fit the work: observable shop-floor work is watched and timed; knowledge work is interviewed; safety work adds critical incidents.</p></div>
          <div class="card mt"><h2 class="h4">What the engines decided</h2>
            ${pool ? `<dl class="kv"><dt>Appraisal blend</dt><dd>${esc(pool.methods.label)} · ${pool.methods.items.map((i) => `${esc(i.name)} ${i.pct}%`).join(', ')}</dd>
            <dt>Ranking</dt><dd><span class="tag" style="background:${vc}22;color:${vc}">${esc(UI.VERDICT_SHORT[pool.verdict])}</span></dd></dl>` : '<p class="why">No one holds this role yet, so there is no pool to judge.</p>'}
            <div class="row mt"><button class="btn light sm" id="toMixer">Method Mixer →</button>${pool ? '<button class="btn light sm" id="toRanking">Ranking Engine →</button>' : ''}</div></div>
          ${persona ? `<div class="card mt"><h2 class="h4">Persona in this role</h2><div class="li" data-person="${esc(persona.emp_id)}">${UI.avatar(persona.row.emp.name)}<div class="grow"><b>${esc(persona.row.emp.name)}</b><small>${esc(persona.row.title)}</small></div>${UI.rate(persona.row.result.rating, persona.row.result.capped)}</div></div>` : ''}
        </div>
      </div>
      <div class="card mt" id="profileCard"><div class="row between"><h2 class="s" style="margin:0">Role profile (1–5): tune it and watch the engines respond</h2><button class="btn light sm" id="profReset">Reset role</button></div>
        <div class="grid g2 mt">${PROFILE.map(([k, l, q]) => `<div class="slider-row wide-label"><label for="p-${k}">${esc(l)}<small class="muted">${esc(q)}</small></label><input type="range" min="1" max="5" step="1" id="p-${k}" data-k="${k}" value="${esc(role[k])}"><output for="p-${k}">${esc(role[k])}</output></div>`).join('')}</div></div>`;
  },
  mount(root, ctx) {
    const rid = ctx.state.sel.role;
    if (!rid || !root.querySelector('#jdFlip')) return;
    root.querySelectorAll('#rolePick [data-role]').forEach((b) => b.addEventListener('click', () => ctx.setSel('role', b.dataset.role)));
    const flip = root.querySelector('#jdFlip');
    const front = flip.querySelector('.front'), back = flip.querySelector('.back');
    let flipped = false;
    const doFlip = () => {
      flipped = !flipped;
      front.inert = flipped; back.inert = !flipped;
      gsap.to(flip, { rotationY: flipped ? 180 : 0, duration: RM ? 0 : 0.9, ease: 'power3.inOut' });
      if (flipped) animateCharts(back);
      (flipped ? root.querySelector('#flipBack') : root.querySelector('#flipBtn')).focus({ preventScroll: true });
    };
    root.querySelector('#flipBtn').addEventListener('click', doFlip);
    root.querySelector('#flipBack').addEventListener('click', doFlip);
    // The card is as tall as its taller face: nothing hides in an inner scroll area.
    const sizeFlip = () => { if (!flip.isConnected) return; flip.style.minHeight = `${Math.max(...[front, back].map((f) => f.scrollHeight)) + 2}px`; };
    sizeFlip();
    const onResize = () => sizeFlip();
    addEventListener('resize', onResize);
    ctx.onCleanup(() => removeEventListener('resize', onResize));
    if (!RM) gsap.from(root.querySelectorAll('.ksao .tag'), { scale: 0, opacity: 0, duration: 0.35, stagger: 0.02, delay: 0.5, ease: 'back.out(2)' });
    root.querySelector('#toMixer').addEventListener('click', (e) => { ctx.state.sel.mixRole = rid; ctx.go('methods', e); });
    root.querySelector('#toRanking')?.addEventListener('click', (e) => {
      const p = poolOf(ctx, rid);
      if (p) ctx.state.sel.pool = `${p.role_id}|${p.homeCountry}`;
      ctx.go('ranking', e);
    });
    const original = (ctx.base.Roles || []).find((r) => r.role_id === rid);
    root.querySelectorAll('#profileCard input[type=range]').forEach((inp) => {
      inp.addEventListener('input', () => { inp.nextElementSibling.textContent = inp.value; });
      inp.addEventListener('change', () => {
        const before = ctx.out;
        ctx.state.data.Roles.find((r) => r.role_id === rid)[inp.dataset.k] = Number(inp.value);
        ctx.rerun(true);
        ctx.changes(`<b>${esc(ctx.idx.role.get(rid).title)}: ${esc(PROFILE.find((p) => p[0] === inp.dataset.k)[1].toLowerCase())} → ${esc(inp.value)}</b>`, before);
      });
    });
    const reset = root.querySelector('#profReset');
    if (!original) reset.disabled = true;
    reset.addEventListener('click', () => {
      if (!original) return;
      const before = ctx.out;
      const r = ctx.state.data.Roles.find((x) => x.role_id === rid);
      for (const [k] of PROFILE) r[k] = original[k];
      ctx.rerun(true);
      ctx.changes(`<b>${esc(r.title)}: role profile reset to the loaded values</b>`, before);
    });
  },
};
