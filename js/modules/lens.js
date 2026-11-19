// M10 Country Lens: Off (India only) · Compare (side by side) · Built-in (whole app re-runs; editable config).
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
const FACE_ROWS = [['performance_year', 'Performance year'], ['review_window', 'Review window'], ['year_end_reward', 'Year-end reward'], ['feedback_style', 'Feedback style'], ['law_in_force', 'Law in force']];
const STATUS = (note) => (String(note).includes('✅') ? '<span class="tag good">✅ checked</span>' : String(note).includes('⚠️') ? '<span class="tag warn">⚠️ verify</span>' : '');

export default {
  nextNote: 'See every person behind the numbers',
  render(ctx) {
    const mode = ctx.sel('lensMode', 'compare');
    const chen = ctx.out.personas.find((p) => p.key === 'chen')?.emp_id;
    const pid = ctx.pickPerson('lensPerson', chen);
    const base = ctx.row(pid);
    const cfg = ctx.idx.country;
    const rowIn = ctx.outFor('IN').employees.find((r) => r.emp.emp_id === pid);
    const rowCn = ctx.outFor('CN').employees.find((r) => r.emp.emp_id === pid);
    const face = (c, row) => `<div class="eyebrow" style="margin-bottom:6px">${UI.code(c)} ${c === 'IN' ? 'India' : 'China'} rules</div><h3 class="s" style="font-size:26px">${esc(base.emp.name)}</h3><p class="why">${esc(base.title)} · ${esc(base.emp.site)} · composite ${UI.fmt(base.result.composite)} · ${row?.tier ? `${row.tier.tier} tier (${row.tier.position} of ${row.tier.of})` : 'no tier'}</p>
      ${FACE_ROWS.map(([k, l]) => `<div class="lrow"><span>${esc(l)}</span><b>${esc(cfg[k]?.[c])}</b></div>`).join('')}
      <div class="lrow"><span>If in the bottom tier</span><b style="color:${c === 'CN' ? '#ffd166' : '#ff8a8d'}">${esc(row?.bottomTierAction?.text || cfg.bottom_tier_action?.[c])}</b></div>
      <div class="lrow"><span>Feedback script</span><b>${c === 'CN' ? 'One-to-one, private. Start with the team\'s results, then the gap and the training offer.' : 'Direct, with the data. Agree a documented improvement plan with dates.'}</b></div>`;
    const showCn = ctx.state.lens === 'CN' || (ctx.state.lens === 'home' && base.emp.country === 'CN');
    const rid = ctx.sel('lensRole', 'SAL');
    const roles = [...ctx.idx.role.values()].filter((r) => r.role_id !== 'EXE');
    const same = ['IN', 'CN'].map((c) => {
      const pool = ctx.outFor('home').pools.find((p) => p.role_id === rid && p.homeCountry === c);
      const rs = ctx.outFor('home').employees.filter((r) => r.emp.role_id === rid && r.emp.country === c);
      const avg = (f) => (rs.length ? rs.reduce((s, r) => s + (f(r) || 0), 0) / rs.length : null);
      return { c, pool, n: rs.length, comp: avg((r) => r.result.composite), pay: avg((r) => r.rewards?.total), cur: rs[0]?.emp.currency };
    });
    const editable = mode === 'built';
    return `
      ${UI.pageHead({ eyebrow: 'M10 · Country Lens', title: 'Same person, same data. <em>Two countries, two rulebooks.</em>', sub: 'India and China differ on the performance year, how bonuses are paid, how feedback is given and, most of all, what may happen to the bottom tier. The lens covers all three readings of the brief: off, compare and built-in.' })}
      <div class="seg mb" id="lensMode">${[['off', 'Off · India only'], ['compare', 'Compare side by side'], ['built', 'Built-in · edit the rules']].map(([k, l]) => `<button class="${k === mode ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      ${mode === 'off' ? `<div class="card"><h3 class="s">${UI.code('IN')} Single-country PMS</h3><p class="why">Everything runs on Indian rules: ${esc(cfg.performance_year?.IN)}; ${esc(cfg.year_end_reward?.IN)}; ${esc(cfg.law_in_force?.IN)}. Switch to Compare to see what China changes, or use the IN / CN buttons in the top bar to re-run the whole app.</p></div>` : ''}
      <div class="grid g21 ${mode === 'off' ? 'mt' : ''}">
        <div class="dark-card"><div class="row between mb"><select class="sel" id="lensWho">${ctx.out.personas.map((p) => `<option value="${p.emp_id}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row?.emp.name)} · ${esc(p.row?.title)}</option>`).join('')}</select>${mode === 'off' ? '' : `<button class="btn pri sm" id="flipLens">⇄ Flip to ${showCn ? 'India' : 'China'}</button>`}</div>
          <div class="flipwrap dark"><div class="flip" id="lensFlip"><div class="face front">${face('IN', rowIn)}</div><div class="face back">${face('CN', rowCn)}</div></div></div></div>
        <div class="card"><h4>What changes for ${esc(base.emp.name.split(' ')[0])}</h4><ul class="dots">${FACE_ROWS.map(([k, l]) => `<li><b>${esc(l)}:</b> ${esc(cfg[k]?.IN)} → ${esc(cfg[k]?.CN)}</li>`).join('')}<li><b>Bottom tier:</b> ${esc(rowIn?.bottomTierAction?.text || '—')} → ${esc(rowCn?.bottomTierAction?.text || '—')}</li></ul>
          <p class="why mt">China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18 (2013): a low ranking alone is not a lawful dismissal ground; the employer must train or reassign first. India: the Labour Codes in force since 21 Nov 2025 frame a documented process.</p>
          <div class="row mt"><button class="btn light sm" data-lensgo="IN">Run the whole app on ${UI.code('IN')}</button><button class="btn light sm" data-lensgo="CN">on ${UI.code('CN')}</button><button class="btn light sm" data-lensgo="home">Home rules</button></div></div>
      </div>
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h3 class="s" style="margin:0">Same role, India vs China</h3><select class="sel" id="lensRole">${roles.map((r) => `<option value="${r.role_id}"${r.role_id === rid ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div>
        <div class="grid g2 mt">${same.map((s) => `<div class="cmp"><div class="row between"><b>${UI.code(s.c)} ${s.c === 'IN' ? 'India' : 'China'}</b><span class="small muted">${s.n} people</span></div>${s.n ? `<div class="kv mt"><dt>Ranking</dt><dd>${esc(UI.VERDICT_SHORT[s.pool?.verdict])} (${s.pool?.poolSize} comparable)</dd><dt>Method blend</dt><dd>${esc(s.pool?.methods.label)}</dd><dt>Avg composite</dt><dd>${UI.fmt(s.comp)}</dd><dt>Avg variable pay</dt><dd>${UI.money(s.pay, s.cur)}</dd><dt>Bonus timing</dt><dd>${esc(cfg.year_end_reward?.[s.c])}</dd><dt>Bottom tier</dt><dd>${esc(s.pool?.bottomTierAction || 'No tiers in this pool')}</dd></div>` : '<p class="why mt">No one in this role here.</p>'}</div>`).join('')}</div></div>` : ''}
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h3 class="s" style="margin:0">Country configuration ${editable ? '(edit a cell, the app re-runs)' : ''}</h3>${editable ? '<button class="btn light sm" id="cfgReset">Reset</button>' : '<button class="btn light sm" data-m2="built">Edit these rules →</button>'}</div>
        <div style="overflow-x:auto" class="mt"><table class="tbl" id="cfgTbl"><thead><tr><th>Parameter</th><th>${UI.code('IN')} India</th><th>${UI.code('CN')} China</th><th>Status</th></tr></thead><tbody>
        ${ctx.data.Country_Config.filter((r) => !['bottom_tier_action_code', 'currency', 'fy_start_month'].includes(r.key)).map((r) => `<tr><td><b>${esc(r.key.replace(/_/g, ' '))}</b></td>${['india_value', 'china_value'].map((f) => `<td class="small">${editable ? `<input value="${esc(r[f])}" data-key="${esc(r.key)}" data-f="${f}">` : esc(r[f])}</td>`).join('')}<td>${STATUS(r.note)}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">⚠️ rows are common practice that still need a source check before the final submission. No maps are used: country chips only.</p></div>` : ''}`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#lensMode [data-m], [data-m2]').forEach((b) => b.addEventListener('click', () => ctx.setSel('lensMode', b.dataset.m || b.dataset.m2)));
    root.querySelector('#lensWho').addEventListener('change', (e) => ctx.setSel('lensPerson', e.target.value));
    root.querySelector('#lensRole')?.addEventListener('change', (e) => ctx.setSel('lensRole', e.target.value));
    root.querySelectorAll('[data-lensgo]').forEach((b) => b.addEventListener('click', () => document.querySelector(`#lensSeg [data-lens="${b.dataset.lensgo}"]`)?.click()));
    const flip = root.querySelector('#lensFlip');
    const base = ctx.row(root.querySelector('#lensWho').value);
    let cn = ctx.state.lens === 'CN' || (ctx.state.lens === 'home' && base.emp.country === 'CN');
    if (ctx.sel('lensMode', 'compare') === 'off') cn = false;
    gsap.set(flip, { rotationY: cn ? 180 : 0 });
    const fit = () => { if (!flip.isConnected) { removeEventListener('resize', fit); return; } flip.style.minHeight = `${Math.max(...[...flip.querySelectorAll('.face')].map((f) => f.scrollHeight)) + 4}px`; };
    fit(); addEventListener('resize', fit);
    const btn = root.querySelector('#flipLens');
    btn?.addEventListener('click', () => {
      cn = !cn;
      gsap.to(flip, { rotationY: cn ? 180 : 0, duration: RM ? 0 : 0.9, ease: 'power3.inOut' });
      btn.textContent = `⇄ Flip to ${cn ? 'India' : 'China'}`;
      const face = flip.querySelector(cn ? '.back' : '.front');
      if (!RM) gsap.from(face.querySelectorAll('.lrow'), { opacity: 0, x: 18, stagger: 0.07, duration: 0.4, delay: 0.45 });
    });
    root.querySelectorAll('#cfgTbl input').forEach((inp) => inp.addEventListener('change', () => {
      const row = ctx.state.data.Country_Config.find((r) => r.key === inp.dataset.key);
      row[inp.dataset.f] = inp.value;
      ctx.rerun(true);
      UI.showChanges([`<b>${esc(inp.dataset.key.replace(/_/g, ' '))} (${inp.dataset.f === 'india_value' ? 'India' : 'China'})</b>`, `<span>now:</span> ${esc(inp.value)}`, '<span>Every screen that reads this row has re-run.</span>']);
    }));
    root.querySelector('#cfgReset')?.addEventListener('click', () => { ctx.state.data.Country_Config = structuredClone(ctx.state.sample.Country_Config); ctx.rerun(true); UI.toast('Country rules reset.'); });
  },
};
