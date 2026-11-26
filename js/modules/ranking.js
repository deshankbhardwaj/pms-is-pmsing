// M5 Ranking Decision Engine: every role × country pool (or role pool across India and China), the rules that sort
// them right beside the pools, the lit decision path for one pool, and its leaderboard.
import * as UI from '../ui.js';
import { histogram } from '../charts.js';
import { num } from '../engine/util.js';
const { esc, gsap, RM } = UI;
const COUNTRY = { IN: 'India', CN: 'China', ALL: 'India + China' };
let prevVerdicts = null;      // verdicts at the last draw: cells that change after a rule move flash

// Which test decided a pool, in a few words (the decision path shows the full reasoning).
function decidedBy(p, role, R) {
  const n = p.poolSize, inno = num(role?.innovation), inter = num(role?.interdependence), meas = num(role?.measurability);
  if (p.verdict === 'absolute' && n < R.min_pool_any_ranking) return `too small: ${n} < ${R.min_pool_any_ranking}`;
  if (p.verdict === 'absolute') return inno >= R.block_if_innovation_at_least && inter >= R.block_if_interdependence_at_least ? 'teamwork + innovation role' : inter >= R.block_if_interdependence_at_least ? 'teamwork role' : 'innovation role';
  if (p.verdict === 'relative') return meas < R.measurability_at_least ? `hard to measure: ${meas} < ${R.measurability_at_least}` : `${n} < ${R.min_pool_forced_distribution} for tiers`;
  return `${n} people, measurable`;
}
const scopeNote = (together) => (together
  ? 'One pool per role across India and China. Pay stays in each person\'s currency, and each person still gets their own country\'s bottom-tier step.'
  : 'People are compared only with the same role in the same country, because pay, targets and exit law differ between India and China.');

