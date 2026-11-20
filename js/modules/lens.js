// M10 Country Lens: Off (India only) · Compare (side by side) · Built-in (whole app re-runs; editable config).
import * as UI from '../ui.js';
import { bottomTierAction } from '../engine/country.js';
const { esc, gsap, RM } = UI;
const FACE_ROWS = [['performance_year', 'Performance year'], ['review_window', 'Review window'], ['year_end_reward', 'Year-end reward'], ['feedback_style', 'Feedback style'], ['law_in_force', 'Law in force']];
const STATUS = (note) => (String(note).includes('✅') ? '<span class="tag good">✅ checked</span>' : String(note).includes('⚠️') ? '<span class="tag warn">⚠️ verify</span>' : '');
const COUNTRY = { IN: 'India', CN: 'China' };

export default {
  nextNote: 'See every person behind the numbers',
  render(ctx) {
    // "Off" is a single-country PMS: India's rules for everyone. If the top bar is switched away from India, the mode follows it.
    let mode = ['off', 'compare', 'built'].includes(ctx.sel('lensMode')) ? ctx.sel('lensMode') : 'compare';
    if (mode === 'off' && ctx.state.lens !== 'IN') { mode = 'compare'; ctx.state.sel.lensMode = 'compare'; }
    const pid = ctx.pickPerson('lensPerson', ctx.personaId('chen'));
    const base = ctx.row(pid);
    if (!base) return `${UI.pageHead({ eyebrow: 'M10 · Country Lens', title: 'No scored people yet', sub: 'Load an organisation in the Data Hub.' })}`;
    ctx.state.sel.lensPerson = pid;
    const cfg = ctx.idx.country;
    const rowIn = ctx.outFor('IN').employees.find((r) => r.emp.emp_id === pid);
    const rowCn = ctx.outFor('CN').employees.find((r) => r.emp.emp_id === pid);
    const face = (c, row) => `<div class="eyebrow" style="margin-bottom:6px">${UI.code(c)} ${COUNTRY[c]} rules</div><h2 class="s" style="font-size:26px">${esc(base.emp.name)}</h2><p class="why">${esc(base.title)} · ${esc(base.emp.site)} · composite ${UI.fmt(base.result.composite)} · ${row?.tier ? `${esc(row.tier.tier)} tier (${row.tier.position} of ${row.tier.of})` : 'no reward tier in this pool'}</p>
      <div class="lrow key"><span>If in the bottom tier</span><b style="color:${c === 'CN' ? '#ffd166' : '#ff8a8d'}">${esc(bottomTierAction(ctx.idx, c, ctx.out.cadence, ctx.rules.ranking.bottom_tier_action).text)}</b></div>
      ${FACE_ROWS.map(([k, l]) => `<div class="lrow"><span>${esc(l)}</span><b>${esc(cfg[k]?.[c] || '—')}</b></div>`).join('')}
      <div class="lrow"><span>Feedback script</span><b>${c === 'CN' ? 'One-to-one, private. Start with the team\'s results, then the gap and the training offer.' : 'Direct, with the data. Agree a documented improvement plan with dates.'}</b></div>`;
    const rid = ctx.pickRole('lensRole', 'SAL');
    const same = ['IN', 'CN'].map((c) => {
      const pool = ctx.outFor('home').pools.find((p) => p.role_id === rid && p.homeCountry === c);
      const rs = ctx.outFor('home').employees.filter((r) => r.emp.role_id === rid && r.emp.country === c);
      const avg = (f) => { const v = rs.map(f).filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
      return { c, pool, n: rs.length, comp: avg((r) => r.result.composite), pay: avg((r) => r.rewards?.total ?? null), cur: rs[0]?.emp.currency };
    });
    const editable = mode === 'built';
    const ps = ctx.out.personas.filter((p) => p.row);
    const byRole = new Map();
    for (const x of [...ctx.out.employees].sort((a, b) => String(a.emp.name).localeCompare(String(b.emp.name)))) { if (!byRole.has(x.title)) byRole.set(x.title, []); byRole.get(x.title).push(x); }
    return `
      ${UI.pageHead({ eyebrow: 'M10 · Country Lens', title: 'Same person, same data. <em>Two countries, two rulebooks.</em>', sub: 'India and China differ on the performance year, how bonuses are paid, how feedback is given and, most of all, what may happen to the bottom tier. The lens covers all three readings of the brief: off, compare and built-in.' })}
      <div class="seg mb" id="lensMode" role="group" aria-label="Country lens mode">${[['off', 'Off · India only'], ['compare', 'Compare side by side'], ['built', 'Built-in · edit the rules']].map(([k, l]) => `<button class="${k === mode ? 'on' : ''}" data-m="${k}" aria-pressed="${k === mode}">${l}</button>`).join('')}</div>
      ${mode === 'off' ? `<div class="card"><h2 class="s">${UI.code('IN')} Single-country PMS</h2><p class="why">The whole app now runs on India's rules (the top bar shows the IN lens): ${esc(cfg.performance_year?.IN)}; ${esc(cfg.year_end_reward?.IN)}; ${esc(cfg.law_in_force?.IN)}. Switch to Compare to see what China changes.</p></div>` : ''}
      <div class="grid g21 ${mode === 'off' ? 'mt' : ''}">
        <div class="dark-card"><div class="row between mb"><label class="sr-only" for="lensWho">Person</label><select class="sel" id="lensWho">${ps.length ? `<optgroup label="Personas">${ps.map((p) => `<option value="${esc(p.emp_id)}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`).join('')}</optgroup>` : ''}${[...byRole].map(([t, rs]) => `<optgroup label="${esc(t)}">${rs.map((x) => `<option value="${esc(x.emp.emp_id)}"${x.emp.emp_id === pid && !ctx.personaKey(pid) ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.emp.site)}</option>`).join('')}</optgroup>`).join('')}</select>${mode === 'off' ? '' : '<button class="btn pri sm" id="flipLens"></button>'}</div>
          <div class="flipwrap dark"><div class="flip" id="lensFlip"><div class="face front">${face('IN', rowIn)}</div><div class="face back">${face('CN', rowCn)}</div></div></div></div>
        <div class="card"><h2 class="h4">What changes for ${esc(String(base.emp.name).split(' ')[0])}</h2><ul class="dots">${FACE_ROWS.map(([k, l]) => `<li><b>${esc(l)}:</b> ${esc(cfg[k]?.IN || '—')} → ${esc(cfg[k]?.CN || '—')}</li>`).join('')}<li><b>Bottom tier:</b> ${esc(rowIn?.bottomTierAction?.text || 'not in the bottom tier')} → ${esc(rowCn?.bottomTierAction?.text || 'not in the bottom tier')}</li></ul>
          <p class="why mt">China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18 (2013): a low ranking alone is not a lawful dismissal ground; the employer must train or reassign first. India: the Labour Codes in force since 21 Nov 2025 frame a documented process.</p>
          <div class="row mt"><button class="btn light sm" data-lensgo="IN">Run the whole app on ${UI.code('IN')}</button><button class="btn light sm" data-lensgo="CN">on ${UI.code('CN')}</button><button class="btn light sm" data-lensgo="home">Home rules</button></div></div>
      </div>
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h2 class="s" style="margin:0">Same role, India vs China</h2><label class="sr-only" for="lensRole">Role</label><select class="sel" id="lensRole">${ctx.roles().map((r) => `<option value="${esc(r.role_id)}"${r.role_id === rid ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div>
        <div class="grid g2 mt">${same.map((s) => `<div class="cmp"><div class="row between"><b>${UI.code(s.c)} ${COUNTRY[s.c]}</b><span class="small muted">${s.n} people</span></div>${s.n ? `<dl class="kv mt"><dt>Ranking</dt><dd>${esc(UI.VERDICT_SHORT[s.pool?.verdict] || '—')} (${s.pool?.poolSize ?? 0} comparable)</dd><dt>Method blend</dt><dd>${esc(s.pool?.methods.label || '—')}</dd><dt>Avg composite</dt><dd>${UI.fmt(s.comp)}</dd><dt>Avg variable pay</dt><dd>${s.pay === null ? '—' : UI.money(s.pay, s.cur)}</dd><dt>Bonus timing</dt><dd>${esc(cfg.year_end_reward?.[s.c] || '—')}</dd><dt>Bottom tier</dt><dd>${esc(s.pool?.bottomTierAction || 'No tiers in this pool')}</dd></dl>` : '<p class="why mt">No one in this role here.</p>'}</div>`).join('')}</div></div>` : ''}
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h2 class="s" style="margin:0">Country configuration ${editable ? '(edit a cell, the app re-runs)' : ''}</h2>${editable ? '<button class="btn light sm" id="cfgReset">Reset</button>' : '<button class="btn light sm" data-m2="built">Edit these rules →</button>'}</div>
        <div class="tbl-wrap mt"><table class="tbl" id="cfgTbl"><thead><tr><th scope="col">Parameter</th><th scope="col">${UI.code('IN')} India</th><th scope="col">${UI.code('CN')} China</th><th scope="col">Status</th></tr></thead><tbody>
        ${(ctx.data.Country_Config || []).filter((r) => !['bottom_tier_action_code', 'currency'].includes(r.key)).map((r) => `<tr><th scope="row">${esc(String(r.key).replace(/_/g, ' '))}</th>${['india_value', 'china_value'].map((f) => `<td class="small">${editable ? `<input value="${esc(r[f])}" data-key="${esc(r.key)}" data-f="${f}" aria-label="${esc(`${String(r.key).replace(/_/g, ' ')}, ${f === 'india_value' ? 'India' : 'China'}`)}"${r.key === 'fy_start_month' ? ' type="number" min="1" max="12"' : ''}>` : esc(r[f])}</td>`).join('')}<td>${STATUS(r.note)}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">⚠️ rows are common practice that still need a source check before the final submission. fy_start_month (1–12) moves the Review calendar. No maps are used: country chips only.</p></div>` : ''}`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#lensMode [data-m], [data-m2]').forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.m || b.dataset.m2;
      ctx.state.sel.lensMode = m;
      if (m === 'off') { if (ctx.state.lens !== 'IN') ctx.setLens('IN'); else ctx.rerender(); }
      else ctx.rerender();
    }));
    const who = root.querySelector('#lensWho');
    if (!who) return;
    who.addEventListener('change', (e) => ctx.setSel('lensPerson', e.target.value));
    root.querySelector('#lensRole')?.addEventListener('change', (e) => ctx.setSel('lensRole', e.target.value));
    root.querySelectorAll('[data-lensgo]').forEach((b) => b.addEventListener('click', () => ctx.setLens(b.dataset.lensgo)));
    const flip = root.querySelector('#lensFlip');
    const front = flip.querySelector('.front'), back = flip.querySelector('.back');
    const base = ctx.row(ctx.state.sel.lensPerson);
    let cn = ctx.state.lens === 'CN' || (ctx.state.lens === 'home' && base.emp.country === 'CN');
    if (ctx.state.sel.lensMode === 'off') cn = false;
    const btn = root.querySelector('#flipLens');
    const sync = () => { front.inert = cn; back.inert = !cn; if (btn) btn.textContent = `⇄ Flip to ${cn ? 'India' : 'China'}`; };
    gsap.set(flip, { rotationY: cn ? 180 : 0 });
    sync();
    const fit = () => { if (!flip.isConnected) return; flip.style.minHeight = `${Math.max(...[front, back].map((f) => f.scrollHeight)) + 4}px`; };
    fit();
    addEventListener('resize', fit);
    ctx.onCleanup(() => removeEventListener('resize', fit));
    btn?.addEventListener('click', () => {
      cn = !cn;
      sync();
      gsap.to(flip, { rotationY: cn ? 180 : 0, duration: RM ? 0 : 0.9, ease: 'power3.inOut' });
      const face = cn ? back : front;
      if (!RM) gsap.from(face.querySelectorAll('.lrow'), { opacity: 0, x: 18, stagger: 0.07, duration: 0.4, delay: 0.45 });
    });
    root.querySelectorAll('#cfgTbl input').forEach((inp) => inp.addEventListener('change', () => {
      const row = ctx.state.data.Country_Config.find((r) => r.key === inp.dataset.key);
      const v = inp.value.trim();
      const label = `${inp.dataset.key.replace(/_/g, ' ')} (${inp.dataset.f === 'india_value' ? 'India' : 'China'})`;
      if (!v) { inp.value = row[inp.dataset.f]; UI.toast(`${esc(label)} can't be empty. The old value is back.`); return; }
      if (inp.dataset.key === 'fy_start_month' && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 12)) { inp.value = row[inp.dataset.f]; UI.toast('fy_start_month must be a whole number from 1 to 12.'); return; }
      if (String(row[inp.dataset.f]) === v) return;
      const before = ctx.out;
      row[inp.dataset.f] = v;
      // re-run after the event finishes, so the input being edited is not replaced mid-event
      requestAnimationFrame(() => {
        ctx.rerun(true);
        ctx.changes(`<b>${esc(label)}</b>`, before, [`<span>now:</span> ${esc(v)}`, '<span>Every screen that reads this row has re-run (Ranking, Review calendar, the drawer).</span>']);
      });
    }));
    root.querySelector('#cfgReset')?.addEventListener('click', () => {
      const before = ctx.out;
      ctx.state.data.Country_Config = structuredClone(ctx.base.Country_Config || []);
      ctx.rerun(true);
      ctx.changes('<b>Country rules reset to the loaded values</b>', before);
    });
  },
};
