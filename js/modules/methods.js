// M4 Method Mixer: traditional ↔ contemporary blend per role, shown as an audio-mixer board.
import * as UI from '../ui.js';
import { gauge } from '../charts.js';
const { esc, gsap, RM } = UI;
const DIM = { M: 'measurability', I: 'interdependence', S: 'standardisation', N: 'innovation', D: 'digital access', L: 'seniority', R: 'regulatory criticality', T: 'talent supply', K: 'company pace' };
const TRAD_LIST = ['Graphic rating scale', 'Ranking / paired comparison', 'Forced distribution', 'Checklist', 'Critical incident', 'Essay', 'BARS', 'MBO', 'Confidential report (ACR/APAR)'];
const CONT_LIST = ['KPI scorecard', 'Balanced Scorecard', 'OKRs', '360° feedback', 'Continuous check-ins', 'Gamified real-time dashboards', 'Competency / skills assessment', 'People analytics'];

const poolOf = (ctx, rid) => ctx.out.pools.find((p) => p.role_id === rid && p.homeCountry === 'IN') || ctx.out.pools.find((p) => p.role_id === rid);
const channels = (ctx) => {
  const ms = ctx.rules.methods.methods.filter((m) => !m.public_sector_only || ctx.out.org.sector === 'public');
  return [...ms.filter((m) => m.family === 'traditional'), ...ms.filter((m) => m.family === 'contemporary')];
};