export default {
  nextNote: 'Rules decided. Now run the year',
  render(ctx) {
    const pools = ctx.out.pools;
    if (!pools.length) return `${UI.pageHead({ eyebrow: 'M5 · Ranking Decision Engine', title: 'No pools yet', sub: 'Load an organisation with employees in the Data Hub.' })}`;
    const R = ctx.rules.ranking;
    const together = R.pool_scope === 'together';
    const want = ctx.sel('pool', 'SAL|IN');
    const pool = pools.find((p) => p.key === want) || pools.find((p) => p.role_id === String(want).split('|')[0]) || pools.find((p) => p.verdict === 'forced') || pools[0];
    ctx.state.sel.pool = pool.key;
    const role = ctx.idx.role.get(pool.role_id);
    const members = ctx.out.employees.filter((r) => r.poolKey === pool.key);
    const k = (r) => r.result.compositeRaw ?? r.result.composite ?? 0;
    const ranked = members.filter((r) => !r.shielded).sort((a, b) => k(b) - k(a) || (b.result.resultsRaw ?? 0) - (a.result.resultsRaw ?? 0) || String(a.emp.emp_id).localeCompare(String(b.emp.emp_id)));
    const roleIds = [...new Set(pools.map((p) => p.role_id))];
    const cols = together ? ['ALL'] : ['IN', 'CN'].filter((c) => pools.some((p) => p.homeCountry === c));
    const vc = UI.VERDICT_COLOR[pool.verdict];
    const personasHere = new Set(ctx.out.personas.filter((p) => p.row && members.includes(p.row)).map((p) => p.emp_id));
    const small = pool.verdict === 'absolute' && pool.poolSize < R.min_pool_any_ranking;
    const counts = ['forced', 'relative', 'absolute'].map((v) => [v, pools.filter((p) => p.verdict === v).length]);
    const block = Math.min(R.block_if_innovation_at_least, R.block_if_interdependence_at_least);
    const where = together ? `${pool.countries.map((c) => UI.code(c)).join('')}` : UI.code(pool.homeCountry);
    const slider = (id, label, k2, min, max, val, help) => `<div class="rk-sl"><div class="row between"><label for="${id}">${label}</label><output for="${id}" id="${id}O">${val >= 6 && k2 === 'block' ? 'never' : val}</output></div><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" data-k="${k2}"><small>${help}</small></div>`;
    const gateCap = ctx.out.mode.strictGates ? ctx.rules.dna.risk_appetite.strict_gate_rating_cap : R.gate_fail_rating_cap;
    return `
      ${UI.pageHead({ eyebrow: 'M5 · Ranking Decision Engine', title: 'Forced ranking? <em>Only where it is fair.</em>', sub: 'Every pool of comparable people goes through three tests. Forced tiers are used for rewards only, never for exits, and only after the compliance gate. Anyone in a new role or on a stretch assignment is kept out of the pool.' })}
      <div class="card" id="poolsCard">
        <div class="row between"><h2 class="h4" style="margin:0">Pools · click one to see its decision</h2>
          <div class="row rk-scope"><label for="poolScope" class="small"><b>Compare people within</b></label><select class="sel" id="poolScope"><option value="country"${together ? '' : ' selected'}>each country separately</option><option value="together"${together ? ' selected' : ''}>India and China together</option></select></div></div>
        <p class="why">${esc(scopeNote(together))}</p>
        <div class="rk-top mt">
          <div><div class="pool-matrix" style="--nc:${cols.length}">
            <div></div>${cols.map((c) => `<div class="h">${c === 'ALL' ? `${UI.code('IN')}${UI.code('CN')} India + China` : `${UI.code(c)} ${COUNTRY[c]}`}</div>`).join('')}
            ${roleIds.map((r) => `<div class="lab">${esc(ctx.idx.role.get(r)?.title || r)}</div>${cols.map((c) => { const p = pools.find((x) => x.role_id === r && x.homeCountry === c); return p ? `<button class="pm${p.key === pool.key ? ' on' : ''}" data-pool="${esc(p.key)}" data-v="${p.verdict}" style="--vc:${UI.VERDICT_COLOR[p.verdict]}" aria-pressed="${p.key === pool.key}"><b>${esc(UI.VERDICT_SHORT[p.verdict])}</b><small>${p.poolSize} compared${p.shielded.length ? ` · ${p.shielded.length} shielded` : ''}</small><small class="why-d">${esc(decidedBy(p, ctx.idx.role.get(r), R))}</small></button>` : '<div class="pm none">no one in this role</div>'; }).join('')}`).join('')}
          </div>
          <div class="rk-legend small">${counts.map(([v, n]) => `<span><i style="background:${UI.VERDICT_COLOR[v]}"></i>${esc(UI.VERDICT_SHORT[v])} <b>${n}</b></span>`).join('')}</div></div>
          <div class="rk-rules"><h3 class="h4">The rules · drag one and watch the pools</h3>
            ${slider('r-any', 'Smallest pool to rank at all', 'min_pool_any_ranking', 5, 40, R.min_pool_any_ranking, 'Below this, people are judged against standards, not each other.')}
            ${slider('r-forced', 'Smallest pool for forced tiers', 'min_pool_forced_distribution', 10, 60, R.min_pool_forced_distribution, 'Below this, calibration compares people but sets no quotas.')}
            ${slider('r-meas', 'Measurability needed for tiers (1–5)', 'measurability_at_least', 1, 5, R.measurability_at_least, 'Tiers only where results can be counted.')}
            ${slider('r-block', 'Teamwork or innovation level that blocks ranking', 'block', 2, 6, block, 'Roles at or above this level are never ranked: it would punish helping and risk-taking. 6 = never block.')}
            <button class="btn light sm mt" id="rReset">Reset the rules</button></div>
        </div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="row between"><h2 class="h4" style="margin:0">Decision path · ${esc(role?.title || pool.role_id)} ${where}</h2>${small ? `<span class="nap">${UI.volty('sleepy')}<small>zzz… pool too small</small></span>` : ''}</div>
          <div class="tree mt" id="tree">
            <div class="node lit"><b>Pool: ${pool.members} ${pool.members === 1 ? 'person' : 'people'}</b><small>${esc(role?.title || pool.role_id)}, ${esc(COUNTRY[pool.homeCountry] || pool.homeCountry)}${pool.country !== pool.homeCountry && pool.homeCountry !== 'ALL' ? ` · judged under ${esc(pool.country)} rules` : ''}</small></div>
            ${pool.steps.map((s) => `<div class="stem lit"></div><div class="node lit${s.pass ? '' : ' fail'}"><b>${s.pass ? '✓' : '✕'} ${esc(s.test)}</b><small>${esc(s.value)}</small></div>`).join('')}
            <div class="stem lit"></div><div class="verdict" style="--vc:${vc}"><small style="opacity:.85;font-weight:800;letter-spacing:.12em;font-size:11px">VERDICT</small><b>${esc(pool.label)}</b><span style="font-size:13px">${esc(pool.reason)}</span></div>
          </div>
          <dl class="kv mt">${pool.verdict === 'forced' ? `<dt>Tiers</dt><dd>${pool.tierPlan.map((t) => `${esc(t.tier)} ${t.pct}%`).join(' · ')}${pool.cutthroat ? ` (pace ≥ ${R.cutthroat_pace_at_least}: cutthroat, so a narrower top tier)` : ''}</dd><dt>Bottom tier</dt><dd>${esc(pool.bottomTierAction)}</dd>` : ''}<dt>Gate</dt><dd>A failed gate caps the rating at ${gateCap} and keeps the person out of the top tier.</dd></dl>
          ${pool.shielded.length ? `<p class="why mt"><b>Built-70 shield:</b> ${pool.shielded.map((id) => `<a class="lnk" data-person="${esc(id)}">${esc(ctx.idx.emp.get(id)?.name || id)}</a>`).join(', ')} ${pool.shielded.length === 1 ? 'is' : 'are'} in a ramp-up or stretch window and not compared with anyone.</p>` : ''}
        </div>
        <div class="card"><h2 class="h4">How this pool's scores really spread</h2>${histogram(members.map((r) => r.result.composite), { color: vc, height: 200 })}
          <p class="why mt">Forced ranking assumes the bell curve (yellow). Real performance tends to follow "the best and the rest" (red): a few stars and a long middle. Small or collaborative pools make a quota unfair.</p></div>
      </div>
      <div class="card mt" id="lbCard"><div class="row between"><h2 class="h4" style="margin:0">${pool.verdict === 'forced' ? 'Leaderboard and reward tiers' : 'Scores (no quotas)'} · ${ranked.length} compared${pool.shielded.length ? `, ${pool.shielded.length} shielded` : ''}</h2><span class="small muted">${personasHere.size ? 'Persona rows are highlighted' : ''}</span></div>
        <div class="tbl-wrap lb mt" tabindex="0" role="region" aria-label="Leaderboard, scrollable"><table class="tbl" id="board"><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Site</th><th scope="col">Composite</th><th scope="col">Rating</th><th scope="col">Gate</th><th scope="col">${pool.verdict === 'forced' ? 'Tier' : 'Calibration'}</th><th scope="col">Note</th></tr></thead><tbody>
          ${ranked.map((r, i) => `<tr class="click${personasHere.has(r.emp.emp_id) ? ' persona' : ''}" data-person="${esc(r.emp.emp_id)}"><td>${i + 1}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(r.emp.name)}<b>${esc(r.emp.name)}</b></div></td><td class="small">${esc(r.emp.site)}${together ? ` ${UI.code(r.emp.country)}` : ''}</td><td><b>${UI.fmt(r.result.composite)}</b></td><td>${UI.rate(r.result.rating, r.result.capped)}</td><td>${r.result.gates.some((g) => g.passed === false) ? '<span class="tag bad">✕ failed</span>' : r.result.gates.some((g) => g.passed === null) ? '<span class="tag warn">no data</span>' : r.result.gates.length ? '<span class="tag good">✓</span>' : '<span class="muted small">none</span>'}</td><td>${r.tier ? UI.tier(r.tier.tier) : '<span class="tag">discuss</span>'}</td><td class="small">${esc(r.tier?.note || (r.bottomTierAction ? r.bottomTierAction.text : ''))}${r.clubTrip ? ' ✈ Club trip' : ''}</td></tr>`).join('')}
        </tbody></table></div></div>`;
  },
  mount(root, ctx, { soft }) {
    if (!root.querySelector('#tree')) return;
    root.querySelectorAll('[data-pool]').forEach((b) => b.addEventListener('click', () => ctx.setSel('pool', b.dataset.pool)));
    // cells whose verdict changed since the last draw flash, so a slider move is visible where it lands
    const now = new Map(ctx.out.pools.map((p) => [p.key, p.verdict]));
    if (prevVerdicts && !RM) root.querySelectorAll('[data-pool]').forEach((b) => { const was = prevVerdicts.get(b.dataset.pool); if (was && was !== b.dataset.v) gsap.fromTo(b, { scale: 1.08, boxShadow: '0 0 0 4px rgba(254,202,87,.9)' }, { scale: 1, boxShadow: '0 0 0 0 rgba(254,202,87,0)', duration: 1.1, ease: 'power2.out', clearProps: 'transform,boxShadow' }); });
    prevVerdicts = now;
    if (!RM && !soft) {
      const nodes = root.querySelectorAll('#tree > *');
      gsap.from(nodes, { opacity: 0.25, x: -10, duration: 0.35, stagger: 0.18, delay: 0.4, ease: 'power2.out' });
      gsap.from(root.querySelector('#tree .verdict'), { scale: 0.85, duration: 0.6, delay: 0.4 + nodes.length * 0.18, ease: 'back.out(2)' });
      gsap.from(root.querySelectorAll('#board tbody tr'), { opacity: 0, x: 16, duration: 0.3, stagger: 0.015, delay: 0.6 });
    }
    // India and China separately or together: a rule, so every screen (tiers, rewards, profiles, exports) follows
    root.querySelector('#poolScope')?.addEventListener('change', (e) => {
      const before = ctx.out;
      const rules = structuredClone(ctx.rules);
      rules.ranking.pool_scope = e.target.value;
      const roleId = String(ctx.state.sel.pool || 'SAL|IN').split('|')[0];
      ctx.state.sel.pool = e.target.value === 'together' ? `${roleId}|ALL` : `${roleId}|IN`;
      prevVerdicts = null;
      ctx.setRules(rules);
      ctx.changes(`<b>Compare people within: ${e.target.value === 'together' ? 'India and China together' : 'each country separately'}</b>`, before, [`<span>${esc(scopeNote(e.target.value === 'together'))}</span>`]);
    });
    const any = root.querySelector('#r-any'), forced = root.querySelector('#r-forced');
    const show = (inp) => { root.querySelector(`#${inp.id}O`).textContent = inp.dataset.k === 'block' && Number(inp.value) >= 6 ? 'never' : inp.value; };
    root.querySelectorAll('input[type=range][data-k]').forEach((inp) => {
      inp.addEventListener('input', () => {
        // keep the two pool sizes consistent while dragging
        if (inp === any && Number(any.value) > Number(forced.value)) { forced.value = any.value; show(forced); }
        if (inp === forced && Number(forced.value) < Number(any.value)) { any.value = forced.value; show(any); }
        show(inp);
      });
      inp.addEventListener('change', () => {
        const before = ctx.out;
        const rules = structuredClone(ctx.rules);
        if (inp.dataset.k === 'block') { rules.ranking.block_if_innovation_at_least = Number(inp.value); rules.ranking.block_if_interdependence_at_least = Number(inp.value); }
        else rules.ranking[inp.dataset.k] = Number(inp.value);
        rules.ranking.min_pool_any_ranking = Number(any.value);
        rules.ranking.min_pool_forced_distribution = Math.max(Number(forced.value), Number(any.value));
        ctx.setRules(rules);
        const label = root.querySelector(`label[for="${inp.id}"]`)?.textContent || inp.dataset.k;
        ctx.changes(`<b>Rule: ${esc(label)} → ${esc(inp.dataset.k === 'block' && Number(inp.value) >= 6 ? 'never' : inp.value)}</b>`, before);
      });
    });
    root.querySelector('#rReset').addEventListener('click', () => {
      const before = ctx.out;
      ctx.resetRules('ranking');
      ctx.changes('<b>Ranking rules reset</b>', before);
    });
  },
};
