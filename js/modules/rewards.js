// M7 Rewards & Recognition: bonus maths, merit matrix, budget guard, gainsharing, sales tiers, delivery planner, recognition wall.
import * as UI from '../ui.js';
import { gainsharingPool } from '../engine/rewards.js';
const { esc, gsap, RM } = UI;

const JAR = `<svg viewBox="0 0 300 330" aria-hidden="true"><defs><linearGradient id="jarG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient></defs>
  <rect x="92" y="18" width="116" height="26" rx="8" fill="#c9b7ff" opacity=".85"/>
  <path d="M100 44 h100 v16 q44 18 44 70 v150 q0 32 -32 32 h-124 q-32 0 -32 -32 v-150 q0 -52 44 -70z" fill="url(#jarG)" stroke="#8b5cf6" stroke-width="3" stroke-opacity=".55"/>
  <path d="M78 150 q0 -30 22 -46" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/></svg>`;
const n = (v) => (v === '' || v == null ? null : Number(v));
const COUNTRY = { IN: 'India', CN: 'China' };
const CUR = { IN: 'INR', CN: 'CNY' };

function meritGrid(ctx, country) {
  const rows = ctx.idx.policy.filter((p) => p.country === country && p.merit_pct !== '' && p.rating !== '');
  const get = (r, b) => n(rows.find((p) => String(p.rating) === String(r) && p.compa_band === b)?.merit_pct);
  return { get, max: Math.max(...rows.map((p) => n(p.merit_pct) || 0), 1), any: rows.length > 0 };
}

