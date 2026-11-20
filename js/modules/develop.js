// M8 Development Studio + Training Engine: 9-box → tracks, IDP 70-20-10, vision-linked capability map, TNA → method → Kirkpatrick.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
const BOXES = [
  [3, 'low', 'Rough diamond', 'Grow'], [3, 'mid', 'Future star', 'Accelerate'], [3, 'high', 'Star', 'Accelerate'],
  [2, 'low', 'Inconsistent', 'Stabilise'], [2, 'mid', 'Core player', 'Grow'], [2, 'high', 'High performer', 'Accelerate'],
  [1, 'low', 'Under-performer', 'Stabilise'], [1, 'mid', 'Effective', 'Grow'], [1, 'high', 'Trusted professional', 'Specialist'],
];
const CAPS = [
  ['Cell chemistry', ['TC-05'], ['BRD'], '#e0a800'],
  ['Power electronics', ['TC-06'], ['CFT', 'BRD'], '#ff9f43'],
  ['OTA software', ['TC-07'], ['SWE'], '#20b8e0'],
  ['Consultative EV selling', ['TC-08'], ['SAL'], '#1dab84'],
  ['High-voltage safety', ['TC-01', 'TC-02'], ['ASM', 'QIN', 'CFT'], '#e5484d'],
  ['India–China collaboration', ['TC-12', 'TC-13'], ['BRD', 'SWE', 'SCM', 'PLM'], '#8b5cf6'],
];
const BUCKET = { 70: ['Experience', 'stretch work, projects, rotations'], 20: ['Exposure', 'coaching, mentoring, feedback'], 10: ['Education', 'courses and certification'] };

