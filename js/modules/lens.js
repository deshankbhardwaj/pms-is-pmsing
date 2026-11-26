// M10 Country Lens, three modes:
//   Off      · a single-country PMS: India's rules for everyone.
//   Compare  · one person and one role side by side under both rulebooks (read-only).
//   Built-in · choose which rulebook the whole app runs on, see what it does across the organisation, and edit the
//              rules the engine uses (bottom-tier step, performance-year start) plus the wording other screens show.
import * as UI from '../ui.js';
import { bottomTierAction } from '../engine/country.js';
const { esc, gsap, RM } = UI;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STEP = { pip: 'Documented improvement plan (PIP)', train_reassign: 'Training or reassignment first' };
const COLS = { IN: 'india_value', CN: 'china_value' };
// Rows the engine reads are edited as rules; the rest is wording, and each row says where it appears.
const ENGINE_KEYS = ['currency', 'fy_start_month', 'bottom_tier_action', 'bottom_tier_action_code'];
const SHOWN_ON = {
  performance_year: [['lens', 'Country Lens'], ['review', 'Review & Delivery']], review_window: [['lens', 'Country Lens'], ['review', 'Review & Delivery']],
  increment_effective: [['rewards', 'Rewards']], year_end_reward: [['lens', 'Country Lens']], mandatory_pay: [['rewards', 'Rewards']],
  law_in_force: [['lens', 'Country Lens']], pms_rule_making: [['review', 'Review & Delivery (appeals)']], hours_guardrail: [['rewards', 'Rewards']],
  data_privacy: [['data', 'Data Hub']], feedback_style: [['lens', 'Country Lens']], feedback_culture: [['review', 'Review & Delivery (feedback tip)']],
  development_tradition: [['forge', 'Leadership Forge']], recognition_norms: [['rewards', 'Rewards']],
};
const yearSpan = (m) => `${MONTHS[m - 1]} to ${MONTHS[(m + 10) % 12]}`;   // April → "April to March"
const FACE_ROWS = [['performance_year', 'Performance year'], ['review_window', 'Review window'], ['year_end_reward', 'Year-end reward'], ['feedback_style', 'Feedback style'], ['law_in_force', 'Law in force']];
const STATUS = (note) => (String(note).includes('✅') ? '<span class="tag good">✅ checked</span>' : String(note).includes('⚠️') ? '<span class="tag warn">⚠️ verify</span>' : '');
const COUNTRY = { IN: 'India', CN: 'China' };

function modeSeg(mode) {
  return `<div class="seg mb" id="lensMode" role="group" aria-label="Country lens mode">${[['off', 'Off · India only'], ['compare', 'Compare side by side'], ['built', 'Built-in · one rulebook, your rules']].map(([k, l]) => `<button class="${k === mode ? 'on' : ''}" data-m="${k}" aria-pressed="${k === mode}">${l}</button>`).join('')}</div>`;
}
const fyOf = (cfg, c) => { const m = Number(cfg.fy_start_month?.[c]); return Number.isInteger(m) && m >= 1 && m <= 12 ? m : (c === 'IN' ? 4 : 1); };
const codeOf = (cfg, c) => String(cfg.bottom_tier_action_code?.[c] ?? '').trim() || (c === 'CN' ? 'train_reassign' : 'pip');

