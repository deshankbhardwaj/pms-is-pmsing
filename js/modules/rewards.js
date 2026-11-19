// M7 Rewards & Recognition: bonus maths, merit matrix, budget guard, gainsharing, sales tiers, delivery planner, recognition wall.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;

const JAR = `<svg viewBox="0 0 300 330" aria-hidden="true"><defs><linearGradient id="jarG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient></defs>
  <rect x="92" y="18" width="116" height="26" rx="8" fill="#c9b7ff" opacity=".85"/>
  <path d="M100 44 h100 v16 q44 18 44 70 v150 q0 32 -32 32 h-124 q-32 0 -32 -32 v-150 q0 -52 44 -70z" fill="url(#jarG)" stroke="#8b5cf6" stroke-width="3" stroke-opacity=".55"/>
  <path d="M78 150 q0 -30 22 -46" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/></svg>`;
const n = (v) => (v === '' || v == null ? null : Number(v));

function meritGrid(ctx, country) {
  const rows = ctx.idx.policy.filter((p) => p.country === country && p.merit_pct !== '' && p.rating !== '');
  const get = (r, b) => n(rows.find((p) => String(p.rating) === String(r) && p.compa_band === b)?.merit_pct);
  return { get, max: Math.max(...rows.map((p) => n(p.merit_pct)), 1) };
}

