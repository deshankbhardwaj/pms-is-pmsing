// M8b Leadership Forge: Born 30 · Built 70. Helix + passport fill from real stamps; pipeline; room-to-grow toggles.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STAMP_ORDER = ['first_team', 'fix_it', 'new_line', 'cross_border', 'scope_jump', 'influence', 'crisis', 'failure_recovery'];
const INK = { first_team: '#7c3aed', fix_it: '#0e7490', new_line: '#15803d', cross_border: '#b4232c', scope_jump: '#7c3aed', influence: '#0e7490', crisis: '#9a3412', failure_recovery: '#1d4ed8', coaching: '#9a3412', learning: '#1d4ed8' };
const TILT = [-8, 6, -4, 9, -10, 5, -6, 7, -3, 8];
const PASSAGES = [['self', 'Managing self'], ['others', 'Managing others'], ['managers', 'Managing managers'], ['function', 'Functional leader'], ['business', 'Business leader']];
const TOGGLES = [
  ['growth', 'Growth weight in every scorecard', 'Growth carries 10% for everyone, 20% on the leadership track and 30% in ramp-up. Switch it off and the score only rewards what people already do well.'],
  ['shield', 'Ramp-up & stretch shield', 'Anyone in a new role (< 6 months) or on a stretch assignment is kept out of ranking pools and scored on ramp-up weights. Without it, taking a stretch role is a career risk.'],
  ['pairing', 'Stretch + feedback pairing', 'A passport stamp needs a finished experience, a logged reflection and a named feedback source. Experience without feedback teaches less (DeRue & Wellman, 2009).'],
  ['leadersBuilt', 'Managers scored on "leaders built"', 'People managers carry a 20% KPI for IDPs done, internal promotions and mentoring hours. Switch it off and growing people becomes optional.'],
  ['wallet', 'Learning wallet', 'Every employee has a yearly learning budget they control (₹15,000 in India, ¥1,500 in China in the sample).'],
];
let loopOn = false;
let loops = [];

const monthEnd = (m) => `2026-${String(m + 1).padStart(2, '0')}-31`;