// Built-in: 1 · which rulebook runs the app, 2 · what it does right now, 3 · the rules the engine uses, 4 · wording.
function built(ctx, cfg) {
  const lens = ctx.state.lens;
  const emps = ctx.out.employees;
  const n = { all: emps.length, IN: emps.filter((r) => r.emp.country === 'IN').length, CN: emps.filter((r) => r.emp.country === 'CN').length };
  const books = [
    ['home', "Each person's home country", `India's rules for the ${n.IN} people in India, China's for the ${n.CN} in China`],
    ['IN', 'India for everyone', `All ${n.all} people under India's rules`],
    ['CN', 'China for everyone', `All ${n.all} people under China's rules`],
  ];
  const inUse = lens === 'home' ? ['IN', 'CN'].filter((c) => n[c]) : [lens];
  const who = (c) => (lens === 'home' ? `${UI.code(c)} People in ${COUNTRY[c]}` : 'Everyone');
  // bottom tier, grouped by the step each person now gets
  const bottom = emps.filter((r) => r.bottomTierAction);
  const groups = new Map();
  // grouped by the step itself; the exact wording (and its legal source) is on the Ranking Engine and each profile
  for (const r of bottom) { const k = r.bottomTierAction.code === 'pip' ? `${STEP.pip}, ${ctx.out.cadence?.pip_days || ''}`.replace(/, $/, '') : STEP.train_reassign; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const chips = (rs) => `<div class="bi-names">${rs.slice(0, 6).map((r) => `<button class="chipbtn" data-person="${esc(r.emp.emp_id)}">${esc(r.emp.name)} ${UI.code(r.emp.country)}</button>`).join('')}${rs.length > 6 ? `<span class="small muted">+${rs.length - 6} more in the Ranking Engine</span>` : ''}</div>`;
  const bottomHtml = bottom.length
    ? [...groups].map(([t, rs]) => `<div class="bi-eff"><div class="row between"><b>${esc(t)}</b><span class="tag">${rs.length} ${rs.length === 1 ? 'person' : 'people'}</span></div>${chips(rs)}</div>`).join('')
    : '<p class="why">No pool is ranked into tiers, so no one is in a bottom tier.</p>';
  const stepSeg = (c) => {
    const code = codeOf(cfg, c);
    return `<div class="bi-cell"><span class="bi-lbl">${UI.code(c)} ${COUNTRY[c]}</span><div class="seg bi-seg" role="group" aria-label="Bottom-tier step, ${COUNTRY[c]}">${Object.entries({ pip: 'Improvement plan (PIP)', train_reassign: 'Train or reassign first' }).map(([k, l]) => `<button class="${k === code ? 'on' : ''}" aria-pressed="${k === code}" data-step="${k}" data-c="${c}">${l}</button>`).join('')}</div></div>`;
  };
  const fySel = (c) => `<div class="bi-cell"><label class="bi-lbl" for="fy${c}">${UI.code(c)} ${COUNTRY[c]}</label><select class="sel" id="fy${c}" data-fy="${c}">${MONTHS.map((m, k) => `<option value="${k + 1}"${k + 1 === fyOf(cfg, c) ? ' selected' : ''}>${m}</option>`).join('')}</select></div>`;
  const words = (ctx.data.Country_Config || []).filter((r) => !ENGINE_KEYS.includes(r.key));
  const open = ctx.sel('lensWords') === true;
  return `
    <div class="card bi-books"><h2 class="s">1 · Which rulebook runs the whole app?</h2>
      <p class="why">Pick one and every screen re-runs under it: the Ranking Engine, Review & Delivery, people profiles and the exports. Pay always stays in each person's own currency and pay policy. The <b>Home rules · IN · CN</b> buttons in the top bar do the same from any screen.</p>
      <div class="bi-opts" role="group" aria-label="Rulebook">${books.map(([k, t, d]) => `<button class="bi-opt${k === lens ? ' on' : ''}" aria-pressed="${k === lens}" data-lensgo="${k}">${k === 'home' ? `<span class="bi-ico">${UI.code('IN')}${UI.code('CN')}</span>` : `<span class="bi-ico">${UI.code(k)}</span>`}<b>${esc(t)}</b><span>${esc(d)}</span></button>`).join('')}</div></div>
    <div class="grid g2 mt">
      <div class="card"><h2 class="s">2 · What this rulebook does right now</h2>
        <h3 class="h4 mt">Bottom tier · ${bottom.length} ${bottom.length === 1 ? 'person' : 'people'}</h3>${bottomHtml}
        <h3 class="h4 mt2">Performance year</h3><ul class="dots">${inUse.map((c) => `<li>${who(c)}: <b>${esc(yearSpan(fyOf(cfg, c)))}</b> (${esc(COUNTRY[c])}'s year)</li>`).join('')}</ul>
        <h3 class="h4 mt2">Feedback tip in review meetings</h3><ul class="dots">${inUse.map((c) => `<li>${who(c)}: ${esc(cfg.feedback_culture?.[c] || '—')}</li>`).join('')}</ul>
        <div class="row mt"><button class="btn light sm bi-go" data-route="ranking">Ranking Engine →</button><button class="btn light sm" data-goreview="cal">Review calendar →</button></div></div>
      <div class="card" id="biRules"><h2 class="s">3 · Edit the rules the engine uses</h2>
        <p class="why">Change one and the app re-runs at once: watch section 2 and the "What changed" panel.</p>
        <div class="bi-rule"><div class="bi-rh"><b>If someone lands in a bottom tier</b><span class="small muted">Ranking Engine · people profiles · this page · results export</span></div>${stepSeg('IN')}${stepSeg('CN')}
          <p class="small muted mt">Improvement-plan length: ${esc(ctx.out.cadence?.pip_days || '—')}, set by Pace in <button type="button" class="lnk bi-go" data-route="dna">Strategy DNA</button>. China's default follows Guiding Case No. 18: a low rank alone is not a lawful exit ground.</p></div>
        <div class="bi-rule"><div class="bi-rh"><b>The performance year starts in</b><span class="small muted">Review calendar · next year's objectives on the feedback checklist</span></div>${fySel('IN')}${fySel('CN')}</div>
        <div class="row between mt"><span class="small muted">Saved in this browser with the rest of your work.</span><button class="btn light sm" id="cfgReset">Reset to the loaded rules</button></div></div>
    </div>
    <details class="card mt bi-words" id="biWords"${open ? ' open' : ''}><summary><h2 class="s" style="margin:0">4 · Wording shown on other screens</h2><span class="small muted">${words.length} rows · text only, no numbers change</span></summary>
      <p class="why mt">These descriptions appear on the screens named in each row. Edit a cell and that screen shows the new text.</p>
      <div class="tbl-wrap mt"><table class="tbl" id="cfgTbl"><thead><tr><th scope="col">Parameter</th><th scope="col">${UI.code('IN')} India</th><th scope="col">${UI.code('CN')} China</th><th scope="col">Shown on</th><th scope="col">Status</th></tr></thead><tbody>
      ${words.map((r) => `<tr><th scope="row">${esc(String(r.key).replace(/_/g, ' '))}</th>${['india_value', 'china_value'].map((f) => `<td class="small"><input class="inp" value="${esc(r[f])}" data-key="${esc(r.key)}" data-f="${f}" aria-label="${esc(`${String(r.key).replace(/_/g, ' ')}, ${f === 'india_value' ? 'India' : 'China'}`)}"></td>`).join('')}<td class="small">${(SHOWN_ON[r.key] || []).map(([id, l]) => `<button type="button" class="lnk bi-go" data-route="${id}">${esc(l)}</button>`).join('<br>') || '<span class="muted">This table (reference)</span>'}</td><td>${STATUS(r.note)}</td></tr>`).join('')}</tbody></table></div>
      <p class="why mt">⚠️ rows are common practice that still need a source check before the final submission.</p></details>`;
}
function cfgRow(ctx, key, defaults) {
  const rows = ctx.state.data.Country_Config || (ctx.state.data.Country_Config = []);
  let row = rows.find((r) => r.key === key);
  if (!row) { row = { key, india_value: defaults.IN, china_value: defaults.CN, note: '' }; rows.push(row); }
  return row;
}
const movedCount = (before, after) => {
  const bt = new Map(before.employees.map((r) => [r.emp.emp_id, r.bottomTierAction?.text || null]));
  return after.employees.filter((r) => (bt.get(r.emp.emp_id) || null) !== (r.bottomTierAction?.text || null)).length;
};
function mountBuilt(root, ctx) {
  root.querySelectorAll('[data-lensgo]').forEach((b) => b.addEventListener('click', () => ctx.setLens(b.dataset.lensgo)));
  root.querySelector('[data-goreview]')?.addEventListener('click', () => { ctx.state.sel.reviewTab = 'cal'; ctx.go('review'); });
  root.querySelectorAll('.bi-go').forEach((b) => b.addEventListener('click', () => ctx.go(b.dataset.route)));
  root.querySelector('#biWords')?.addEventListener('toggle', (e) => { ctx.state.sel.lensWords = e.target.open; });
  // bottom-tier step: the engine reads the code; the wording follows it (the loaded wording comes back with its code)
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.c, code = b.dataset.step, f = COLS[c];
    const codeRow = cfgRow(ctx, 'bottom_tier_action_code', { IN: 'pip', CN: 'train_reassign' });
    if (String(codeRow[f]).trim() === code) return;
    const before = ctx.out;
    codeRow[f] = code;
    const baseRows = ctx.base.Country_Config || [];
    const baseCode = String(baseRows.find((r) => r.key === 'bottom_tier_action_code')?.[f] ?? '').trim();
    const baseText = baseRows.find((r) => r.key === 'bottom_tier_action')?.[f];
    cfgRow(ctx, 'bottom_tier_action', { IN: STEP.pip, CN: STEP.train_reassign })[f] = baseCode === code && baseText ? baseText : STEP[code];
    ctx.rerun(true);
    const moved = movedCount(before, ctx.out);
    ctx.changes(`<b>Bottom-tier step (${COUNTRY[c]})</b>`, before, [`<span>now:</span> ${esc(STEP[code])}`, moved ? `<span>Bottom-tier people whose next step changed:</span> <b>${moved}</b>` : `<span>No one in a bottom tier follows ${COUNTRY[c]}'s rules under the current rulebook.</span>`]);
  }));
  root.querySelectorAll('[data-fy]').forEach((sel) => sel.addEventListener('change', () => {
    const c = sel.dataset.fy, f = COLS[c], m = Number(sel.value);
    const row = cfgRow(ctx, 'fy_start_month', { IN: '4', CN: '1' });
    const old = fyOf(ctx.idx.country, c);
    if (old === m) return;
    const before = ctx.out;
    row[f] = String(m);
    // keep the "performance year" wording in step when it still describes the old year
    const py = (ctx.state.data.Country_Config || []).find((r) => r.key === 'performance_year');
    if (py && String(py[f]).trim() === yearSpan(old)) py[f] = yearSpan(m);
    ctx.rerun(true);
    ctx.changes(`<b>Performance year (${COUNTRY[c]})</b>`, before, [`<span>now:</span> ${esc(yearSpan(m))}`, `<span>The Review calendar for ${COUNTRY[c]} now starts in ${esc(MONTHS[m - 1])}.</span>`]);
  }));
  root.querySelectorAll('#cfgTbl input').forEach((inp) => inp.addEventListener('change', () => {
    const row = ctx.state.data.Country_Config.find((r) => r.key === inp.dataset.key);
    const v = inp.value.trim();
    const label = `${inp.dataset.key.replace(/_/g, ' ')} (${inp.dataset.f === 'india_value' ? 'India' : 'China'})`;
    if (!v) { inp.value = row[inp.dataset.f]; UI.toast(`${esc(label)} can't be empty. The old value is back.`); return; }
    if (String(row[inp.dataset.f]) === v) return;
    const before = ctx.out;
    row[inp.dataset.f] = v;
    const where = (SHOWN_ON[inp.dataset.key] || []).map(([, l]) => l).join(', ');
    // re-run after the event finishes, so the input being edited is not replaced mid-event
    requestAnimationFrame(() => {
      ctx.rerun(true);
      ctx.changes(`<b>${esc(label)}</b>`, before, [`<span>now:</span> ${esc(v)}`, `<span>${where ? `Shown on: ${esc(where)}.` : 'Reference only: no other screen shows this row.'} Wording only, so no numbers change.</span>`]);
    });
  }));
  root.querySelector('#cfgReset')?.addEventListener('click', () => {
    const before = ctx.out;
    ctx.state.data.Country_Config = structuredClone(ctx.base.Country_Config || []);
    ctx.rerun(true);
    const moved = movedCount(before, ctx.out);
    ctx.changes('<b>Country rules reset to the loaded values</b>', before, moved ? [`<span>Bottom-tier people whose next step changed:</span> <b>${moved}</b>`] : []);
  });
}

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
      const pool = ctx.outFor('home').pools.find((p) => p.role_id === rid && (p.homeCountry === c || p.homeCountry === 'ALL'));
      const rs = ctx.outFor('home').employees.filter((r) => r.emp.role_id === rid && r.emp.country === c);
      const avg = (f) => { const v = rs.map(f).filter((x) => x !== null && x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
      return { c, pool, n: rs.length, comp: avg((r) => r.result.composite), pay: avg((r) => r.rewards?.total ?? null), cur: rs[0]?.emp.currency };
    });
    if (mode === 'built') return `${UI.pageHead({ eyebrow: 'M10 · Country Lens', title: 'Same person, same data. <em>Two countries, two rulebooks.</em>', sub: 'Built-in: pick the rulebook the whole app runs on, see what it does across the organisation, and change the rules themselves.' })}${modeSeg(mode)}${built(ctx, cfg)}`;
    const ps = ctx.out.personas.filter((p) => p.row);
    const byRole = new Map();
    for (const x of [...ctx.out.employees].sort((a, b) => String(a.emp.name).localeCompare(String(b.emp.name)))) { if (!byRole.has(x.title)) byRole.set(x.title, []); byRole.get(x.title).push(x); }
    return `
      ${UI.pageHead({ eyebrow: 'M10 · Country Lens', title: 'Same person, same data. <em>Two countries, two rulebooks.</em>', sub: 'India and China differ on the performance year, how bonuses are paid, how feedback is given and, most of all, what may happen to the bottom tier. The lens covers all three readings of the brief: off, compare and built-in.' })}
      ${modeSeg(mode)}
      ${mode === 'off' ? `<div class="card"><h2 class="s">${UI.code('IN')} Single-country PMS</h2><p class="why">The whole app now runs on India's rules (the top bar shows the IN lens): ${esc(cfg.performance_year?.IN)}; ${esc(cfg.year_end_reward?.IN)}; ${esc(cfg.law_in_force?.IN)}. Switch to Compare to see what China changes.</p></div>` : ''}
      <div class="grid g21 ${mode === 'off' ? 'mt' : ''}">
        <div class="dark-card"><div class="row between mb"><label class="sr-only" for="lensWho">Person</label><select class="sel" id="lensWho">${ps.length ? `<optgroup label="Personas">${ps.map((p) => `<option value="${esc(p.emp_id)}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`).join('')}</optgroup>` : ''}${[...byRole].map(([t, rs]) => `<optgroup label="${esc(t)}">${rs.map((x) => `<option value="${esc(x.emp.emp_id)}"${x.emp.emp_id === pid && !ctx.personaKey(pid) ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.emp.site)}</option>`).join('')}</optgroup>`).join('')}</select>${mode === 'off' ? '' : '<button class="btn pri sm" id="flipLens"></button>'}</div>
          <div class="flipwrap dark"><div class="flip" id="lensFlip"><div class="face front">${face('IN', rowIn)}</div><div class="face back">${face('CN', rowCn)}</div></div></div></div>
        <div class="card"><h2 class="h4">What changes for ${esc(String(base.emp.name).split(' ')[0])}</h2><ul class="dots">${FACE_ROWS.map(([k, l]) => `<li><b>${esc(l)}:</b> ${esc(cfg[k]?.IN || '—')} → ${esc(cfg[k]?.CN || '—')}</li>`).join('')}<li><b>Bottom tier:</b> ${esc(rowIn?.bottomTierAction?.text || 'not in the bottom tier')} → ${esc(rowCn?.bottomTierAction?.text || 'not in the bottom tier')}</li></ul>
          <p class="why mt">China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18 (2013): a low ranking alone is not a lawful dismissal ground; the employer must train or reassign first. India: the Labour Codes in force since 21 Nov 2025 frame a documented process.</p>
          <div class="row mt"><button class="btn light sm" data-m2="built" style="white-space:normal;text-align:left;max-width:100%">Run the whole app on one rulebook →</button></div></div>
      </div>
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h2 class="s" style="margin:0">Same role, India vs China</h2><label class="sr-only" for="lensRole">Role</label><select class="sel" id="lensRole">${ctx.roles().map((r) => `<option value="${esc(r.role_id)}"${r.role_id === rid ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div>
        <div class="grid g2 mt">${same.map((s) => `<div class="cmp"><div class="row between"><b>${UI.code(s.c)} ${COUNTRY[s.c]}</b><span class="small muted">${s.n} people</span></div>${s.n ? `<dl class="kv mt"><dt>Ranking</dt><dd>${esc(UI.VERDICT_SHORT[s.pool?.verdict] || '—')} (${s.pool?.poolSize ?? 0} comparable${s.pool?.homeCountry === 'ALL' ? ', India and China pooled' : ''})</dd><dt>Method blend</dt><dd>${esc(s.pool?.methods.label || '—')}</dd><dt>Avg composite</dt><dd>${UI.fmt(s.comp)}</dd><dt>Avg variable pay</dt><dd>${s.pay === null ? '—' : UI.money(s.pay, s.cur)}</dd><dt>Bonus timing</dt><dd>${esc(cfg.year_end_reward?.[s.c] || '—')}</dd><dt>Bottom tier</dt><dd>${esc(s.pool?.verdict === 'forced' && s.pool.homeCountry === 'ALL' ? bottomTierAction(ctx.idx, s.c, ctx.out.cadence, ctx.rules.ranking.bottom_tier_action).text : (s.pool?.bottomTierAction || 'No tiers in this pool'))}</dd></dl>` : '<p class="why mt">No one in this role here.</p>'}</div>`).join('')}</div></div>` : ''}
      ${mode !== 'off' ? `<div class="card mt"><div class="row between"><h2 class="s" style="margin:0">Country configuration</h2><button class="btn light sm" data-m2="built">Edit these rules →</button></div>
        <div class="tbl-wrap mt"><table class="tbl" id="cfgTbl"><thead><tr><th scope="col">Parameter</th><th scope="col">${UI.code('IN')} India</th><th scope="col">${UI.code('CN')} China</th><th scope="col">Status</th></tr></thead><tbody>
        ${(ctx.data.Country_Config || []).filter((r) => !['bottom_tier_action_code', 'currency'].includes(r.key)).map((r) => `<tr><th scope="row">${esc(r.key === 'fy_start_month' ? 'performance year starts' : String(r.key).replace(/_/g, ' '))}</th>${['india_value', 'china_value'].map((f) => `<td class="small">${esc(r.key === 'fy_start_month' ? MONTHS[(Number(r[f]) || 1) - 1] : r[f])}</td>`).join('')}<td>${STATUS(r.note)}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">⚠️ rows are common practice that still need a source check before the final submission. No maps are used: country chips only.</p></div>` : ''}`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#lensMode [data-m], [data-m2]').forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.m || b.dataset.m2;
      ctx.state.sel.lensMode = m;
      if (m === 'off') { if (ctx.state.lens !== 'IN') ctx.setLens('IN'); else ctx.rerender(); }
      else ctx.rerender();
    }));
    if (ctx.state.sel.lensMode === 'built') { mountBuilt(root, ctx); return; }
    const who = root.querySelector('#lensWho');
    if (!who) return;
    who.addEventListener('change', (e) => ctx.setSel('lensPerson', e.target.value));
    root.querySelector('#lensRole')?.addEventListener('change', (e) => ctx.setSel('lensRole', e.target.value));
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
  },
};
