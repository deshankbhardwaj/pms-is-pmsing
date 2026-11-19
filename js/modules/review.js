// M6 Review & Delivery: review calendar per country, conversation builder, calibration board, check-ins, appeals.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TABS = [['cal', 'Review calendar'], ['talk', 'Conversation builder'], ['calib', 'Calibration board'], ['exec', 'Check-ins & delivery'], ['appeal', 'Appeals']];
let drags = [];

function calendar(country, pace) {
  const all = [...Array(12).keys()], quarterly = (s) => [s, s + 3, s + 6, s + 9].map((m) => m % 12);
  const C = country === 'IN'
    ? { goal: [3], check: pace >= 8 ? all : quarterly(5), qrev: pace >= 8 ? [6, 9, 0] : [9], year: [2, 3, 4], calib: [4], pay: [3, 9, 10], dev: [5, 6] }
    : { goal: [0], check: pace >= 8 ? all : quarterly(2), qrev: pace >= 8 ? [3, 6, 9] : [6], year: [11, 0], calib: [0], pay: [0, 1], dev: [2, 3] };
  return [
    ['Goal setting', '#e0a800', C.goal, country === 'IN' ? 'April, start of the Indian financial year' : 'January, calendar year'],
    [pace >= 8 ? 'Check-ins (monthly)' : 'Check-ins (quarterly)', '#1dab84', C.check, 'Pace sets the rhythm'],
    [pace >= 8 ? 'Quarterly reviews' : 'Mid-year review', '#20b8e0', C.qrev, ''],
    ['Year-end review', '#5f7cff', C.year, country === 'IN' ? 'March to May' : 'December to January, before Spring Festival'],
    ['Calibration', '#e5484d', C.calib, 'Managers compare ratings across teams'],
    ['Pay & bonus', '#a55eea', C.pay, country === 'IN' ? 'Increments 1 April; Diwali sales contest Oct–Nov' : 'Year-end bonus / 13th month before Spring Festival'],
    ['Development talk', '#8b5cf6', C.dev, 'Kept separate from the rating talk'],
  ];
}

function script(ctx, r, model) {
  const res = r.result, items = [...res.items].filter((i) => i.score !== null).sort((a, b) => b.score - a.score);
  const best = items[0], worst = items[items.length - 1], gate = res.gates.find((g) => !g.passed);
  const course = r.tna.gaps[0]?.courses[0];
  const first = r.emp.name.split(' ')[0];
  const kpi = (i) => ctx.idx.kpi.get(i.kpi_id);
  const tgt = (i) => `${kpi(i).target} ${kpi(i).unit}`;
  const lines = [];
  if (model === 'SBI') {
    lines.push(['Situation', `Over the last four quarters, on ${best.name.toLowerCase()}…`]);
    lines.push(['Behaviour', `…you averaged ${best.value} against a target of ${tgt(best)}. That is a ${best.score >= 4 ? 'stretch-level' : 'solid'} result.`]);
    lines.push(['Impact', 'It moved the team scorecard and the customer experience. Thank you.']);
    if (gate) lines.push(['Situation', `In ${gate.failedPeriods.join(' and ') || 'this year'}, on ${gate.name.toLowerCase()}…`], ['Behaviour', '…the compliance check was not met.'], ['Impact', 'However strong the numbers, this caps the rating and keeps the top-tier bonus out of reach. How we get results matters as much as what.']);
    else if (worst && worst !== best) lines.push(['Situation', `On ${worst.name.toLowerCase()}…`], ['Behaviour', `…you averaged ${worst.value} against ${tgt(worst)}.`], ['Impact', 'This is the one area holding the overall score back.']);
  } else if (model === 'GROW') {
    lines.push(['Goal', gate ? `Pass ${gate.name.toLowerCase()} every quarter next year.` : `Reach ${tgt(worst)} on ${worst.name.toLowerCase()} by the next review.`]);
    lines.push(['Reality', gate ? `Failed in ${gate.failedPeriods.join(', ')}.` : `Today: ${worst.value} (score ${UI.fmt(worst.score, 1)} of 5).`]);
    lines.push(['Options', `${course ? `${course.name} (${course.mode})` : 'Coaching with your manager'}; pair with a strong peer; one check-in a month on this goal.`]);
    lines.push(['Way forward', `${first} owns the plan; next check-in in four weeks. Progress counts towards the Growth part of the score.`]);
  } else {
    lines.push(['Looking ahead', `${first}, what would make next year your best yet on ${best.name.toLowerCase()}?`]);
    lines.push(['One idea', `Try ${course ? course.name.toLowerCase() : 'a stretch assignment'}; ${focus(worst)}`]);
    lines.push(['Ask for help', 'Who could you learn from? I can set that up.']);
    lines.push(['Commit', 'Pick one change and we will check it together in a month.']);
  }
  return lines;
  function focus(w) { return w ? `aim for ${tgt(w)} on ${w.name.toLowerCase()}.` : ''; }
}