export default {
  dark: true,
  nextNote: 'Step back and audit the whole system',
  render(ctx) {
    const zhang = ctx.out.personas.find((p) => p.key === 'zhang')?.emp_id;
    const track = ctx.out.employees.filter((r) => r.leadershipTrack).sort((a, b) => b.helix.built - a.helix.built);
    const pid = ctx.pickPerson('forgePerson', zhang, (r) => r.leadershipTrack || ctx.personaKey(r.emp.emp_id));
    const r = ctx.row(pid);
    const month = ctx.sel('forgeMonth', 11);
    const h = r.helix;
    const lit = h.rungs.filter((x) => String(x.date) <= monthEnd(month)).length;
    const lp = ctx.idx.lp;
    const pas = PASSAGES.map(([k, l]) => {
      const ppl = [...lp.values()].filter((x) => x.pipeline_passage === k).map((x) => ctx.idx.emp.get(x.emp_id)).filter(Boolean);
      return { k, l, n: ppl.length, leak: ppl.filter((e) => e.flight_risk === 'H').length };
    });
    const bench = [['Plant people manager', ['ASM', 'QIN', 'CFT', 'PLM']], ['Sales manager', ['SAL']], ['R&D team lead', ['BRD', 'SWE']], ['Service manager', ['CSA', 'CFT']]].map(([name, roles]) => {
      const ppl = ctx.out.employees.filter((x) => roles.includes(x.emp.role_id) && (x.leadershipTrack || x.nineBox?.topThree));
      const now = (x) => x.nineBox?.topThree && x.helix.built >= 3, soon = (x) => !now(x) && (x.nineBox?.topThree || x.helix.built >= 2);
      return { name, now: ppl.filter(now).length, soon: ppl.filter(soon).length, later: ppl.filter((x) => !now(x) && !soon(x)).length };
    });
    const T = ctx.state.toggles;
    const zh = ctx.row(zhang);
    const stamps = STAMP_ORDER.map((t) => ({ t, x: h.experiences.find((e) => e.experience_type === t) }));
    const extra = [h.rungs.find((x) => x.kind === 'coaching'), h.rungs.find((x) => x.kind === 'learning')];
    return `
      ${UI.pageHead({ eyebrow: 'M8b · Leadership Forge', title: 'Born 30. <span class="grad">Built 70.</span>', sub: 'In twin studies about 30% of the variance in who ends up in leadership roles was genetic; the rest came from experiences unique to each person (Arvey et al., 2006). A PMS cannot change the 30%. It can be built to grow the 70%.' })}
      <div class="forge">
        <div><canvas id="helix" aria-label="Leadership helix: three grey rungs given, seven rungs built through development"></canvas></div>
        <div>
          <div class="row between"><select class="sel" id="forgeWho">${track.map((x) => `<option value="${x.emp.emp_id}"${x.emp.emp_id === pid ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.title)} (${x.helix.built}/7)</option>`).join('')}${track.includes(r) ? '' : `<option value="${pid}" selected>${esc(r.emp.name)}</option>`}</select>${ctx.personaKey(pid) ? '<span class="tag purple">persona</span>' : ''}</div>
          <p class="why mt"><b style="color:#fff">${esc(r.emp.name)}</b> · ${esc(r.title)}, ${esc(r.emp.site)}. ${esc(ctx.out.personas.find((p) => p.emp_id === pid)?.story || r.result.track.why)}</p>
          <div class="meter"><div class="born"></div><div class="built" id="builtBar" style="width:${lit * 10}%"></div></div>
          <div class="counts"><div><span class="big">30%</span><small>Born · given</small></div><div><span class="big grad" id="builtN">${lit * 10}%</span><small>Built by ${MONTHS[month]}</small></div><div><span class="big">${UI.fmt(r.result.growth, 1)}</span><small>Growth score / 5</small></div></div>
          <div class="row" style="flex-wrap:nowrap"><button class="btn pri sm" id="play">▶ Play the year</button><input type="range" id="month" min="0" max="11" value="${month}" style="flex:1"><b id="monthL" style="width:36px">${MONTHS[month]}</b></div>
          <div class="passport mt2" id="passport">${stamps.map(({ t, x }, i) => `<div class="slot" style="--ink-c:${INK[t]}" title="${esc(ctx.rules.built70.passport_experiences[t])}">${x?.stamped ? `<div class="stamp" data-date="${esc(x.end)}" style="--rot:${TILT[i]}deg"><span>${esc(ctx.rules.built70.passport_experiences[t])}</span><small>${esc(x.end)}</small></div>` : `<small class="slotl">${esc(ctx.rules.built70.passport_experiences[t])}</small>`}</div>`).join('')}
            ${extra.map((x, i) => `<div class="slot" style="--ink-c:${INK[x?.kind || (i ? 'learning' : 'coaching')]}">${x ? `<div class="stamp" data-date="${esc(x.date)}" style="--rot:${TILT[8 + i]}deg"><span>${esc(x.label)}</span><small>${x.kind === 'coaching' ? 'Exposure · 20' : 'Education · 10'}</small></div>` : `<small class="slotl">${i ? 'Formal learning' : 'Coaching × 6'}</small>`}</div>`).join('')}</div>
          ${h.missingForStamp.length ? `<p class="why mt">Not stamped yet: ${h.missingForStamp.map((m) => `${esc(m.label)} (${m.missing.join(', ')})`).join('; ')}.</p>` : ''}
          <p class="why mt small">PRISM never measures, infers or scores anything genetic. The three grey rungs are a reminder, not a rating. The 30% describes variance across a population, not a share of any one person.</p>
        </div>
      </div>
      <div class="grid g2 mt2">
        <div class="card"><h3 class="s">Room to grow: the rules, as switches</h3>
          ${TOGGLES.map(([k, l, why]) => `<div class="tog"><label class="switch"><input type="checkbox" data-t="${k}" ${T[k] ? 'checked' : ''}><i></i></label><div><b>${esc(l)}</b><p class="why">${esc(why)}</p></div></div>`).join('')}
          <p class="why mt">Right now: Zhang Wei is rated <b>${zh?.result.rating}</b> on <b>${esc(zh?.result.track.track)}</b> weights${zh?.shielded ? ', shielded from ranking' : ''}. Switch the shield off and watch.</p></div>
        <div class="card"><h3 class="s">Leadership pipeline</h3><p class="why">Charan, Drotter & Noel: each passage needs new skills, time use and values. Drops are high-flight-risk people at that passage.</p>
          <div class="pipe mt" id="pipe">${pas.map((p) => `<div class="passage"><b>${p.n}</b><span>${esc(p.l)}</span>${p.leak ? `<em class="leak">💧 ${p.leak}</em>` : ''}</div>`).join('')}<div class="flow-dots"></div></div>
          <h4 class="mt2">Bench strength</h4><div class="bench"><div class="h"></div><div class="h">Ready now</div><div class="h">1–2 yrs</div><div class="h">3+ yrs</div>
            ${bench.map((b) => `<div class="lab">${esc(b.name)}</div><div class="c now">${b.now}</div><div class="c soon">${b.soon}</div><div class="c later">${b.later}</div>`).join('')}</div>
          <p class="why mt">Ready now = top-three 9-box with 3+ built rungs. 1–2 years = top-three box or 2+ rungs. Candidates are people on the leadership track or in a top-three box, in the roles that feed each job.</p></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><h4>${UI.code('CN')} China</h4><p class="why">${esc(ctx.idx.country.development_tradition?.CN)} (⚠️). Critical feedback stays private to protect face; stretch roles come with a named master. Cross-border rotation to Pune is the premium stamp.</p></div>
        <div class="card"><h4>${UI.code('IN')} India</h4><p class="why">${esc(ctx.idx.country.development_tradition?.IN)} (⚠️). Public recognition of passport stamps works well. Cross-border rotation to Shenzhen is the premium stamp.</p></div>
      </div>`;
  },
  mount(root, ctx, { soft }) {
    loops.forEach((t) => t.kill()); loops = [];
    root.querySelector('#forgeWho').addEventListener('change', (e) => { ctx.state.sel.forgeMonth = 11; ctx.setSel('forgePerson', e.target.value); });
    const r = ctx.row(root.querySelector('#forgeWho').value);
    const rungs = r.helix.rungs;
    // ---------- helix canvas (from the motion prototype) ----------
    const cv = root.querySelector('#helix'), hx = cv.getContext('2d');
    let HW = 0, HH = 0, spin = 0, spinBoost = 0, last = 0, built = 0;
    const RUNGS = 10, BORN = 3, flashAt = Array(RUNGS).fill(-1e9);
    const size = () => { const b = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); HW = b.width; HH = b.height; cv.width = Math.round(HW * d); cv.height = Math.round(HH * d); hx.setTransform(d, 0, 0, d, 0, 0); };
    const pt = (u, s, cx, top, bot, R) => { const a = spin + u * 1.35 * Math.PI * 2 + s * Math.PI; return { x: cx + R * Math.cos(a), y: bot - (bot - top) * u, z: Math.sin(a) }; };
    const draw = (now) => {
      const dt = Math.min(50, last ? now - last : 16); last = now;
      spinBoost *= 0.94; spin += dt * 0.00055 * (1 + spinBoost);
      hx.clearRect(0, 0, HW, HH);
      const cx = HW / 2, top = HH * 0.06, bot = HH * 0.94, R = Math.min(HW * 0.26, 150), segs = [], rs = [];
      for (let s = 0; s < 2; s++) { let p = pt(0, s, cx, top, bot, R); for (let k = 1; k <= 140; k++) { const q = pt(k / 140, s, cx, top, bot, R); segs.push({ a: p, b: q, z: (p.z + q.z) / 2, s }); p = q; } }
      for (let k = 0; k < RUNGS; k++) { const u = (k + 0.5) / RUNGS; rs.push({ i: k, a: pt(u, 0, cx, top, bot, R), b: pt(u, 1, cx, top, bot, R) }); }
      hx.lineCap = 'round';
      const seg = (g) => { const d = (g.z + 1) / 2; hx.strokeStyle = `rgba(${g.s ? '72,219,251' : '167,139,250'},${0.15 + 0.85 * d})`; hx.lineWidth = 2 + 4.5 * d; hx.beginPath(); hx.moveTo(g.a.x, g.a.y); hx.lineTo(g.b.x, g.b.y); hx.stroke(); };
      const rung = (q) => {
        const bornR = q.i < BORN, isLit = !bornR && q.i - BORN < built, f = now < flashAt[q.i] ? 0 : Math.max(0, 1 - (now - flashAt[q.i]) / 750);
        hx.save();
        if (bornR) { hx.strokeStyle = 'rgba(157,161,181,.8)'; hx.lineWidth = 3.5; }
        else if (isLit) { const g = hx.createLinearGradient(q.a.x, q.a.y, q.b.x, q.b.y); g.addColorStop(0, '#a78bfa'); g.addColorStop(1, '#48dbfb'); hx.strokeStyle = g; hx.lineWidth = 4 + 5 * f; hx.shadowColor = 'rgba(139,92,246,.95)'; hx.shadowBlur = 14 + 34 * f; }
        else { hx.strokeStyle = 'rgba(255,255,255,.16)'; hx.lineWidth = 2; hx.setLineDash([4, 7]); }
        hx.beginPath(); hx.moveTo(q.a.x, q.a.y); hx.lineTo(q.b.x, q.b.y); hx.stroke(); hx.restore();
        [q.a, q.b].forEach((p2) => { const d = (p2.z + 1) / 2; hx.fillStyle = bornR ? `rgba(157,161,181,${0.4 + 0.6 * d})` : isLit ? `rgba(200,190,255,${0.5 + 0.5 * d})` : `rgba(255,255,255,${0.12 + 0.2 * d})`; hx.beginPath(); hx.arc(p2.x, p2.y, 2.5 + 4 * d + (isLit ? 3 * f : 0), 0, 7); hx.fill(); });
      };
      segs.filter((g) => g.z < 0).forEach(seg); rs.forEach(rung); segs.filter((g) => g.z >= 0).forEach(seg);
      hx.font = '800 11px Manrope, system-ui, sans-serif'; hx.textAlign = 'left';
      const lx = Math.max(4, cx - R - 86);
      hx.fillStyle = '#9da1b5'; hx.fillText('BORN · 30', lx, rs[1].a.y + 4);
      hx.fillStyle = '#a78bfa'; hx.fillText('BUILT · 70', lx, rs[6].a.y + 4);
    };
    size();
    const onResize = () => { if (!cv.isConnected) { removeEventListener('resize', onResize); return; } size(); };
    addEventListener('resize', onResize);
    loopOn = false;
    const loop = (now) => { if (!cv.isConnected) { loopOn = false; return; } draw(now); requestAnimationFrame(loop); };
    if (RM) { built = rungs.filter((x) => String(x.date) <= monthEnd(ctx.sel('forgeMonth', 11))).length; draw(performance.now()); }
    else if (!loopOn) { loopOn = true; requestAnimationFrame(loop); }
    // ---------- stamps + month ----------
    const passport = root.querySelector('#passport');
    const stampEls = [...passport.querySelectorAll('.stamp')];
    const shake = () => gsap.fromTo(passport, { x: 0 }, { keyframes: { x: [0, -5, 4, -3, 2, 0] }, duration: 0.3, ease: 'none' });
    const splat = (st) => { const sp = document.createElement('span'); sp.className = 'splat'; st.parentNode.appendChild(sp); gsap.fromTo(sp, { scale: 0.2, opacity: 0.45 }, { scale: 1.3, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => sp.remove() }); };
    const shown = new Set();
    const setMonth = (m, animate) => {
      const cut = monthEnd(m);
      const n = rungs.filter((x) => String(x.date) <= cut).length;
      if (n > built && animate) for (let i = built; i < n; i++) flashAt[BORN + i] = performance.now() + (i - built) * 140;
      if (n > built) spinBoost = 2.6;
      built = n;
      root.querySelector('#monthL').textContent = MONTHS[m];
      root.querySelector('#builtN').textContent = `${n * 10}%`;
      gsap.to(root.querySelector('#builtBar'), { width: `${n * 10}%`, duration: RM ? 0 : 0.5 });
      let k = 0;
      stampEls.forEach((st, i) => {
        const on = String(st.dataset.date) <= cut;
        const rot = parseFloat(st.style.getPropertyValue('--rot')) || 0;
        if (on && !shown.has(i)) {
          shown.add(i);
          if (animate && !RM) gsap.fromTo(st, { scale: 2.6, opacity: 0, rotation: rot - 24 }, { scale: 1, opacity: 0.95, rotation: rot, duration: 0.3, ease: 'power4.in', delay: 0.05 + 0.14 * k++, onComplete: () => { shake(); splat(st); } });
          else gsap.set(st, { scale: 1, opacity: 0.95, rotation: rot });
        } else if (!on && shown.has(i)) { shown.delete(i); gsap.to(st, { opacity: 0, scale: 0.85, duration: RM ? 0 : 0.2 }); }
      });
    };
    stampEls.forEach((st) => gsap.set(st, { opacity: 0, rotation: parseFloat(st.style.getPropertyValue('--rot')) || 0 }));
    const start = ctx.sel('forgeMonth', 11);
    if (ctx.state.forgeAutoplay) { ctx.state.forgeAutoplay = false; setMonth(0, false); setTimeout(() => play(), 500); }
    else setMonth(start, !soft);
    const slider = root.querySelector('#month');
    slider.addEventListener('input', () => { ctx.state.sel.forgeMonth = Number(slider.value); setMonth(Number(slider.value), true); });
    let playing = null;
    function play() {
      if (playing) playing.kill();
      const o = { m: 0 }; setMonth(0, false); slider.value = 0;
      playing = gsap.to(o, { m: 11, duration: RM ? 0 : 6, ease: 'none', onUpdate: () => { const m = Math.round(o.m); if (Number(slider.value) !== m) { slider.value = m; ctx.state.sel.forgeMonth = m; setMonth(m, true); } } });
    }
    root.querySelector('#play').addEventListener('click', play);
    // ---------- toggles ----------
    root.querySelectorAll('[data-t]').forEach((cb) => cb.addEventListener('change', () => {
      const before = new Map(ctx.out.employees.map((x) => [x.emp.emp_id, { rating: x.result.rating, sh: x.shielded, tier: x.tier?.tier, built: x.helix.built }]));
      const zid = ctx.out.personas.find((p) => p.key === 'zhang')?.emp_id;
      const zb = before.get(zid);
      ctx.setToggle(cb.dataset.t, cb.checked);
      const after = ctx.out.employees;
      const moved = after.filter((x) => before.get(x.emp.emp_id)?.rating !== x.result.rating).length;
      const sh = after.filter((x) => x.shielded).length, shb = [...before.values()].filter((v) => v.sh).length;
      const za = ctx.row(zid);
      const stamps = after.reduce((s, x) => s + x.helix.built, 0) - [...before.values()].reduce((s, v) => s + v.built, 0);
      const items = [`<b>${esc(TOGGLES.find((t) => t[0] === cb.dataset.t)[1])}: ${cb.checked ? 'on' : 'off'}</b>`, `<span>Ratings that moved:</span> <b>${moved}</b>`];
      if (sh !== shb) items.push(`<span>People shielded from ranking:</span> ${shb} → <b>${sh}</b>`);
      if (stamps) items.push(`<span>Helix rungs across the company:</span> <b>${stamps > 0 ? '+' : ''}${stamps}</b>`);
      if (za && (za.result.rating !== zb.rating || za.shielded !== zb.sh)) items.push(`<span>Zhang Wei:</span> rating ${zb.rating} → <b>${za.result.rating}</b>${za.tier ? `, tier <b>${za.tier.tier}</b>` : ''}${za.shielded ? ' (shielded)' : ' (now in the pool)'}`);
      if (cb.dataset.t === 'wallet') items.push('<span>Learning wallet</span> ' + (cb.checked ? 'back in total rewards' : 'removed from total rewards'));
      UI.showChanges(items);
    }));
    // ---------- pipeline particles ----------
    if (!RM) {
      const pipe = root.querySelector('#pipe .flow-dots');
      for (let i = 0; i < 14; i++) {
        const d = document.createElement('i'); pipe.appendChild(d);
        loops.push(gsap.fromTo(d, { left: '0%' }, { left: '100%', duration: 5, ease: 'none', repeat: -1, delay: i * 0.36 }));
      }
      loops.push(gsap.to(root.querySelectorAll('.leak'), { y: 6, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.2 }));
    }
  },
};