export default {
  nextNote: 'Rewards paid. Now build the people',
  render(ctx) {
    const withRw = ctx.out.employees.filter((x) => x.rewards);
    if (!withRw.length) return `${UI.pageHead({ eyebrow: 'M7 · Rewards & Recognition', title: 'No rewards to show', sub: 'Nobody in the loaded data has a valid base pay. Check base_pay and pay_range_mid in the Employees sheet.' })}`;
    const pid = ctx.pickPerson('rewPerson', ctx.personaId('arjun'), (x) => !!x.rewards);
    ctx.state.sel.rewPerson = pid;
    const r = ctx.row(pid), rw = r.rewards, e = r.emp, cur = rw.currency;
    const c = e.country;
    const mg = meritGrid(ctx, c);
    const cf = ctx.rules.rewards.company_factor;
    const bud = ctx.out.budget;
    const countries = ['IN', 'CN'].filter((cc) => ctx.out.employees.some((x) => x.emp.country === cc));
    const asmMgrs = Object.keys(ctx.out.gainsharing);
    const ritu = ctx.persona('ritu');
    const gmWant = ctx.sel('gainMgr', ritu?.emp.manager_id || asmMgrs[0]);
    const gm = asmMgrs.includes(gmWant) ? gmWant : asmMgrs[0];
    if (gm) ctx.state.sel.gainMgr = gm;
    const team = gm ? ctx.out.employees.filter((x) => x.emp.role_id === 'ASM' && x.emp.manager_id === gm) : [];
    const g = gm ? ctx.out.gainsharing[gm] : null;
    const gCur = team[0]?.emp.currency;
    const sal = countries.map((cc) => ({ cc, pool: ctx.out.pools.find((p) => p.role_id === 'SAL' && p.homeCountry === cc), rows: ctx.out.employees.filter((x) => x.emp.role_id === 'SAL' && x.emp.country === cc) })).filter((s) => s.rows.length);
    const rec = [...(ctx.data.Recognition || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const pts = {}; for (const k of rec) pts[k.to_emp_id] = (pts[k.to_emp_id] || 0) + Number(k.points || 0);
    const leaders = Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const badges = {}; for (const k of rec) badges[k.badge] = (badges[k.badge] || 0) + 1;
    const cfg = ctx.idx.country;
    const rnd = ctx.rules.rewards.rnd;
    const S = ctx.rules.rewards.sales;
    const lens = ctx.state.lens;
    const planner = [
      ['Merit increase', 'Base pay', { IN: cfg.increment_effective?.IN, CN: cfg.increment_effective?.CN }, 'Private letter · cash', 'Manager proposes, calibration approves'],
      ['Annual bonus', 'Variable pay', { IN: 'With the April increment cycle', CN: 'Before Spring Festival (13th-month style)' }, 'Private · cash', bud.IN?.strict ? 'Formula; strict budget guard rescales to the pool' : 'Formula; budget guard warns'],
      ['Sales commission & contests', 'Units, tiers, Club trip', { IN: 'Monthly + Diwali contest', CN: 'Monthly + year-end before Spring Festival' }, 'Public leaderboard · cash + trip', 'Formula after the fair-selling gate'],
      ['Plant gainsharing', 'Team share of savings', { IN: 'Quarterly', CN: 'Quarterly' }, 'Team announcement · cash', 'Formula, split by attendance'],
      ['Spot awards & kudos', 'Badges, points', { IN: 'Any time; town halls', CN: 'Any time; team banners, hongbao' }, 'IN: public · CN: praise at team level · non-cash', 'Peers and managers'],
      ['Patent & filing bonus', 'R&D', { IN: `₹${rnd.patent_filing_bonus.IN.toLocaleString('en-IN')} on filing`, CN: `¥${rnd.patent_filing_bonus.CN.toLocaleString('zh-CN')} on filing` }, 'Public at tech forum · cash', 'IP committee'],
      ['Development as a reward', 'Stretch, rotation, wallet', { IN: 'IDP cycle', CN: 'IDP cycle' }, 'Private · non-cash', 'Manager + talent council'],
    ];
    const plannerCs = lens === 'home' ? (countries.length ? countries : ['IN']) : [lens];
    const ps = ctx.out.personas.filter((p) => p.row?.rewards);
    const guardLine = (cc) => {
      const b = bud[cc];
      if (!b) return '';
      const over = b.utilisationBeforePct > 100;
      return `<div class="budget"><div class="row between small"><b>${UI.code(cc)} bonus pool</b><span>${UI.money(b.paid, CUR[cc])} of ${UI.money(b.targetPool, CUR[cc])}</span></div>
        <div class="bmeter" role="img" aria-label="${esc(`${COUNTRY[cc]} bonus pool ${b.utilisationBeforePct}% used before the guard`)}"><i style="width:${Math.min(150, b.utilisationBeforePct) / 1.5}%;background:${over ? '#e5484d' : '#1dab84'}"></i><span style="left:${100 / 1.5}%"></span></div>
        <div class="small ${over ? 'bad-t' : 'muted'}">${b.utilisationBeforePct}% of the pool${over ? (b.factor < 1 ? `: over budget, so every ${COUNTRY[cc]} bonus was rescaled ×${b.factor.toFixed(3)} to use exactly 100%` : ': over budget (warning only: Strategy DNA cost focus is below the strict threshold)') : ''}</div></div>`;
    };
    return `
      ${UI.pageHead({ eyebrow: 'M7 · Rewards & Recognition', title: 'What, when, how <em>and who.</em>', sub: 'Pay follows the rating through a formula you can read. Recognition happens all year. India and China pay at different times and in different styles, and development counts as a reward too.' })}
      <div class="grid g12 rw-top">
        <div class="card jar-card" style="text-align:center"><h2 class="h4">Release the Q4 bonus</h2>
          <div class="jar-box" id="jar">${JAR}</div>
          <div class="payout" id="payout" aria-live="polite">${UI.money(0, cur)}</div><div class="small muted">${esc(e.name)} · total variable pay</div>
          <button class="btn pri mt" id="release">💰 Release Q4 bonus</button></div>
        <div class="card"><div class="row between"><h2 class="h4" style="margin:0">Bonus calculator</h2><label class="sr-only" for="rewWho">Person</label><select class="sel" id="rewWho">${(ps.length ? ps.map((p) => p.row) : withRw.slice(0, 300)).map((x) => `<option value="${esc(x.emp.emp_id)}"${x.emp.emp_id === pid ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.title)}</option>`).join('')}${(ps.length ? ps.some((p) => p.emp_id === pid) : withRw.slice(0, 300).includes(r)) ? '' : `<option value="${esc(pid)}" selected>${esc(e.name)}</option>`}</select></div>
          <div class="calc mt">${[['Base pay', UI.money(rw.base, cur)], ['× target bonus', `${rw.targetBonusPct}%`], ['× company factor', cf], ['× rating multiplier', `${rw.multiplier} (rating ${r.result.rating})`], ...(rw.guardFactor < 1 ? [['× budget guard', rw.guardFactor.toFixed(3)]] : []), ['= bonus', UI.money(rw.bonus, cur)]].map(([l, v], i, arr) => `<div class="cstep${i === arr.length - 1 ? ' eq' : ''}"><small>${esc(l)}</small><b>${esc(String(v))}</b></div>`).join('')}</div>
          ${rw.extras.length ? `<dl class="kv extras mt">${rw.extras.map((x) => `<dt>${esc(x.name)}</dt><dd>${x.amount === null ? esc(x.detail) : `${UI.money(x.amount, cur)} <span class="muted small">${esc(x.detail)}</span>`}</dd>`).join('')}</dl>` : ''}
          ${r.clubTrip ? `<p class="mt"><span class="badge">✈ Club trip: top ${S.club_trip_top_pct}% of the sales pool</span></p>` : ''}
          ${r.result.capped ? `<p class="why mt" style="color:#b4232c">${esc(r.result.why)}</p>` : ''}
          <div class="grid g2 rw-split mt"><div><h3 class="h4">Merit matrix · ${UI.code(c)}</h3>${mg.any ? `<div class="heat" role="table" aria-label="Merit increase by rating and compa-ratio band"><div class="r" role="row"><div class="h" role="columnheader"><span class="sr-only">Rating</span></div>${['low', 'mid', 'high'].map((b) => `<div class="h" role="columnheader">compa ${b}</div>`).join('')}</div>
            ${[5, 4, 3, 2, 1].map((rt) => `<div class="r" role="row"><div class="h" role="rowheader">rating ${rt}</div>${['low', 'mid', 'high'].map((b) => { const v = mg.get(rt, b); const a = 0.06 + ((v ?? 0) / mg.max) * 0.5; return `<div role="cell" class="${rt === r.result.rating && b === rw.compaBand ? 'me' : ''}" style="background:rgba(124,58,237,${a.toFixed(2)})">${v === null ? '—' : `${v}%`}</div>`; }).join('')}</div>`).join('')}</div>` : '<p class="why">No rating × compa rows in the Reward_Policy sheet for this country; merit uses the grade budget × multiple from the rules.</p>'}
            <p class="why mt">Compa-ratio ${rw.compa} (${esc(rw.compaBand)} band: below 0.9 is low, 0.9 to 1.1 is mid, above 1.1 is high). People paid below the range midpoint get a bigger rise for the same rating. ${esc(String(e.name).split(' ')[0])}: +${rw.meritPct}% → ${UI.money(rw.newBase, cur)}.</p></div>
            <div><h3 class="h4"><label for="cf">Company factor (business result)</label></h3><div class="slider-row bare"><input type="range" id="cf" min="0.5" max="1.5" step="0.05" value="${cf}"><output id="cfO" for="cf">${cf}</output></div>
              <h3 class="h4 mt">Budget guard</h3>${countries.map(guardLine).join('')}</div></div>
        </div>
      </div>
      <div class="grid g2 mt" id="rwTeams">
        <div class="card"><div class="row between"><h2 class="h4" style="margin:0">Plant gainsharing (Assembly)</h2>${asmMgrs.length ? `<label class="sr-only" for="gainMgr">Assembly line</label><select class="sel" id="gainMgr">${asmMgrs.map((m) => `<option value="${esc(m)}"${m === gm ? ' selected' : ''}>${esc(ctx.idx.emp.get(m)?.name || m)}'s line (${esc(ctx.idx.emp.get(m)?.site || '')})</option>`).join('')}</select>` : ''}</div>
          ${g ? `<p class="why mt">Assembly is never ranked. If the line beats standard output, ${g.sharePct}% of the saving is shared, split by attendance${g.sharePct > ctx.rules.rewards.gainsharing.pool_share_of_savings_pct ? ' (raised by Strategy DNA team orientation)' : ''}. ${ritu && team.some((x) => x.emp.emp_id === ritu.emp.emp_id) ? 'Ritu Deshmukh\'s' : 'This'} line averaged <b>${g.avgOutputPct}%</b> of standard${g.pool ? `, so the pool is <b>${UI.money(g.pool, gCur)}</b>` : ', below standard, so there is nothing to share this year'}.</p>
          <div class="slider-row rule"><label for="gx">What if output were</label><input type="range" id="gx" min="90" max="125" step="1" value="${Math.round(g.avgOutputPct)}"><output id="gxO" for="gx">${Math.round(g.avgOutputPct)}%</output></div>
          <div class="grid g2 mt"><div class="card stat soft"><div class="v" id="gPool">${UI.money(g.pool, gCur)}</div><div class="l">TEAM POOL</div></div><div class="card stat soft"><div class="v" id="gHead">${UI.money(team.length ? g.pool / team.length : 0, gCur)}</div><div class="l">PER PERSON (AVERAGE)</div></div></div>
          ${ritu && team.some((x) => x.emp.emp_id === ritu.emp.emp_id) ? `<p class="why mt">Ritu is also on <b>skill-based pay</b>: grade ${esc(ritu.emp.grade)} today; the multi-skill certification moves her up one level (L1–L4 ladder).</p>` : ''}`
          : '<p class="why mt">No Assembly lines in the loaded data, so there is no plant gainsharing to show.</p>'}</div>
        <div class="card"><h2 class="h4">Sales: tiers after the gate</h2>${sal.length ? sal.map((s) => `<div class="mt"><b>${UI.code(s.cc)} ${s.rows.length} consultants</b> · ${esc(UI.VERDICT_SHORT[s.pool?.verdict] || '')}
            <div class="tierbar" role="img" aria-label="${esc(['Top', 'Core', 'Bottom'].map((t) => `${t} ${s.rows.filter((x) => x.tier?.tier === t).length}`).join(', '))}">${['Top', 'Core', 'Bottom'].map((t) => { const k = s.rows.filter((x) => x.tier?.tier === t).length; return k ? `<i class="${t}" style="flex:${k}">${t} ${k}</i>` : ''; }).join('')}</div>
            <div class="small muted">Club trip: ${s.rows.filter((x) => x.clubTrip).map((x) => esc(x.emp.name)).join(', ') || '—'} · Gate failures: ${s.rows.filter((x) => x.result.gates.some((gg) => gg.passed === false)).length} (no top tier, no kicker)</div></div>`).join('')
            + `<p class="why mt">Commission ${UI.money(S.commission_per_unit.IN, 'INR')} / unit in India, ${UI.money(S.commission_per_unit.CN, 'CNY')} in China. The top ${S.kicker_top_pct ?? 20}% of each ranked pool who passed the fair-selling gate get a ${S.top_tier_kicker_pct_of_commission}% kicker. ${esc(S.festive_contest.IN)} · ${esc(S.festive_contest.CN)}.</p>` : '<p class="why mt">No sales roles in the loaded data.</p>'}</div>
      </div>
      <div class="card mt"><h2 class="s">Total rewards for ${esc(e.name)} ${UI.code(c)}: ${UI.money(rw.totalRewards, cur)} a year</h2><div class="wheel">
        ${[['💵 Pay', `Base ${UI.money(rw.base, cur)}; merit +${rw.meritPct}%`], ['🎯 Variable', `Bonus ${UI.money(rw.bonus, cur)}${rw.extras.filter((x) => x.amount).map((x) => ` · ${esc(x.name)} ${UI.money(x.amount, cur)}`).join('')}`], ['🛡 Benefits', esc(cfg.mandatory_pay?.[c])], ['🏅 Recognition', `${pts[e.emp_id] || 0} kudos points this year`], ['🌱 Development', ctx.state.toggles.wallet ? `Learning wallet ${UI.money(rw.learningWallet, cur)} (${esc(rw.walletDetail || '')}); stretch roles; passport stamps (${r.helix.built}/7)` : 'Learning wallet switched off in the Leadership Forge'], ['⏱ Work-life', esc(cfg.hours_guardrail?.[c])]].map(([h, t]) => `<div><b>${h}</b>${t}</div>`).join('')}</div>
        <p class="why mt">Total = base pay + variable pay + learning wallet. Statutory benefits are listed but not priced.</p></div>
      <div class="card mt"><h2 class="s">Delivery planner: what, when, how, who</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Reward</th><th scope="col">What</th><th scope="col">When ${plannerCs.map((x) => UI.code(x)).join(' / ')}</th><th scope="col">How</th><th scope="col">Who decides</th></tr></thead><tbody>
        ${planner.map(([a, w, when, how, who]) => `<tr><td><b>${esc(a)}</b></td><td class="small">${esc(w)}</td><td class="small">${plannerCs.map((x, i) => `${i ? '<br><span class="muted">' : ''}${esc(when[x])}${i ? '</span>' : ''}`).join('')}</td><td class="small">${esc(how)}</td><td class="small">${esc(who)}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">${UI.code('IN')} ${esc(cfg.recognition_norms?.IN)} · ${UI.code('CN')} ${esc(cfg.recognition_norms?.CN)}</p></div>
      <div class="grid g21 mt"><div class="card"><div class="row between"><h2 class="s" style="margin:0">Recognition wall</h2><button class="btn sm" id="kudoBtn">+ Send kudos</button></div>
          <div class="kudos mt" id="kudos">${rec.slice(0, 9).map((k) => `<div class="kudo"><span class="badge">${esc(k.badge)}</span><b>${esc(ctx.idx.emp.get(k.to_emp_id)?.name || k.to_emp_id)}</b><span class="muted">from ${esc(ctx.idx.emp.get(k.from_emp_id)?.name || k.from_emp_id)} · ${esc(k.date)} · +${esc(k.points)}</span></div>`).join('') || '<p class="why">No recognition rows in the loaded data.</p>'}</div></div>
        <div class="card"><h2 class="h4">Most recognised</h2>${leaders.map(([id, p]) => `<div class="li"${ctx.row(id) ? ` data-person="${esc(id)}"` : ''} style="margin-bottom:6px">${UI.avatar(ctx.idx.emp.get(id)?.name || id)}<div class="grow"><b>${esc(ctx.idx.emp.get(id)?.name || id)}</b><small>${esc(ctx.row(id)?.title || '')}</small></div><b>${p}</b></div>`).join('') || '<p class="why">—</p>'}
          <h2 class="h4 mt">Badges given</h2><div class="chips">${Object.entries(badges).map(([b, k]) => `<span class="tag">${esc(b)} × ${k}</span>`).join('')}</div></div></div>`;
  },
  mount(root, ctx) {
    const who = root.querySelector('#rewWho');
    if (!who) return;
    who.addEventListener('change', (e) => ctx.setSel('rewPerson', e.target.value));
    root.querySelector('#gainMgr')?.addEventListener('change', (e) => ctx.setSel('gainMgr', e.target.value));
    const pid = ctx.state.sel.rewPerson, r = ctx.row(pid), rw = r.rewards;
    // coins into the jar (positions in % so the jar can shrink with its card)
    const jar = root.querySelector('#jar'), payout = root.querySelector('#payout');
    const tweens = [];
    const release = (evt) => {
      jar.querySelectorAll('.coin').forEach((c) => c.remove());
      const N = 14, coins = [];
      for (let i = 0; i < N; i++) {
        const c = document.createElement('div'); c.className = 'coin'; c.textContent = rw.currency === 'CNY' ? '¥' : '₹';
        const row = Math.floor(i / 4), col = i % 4;
        c.style.left = `${((78 + col * 38 + (row % 2) * 16) / 300) * 100}%`; c.style.top = `${((262 - row * 30) / 330) * 100}%`;
        jar.appendChild(c); coins.push(c);
      }
      if (RM) { coins.forEach((c) => { c.style.opacity = 1; }); payout.textContent = UI.money(rw.total, rw.currency); return; }
      tweens.push(gsap.fromTo(coins, { yPercent: -900, rotation: () => gsap.utils.random(-180, 180), opacity: 1 }, { yPercent: 0, rotation: () => gsap.utils.random(-20, 20), duration: 0.9, ease: 'bounce.out', stagger: 0.07 }));
      const o = { v: 0 };
      tweens.push(gsap.to(o, { v: rw.total, duration: 1.6, ease: 'power2.out', onUpdate: () => { payout.textContent = UI.money(o.v, rw.currency); } }));
      const b = evt?.currentTarget?.getBoundingClientRect?.() || jar.getBoundingClientRect();
      const t = setTimeout(() => UI.confetti(b.left + b.width / 2, b.top), 900);
      ctx.onCleanup(() => clearTimeout(t));
    };
    root.querySelector('#release').addEventListener('click', release);
    payout.textContent = UI.money(0, rw.currency);
    if (ctx.state.autoRelease) { ctx.state.autoRelease = false; const t = setTimeout(release, 600); ctx.onCleanup(() => clearTimeout(t)); }
    ctx.onCleanup(() => tweens.forEach((t) => t.kill()));
    // company factor
    const cf = root.querySelector('#cf');
    cf.addEventListener('input', () => { root.querySelector('#cfO').textContent = cf.value; });
    cf.addEventListener('change', () => {
      const before = ctx.out;
      const rules = structuredClone(ctx.rules); rules.rewards.company_factor = Number(cf.value);
      ctx.setRules(rules);
      ctx.changes(`<b>Company factor → ${esc(cf.value)}</b>`, before);
    });
    // gainsharing what-if (the engine's own formula)
    const gm = root.querySelector('#gainMgr')?.value;
    const gx = root.querySelector('#gx');
    if (gm && gx) {
      const team = ctx.out.employees.filter((x) => x.emp.role_id === 'ASM' && x.emp.manager_id === gm);
      const payroll = team.reduce((s, x) => s + Number(x.emp.base_pay || 0), 0);
      const cur = team[0]?.emp.currency;
      gx.addEventListener('input', () => {
        const v = Number(gx.value);
        root.querySelector('#gxO').textContent = `${v}%`;
        const pool = gainsharingPool(v, payroll, ctx.out.org, ctx.rules);
        root.querySelector('#gPool').textContent = UI.money(pool, cur);
        root.querySelector('#gHead').textContent = UI.money(team.length ? pool / team.length : 0, cur);
      });
    }
    // kudos: never to yourself; "Most recognised" refreshes afterwards
    root.querySelector('#kudoBtn').addEventListener('click', (e) => {
      const pool = (ctx.out.personas.filter((p) => p.row).map((p) => p.row.emp).length ? ctx.out.personas.filter((p) => p.row).map((p) => p.row.emp) : ctx.out.employees.map((x) => x.emp)).filter((x) => x.emp_id !== pid);
      if (!pool.length) return;
      const to = pool[Math.floor(Math.random() * pool.length)];
      const badges = ['Kaizen Champion', 'Customer Hero', 'Bridge Builder', 'Safety Streak 100 days', 'Fast Fix', 'Team Player'];
      const k = { from_emp_id: pid, to_emp_id: to.emp_id, date: ctx.out.asOf, badge: badges[Math.floor(Math.random() * badges.length)], points: 50, message: 'Thank you!' };
      (ctx.state.data.Recognition ||= []).push(k);
      ctx.markDirty();
      const div = document.createElement('div'); div.className = 'kudo';
      div.innerHTML = `<span class="badge">${esc(k.badge)}</span><b>${esc(to.name)}</b><span class="muted">from ${esc(r.emp.name)} · just now · +50</span>`;
      root.querySelector('#kudos').prepend(div);
      if (!RM) gsap.from(div, { scale: 0.3, opacity: 0, duration: 0.5, ease: 'back.out(2.5)' });
      const b = e.currentTarget.getBoundingClientRect(); UI.confetti(b.left + b.width / 2, b.top);
      const t = setTimeout(() => ctx.rerender(), 1400);
      ctx.onCleanup(() => clearTimeout(t));
    });
  },
};
