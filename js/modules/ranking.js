// M5 Ranking Decision Engine: verdict per role × country pool, lit decision path, leaderboard, rules you can edit.
import * as UI from '../ui.js';
import { histogram } from '../charts.js';
const { esc, gsap, RM } = UI;

export default {
  nextNote: 'Rules decided. Now run the year',
  render(ctx) {
    const pid = ctx.pickPerson('rankPerson', null);
    if (pid) { const e = ctx.row(pid).emp; ctx.state.sel.pool = `${e.role_id}|${e.country}`; }
    const key = ctx.sel('pool', 'SAL|IN');
    const [rid, home] = key.split('|');
    const pools = ctx.out.pools;
    const pool = pools.find((p) => p.role_id === rid && p.homeCountry === home) || pools[0];
    const role = ctx.idx.role.get(pool.role_id);
    const R = ctx.rules.ranking;
    const members = ctx.out.employees.filter((r) => r.emp.role_id === pool.role_id && r.emp.country === pool.homeCountry);
    const ranked = members.filter((r) => !r.shielded).sort((a, b) => (b.result.composite ?? 0) - (a.result.composite ?? 0));
    const roleIds = [...new Set(pools.map((p) => p.role_id))];
    const vc = UI.VERDICT_COLOR[pool.verdict];
    const personasHere = new Set(ctx.out.personas.filter((p) => p.row && members.includes(p.row)).map((p) => p.emp_id));
    const small = pool.verdict === 'absolute' && pool.poolSize < R.min_pool_any_ranking;
    const steps = pool.steps;
    return `
      ${UI.pageHead({ eyebrow: 'M5 · Ranking Decision Engine', title: 'Forced ranking? <em>Only where it is fair.</em>', sub: 'The engine checks every role × country pool against three tests. Forced tiers are used for rewards only, never for exits, and only after the compliance gate. Anyone in a new role or on a stretch assignment is kept out of the pool.' })}
      <div class="card"><h4>All pools (click one)</h4><div class="pool-matrix">
        <div></div><div class="h">${UI.code('IN')} India</div><div class="h">${UI.code('CN')} China</div>
        ${roleIds.map((r) => `<div class="lab">${esc(ctx.idx.role.get(r).title)}</div>${['IN', 'CN'].map((c) => { const p = pools.find((x) => x.role_id === r && x.homeCountry === c); return p ? `<button class="pm${p.role_id === pool.role_id && p.homeCountry === pool.homeCountry ? ' on' : ''}" data-pool="${r}|${c}" style="--vc:${UI.VERDICT_COLOR[p.verdict]}"><b>${esc(UI.VERDICT_SHORT[p.verdict])}</b><small>${p.poolSize} in pool${p.shielded.length ? ` · ${p.shielded.length} shielded` : ''}</small></button>` : '<div class="pm none">no one</div>'; }).join('')}`).join('')}
      </div></div>
      <div class="grid g2 mt">
        <div class="card"><div class="row between"><h4 style="margin:0">Decision path · ${esc(role.title)} ${UI.code(pool.homeCountry)}</h4>${small ? `<span class="nap">${UI.volty('sleepy')}<small>zzz… pool too small</small></span>` : ''}</div>
          <div class="tree mt" id="tree">
            <div class="node lit"><b>Pool: ${pool.members} people</b><small>${esc(role.title)}, ${pool.homeCountry === 'IN' ? 'India' : 'China'}${pool.country !== pool.homeCountry ? ` · judged under ${pool.country} rules` : ''}</small></div>
            ${steps.map((s) => `<div class="stem lit"></div><div class="node lit${s.pass ? '' : ' fail'}"><b>${s.pass ? '✓' : '✕'} ${esc(s.test)}</b><small>${esc(s.value)}</small></div>`).join('')}
            <div class="stem lit"></div><div class="verdict" style="--vc:${vc}"><small style="opacity:.85;font-weight:800;letter-spacing:.12em;font-size:11px">VERDICT</small><b>${esc(pool.label)}</b><span style="font-size:13px">${esc(pool.reason)}</span></div>
          </div>
          ${pool.verdict === 'forced' ? `<div class="kv mt"><dt>Tiers</dt><dd>${pool.tierPlan.map((t) => `${t.tier} ${t.pct}%`).join(' · ')}${pool.cutthroat ? ' (cutthroat pace)' : ''}</dd><dt>Bottom tier</dt><dd>${esc(pool.bottomTierAction)}</dd></div>` : ''}
          ${pool.shielded.length ? `<p class="why mt"><b>Built-70 shield:</b> ${pool.shielded.map((id) => `<a class="lnk" data-person="${id}">${esc(ctx.idx.emp.get(id).name)}</a>`).join(', ')} ${pool.shielded.length === 1 ? 'is' : 'are'} in a ramp-up or stretch window and not compared with anyone.</p>` : ''}
        </div>
        <div class="card"><h4>How this pool's scores really spread</h4>${histogram(members.map((r) => r.result.composite), { color: vc, height: 200 })}
          <p class="why mt">Forced ranking assumes the bell curve (yellow). Real performance tends to follow "the best and the rest" (red): a few stars and a long middle. Small or collaborative pools make a quota unfair.</p></div>
      </div>
      <div class="card mt" id="lbCard"><div class="row between"><h4 style="margin:0">${pool.verdict === 'forced' ? 'Leaderboard and reward tiers' : 'Scores (no quotas)'} · ${ranked.length} compared</h4><span class="small muted">Persona rows are highlighted</span></div>
        <div style="overflow-x:auto;max-height:380px;overflow-y:auto" class="mt"><table class="tbl" id="board"><thead><tr><th>#</th><th>Name</th><th>Site</th><th>Composite</th><th>Rating</th><th>Gate</th><th>${pool.verdict === 'forced' ? 'Tier' : 'Calibration'}</th><th>Note</th></tr></thead><tbody>
          ${ranked.map((r, i) => `<tr class="click${personasHere.has(r.emp.emp_id) ? ' persona' : ''}" data-person="${r.emp.emp_id}"><td>${i + 1}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(r.emp.name)}<b>${esc(r.emp.name)}</b></div></td><td class="small">${esc(r.emp.site)}</td><td><b>${UI.fmt(r.result.composite)}</b></td><td>${UI.rate(r.result.rating, r.result.capped)}</td><td>${r.result.gatePassed ? '<span class="tag good">✓</span>' : '<span class="tag bad">✕ failed</span>'}</td><td>${r.tier ? UI.tier(r.tier.tier) : '<span class="tag">discuss</span>'}</td><td class="small">${esc(r.tier?.note || (r.bottomTierAction ? r.bottomTierAction.text : ''))}${r.clubTrip ? ' ✈ Club trip' : ''}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card mt"><h3 class="s">The rules (edit them)</h3><div class="grid g2">
        <div><div class="slider-row" style="grid-template-columns:220px 1fr 40px"><label for="r-any">Smallest pool to rank at all</label><input type="range" id="r-any" min="5" max="40" value="${R.min_pool_any_ranking}" data-k="min_pool_any_ranking"><output>${R.min_pool_any_ranking}</output></div>
          <div class="slider-row" style="grid-template-columns:220px 1fr 40px"><label for="r-forced">Smallest pool for forced tiers</label><input type="range" id="r-forced" min="10" max="60" value="${R.min_pool_forced_distribution}" data-k="min_pool_forced_distribution"><output>${R.min_pool_forced_distribution}</output></div>
          <div class="slider-row" style="grid-template-columns:220px 1fr 40px"><label for="r-meas">Measurability needed (1–5)</label><input type="range" id="r-meas" min="1" max="5" value="${R.measurability_at_least}" data-k="measurability_at_least"><output>${R.measurability_at_least}</output></div>
          <button class="btn light sm mt" id="rReset">Reset rules</button></div>
        <ul class="dots"><li>Innovation or interdependence ≥ ${R.block_if_innovation_at_least} blocks ranking: it would punish risk-taking and helping colleagues.</li><li>Pace ≥ ${R.cutthroat_pace_at_least} ("cutthroat") narrows the top tier to ${R.tiers_cutthroat[0].pct}%, so rewards are sharper.</li><li>A failed gate caps the rating at ${R.gate_fail_rating_cap}: no top tier however good the numbers.</li><li>India: bottom tier → ${esc(R.bottom_tier_action.IN)}.</li><li>China: bottom tier → ${esc(R.bottom_tier_action.CN)}.</li></ul>
      </div></div>`;
  },
  mount(root, ctx, { soft }) {
    root.querySelectorAll('[data-pool]').forEach((b) => b.addEventListener('click', () => ctx.setSel('pool', b.dataset.pool)));
    if (!RM && !soft) {
      const nodes = root.querySelectorAll('#tree > *');
      gsap.from(nodes, { opacity: 0.25, x: -10, duration: 0.35, stagger: 0.18, delay: 0.4, ease: 'power2.out' });
      gsap.from(root.querySelector('#tree .verdict'), { scale: 0.85, duration: 0.6, delay: 0.4 + nodes.length * 0.18, ease: 'back.out(2)' });
      gsap.from(root.querySelectorAll('#board tbody tr'), { opacity: 0, x: 16, duration: 0.3, stagger: 0.015, delay: 0.6 });
    }
    root.querySelectorAll('input[type=range][data-k]').forEach((inp) => {
      inp.addEventListener('input', () => { inp.nextElementSibling.textContent = inp.value; });
      inp.addEventListener('change', () => {
        const before = new Map(ctx.out.pools.map((p) => [`${p.role_id}|${p.homeCountry}`, p.verdict]));
        const rules = structuredClone(ctx.rules);
        rules.ranking[inp.dataset.k] = Number(inp.value);
        ctx.setRules(rules);
        const changed = ctx.out.pools.filter((p) => before.get(`${p.role_id}|${p.homeCountry}`) !== p.verdict);
        UI.showChanges([`<b>Rule: ${esc(inp.previousElementSibling.textContent)} → ${inp.value}</b>`, ...(changed.length ? changed.map((p) => `<span>${esc(ctx.idx.role.get(p.role_id).title)} ${p.homeCountry}:</span> ${esc(UI.VERDICT_SHORT[before.get(`${p.role_id}|${p.homeCountry}`)])} → <b>${esc(UI.VERDICT_SHORT[p.verdict])}</b>`) : ['<span>No pool changed its verdict.</span>'])]);
      });
    });
    root.querySelector('#rReset').addEventListener('click', async () => {
      const fresh = await (await fetch('data/rules/ranking.json')).json();
      ctx.setRules({ ...ctx.rules, ranking: fresh }); UI.toast('Ranking rules reset.');
    });
  },
};