export default {
  dark: true,
  nextNote: 'Should anyone be ranked against anyone?',
  render(ctx) {
    const rows = ctx.roles().map((r) => ({ id: r.role_id, role: r, p: poolOf(ctx, r.role_id) })).filter((r) => r.p);
    const pref = ctx.sel('mixRole', 'ASM');
    const rid = rows.some((r) => r.id === pref) ? pref : rows[0]?.id;
    if (!rid) return `${UI.pageHead({ eyebrow: 'M4 · Method Mixer', title: 'No roles with people yet', sub: 'Load an organisation with employees in the Data Hub to see each role\'s appraisal blend.' })}`;
    ctx.state.sel.mixRole = rid;
    const pool = poolOf(ctx, rid);
    const ch = channels(ctx);
    const nT = ch.filter((m) => m.family === 'traditional').length;
    const maxAff = Math.max(...pool.methods.all.map((x) => x.affinity), 1);
    return `
      ${UI.pageHead({ eyebrow: 'M4 · Method Mixer', title: 'Traditional or contemporary? <em>It depends on the job.</em>', sub: 'Each role is scored on eight job traits plus the company\'s pace. Every appraisal method has an affinity for those traits; the top three are blended. No method wins everywhere.' })}
      <div class="chips mb" id="mixRoles" role="group" aria-label="Choose a role">${rows.map((r) => `<button class="chipbtn${r.id === rid ? ' on' : ''}" data-role="${esc(r.id)}" aria-pressed="${r.id === rid}">${esc(r.role.title)}</button>`).join('')}</div>
      <div class="board">
        <div class="mixer-scroll">
          <div class="channels" id="channels" style="--n:${ch.length};--nt:${nT};--cols:${Math.max(nT, ch.length - nT, 1)}" role="img" aria-label="${esc(`Method blend for ${ctx.idx.role.get(rid).title}: ${pool.methods.items.map((i) => `${i.name} ${i.pct}%`).join(', ')}`)}">
            ${ch.map((m) => `<div class="ch ${m.family}" data-id="${esc(m.id)}" style="--cc:${m.family === 'traditional' ? '#ff9f43' : '#48dbfb'}"><div class="val">0%</div><div class="track"><div class="fill"></div><div class="knob"></div></div><div class="name">${esc(m.name)}</div></div>`).join('')}
            <div class="grp t" style="--gc:#ff9f43;grid-column:span ${nT}">Traditional</div><div class="grp c" style="--gc:#48dbfb;grid-column:span ${ch.length - nT}">Contemporary</div>
          </div>
          <div class="mix-legend"><span><i style="background:#ff9f43"></i>Traditional</span><span><i style="background:#48dbfb"></i>Contemporary</span></div>
        </div>
        <div class="gauge-box">${gauge(pool.methods.contemporaryPct)}<div class="pct" id="mixPct">${pool.methods.contemporaryPct}% contemporary</div><div class="tag mt" style="font-size:12px">${esc(pool.methods.label)}</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="h4">Why this blend for ${esc(ctx.idx.role.get(rid).title)}</h2>
          ${pool.methods.items.map((i) => `<div class="mt"><div class="row between"><b>${esc(i.name)}</b><span class="tag ${i.family === 'traditional' ? 'warn' : 'info'}">${i.pct}%</span></div><p class="why">${esc(i.why)} <span style="opacity:.75">Driven by ${i.drivers.map((d) => `${esc(DIM[d.dim])} (${d.effect >= 0 ? '+' : ''}${UI.fmt(d.effect, 1)})`).join(' and ')}.</span></p></div>`).join('')}
          ${pool.verdict === 'absolute' ? '<p class="why mt">Ranking is not on the board: the Ranking Engine gave this role absolute standards, so ranking methods are switched off.</p>' : ''}</div>
        <div class="card"><h2 class="h4">Affinity scores (all methods)</h2>
          ${pool.methods.all.map((a) => `<div class="hbar aff"><span class="lab">${esc(a.name)}</span>${UI.bar((Math.max(0, a.affinity) / maxAff) * 100, a.family === 'traditional' ? '#ff9f43' : '#48dbfb')}<span class="val">${UI.fmt(a.affinity, 1)}</span></div>`).join('')}
          <p class="why mt">Affinity = bias + Σ coefficient × (trait − 3). Pace enters as (pace − 5.5) / 2.25, so a cutthroat company leans towards fast, frequent methods.</p></div>
      </div>
      <div class="card mt"><h2 class="h4">Every role at a glance</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Role</th><th scope="col">Blend</th><th scope="col">Top three</th><th scope="col" style="width:30%">Traditional ↔ contemporary</th></tr></thead><tbody>
        ${rows.map((r) => `<tr class="click" data-role="${esc(r.id)}"><td><b>${esc(r.role.title)}</b></td><td><span class="tag ${r.p.methods.label === 'Contemporary' ? 'info' : r.p.methods.label === 'Hybrid' ? 'purple' : 'warn'}">${esc(r.p.methods.label)}</span></td><td class="small">${r.p.methods.items.map((i) => `${esc(i.name)} ${i.pct}`).join(' · ')}</td><td><div class="tc-bar" role="img" aria-label="${r.p.methods.traditionalPct}% traditional"><i style="width:${r.p.methods.traditionalPct}%"></i></div></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="h4">Traditional toolkit</h2><div class="chips">${TRAD_LIST.map((t) => `<span class="tag warn">${esc(t)}</span>`).join('')}</div><p class="why mt">Strong where work is standardised and safety-critical: clear, defensible, easy to audit. Weak where work is new, collaborative or fast-changing.</p></div>
        <div class="card"><h2 class="h4">Contemporary toolkit</h2><div class="chips">${CONT_LIST.map((t) => `<span class="tag info">${esc(t)}</span>`).join('')}</div><p class="why mt">Strong where work is uncertain, digital and team-based: frequent, forward-looking, multi-source. Needs data and manager skill to work.</p></div>
      </div>`;
  },
  mount(root, ctx) {
    const rid = ctx.state.sel.mixRole;
    if (!rid || !root.querySelector('#channels')) return;
    root.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => ctx.setSel('mixRole', b.dataset.role)));
    const pool = poolOf(ctx, rid);
    const pct = Object.fromEntries(pool.methods.items.map((i) => [i.id, i.pct]));
    const prev = ctx.state.mixPrev || {};
    const tweens = [];
    root.querySelectorAll('.ch').forEach((el, i) => {
      const to = pct[el.dataset.id] || 0, from = prev[el.dataset.id] || 0, o = { v: from };
      el.style.setProperty('--v', from);
      el.classList.toggle('live', to > 0);
      tweens.push(gsap.to(el, { '--v': to, duration: RM ? 0 : 1.1, ease: 'elastic.out(1,0.55)', delay: RM ? 0 : 0.2 + i * 0.04 }));
      tweens.push(gsap.to(o, { v: to, duration: RM ? 0 : 0.8, delay: RM ? 0 : 0.2 + i * 0.04, onUpdate: () => { el.querySelector('.val').textContent = `${Math.round(o.v)}%`; } }));
    });
    ctx.onCleanup(() => tweens.forEach((t) => t.kill()));
    ctx.state.mixPrev = pct;
  },
};