export default {
  nextNote: 'Ratings set. Now the money and the thanks',
  render(ctx) {
    const tab = ctx.sel('reviewTab', 'cal');
    const pace = Number(ctx.out.org.pace);
    let body = '';
    if (tab === 'cal') {
      const cs = ctx.state.lens === 'home' ? ['IN', 'CN'] : [ctx.state.lens];
      body = cs.map((c) => `<div class="card mt"><div class="row between"><h3 class="s" style="margin:0">${UI.code(c)} ${c === 'IN' ? 'India' : 'China'} · ${esc(ctx.idx.country.performance_year?.[c])}</h3><span class="small muted">${esc(ctx.idx.country.review_window?.[c])}</span></div>
        <div class="cal mt" data-cal="${c}"><div></div>${MONTHS.map((m) => `<div class="m">${m}</div>`).join('')}
        ${calendar(c, pace).map(([lab, col, on, note]) => `<div class="lab" title="${esc(note)}">${esc(lab)}</div>${MONTHS.map((_, i) => `<div class="cell${on.includes(i) ? ' on' : ''}" style="--cc:${col}"></div>`).join('')}`).join('')}</div></div>`).join('')
        + `<div class="grid g2 mt"><div class="card"><h4>Why two separate conversations</h4><p class="why">Meyer, Kay & French (1965) found that criticism in the rating talk made people defensive and blocked development. PRISM books the development talk at least ${ctx.rules.built70.split_conversation_min_weeks} weeks after the rating talk.</p></div>
          <div class="card"><h4>Pace changes the rhythm</h4><p class="why">VoltBridge runs at pace ${pace}. ${pace >= 8 ? 'Monthly check-ins and quarterly reviews keep goals current in a price war.' : 'Quarterly check-ins and a mid-year review.'} Move the Pace slider in Strategy DNA to see this calendar change.</p></div></div>`;
    } else if (tab === 'talk') {
      const pid = ctx.pickPerson('talkPerson', ctx.out.personas.find((p) => p.key === 'karan')?.emp_id);
      const r = ctx.row(pid), model = ctx.sel('talkModel', 'SBI');
      const c = ctx.lensCountry(r.emp);
      const lines = script(ctx, r, model);
      body = `<div class="grid g12 mt"><div class="card"><h4>Who</h4><select class="sel" id="talkWho" style="width:100%">${ctx.out.personas.map((p) => `<option value="${p.emp_id}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`).join('')}<optgroup label="Everyone">${ctx.out.employees.filter((x) => !ctx.personaKey(x.emp.emp_id)).slice(0, 200).map((x) => `<option value="${x.emp.emp_id}"${x.emp.emp_id === pid ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.title)}</option>`).join('')}</optgroup></select>
          <div class="li mt" data-person="${pid}">${UI.avatar(r.emp.name)}<div class="grow"><b>${esc(r.emp.name)}</b><small>${esc(r.title)} · ${esc(r.emp.site)} ${UI.code(r.emp.country)}</small></div>${UI.rate(r.result.rating, r.result.capped)}</div>
          <h4 class="mt">Model</h4><div class="seg" id="talkModel">${['SBI', 'GROW', 'Feed-forward'].map((m) => `<button class="${m === model ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
          <p class="why mt">${model === 'SBI' ? 'Situation, Behaviour, Impact: feedback on facts, not personality.' : model === 'GROW' ? 'Goal, Reality, Options, Way forward: a coaching structure.' : 'Feed-forward: ideas for the future instead of judging the past.'}</p>
          <div class="tip mt"><b>${UI.code(c)} tip</b> ${esc(ctx.idx.country.feedback_culture?.[c])}. ${c === 'CN' ? 'Give the critical part one-to-one; praise in front of the team.' : 'Be direct; public praise is welcome; frame yourself as a mentor.'}</div></div>
        <div class="card"><div class="row between"><h4 style="margin:0">Script (built from ${esc(r.emp.name.split(' ')[0])}'s data)</h4><button class="btn light sm" id="copyScript">Copy</button></div>
          <div class="script mt" id="script">${lines.map(([h, t]) => `<div class="sl"><span>${esc(h)}</span><p>${esc(t)}</p></div>`).join('')}</div>
          <p class="why mt">Rating talk now; development talk booked ${ctx.rules.built70.split_conversation_min_weeks}+ weeks later. Tone set by the ${c === 'IN' ? 'India' : 'China'} lens (switch it in the top bar).</p></div></div>`;
    } else if (tab === 'calib') {
      const mgrs = ctx.out.bias.managers;
      const vik = ctx.out.personas.find((p) => p.key === 'vikram')?.emp_id;
      const mid = ctx.sel('calibMgr', vik || mgrs[0]?.manager_id);
      const m = mgrs.find((x) => x.manager_id === mid) || mgrs[0];
      const team = ctx.out.employees.filter((r) => r.emp.manager_id === m.manager_id);
      const prop = (r) => { const s = (ctx.idx.fb.get(r.emp.emp_id) || []).filter((f) => f.relationship === 'manager').map((f) => Number(f.score)); return s.length ? Math.max(1, Math.min(5, Math.round(s.reduce((a, b) => a + b, 0) / s.length))) : r.result.rating; };
      const saved = ctx.state.calib[m.manager_id] || {};
      const where = (r) => saved[r.emp.emp_id] ?? prop(r);
      const mean = (f) => (team.length ? team.reduce((s, r) => s + f(r), 0) / team.length : 0);
      body = `<div class="card mt" id="calibCard"><div class="row between"><div class="row"><h4 style="margin:0">Team of</h4><select class="sel" id="calibMgr">${mgrs.map((x) => `<option value="${x.manager_id}"${x.manager_id === m.manager_id ? ' selected' : ''}>${esc(x.name)} (${x.reports})${x.flags.length ? ' ⚑' : ''}</option>`).join('')}</select>
          ${m.flags.map((f) => `<span class="tag bad wob">⚑ ${esc(f.type)}: ${esc(f.text)}</span>`).join('')}</div>
          <div class="row"><button class="btn sm" id="toEvidence">Calibrate to evidence</button><button class="btn light sm" id="toProposal">Reset to manager's proposal</button></div></div>
        <div class="row mt calib-stats"><span>Manager proposed: <b>${UI.fmt(mean(prop), 2)}</b></span><span>On the board: <b id="boardMean">${UI.fmt(mean(where), 2)}</b></span><span>Evidence (engine): <b>${UI.fmt(mean((r) => r.result.rating), 2)}</b></span><span class="muted small">Drag a card to another column. Orange outline = moved from the proposal.</span></div>
        <div class="calib mt" id="calib">${[1, 2, 3, 4, 5].map((v) => `<div class="ccol" data-v="${v}"><h6>${v} · ${esc(['', 'Unsatisfactory', 'Developing', 'Solid', 'Strong', 'Outstanding'][v])}<span class="cnt">${team.filter((r) => where(r) === v).length}</span></h6><div class="cards">${team.filter((r) => where(r) === v).map((r) => `<div class="pcard${where(r) !== prop(r) ? ' moved' : ''}" data-id="${r.emp.emp_id}" data-prop="${prop(r)}" data-ev="${r.result.rating}" title="Evidence: composite ${UI.fmt(r.result.composite)} → ${r.result.rating}">${esc(r.emp.name)}<small>${UI.fmt(r.result.composite, 1)}</small></div>`).join('')}</div></div>`).join('')}</div>
        <p class="why mt">The manager's proposal is the average of the ratings he gave his own team. The evidence is the engine's composite from KPIs, 360° feedback and growth. Calibration is where the two meet, in a room with other managers.</p></div>`;
    } else if (tab === 'exec') {
      const ci = ctx.data.CheckIns, people = ctx.out.employees.length;
      const types = {}; for (const c of ci) types[c.type] = (types[c.type] || 0) + 1;
      const changes = ci.filter((c) => c.type === 'goal change').sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
      body = `<div class="grid g3 mt"><div class="card stat"><div class="v">${UI.counter(ci.length / people, { dec: 1 })}</div><div class="l">CHECK-INS PER PERSON THIS YEAR</div><div class="d">Target at pace ${pace}: ${pace >= 8 ? '12 (monthly)' : '4 (quarterly)'}</div></div>
          <div class="card stat"><div class="v">${UI.counter(types['goal change'] || 0)}</div><div class="l">MID-CYCLE GOAL CHANGES</div><div class="d">Re-contracting when the plan changes</div></div>
          <div class="card stat"><div class="v">${UI.counter(types.coaching || 0)}</div><div class="l">COACHING SESSIONS</div><div class="d">Six earn a rung on the leadership helix</div></div></div>
        <div class="grid g2 mt"><div class="card"><h4>How employees deliver performance</h4><ul class="dots"><li><b>Clear line of sight:</b> every KPI traces back to the scorecard and the vision (Strategy DNA cascade).</li><li><b>Frequent check-ins:</b> blockers are raised in days, not at year end.</li><li><b>Re-contracting:</b> when a model launch slips or a price cut lands, goals are changed mid-cycle and logged.</li><li><b>Resources and skills:</b> gaps found in reviews go straight to the Training Engine.</li><li><b>Recognition in the moment:</b> peer kudos and spot awards, not only the year-end bonus.</li></ul></div>
          <div class="card"><h4>Check-in mix</h4>${Object.entries(types).map(([t, c]) => `<div class="hbar"><span class="lab">${esc(t)}</span>${UI.bar((c / ci.length) * 100)}<span class="val">${c}</span></div>`).join('')}
            <h4 class="mt">Latest goal changes</h4><ul class="dots">${changes.map((c) => `<li><a class="lnk" data-person="${c.emp_id}">${esc(ctx.idx.emp.get(c.emp_id)?.name)}</a> · ${esc(c.date)}: ${esc(c.note)}</li>`).join('')}</ul></div></div>`;
    } else {
      body = `<div class="card mt"><h3 class="s">If someone disagrees with their rating</h3><div class="flow">
        ${[['1', 'Talk to the manager', 'Within 7 days. Most disagreements end here with the evidence on the table.'], ['2', 'Written appeal', 'Within 14 days of the review, on a form that asks for evidence, not opinions.'], ['3', 'Skip-level + HR review', 'The manager\'s manager and an HR partner re-check the data and the calibration notes.'], ['4', 'Review panel decision', 'A panel with a peer manager from another team decides within 21 days. The outcome is recorded.']].map(([n, h, t]) => `<div class="fstep"><span>${n}</span><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('')}</div>
        <div class="grid g2 mt"><div class="tip">${UI.code('IN')} Workplace rules sit in standing orders above the IR Code threshold; a grievance redressal route is expected for larger establishments (⚠️ check the exact Labour Code rule before final).</div>
          <div class="tip">${UI.code('CN')} ${esc(ctx.idx.country.pms_rule_making?.CN)}. The appeal route itself should go through that consultation.</div></div></div>`;
    }
    return `${UI.pageHead({ eyebrow: 'M6 · Review & Delivery', title: 'Performance is a conversation, <em>not a form.</em>', sub: 'Two sides: how people deliver performance through the year, and how managers deliver feedback about it. Timing follows each country; calibration keeps ratings honest.' })}
      <div class="seg" id="revTabs">${TABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${esc(l)}</button>`).join('')}</div>${body}`;
  },
  mount(root, ctx) {
    drags.forEach((d) => d.kill()); drags = [];
    root.querySelectorAll('#revTabs [data-t]').forEach((b) => b.addEventListener('click', () => ctx.setSel('reviewTab', b.dataset.t)));
    const tab = ctx.sel('reviewTab', 'cal');
    if (tab === 'cal' && !RM) root.querySelectorAll('.cal').forEach((c) => gsap.from(c.querySelectorAll('.cell.on'), { scale: 0, duration: 0.4, ease: 'back.out(2)', stagger: { each: 0.012, from: 'start' }, delay: 0.3 }));
    if (tab === 'talk') {
      root.querySelector('#talkWho').addEventListener('change', (e) => ctx.setSel('talkPerson', e.target.value));
      root.querySelectorAll('#talkModel [data-m]').forEach((b) => b.addEventListener('click', () => ctx.setSel('talkModel', b.dataset.m)));
      if (!RM) gsap.from(root.querySelectorAll('#script .sl'), { opacity: 0, x: 20, stagger: 0.12, duration: 0.45, delay: 0.2 });
      root.querySelector('#copyScript').addEventListener('click', () => {
        const t = [...root.querySelectorAll('#script .sl')].map((s) => `${s.querySelector('span').textContent}: ${s.querySelector('p').textContent}`).join('\n');
        navigator.clipboard?.writeText(t).then(() => UI.toast('Script copied.'), () => UI.toast('Copy is blocked here; select the text instead.'));
      });
    }
    if (tab === 'calib') calibMount(root, ctx);
  },
};

function calibMount(root, ctx) {
  const sel = root.querySelector('#calibMgr');
  sel.addEventListener('change', () => ctx.setSel('calibMgr', sel.value));
  const mid = sel.value;
  const board = root.querySelector('#calib');
  const cols = [...board.querySelectorAll('.ccol')];
  const save = () => {
    const m = {};
    board.querySelectorAll('.pcard').forEach((c) => { m[c.dataset.id] = Number(c.closest('.ccol').dataset.v); c.classList.toggle('moved', m[c.dataset.id] !== Number(c.dataset.prop)); });
    ctx.state.calib[mid] = m;
    cols.forEach((c) => { c.querySelector('.cnt').textContent = c.querySelectorAll('.pcard').length; });
    const vals = Object.values(m);
    root.querySelector('#boardMean').textContent = UI.fmt(vals.reduce((a, b) => a + b, 0) / (vals.length || 1), 2);
  };
  const moveAll = (fn) => {
    const cards = [...board.querySelectorAll('.pcard')];
    const st = window.Flip ? window.Flip.getState(cards) : null;
    cards.forEach((c) => cols[fn(c) - 1].querySelector('.cards').appendChild(c));
    if (st && !RM) window.Flip.from(st, { duration: 0.7, ease: 'power3.inOut', stagger: 0.01, absolute: true });
    save();
  };
  root.querySelector('#toEvidence').addEventListener('click', () => { moveAll((c) => Number(c.dataset.ev)); UI.toast('Cards moved to what the evidence says. Discuss the big moves in the room.'); });
  root.querySelector('#toProposal').addEventListener('click', () => moveAll((c) => Number(c.dataset.prop)));
  if (!window.Draggable) return;
  board.querySelectorAll('.pcard').forEach((card) => {
    const d = window.Draggable.create(card, {
      type: 'x,y', zIndexBoost: true,
      onPress() { cols.forEach((c) => c.classList.remove('hot')); },
      onDrag() { const x = this.pointerEvent.clientX; cols.forEach((c) => { const r = c.getBoundingClientRect(); c.classList.toggle('hot', x >= r.left && x <= r.right); }); },
      onRelease() {
        const x = this.pointerEvent.clientX;
        const target = cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; });
        cols.forEach((c) => c.classList.remove('hot'));
        const all = [...board.querySelectorAll('.pcard')];
        const st = window.Flip ? window.Flip.getState(all) : null;
        gsap.set(card, { x: 0, y: 0 });
        if (target) target.querySelector('.cards').appendChild(card);
        this.update();
        if (st && !RM) window.Flip.from(st, { duration: 0.45, ease: 'power2.inOut', absolute: false });
        save();
      },
    })[0];
    drags.push(d);
  });
}