export default {
  nextNote: 'Rewards paid. Now build the people',
  render(ctx) {
    const arjun = ctx.out.personas.find((p) => p.key === 'arjun')?.emp_id;
    const pid = ctx.pickPerson('rewPerson', arjun, (r) => !!r.rewards);
    const r = ctx.row(pid), rw = r.rewards, e = r.emp, cur = rw.currency;
    const c = e.country, lensC = ctx.lensCountry(e);
    const mg = meritGrid(ctx, c);
    const cf = ctx.rules.rewards.company_factor;
    const bud = ctx.out.budget;
    const asmMgrs = Object.keys(ctx.out.gainsharing);
    const ritu = ctx.out.personas.find((p) => p.key === 'ritu')?.row;
    const gm = ctx.sel('gainMgr', ritu?.emp.manager_id || asmMgrs[0]);
    const team = ctx.out.employees.filter((x) => x.emp.role_id === 'ASM' && x.emp.manager_id === gm);
    const g = ctx.out.gainsharing[gm];
    const sal = ['IN', 'CN'].map((cc) => ({ cc, pool: ctx.out.pools.find((p) => p.role_id === 'SAL' && p.homeCountry === cc), rows: ctx.out.employees.filter((x) => x.emp.role_id === 'SAL' && x.emp.country === cc) }));
    const rec = [...ctx.data.Recognition].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const pts = {}; for (const k of rec) pts[k.to_emp_id] = (pts[k.to_emp_id] || 0) + Number(k.points || 0);
    const leaders = Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const badges = {}; for (const k of rec) badges[k.badge] = (badges[k.badge] || 0) + 1;
    const cfg = ctx.idx.country;
    const rnd = ctx.rules.rewards.rnd;
    const wallet = ctx.state.toggles.wallet;
    const planner = [
      ['Merit increase', 'Base pay', { IN: cfg.increment_effective?.IN, CN: cfg.increment_effective?.CN }, 'Private letter · cash', 'Manager proposes, calibration approves'],
      ['Annual bonus', 'Variable pay', { IN: 'With the April increment cycle', CN: 'Before Spring Festival (13th-month style)' }, 'Private · cash', 'Formula; budget guard rescales'],
      ['Sales commission & contests', 'Units, tiers, Club trip', { IN: 'Monthly + Diwali contest', CN: 'Monthly + year-end before Spring Festival' }, 'Public leaderboard · cash + trip', 'Formula after the fair-selling gate'],
      ['Plant gainsharing', 'Team share of savings', { IN: 'Quarterly', CN: 'Quarterly' }, 'Team announcement · cash', 'Formula, split by attendance'],
      ['Spot awards & kudos', 'Badges, points', { IN: 'Any time; town halls', CN: 'Any time; team banners, hongbao' }, c === 'CN' ? 'Praise at team level · non-cash' : 'Public · non-cash', 'Peers and managers'],
      ['Patent & filing bonus', 'R&D', { IN: `₹${rnd.patent_filing_bonus.IN.toLocaleString('en-IN')} on filing`, CN: `¥${rnd.patent_filing_bonus.CN.toLocaleString('zh-CN')} on filing` }, 'Public at tech forum · cash', 'IP committee'],
      ['Development as a reward', 'Stretch, rotation, wallet', { IN: 'IDP cycle', CN: 'IDP cycle' }, 'Private · non-cash', 'Manager + talent council'],
    ];
    return `
      ${UI.pageHead({ eyebrow: 'M7 · Rewards & Recognition', title: 'What, when, how <em>and who.</em>', sub: 'Pay follows the rating through a formula you can read. Recognition happens all year. India and China pay at different times and in different styles, and development counts as a reward too.' })}
      <div class="grid g12">
        <div class="card" style="text-align:center"><h4>Release the Q4 bonus</h4>
          <div class="jar-box" id="jar">${JAR}</div>
          <div class="payout" id="payout">${UI.money(0, cur)}</div><div class="small muted">${esc(e.name)} · total variable pay</div>
          <button class="btn pri mt" id="release">💰 Release Q4 bonus</button></div>
        <div class="card"><div class="row between"><h4 style="margin:0">Bonus calculator</h4><select class="sel" id="rewWho">${ctx.out.personas.filter((p) => p.row?.rewards).map((p) => `<option value="${p.emp_id}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`).join('')}${ctx.personaKey(pid) ? '' : `<option value="${pid}" selected>${esc(e.name)}</option>`}</select></div>
          <div class="calc mt">${[['Base pay', UI.money(rw.base, cur)], ['× target bonus', `${rw.targetBonusPct}%`], ['× company factor', cf], ['× rating multiplier', `${rw.multiplier} (rating ${r.result.rating})`], ['= bonus', UI.money(rw.bonus, cur)]].map(([l, v], i) => `<div class="cstep${i === 4 ? ' eq' : ''}"><small>${esc(l)}</small><b>${esc(String(v))}</b></div>`).join('')}</div>
          ${rw.extras.length ? `<div class="mt">${rw.extras.map((x) => `<div class="kv" style="grid-template-columns:200px 1fr"><dt>${esc(x.name)}</dt><dd>${x.amount === null ? esc(x.detail) : `${UI.money(x.amount, cur)} <span class="muted small">${esc(x.detail)}</span>`}</dd></div>`).join('')}</div>` : ''}
          ${r.clubTrip ? '<p class="mt"><span class="badge">✈ Club trip: top 5% of the sales pool</span></p>' : ''}
          ${r.result.capped ? `<p class="why mt" style="color:#b4232c">${esc(r.result.why)}</p>` : ''}
          <div class="grid g2 mt"><div><h4>Merit matrix · ${UI.code(c)}</h4><div class="heat"><div class="h"></div>${['low', 'mid', 'high'].map((b) => `<div class="h">compa ${b}</div>`).join('')}
            ${[5, 4, 3, 2, 1].map((rt) => `<div class="h">rating ${rt}</div>${['low', 'mid', 'high'].map((b) => { const v = mg.get(rt, b); return `<div class="${rt === r.result.rating && b === rw.compaBand ? 'me' : ''}" style="background:rgba(165,94,234,${0.08 + (v / mg.max) * 0.75});color:${v / mg.max > 0.55 ? '#fff' : 'inherit'}">${v === null ? '—' : `${v}%`}</div>`; }).join('')}`).join('')}</div>
            <p class="why mt">Compa-ratio ${rw.compa} (${rw.compaBand}): people paid below the range midpoint get a bigger rise for the same rating. ${esc(e.name.split(' ')[0])}: +${rw.meritPct}% → ${UI.money(rw.newBase, cur)}.</p></div>
            <div><h4>Company factor (business result)</h4><div class="slider-row" style="grid-template-columns:1fr 50px"><input type="range" id="cf" min="0.5" max="1.5" step="0.05" value="${cf}"><output id="cfO">${cf}</output></div>
              <h4 class="mt">Budget guard</h4>${['IN', 'CN'].map((cc) => `<div class="budget"><div class="row between small"><b>${UI.code(cc)} bonus pool</b><span>${UI.money(bud[cc].paid, cc === 'IN' ? 'INR' : 'CNY')} of ${UI.money(bud[cc].targetPool, cc === 'IN' ? 'INR' : 'CNY')}</span></div><div class="bmeter"><i style="width:${Math.min(150, bud[cc].utilisationPct) / 1.5}%;background:${bud[cc].utilisationPct > 100 ? '#e5484d' : '#1dab84'}"></i><span style="left:${100 / 1.5}%"></span></div><div class="small ${bud[cc].utilisationPct > 100 ? 'bad-t' : 'muted'}">${bud[cc].utilisationPct}% used${bud[cc].utilisationPct > 100 ? ': over budget, payouts would be rescaled' : ''}</div></div>`).join('')}</div></div>
        </div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="row between"><h4 style="margin:0">Plant gainsharing (Assembly)</h4><select class="sel" id="gainMgr">${asmMgrs.map((m) => `<option value="${m}"${m === gm ? ' selected' : ''}>${esc(ctx.idx.emp.get(m)?.name)}'s line (${ctx.idx.emp.get(m)?.site})</option>`).join('')}</select></div>
          <p class="why mt">Assembly is never ranked. If the line beats standard output, ${ctx.rules.rewards.gainsharing.pool_share_of_savings_pct}% of the saving is shared, split by attendance. ${ritu && team.some((x) => x.emp.emp_id === ritu.emp.emp_id) ? `Ritu Deshmukh's line averaged <b>${g.avgOutputPct}%</b> of standard.` : `This line averaged <b>${g.avgOutputPct}%</b> of standard.`}</p>
          <div class="slider-row" style="grid-template-columns:150px 1fr 54px"><label for="gx">What if output were</label><input type="range" id="gx" min="90" max="125" step="1" value="${Math.round(g.avgOutputPct)}"><output id="gxO">${Math.round(g.avgOutputPct)}%</output></div>
          <div class="grid g2 mt"><div class="card stat" style="box-shadow:none;background:rgba(165,94,234,.07)"><div class="v" id="gPool">${UI.money(g.pool, team[0]?.emp.currency)}</div><div class="l">TEAM POOL</div></div><div class="card stat" style="box-shadow:none;background:rgba(165,94,234,.07)"><div class="v" id="gHead">${UI.money(team.length ? g.pool / team.length : 0, team[0]?.emp.currency)}</div><div class="l">PER PERSON (AVG ATTENDANCE)</div></div></div>
          ${ritu && team.some((x) => x.emp.emp_id === ritu.emp.emp_id) ? `<p class="why mt">Ritu is also on <b>skill-based pay</b>: grade ${esc(ritu.emp.grade)} today; the multi-skill certification moves her up one level (L1–L4 ladder).</p>` : ''}</div>
        <div class="card"><h4>Sales: tiers after the gate</h4>${sal.map((s) => `<div class="mt"><b>${UI.code(s.cc)} ${s.rows.length} consultants</b> · ${esc(UI.VERDICT_SHORT[s.pool?.verdict])}
            <div class="tierbar">${['Top', 'Core', 'Bottom'].map((t) => { const k = s.rows.filter((x) => x.tier?.tier === t).length; return `<i class="${t}" style="flex:${k || 0.001}">${t} ${k}</i>`; }).join('')}</div>
            <div class="small muted">Club trip: ${s.rows.filter((x) => x.clubTrip).map((x) => esc(x.emp.name)).join(', ') || '—'} · Gate failures: ${s.rows.filter((x) => !x.result.gatePassed).length} (no top tier, no kicker)</div></div>`).join('')}
          <p class="why mt">Commission ${UI.money(ctx.rules.rewards.sales.commission_per_unit.IN, 'INR')} / unit in India, ${UI.money(ctx.rules.rewards.sales.commission_per_unit.CN, 'CNY')} in China; top tier adds a ${ctx.rules.rewards.sales.top_tier_kicker_pct_of_commission}% kicker. ${esc(ctx.rules.rewards.sales.festive_contest.IN)} · ${esc(ctx.rules.rewards.sales.festive_contest.CN)}.</p></div>
      </div>
      <div class="card mt"><h3 class="s">Total rewards for ${esc(e.name)} ${UI.code(c)}</h3><div class="wheel">
        ${[['💵 Pay', `Base ${UI.money(rw.base, cur)}; merit +${rw.meritPct}%`], ['🎯 Variable', `Bonus ${UI.money(rw.bonus, cur)}${rw.extras.filter((x) => x.amount).map((x) => ` · ${esc(x.name)} ${UI.money(x.amount, cur)}`).join('')}`], ['🛡 Benefits', esc(cfg.mandatory_pay?.[c])], ['🏅 Recognition', `${pts[e.emp_id] || 0} kudos points this year`], ['🌱 Development', wallet ? `Learning wallet ${UI.money(rw.learningWallet, cur)}; stretch roles; passport stamps (${r.helix.built}/7)` : 'Learning wallet switched off in the Leadership Forge'], ['⏱ Work-life', esc(cfg.hours_guardrail?.[c])]].map(([h, t]) => `<div><b>${h}</b>${t}</div>`).join('')}</div></div>
      <div class="card mt"><h3 class="s">Delivery planner: what, when, how, who</h3><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Reward</th><th>What</th><th>When ${lensC === 'IN' ? UI.code('IN') : ''}${ctx.state.lens === 'home' ? `${UI.code('IN')} / ${UI.code('CN')}` : lensC === 'CN' ? UI.code('CN') : ''}</th><th>How</th><th>Who decides</th></tr></thead><tbody>
        ${planner.map(([a, w, when, how, who]) => `<tr><td><b>${esc(a)}</b></td><td class="small">${esc(w)}</td><td class="small">${ctx.state.lens === 'home' ? `${esc(when.IN)}<br><span class="muted">${esc(when.CN)}</span>` : esc(when[lensC])}</td><td class="small">${esc(how)}</td><td class="small">${esc(who)}</td></tr>`).join('')}</tbody></table></div>
        <p class="why mt">${UI.code('IN')} ${esc(cfg.recognition_norms?.IN)} · ${UI.code('CN')} ${esc(cfg.recognition_norms?.CN)}</p></div>
      <div class="grid g21 mt"><div class="card"><div class="row between"><h3 class="s" style="margin:0">Recognition wall</h3><button class="btn sm" id="kudoBtn">+ Send kudos</button></div>
          <div class="kudos mt" id="kudos">${rec.slice(0, 9).map((k) => `<div class="kudo"><span class="badge">${esc(k.badge)}</span><b>${esc(ctx.idx.emp.get(k.to_emp_id)?.name)}</b><span class="muted">from ${esc(ctx.idx.emp.get(k.from_emp_id)?.name)} · ${esc(k.date)} · +${esc(k.points)}</span></div>`).join('')}</div></div>
        <div class="card"><h4>Most recognised</h4>${leaders.map(([id, p]) => `<div class="li" data-person="${id}" style="margin-bottom:6px">${UI.avatar(ctx.idx.emp.get(id)?.name)}<div class="grow"><b>${esc(ctx.idx.emp.get(id)?.name)}</b><small>${esc(ctx.row(id)?.title || '')}</small></div><b>${p}</b></div>`).join('')}
          <h4 class="mt">Badges given</h4><div class="chips">${Object.entries(badges).map(([b, k]) => `<span class="tag">${esc(b)} × ${k}</span>`).join('')}</div></div></div>`;
  },
  mount(root, ctx) {
    root.querySelector('#rewWho').addEventListener('change', (e) => ctx.setSel('rewPerson', e.target.value));
    root.querySelector('#gainMgr').addEventListener('change', (e) => ctx.setSel('gainMgr', e.target.value));
    const pid = root.querySelector('#rewWho').value, r = ctx.row(pid), rw = r.rewards;
    // coins into the jar
    const jar = root.querySelector('#jar'), payout = root.querySelector('#payout');
    let filled = false;
    const release = (evt) => {
      jar.querySelectorAll('.coin').forEach((c) => c.remove());
      const N = 14, coins = [];
      for (let i = 0; i < N; i++) {
        const c = document.createElement('div'); c.className = 'coin'; c.textContent = rw.currency === 'CNY' ? '¥' : '₹';
        const row = Math.floor(i / 4), col = i % 4;
        c.style.left = `${78 + col * 38 + (row % 2) * 16}px`; c.style.top = `${262 - row * 30}px`;
        jar.appendChild(c); coins.push(c);
      }
      if (RM) { coins.forEach((c) => { c.style.opacity = 1; }); payout.textContent = UI.money(rw.total, rw.currency); return; }
      gsap.fromTo(coins, { y: -340, rotation: () => gsap.utils.random(-180, 180), opacity: 1 }, { y: 0, rotation: () => gsap.utils.random(-20, 20), duration: 0.9, ease: 'bounce.out', stagger: 0.07 });
      const o = { v: 0 };
      gsap.to(o, { v: rw.total, duration: 1.6, ease: 'power2.out', onUpdate: () => { payout.textContent = UI.money(o.v, rw.currency); } });
      const b = evt?.currentTarget?.getBoundingClientRect?.() || jar.getBoundingClientRect();
      setTimeout(() => UI.confetti(b.left + b.width / 2, b.top), 900);
      filled = true;
    };
    root.querySelector('#release').addEventListener('click', release);
    if (!filled) payout.textContent = UI.money(0, rw.currency);
    if (ctx.state.autoRelease) { ctx.state.autoRelease = false; setTimeout(release, 600); }
    // company factor
    const cf = root.querySelector('#cf');
    cf.addEventListener('input', () => { root.querySelector('#cfO').textContent = cf.value; });
    cf.addEventListener('change', () => {
      const before = ctx.out.budget;
      const rules = structuredClone(ctx.rules); rules.rewards.company_factor = Number(cf.value);
      ctx.setRules(rules);
      const a = ctx.out.budget;
      UI.showChanges([`<b>Company factor → ${cf.value}</b>`, ...['IN', 'CN'].map((c) => `<span>${c} pool used:</span> ${before[c].utilisationPct}% → <b>${a[c].utilisationPct}%</b>`)]);
    });
    // gainsharing what-if (same formula as the engine)
    const gm = root.querySelector('#gainMgr').value;
    const team = ctx.out.employees.filter((x) => x.emp.role_id === 'ASM' && x.emp.manager_id === gm);
    const payroll = team.reduce((s, x) => s + Number(x.emp.base_pay || 0), 0);
    const cur = team[0]?.emp.currency;
    const gx = root.querySelector('#gx');
    gx.addEventListener('input', () => {
      const v = Number(gx.value);
      root.querySelector('#gxO').textContent = `${v}%`;
      const pool = Math.round(Math.max(0, (v - 100) / 100) * payroll * 0.5 * ctx.rules.rewards.gainsharing.pool_share_of_savings_pct / 100);
      root.querySelector('#gPool').textContent = UI.money(pool, cur);
      root.querySelector('#gHead').textContent = UI.money(team.length ? pool / team.length : 0, cur);
    });
    // kudos
    root.querySelector('#kudoBtn').addEventListener('click', (e) => {
      const ps = ctx.out.personas.filter((p) => p.row);
      const to = ps[Math.floor(Math.random() * ps.length)].row.emp;
      const badges = ['Kaizen Champion', 'Customer Hero', 'Bridge Builder', 'Safety Streak 100 days', 'Fast Fix', 'Team Player'];
      const k = { from_emp_id: pid, to_emp_id: to.emp_id, date: ctx.out.asOf, badge: badges[Math.floor(Math.random() * badges.length)], points: 50, message: 'Thank you!' };
      ctx.state.data.Recognition.push(k);
      const div = document.createElement('div'); div.className = 'kudo';
      div.innerHTML = `<span class="badge">${esc(k.badge)}</span><b>${esc(to.name)}</b><span class="muted">from ${esc(r.emp.name)} · just now · +50</span>`;
      const box = root.querySelector('#kudos'); box.prepend(div);
      if (!RM) gsap.from(div, { scale: 0.3, opacity: 0, duration: 0.5, ease: 'back.out(2.5)' });
      const b = e.currentTarget.getBoundingClientRect(); UI.confetti(b.left + b.width / 2, b.top);
    });
  },
};