export default {
  nextNote: 'Leadership: born 30, built 70',
  render(ctx) {
    const out = ctx.out, emps = out.employees;
    const cf = ctx.sel('nbCountry', 'all');
    const pop = emps.filter((r) => r.nineBox && (cf === 'all' || r.emp.country === cf));
    const personaIds = new Set(out.personas.map((p) => p.emp_id));
    const box = ctx.sel('nbBox', 'Star');
    const inBox = pop.filter((r) => r.nineBox.label === box).sort((a, b) => b.result.composite - a.result.composite);
    const pid = ctx.pickPerson('devPerson', ctx.personaId('arjun'));
    const r = ctx.row(pid);
    if (!r) return `${UI.pageHead({ eyebrow: 'M8 · Development Studio + Training Engine', title: 'No scored people yet', sub: 'Load an organisation in the Data Hub.' })}`;
    ctx.state.sel.devPerson = pid;
    const goals = ctx.idx.devGoals.get(pid) || [];
    const done = (ids, roles) => {
      const ppl = emps.filter((x) => roles.includes(x.emp.role_id));
      const has = ppl.filter((x) => (ctx.idx.training.get(x.emp.emp_id) || []).some((t) => t.completed_on && ids.includes(t.course_id)));
      return { n: ppl.length, k: has.length, pct: ppl.length ? (has.length / ppl.length) * 100 : 0 };
    };
    // VoltBridge's six vision capabilities; any other organisation gets one bar per capability in its training catalogue.
    const catalogue = [...ctx.idx.course.values()];
    const evCaps = CAPS.every(([, ids]) => ids.some((id) => ctx.idx.course.has(id)));
    const PAL = ['#e0a800', '#ff9f43', '#20b8e0', '#1dab84', '#e5484d', '#8b5cf6'];
    const allRoles = ctx.roles().map((x) => x.role_id);
    const caps = evCaps
      ? CAPS.map(([name, ids, roles, col]) => ({ name, ids, roles, col, ...done(ids, roles) }))
      : catalogue.slice(0, 8).map((c, i) => ({ name: c.capability || c.course_id, ids: [c.course_id], roles: allRoles, col: PAL[i % 6], ...done([c.course_id], allRoles) }));
    const orgGaps = caps.filter((c) => c.pct < 60);
    const role = ctx.idx.role.get(r.emp.role_id) || {};
    const withGaps = emps.filter((x) => x.tna.gaps.length);
    const gapSrc = {}; for (const x of withGaps) for (const g of x.tna.gaps) gapSrc[g.source] = (gapSrc[g.source] || 0) + 1;
    const topSrc = Object.entries(gapSrc).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const T = ctx.rules.training;
    const cat = [...ctx.idx.course.values()];
    const kp = out.kirkpatrick.map((k) => {
      const kpi = k.l4Kpi && ctx.idx.kpi.get(k.l4Kpi);
      if (!kpi) return { ...k, lift: null };
      const ppl = emps.filter((x) => x.emp.role_id === kpi.role_id);
      const sc = (x) => x.result.items.find((i) => i.kpi_id === kpi.kpi_id)?.score;
      const took = ppl.filter((x) => (ctx.idx.training.get(x.emp.emp_id) || []).some((t) => t.course_id === k.course_id && t.completed_on));
      const not = ppl.filter((x) => !took.includes(x));
      const avg = (a) => { const v = a.map(sc).filter((s) => s != null); return v.length ? v.reduce((s, q) => s + q, 0) / v.length : null; };
      const a = avg(took), b = avg(not);
      return { ...k, kpiName: kpi.kpi_name, lift: a !== null && b !== null ? a - b : null };
    });
    return `
      ${UI.pageHead({ eyebrow: 'M8 · Development Studio + Training Engine', title: 'From a rating <em>to a plan.</em>', sub: `Performance × potential places everyone on a track. Each track gets a 70-20-10 plan tied to the capabilities ${esc(out.org.org_name || 'the organisation')}'s vision needs. Training is chosen by the type of gap and checked at four levels.` })}
      <div class="grid g21">
        <div class="card"><div class="row between"><h2 class="s" style="margin:0">9-box: performance × potential</h2><div class="seg" id="nbC" role="group" aria-label="Country filter">${[['all', 'All'], ['IN', 'IN'], ['CN', 'CN']].map(([k, l]) => `<button class="${k === cf ? 'on' : ''}" data-c="${k}" aria-pressed="${k === cf}">${l}</button>`).join('')}</div></div>
          <div class="ninebox mt">${[3, 2, 1].map((pot) => `<div class="axis y">${['', 'Lower', 'Medium', 'High'][pot]}</div>${BOXES.filter((b) => b[0] === pot).map(([p, perf, label, track]) => { const ppl = pop.filter((x) => x.nineBox.label === label); return `<div class="nb${['Star', 'Future star', 'High performer'].includes(label) ? ' top3' : ''}${label === box ? ' on' : ''}" data-box="${esc(label)}" aria-pressed="${label === box}"><b>${esc(label)}</b><small>${esc(track)}</small><div class="dots">${ppl.slice(0, 60).map((x) => `<i class="${personaIds.has(x.emp.emp_id) ? 'p' : ''}" title="${esc(x.emp.name)}"></i>`).join('')}</div><div class="n">${ppl.length}<span class="sr-only"> people</span></div></div>`; }).join('')}`).join('')}
            <div></div><div class="axis">Performance: low</div><div class="axis">mid</div><div class="axis">high</div></div>
          <p class="why mt">Potential means learning agility (1–3 in the data), not this year's results. A failed gate puts performance in "low" whatever the score. Purple dots are personas.</p></div>
        <div class="card"><h2 class="h4">${esc(box)} · ${inBox.length} people</h2><p class="why">Track: <b>${esc(BOXES.find((b) => b[2] === box)?.[3])}</b>. ${{ Accelerate: `Stretch roles, rotations, a sponsor; on the leadership track (growth carries ${ctx.rules.built70.weights.leadership.growth}%).`, Grow: 'Build depth in the current role with a 70-20-10 plan.', Specialist: 'Expert track (e.g. "Tech Fellow") instead of forcing people management.', Stabilise: 'Clear expectations, coaching and a support plan; in China training/reassignment comes first.' }[BOXES.find((b) => b[2] === box)?.[3]]}</p>
          <div class="list mt" style="max-height:440px;overflow:auto">${inBox.slice(0, 40).map((x) => `<div class="li" data-person="${esc(x.emp.emp_id)}">${UI.avatar(x.emp.name)}<div class="grow"><b>${esc(x.emp.name)}${personaIds.has(x.emp.emp_id) ? '<span class="persona-dot"></span>' : ''}</b><small>${esc(x.title)} · ${esc(x.emp.site)}${x.emp.flight_risk === 'H' ? ' · <span style="color:#b4232c">flight risk</span>' : ''}</small></div>${UI.rate(x.result.rating, x.result.capped)}</div>`).join('') || '<p class="why">Nobody here.</p>'}</div></div>
      </div>
      <div class="card mt"><div class="row between"><h2 class="s" style="margin:0">Individual development plan · 70-20-10</h2><label class="sr-only" for="devWho">Person</label><select class="sel" id="devWho">${(out.personas.some((p) => p.row) ? out.personas.filter((p) => p.row).map((p) => p.row) : emps.slice(0, 300)).map((x) => `<option value="${esc(x.emp.emp_id)}"${x.emp.emp_id === pid ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.title)}</option>`).join('')}${(out.personas.some((p) => p.row) ? ctx.personaKey(pid) : emps.slice(0, 300).includes(r)) ? '' : `<option value="${esc(pid)}" selected>${esc(r.emp.name)}</option>`}</select></div>
        <div class="idp mt" id="idp"><svg class="idp-line" aria-hidden="true" viewBox="0 0 1000 40" preserveAspectRatio="none"><path d="M10,20 C250,0 350,40 500,20 S800,0 990,20" fill="none" stroke="var(--mc)" stroke-width="3" stroke-dasharray="6 6"/></svg>
          ${[70, 20, 10].map((b) => { const gs = goals.filter((g) => Number(g.bucket) === b); return `<div class="idp-col"><div class="idp-h"><b>${b}%</b> ${esc(BUCKET[b][0])}<small>${esc(BUCKET[b][1])}</small></div>${gs.map((g) => `<div class="goal"><b>${esc(g.goal)}</b><div class="row between small muted"><span>Due ${esc(g.due)}</span><span>${g.feedback_source_id ? '✓ feedback source' : '⚠ no feedback source'}</span></div>${UI.bar(Number(g.progress_pct), b === 70 ? '#8b5cf6' : b === 20 ? '#20b8e0' : '#e0a800')}<div class="small" style="text-align:right;font-weight:800">${esc(g.progress_pct)}%</div></div>`).join('') || `<div class="goal sugg"><b>Suggested</b><span class="small">${{ 70: 'A stretch role or project (e.g. lead a pilot), logged as a passport experience with a feedback source.', 20: 'A named mentor or coach, plus a mid-year 360° check-in.', 10: 'A course matched to the gap in the Training Engine below.' }[b]}</span></div>`}</div>`; }).join('')}</div>
        <p class="why mt">${esc(r.emp.name)} · 9-box <b>${esc(r.nineBox?.label)}</b> (${esc(r.nineBox?.track)}) · Growth score ${UI.fmt(r.result.growth, 1)} / 5. ${r.tna.gaps.length ? `Training need: ${r.tna.gaps.map((g) => `${esc(g.source)} → ${g.courses.map((c) => esc(c.name)).join(', ') || 'coaching'}`).join('; ')}.` : 'No KPI or competency below 2.5, so no mandatory training; the plan is about growth.'}</p></div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="s">Vision → capabilities → gaps</h2><p class="why">${evCaps ? `"${esc(out.org.vision)}" needs ${caps.length} capabilities. Bars show the share of people in the roles that need each one who have completed the matching training.` : 'One bar per capability in the training catalogue: the share of all scored people who have completed it.'}</p>
          ${caps.map((c) => `<div class="hbar cap"><span class="lab">${esc(c.name)}</span>${UI.bar(c.pct, c.col)}<span class="val">${UI.fmt(c.pct, 0)}% <small class="muted">${c.k}/${c.n}</small></span></div>`).join('') || '<p class="why">No training catalogue in the loaded data.</p>'}
          <p class="why mt">${evCaps ? 'Scorecard target: 40% of technical roles certified on high voltage. ' : ''}Gaps under 60% become organisation-level training needs.</p></div>
        <div class="card"><h2 class="s">Training needs at three levels</h2><p class="why">McGehee & Thayer (1961): organisation → task → person.</p>
          <div class="funnel mt">
            <div style="--fw:100%;--fc:#8b5cf6"><b>Organisation</b><span>${orgGaps.length} capability gaps: ${orgGaps.map((c) => esc(c.name)).join(', ') || 'none'}</span></div>
            <div style="--fw:84%;--fc:#5f7cff"><b>Task · ${esc(role.title || '')}</b><span>Skills: ${esc(String(role.skills || '—').split(';').slice(0, 3).join(', '))}</span></div>
            <div style="--fw:68%;--fc:#20b8e0"><b>Person</b><span>${withGaps.length} people with a gap below 2.5. ${topSrc.length ? `Top: ${topSrc.map(([s, k]) => `${esc(s)} (${k})`).join(', ')}` : ''}</span></div>
          </div></div>
      </div>
      <div class="card mt"><h2 class="s">Match the gap to the mechanism</h2><div class="grid g4">${Object.entries(T.mechanism_by_gap).map(([gap, mechs]) => `<div class="mech"><span class="tag ${gap === 'compliance' ? 'bad' : gap === 'behaviour' ? 'purple' : gap === 'skill' ? 'warn' : 'info'}">${esc(gap)}</span><b>${mechs.map(esc).join(' · ')}</b><ul class="dots">${cat.filter((c) => c.gap_type === gap).map((c) => `<li>${esc(c.capability)} <span class="muted small">${esc(c.mode)}, ${esc(c.duration_hrs)} h</span></li>`).join('')}</ul></div>`).join('')}</div>
        <p class="why mt">Apprenticeships in India can run under NAPS (⚠️ verify scheme terms). Cross-border rotation Shenzhen ⇄ Pune is the premium behaviour mechanism in both countries.</p></div>
      <div class="card mt"><h2 class="s">Did the training work? Kirkpatrick, four levels</h2><div class="tbl-wrap"><table class="tbl" id="kirk"><thead><tr><th scope="col">Course</th><th scope="col">Done</th><th scope="col">L1 Reaction</th><th scope="col">L2 Learning</th><th scope="col">L3 Behaviour seen</th><th scope="col">L4 Results (KPI)</th></tr></thead><tbody>
        ${kp.map((k) => `<tr><td><b>${esc(k.name)}</b></td><td>${k.completions}</td><td>${UI.bar((k.l1 / 5) * 100, '#e0a800')}<small>${UI.fmt(k.l1, 1)} / 5</small></td><td>${UI.bar(k.l2, '#1dab84')}<small>${UI.fmt(k.l2, 0)}%</small></td><td>${UI.bar(k.l3Pct, '#5f7cff')}<small>${UI.fmt(k.l3Pct, 0)}%</small></td><td class="small">${k.lift === null ? '—' : `${esc(k.kpiName)}: <b style="color:${k.lift >= 0 ? '#0b7a5b' : '#b4232c'}">${k.lift >= 0 ? '+' : ''}${UI.fmt(k.lift, 2)}</b> vs those who did not`}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">The loop: L3 and L4 evidence feeds the Growth part of next year's scorecard. L4 here compares the linked KPI score of people who took the course with colleagues in the same role who did not (a signal, not proof).</p></div>`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#nbC [data-c]').forEach((b) => b.addEventListener('click', () => ctx.setSel('nbCountry', b.dataset.c)));
    root.querySelectorAll('[data-box]').forEach((b) => b.addEventListener('click', () => ctx.setSel('nbBox', b.dataset.box)));
    root.querySelector('#devWho')?.addEventListener('change', (e) => ctx.setSel('devPerson', e.target.value));
    if (RM) return;
    gsap.from(root.querySelectorAll('.nb .dots i'), { scale: 0, duration: 0.3, stagger: { each: 0.003, from: 'random' }, delay: 0.4 });
    const p = root.querySelector('.idp-line path');
    if (p) { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDashoffset: L, strokeDasharray: `${L} ${L}` }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', delay: 0.3, onComplete: () => p.setAttribute('stroke-dasharray', '6 6') }); }
    gsap.from(root.querySelectorAll('.goal'), { opacity: 0, y: 16, stagger: 0.08, duration: 0.45, delay: 0.6 });
    gsap.from(root.querySelectorAll('.funnel > div'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.15, delay: 0.3, ease: 'power3.out' });
  },
};
