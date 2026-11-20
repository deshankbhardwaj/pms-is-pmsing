// M5 Ranking Decision Engine: verdict per role × country pool, lit decision path, leaderboard, rules you can edit.
import * as UI from '../ui.js';
import { histogram } from '../charts.js';
const { esc, gsap, RM } = UI;
const COUNTRY = { IN: 'India', CN: 'China' };

export default {
  nextNote: 'Rules decided. Now run the year',
  render(ctx) {
    const pools = ctx.out.pools;
    if (!pools.length) return `${UI.pageHead({ eyebrow: 'M5 · Ranking Decision Engine', title: 'No pools yet', sub: 'Load an organisation with employees in the Data Hub.' })}`;
    const key = (p) => `${p.role_id}|${p.homeCountry}`;
    const want = ctx.sel('pool', 'SAL|IN');
    const pool = pools.find((p) => key(p) === want) || pools.find((p) => p.verdict === 'forced') || pools[0];
    ctx.state.sel.pool = key(pool);
    const role = ctx.idx.role.get(pool.role_id);
    const R = ctx.rules.ranking;
    const members = ctx.out.employees.filter((r) => r.emp.role_id === pool.role_id && r.emp.country === pool.homeCountry);
    const k = (r) => r.result.compositeRaw ?? r.result.composite ?? 0;
    const ranked = members.filter((r) => !r.shielded).sort((a, b) => k(b) - k(a) || (b.result.resultsRaw ?? 0) - (a.result.resultsRaw ?? 0) || String(a.emp.emp_id).localeCompare(String(b.emp.emp_id)));
    const roleIds = [...new Set(pools.map((p) => p.role_id))];
    const countries = ['IN', 'CN'].filter((c) => pools.some((p) => p.homeCountry === c));
    const vc = UI.VERDICT_COLOR[pool.verdict];
    const personasHere = new Set(ctx.out.personas.filter((p) => p.row && members.includes(p.row)).map((p) => p.emp_id));
    const small = pool.verdict === 'absolute' && pool.poolSize < R.min_pool_any_ranking;
    const btxt = (c) => ctx.idx.country.bottom_tier_action?.[c] || R.bottom_tier_action[c];
    return `
      ${UI.pageHead({ eyebrow: 'M5 · Ranking Decision Engine', title: 'Forced ranking? <em>Only where it is fair.</em>', sub: 'The engine checks every role × country pool against three tests. Forced tiers are used for rewards only, never for exits, and only after the compliance gate. Anyone in a new role or on a stretch assignment is kept out of the pool.' })}
      <div class="card"><h2 class="h4">All pools (click one)</h2><div class="pool-matrix" style="--nc:${countries.length}">
        <div></div>${countries.map((c) => `<div class="h">${UI.code(c)} ${COUNTRY[c]}</div>`).join('')}
        ${roleIds.map((r) => `<div class="lab">${esc(ctx.idx.role.get(r)?.title || r)}</div>${countries.map((c) => { const p = pools.find((x) => x.role_id === r && x.homeCountry === c); return p ? `<button class="pm${key(p) === key(pool) ? ' on' : ''}" data-pool="${esc(key(p))}" style="--vc:${UI.VERDICT_COLOR[p.verdict]}" aria-pressed="${key(p) === key(pool)}"><b>${esc(UI.VERDICT_SHORT[p.verdict])}</b><small>${p.poolSize} in pool${p.shielded.length ? ` · ${p.shielded.length} shielded` : ''}</small></button>` : '<div class="pm none">no one</div>'; }).join('')}`).join('')}
      </div></div>
      <div class="grid g2 mt">
        <div class="card"><div class="row between"><h2 class="h4" style="margin:0">Decision path · ${esc(role?.title || pool.role_id)} ${UI.code(pool.homeCountry)}</h2>${small ? `<span class="nap">${UI.volty('sleepy')}<small>zzz… pool too small</small></span>` : ''}</div>
          <div class="tree mt" id="tree">
            <div class="node lit"><b>Pool: ${pool.members} ${pool.members === 1 ? 'person' : 'people'}</b><small>${esc(role?.title || pool.role_id)}, ${COUNTRY[pool.homeCountry] || esc(pool.homeCountry)}${pool.country !== pool.homeCountry ? ` · judged under ${esc(pool.country)} rules` : ''}</small></div>
            ${pool.steps.map((s) => `<div class="stem lit"></div><div class="node lit${s.pass ? '' : ' fail'}"><b>${s.pass ? '✓' : '✕'} ${esc(s.test)}</b><small>${esc(s.value)}</small></div>`).join('')}
            <div class="stem lit"></div><div class="verdict" style="--vc:${vc}"><small style="opacity:.85;font-weight:800;letter-spacing:.12em;font-size:11px">VERDICT</small><b>${esc(pool.label)}</b><span style="font-size:13px">${esc(pool.reason)}</span></div>
          </div>
          ${pool.verdict === 'forced' ? `<dl class="kv mt"><dt>Tiers</dt><dd>${pool.tierPlan.map((t) => `${esc(t.tier)} ${t.pct}%`).join(' · ')}${pool.cutthroat ? ' (cutthroat pace)' : ''}</dd><dt>Bottom tier</dt><dd>${esc(pool.bottomTierAction)}</dd></dl>` : ''}
          ${pool.shielded.length ? `<p class="why mt"><b>Built-70 shield:</b> ${pool.shielded.map((id) => `<a class="lnk" data-person="${esc(id)}">${esc(ctx.idx.emp.get(id)?.name || id)}</a>`).join(', ')} ${pool.shielded.length === 1 ? 'is' : 'are'} in a ramp-up or stretch window and not compared with anyone.</p>` : ''}
        </div>
        <div class="card"><h2 class="h4">How this pool's scores really spread</h2>${histogram(members.map((r) => r.result.composite), { color: vc, height: 200 })}
          <p class="why mt">Forced ranking assumes the bell curve (yellow). Real performance tends to follow "the best and the rest" (red): a few stars and a long middle. Small or collaborative pools make a quota unfair.</p></div>
      </div>
      <div class="card mt" id="lbCard"><div class="row between"><h2 class="h4" style="margin:0">${pool.verdict === 'forced' ? 'Leaderboard and reward tiers' : 'Scores (no quotas)'} · ${ranked.length} compared${pool.shielded.length ? `, ${pool.shielded.length} shielded` : ''}</h2><span class="small muted">Persona rows are highlighted</span></div>
        <div class="tbl-wrap lb mt" tabindex="0" role="region" aria-label="Leaderboard, scrollable"><table class="tbl" id="board"><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Site</th><th scope="col">Composite</th><th scope="col">Rating</th><th scope="col">Gate</th><th scope="col">${pool.verdict === 'forced' ? 'Tier' : 'Calibration'}</th><th scope="col">Note</th></tr></thead><tbody>
          ${ranked.map((r, i) => `<tr class="click${personasHere.has(r.emp.emp_id) ? ' persona' : ''}" data-person="${esc(r.emp.emp_id)}"><td>${i + 1}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(r.emp.name)}<b>${esc(r.emp.name)}</b></div></td><td class="small">${esc(r.emp.site)}</td><td><b>${UI.fmt(r.result.composite)}</b></td><td>${UI.rate(r.result.rating, r.result.capped)}</td><td>${r.result.gates.some((g) => g.passed === false) ? '<span class="tag bad">✕ failed</span>' : r.result.gates.some((g) => g.passed === null) ? '<span class="tag warn">no data</span>' : r.result.gates.length ? '<span class="tag good">✓</span>' : '<span class="muted small">none</span>'}</td><td>${r.tier ? UI.tier(r.tier.tier) : '<span class="tag">discuss</span>'}</td><td class="small">${esc(r.tier?.note || (r.bottomTierAction ? r.bottomTierAction.text : ''))}${r.clubTrip ? ' ✈ Club trip' : ''}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card mt"><h2 class="s">The rules (edit them)</h2><div class="grid g2">
        <div><div class="slider-row rule"><label for="r-any">Smallest pool to rank at all</label><input type="range" id="r-any" min="5" max="40" value="${R.min_pool_any_ranking}" data-k="min_pool_any_ranking"><output for="r-any">${R.min_pool_any_ranking}</output></div>
          <div class="slider-row rule"><label for="r-forced">Smallest pool for forced tiers</label><input type="range" id="r-forced" min="10" max="60" value="${R.min_pool_forced_distribution}" data-k="min_pool_forced_distribution"><output for="r-forced">${R.min_pool_forced_distribution}</output></div>
          <div class="slider-row rule"><label for="r-meas">Measurability needed (1–5)</label><input type="range" id="r-meas" min="1" max="5" value="${R.measurability_at_least}" data-k="measurability_at_least"><output for="r-meas">${R.measurability_at_least}</output></div>
          <p class="why small">The forced-tier pool can never be smaller than the pool needed to rank at all.</p>
          <button class="btn light sm mt" id="rReset">Reset rules</button></div>
        <ul class="dots"><li>Innovation or interdependence ≥ ${R.block_if_innovation_at_least} blocks ranking: it would punish risk-taking and helping colleagues.</li><li>Pace ≥ ${R.cutthroat_pace_at_least} ("cutthroat") narrows the top tier to ${R.tiers_cutthroat[0].pct}%, so rewards are sharper.</li><li>A failed gate caps the rating at ${ctx.out.mode.strictGates ? ctx.rules.dna.risk_appetite.strict_gate_rating_cap : R.gate_fail_rating_cap}: no top tier however good the numbers.</li><li>India: bottom tier → ${esc(btxt('IN'))} (${esc(ctx.out.cadence.pip_days)} at pace ${esc(ctx.out.cadence.pace)}).</li><li>China: bottom tier → ${esc(btxt('CN'))}.</li><li class="small muted">Bottom-tier wording comes from the Country Lens configuration.</li></ul>
      </div></div>`;
  },
  mount(root, ctx, { soft }) {
    if (!root.querySelector('#tree')) return;
    root.querySelectorAll('[data-pool]').forEach((b) => b.addEventListener('click', () => ctx.setSel('pool', b.dataset.pool)));
    if (!RM && !soft) {
      const nodes = root.querySelectorAll('#tree > *');
      gsap.from(nodes, { opacity: 0.25, x: -10, duration: 0.35, stagger: 0.18, delay: 0.4, ease: 'power2.out' });
      gsap.from(root.querySelector('#tree .verdict'), { scale: 0.85, duration: 0.6, delay: 0.4 + nodes.length * 0.18, ease: 'back.out(2)' });
      gsap.from(root.querySelectorAll('#board tbody tr'), { opacity: 0, x: 16, duration: 0.3, stagger: 0.015, delay: 0.6 });
    }
    const any = root.querySelector('#r-any'), forced = root.querySelector('#r-forced');
    root.querySelectorAll('input[type=range][data-k]').forEach((inp) => {
      inp.addEventListener('input', () => {
        // keep the two pool sizes consistent while dragging
        if (inp === any && Number(any.value) > Number(forced.value)) { forced.value = any.value; forced.nextElementSibling.textContent = forced.value; }
        if (inp === forced && Number(forced.value) < Number(any.value)) { any.value = forced.value; any.nextElementSibling.textContent = any.value; }
        inp.nextElementSibling.textContent = inp.value;
      });
      inp.addEventListener('change', () => {
        const before = ctx.out;
        const rules = structuredClone(ctx.rules);
        rules.ranking[inp.dataset.k] = Number(inp.value);
        rules.ranking.min_pool_any_ranking = Number(any.value);
        rules.ranking.min_pool_forced_distribution = Math.max(Number(forced.value), Number(any.value));
        ctx.setRules(rules);
        ctx.changes(`<b>Rule: ${esc(root.querySelector(`label[for="${inp.id}"]`)?.textContent || inp.dataset.k)} → ${esc(inp.value)}</b>`, before);
      });
    });
    root.querySelector('#rReset').addEventListener('click', () => {
      const before = ctx.out;
      ctx.resetRules('ranking');
      ctx.changes('<b>Ranking rules reset</b>', before);
    });
  },
};
