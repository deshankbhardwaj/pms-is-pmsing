// M6 Review & Delivery: review calendar per country, feedback conversation (script + feedback toolkit), calibration board, check-ins, appeals.
import * as UI from '../ui.js';
import { feedbackHtml, feedbackMount } from '../feedback.js';
const { esc, gsap, RM } = UI;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TABS = [['cal', 'Review calendar'], ['talk', 'Feedback conversation'], ['calib', 'Calibration board'], ['exec', 'Check-ins & delivery'], ['appeal', 'Appeals']];
const RATING = ['', 'Unsatisfactory', 'Developing', 'Solid', 'Strong', 'Outstanding'];
const mod12 = (x) => ((x % 12) + 12) % 12;

// One calendar rule for every screen: the rhythm comes from the engine's cadence (pace), the months from fy_start_month.
function calendar(country, cad, fyStart) {
  const fy = mod12((Number(fyStart) || (country === 'IN' ? 4 : 1)) - 1);
  const all = [...Array(12).keys()];
  const check = cad.checkins === 'monthly' ? all : [2, 5, 8, 11].map((o) => mod12(fy + o));
  const rows = [
    ['Goal setting', '#b88a00', [fy], `${MONTHS[fy]}: start of the performance year`],
    [`Check-ins (${cad.checkins})`, '#1dab84', check, 'Pace sets the rhythm'],
  ];
  if (cad.reviews === 'quarterly') rows.push(['Quarterly reviews', '#1c9ec4', [3, 6, 9].map((o) => mod12(fy + o)), 'Pace 8+']);
  if (cad.reviews === 'half-yearly') rows.push(['Mid-year review', '#1c9ec4', [mod12(fy + 6)], 'Half-yearly reviews']);
  rows.push(
    ['Year-end review', '#5f7cff', country === 'IN' ? [mod12(fy - 1), fy, mod12(fy + 1)] : [mod12(fy - 1), fy], 'Around the end of the performance year'],
    ['Calibration', '#e5484d', [country === 'IN' ? mod12(fy + 1) : fy], 'Managers compare ratings across teams'],
    ['Pay & bonus', '#a55eea', country === 'IN' ? [fy, 9, 10] : [fy, mod12(fy + 1)], country === 'IN' ? 'Increments at the start of the year; Diwali sales contest Oct–Nov' : 'Year-end bonus / 13th month before Spring Festival'],
    ['Development talk', '#8b5cf6', [mod12(fy + 2), mod12(fy + 3)], 'Kept separate from the rating talk'],
  );
  return rows;
}

function script(ctx, r, model) {
  const res = r.result, items = [...res.items].filter((i) => i.score !== null).sort((a, b) => b.score - a.score);
  const best = items[0], worst = items[items.length - 1], gate = res.gates.find((g) => g.passed === false);
  const course = r.tna.gaps[0]?.courses[0];
  const first = String(r.emp.name).split(' ')[0];
  const kpi = (i) => ctx.idx.kpi.get(i.kpi_id) || {};
  const tgt = (i) => `${kpi(i).target ?? ''} ${kpi(i).unit ?? ''}`.trim();
  if (!best) return [['Note', `There are no KPI results for ${first} yet, so the script can only cover behaviours and goals. Add KPI_Actuals rows in the Data Hub.`]];
  const lines = [];
  if (model === 'SBI') {
    lines.push(['Situation', `Over the year, on ${best.name.toLowerCase()}…`]);
    lines.push(['Behaviour', `…you averaged ${best.value} against a target of ${tgt(best)}. That is a ${best.score >= 4 ? 'stretch-level' : 'solid'} result.`]);
    lines.push(['Impact', 'It moved the team scorecard and the customer experience. Thank you.']);
    if (gate) lines.push(['Situation', `In ${gate.failedPeriods.join(' and ') || 'this year'}, on ${gate.name.toLowerCase()}…`], ['Behaviour', '…the compliance check was not met.'], ['Impact', 'However strong the numbers, this caps the rating and keeps the top-tier bonus out of reach. How we get results matters as much as what.']);
    else if (worst !== best) lines.push(['Situation', `On ${worst.name.toLowerCase()}…`], ['Behaviour', `…you averaged ${worst.value} against ${tgt(worst)}.`], ['Impact', 'This is the one area holding the overall score back.']);
  } else if (model === 'GROW') {
    lines.push(['Goal', gate ? `Pass ${gate.name.toLowerCase()} every quarter next year.` : `Reach ${tgt(worst)} on ${worst.name.toLowerCase()} by the next review.`]);
    lines.push(['Reality', gate ? `Failed in ${gate.failedPeriods.join(', ') || 'this year'}.` : `Today: ${worst.value} (score ${UI.fmt(worst.score, 1)} of 5).`]);
    lines.push(['Options', `${course ? `${course.name} (${course.mode})` : 'Coaching with your manager'}; pair with a strong peer; one check-in a month on this goal.`]);
    lines.push(['Way forward', `${first} owns the plan; next check-in in four weeks. Progress counts towards the Growth part of the score.`]);
  } else {
    lines.push(['Looking ahead', `${first}, what would make next year your best yet on ${best.name.toLowerCase()}?`]);
    lines.push(['One idea', `Try ${course ? String(course.name).toLowerCase() : 'a stretch assignment'}; aim for ${tgt(worst)} on ${worst.name.toLowerCase()}.`]);
    lines.push(['Ask for help', 'Who could you learn from? I can set that up.']);
    lines.push(['Commit', 'Pick one change and we will check it together in a month.']);
  }
  return lines;
}

const proposalOf = (ctx, r) => {
  const s = (ctx.idx.fb.get(r.emp.emp_id) || []).filter((f) => f.relationship === 'manager').map((f) => Number(f.score)).filter((x) => Number.isFinite(x));
  return s.length ? Math.max(1, Math.min(5, Math.round(s.reduce((a, b) => a + b, 0) / s.length))) : r.result.rating;
};

export default {
  nextNote: 'Ratings set. Now the money and the thanks',
  render(ctx) {
    const tab = TABS.some(([k]) => k === ctx.sel('reviewTab')) ? ctx.sel('reviewTab') : 'cal';
    const cad = ctx.out.cadence;
    let body = '';
    if (tab === 'cal') {
      const present = ['IN', 'CN'].filter((c) => ctx.out.employees.some((r) => r.emp.country === c));
      const cs = ctx.state.lens === 'home' ? (present.length ? present : ['IN']) : [ctx.state.lens];
      body = cs.map((c) => `<div class="card mt"><div class="row between"><h2 class="s" style="margin:0">${UI.code(c)} ${c === 'IN' ? 'India' : 'China'} · ${esc(ctx.idx.country.performance_year?.[c])}</h2><span class="small muted">${esc(ctx.idx.country.review_window?.[c])}</span></div>
        <div class="cal-wrap"><div class="cal mt" data-cal="${c}" role="table" aria-label="${c === 'IN' ? 'India' : 'China'} review calendar"><div class="r" role="row"><div role="columnheader"><span class="sr-only">Activity</span></div>${MONTHS.map((m) => `<div class="m" role="columnheader" data-s="${m[0]}">${m}</div>`).join('')}</div>
        ${calendar(c, cad, ctx.idx.country.fy_start_month?.[c]).map(([lab, col, on, note]) => `<div class="r" role="row"><div class="lab" role="rowheader" title="${esc(note)}">${esc(lab)}</div>${MONTHS.map((m, i) => `<div class="cell${on.includes(i) ? ' on' : ''}" role="cell" aria-label="${esc(`${lab}, ${m}: ${on.includes(i) ? 'yes' : 'no'}`)}" style="--cc:${col}"></div>`).join('')}</div>`).join('')}</div></div></div>`).join('')
        + `<div class="grid g2 mt"><div class="card"><h2 class="h4">Why two separate conversations</h2><p class="why">Meyer, Kay & French (1965) found that criticism in the rating talk made people defensive and blocked development. PRISM books the development talk at least ${ctx.rules.built70.split_conversation_min_weeks} weeks after the rating talk.</p></div>
          <div class="card"><h2 class="h4">Pace changes the rhythm</h2><p class="why">${esc(ctx.out.org.org_name)} runs at pace ${esc(cad.pace)}: ${esc(cad.checkins)} check-ins and ${esc(cad.reviews)} reviews (the same rule the Strategy DNA card shows). The months follow each country's performance year (fy_start_month in the Country Lens). Move the Pace slider in Strategy DNA to see this calendar change.</p></div></div>`;
    } else if (tab === 'talk') {
      const pid = ctx.pickPerson('talkPerson', ctx.personaId('karan'));
      const r = ctx.row(pid);
      if (!r) body = '<div class="card mt"><p class="why">No scored people in the loaded data.</p></div>';
      else {
        ctx.state.sel.talkPerson = pid;
        const model = ['SBI', 'GROW', 'Feed-forward'].includes(ctx.sel('talkModel')) ? ctx.sel('talkModel') : 'SBI';
        const c = ctx.lensCountry(r.emp);
        const lines = script(ctx, r, model);
        const byRole = new Map();
        for (const x of [...ctx.out.employees].sort((a, b) => String(a.emp.name).localeCompare(String(b.emp.name)))) {
          if (!byRole.has(x.title)) byRole.set(x.title, []);
          byRole.get(x.title).push(x);
        }
        const ps = ctx.out.personas.filter((p) => p.row);
        body = `<div class="grid g12 mt"><div class="card"><h2 class="h4">Who</h2>
            <label class="sr-only" for="talkSearch">Search for a person</label><input class="inp" id="talkSearch" list="talkList" placeholder="Search ${ctx.out.employees.length} people by name or ID…" autocomplete="off" style="width:100%">
            <datalist id="talkList">${ctx.out.employees.map((x) => `<option value="${esc(`${x.emp.name} · ${x.emp.emp_id}`)}"></option>`).join('')}</datalist>
            <label class="sr-only" for="talkWho">Person</label><select class="sel mt" id="talkWho" style="width:100%">${ps.length ? `<optgroup label="Personas">${ps.map((p) => `<option value="${esc(p.emp_id)}"${p.emp_id === pid ? ' selected' : ''}>${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`).join('')}</optgroup>` : ''}${[...byRole].map(([t, rs]) => `<optgroup label="${esc(t)}">${rs.map((x) => `<option value="${esc(x.emp.emp_id)}"${x.emp.emp_id === pid && !ctx.personaKey(pid) ? ' selected' : ''}>${esc(x.emp.name)} · ${esc(x.emp.site)}</option>`).join('')}</optgroup>`).join('')}</select>
            <div class="li mt" data-person="${esc(pid)}">${UI.avatar(r.emp.name)}<div class="grow"><b>${esc(r.emp.name)}</b><small>${esc(r.title)} · ${esc(r.emp.site)} ${UI.code(r.emp.country)}</small></div>${UI.rate(r.result.rating, r.result.capped)}</div>
            <h2 class="h4 mt">Model</h2><div class="seg" id="talkModel" role="group" aria-label="Feedback model">${['SBI', 'GROW', 'Feed-forward'].map((m) => `<button class="${m === model ? 'on' : ''}" data-m="${m}" aria-pressed="${m === model}">${m}</button>`).join('')}</div>
            <p class="why mt">${model === 'SBI' ? 'Situation, Behaviour, Impact: feedback on facts, not personality.' : model === 'GROW' ? 'Goal, Reality, Options, Way forward: a coaching structure.' : 'Feed-forward: ideas for the future instead of judging the past.'}</p>
            <div class="tip mt"><b>${UI.code(c)} tip</b> ${esc(ctx.idx.country.feedback_culture?.[c])}. ${c === 'CN' ? 'Give the critical part one-to-one; praise in front of the team.' : 'Be direct; public praise is welcome; frame yourself as a mentor.'}</div></div>
          <div class="card"><div class="row between"><h2 class="h4" style="margin:0">Script (built from ${esc(String(r.emp.name).split(' ')[0])}'s data)</h2><button class="btn light sm" id="copyScript">Copy</button></div>
            <div class="script mt" id="script">${lines.map(([h, t]) => `<div class="sl"><span>${esc(h)}</span><p>${esc(t)}</p></div>`).join('')}</div>
            <p class="why mt">Rating talk now; development talk booked ${ctx.rules.built70.split_conversation_min_weeks}+ weeks later. Tone set by the ${c === 'IN' ? 'India' : 'China'} rules (switch the lens in the top bar).</p></div></div>
          ${feedbackHtml(ctx, r)}`;
      }
    } else if (tab === 'calib') {
      const mgrs = ctx.out.bias.managers.filter((m) => ctx.out.employees.some((r) => r.emp.manager_id === m.manager_id));
      if (!mgrs.length) body = '<div class="card mt"><p class="why">No manager has enough rated reports (4 or more) to calibrate.</p></div>';
      else {
        const vik = ctx.personaId('vikram');
        const want = ctx.sel('calibMgr', vik || mgrs[0].manager_id);
        const m = mgrs.find((x) => x.manager_id === want) || mgrs[0];
        ctx.state.sel.calibMgr = m.manager_id;
        const team = ctx.out.employees.filter((r) => r.emp.manager_id === m.manager_id);
        const saved = ctx.state.calib[m.manager_id] || {};
        const where = (r) => saved[r.emp.emp_id] ?? proposalOf(ctx, r);
        const mean = (f) => (team.length ? team.reduce((s, r) => s + f(r), 0) / team.length : 0);
        body = `<div class="card mt" id="calibCard"><div class="row between"><div class="row"><label class="h4" for="calibMgr" style="margin:0">Team of</label><select class="sel" id="calibMgr">${mgrs.map((x) => `<option value="${esc(x.manager_id)}"${x.manager_id === m.manager_id ? ' selected' : ''}>${esc(x.name)} (${x.reports})${x.flags.length ? ' ⚑' : ''}</option>`).join('')}</select>
            ${m.flags.map((f) => `<span class="tag bad wob">⚑ ${esc(f.type)}: ${esc(f.text)}</span>`).join('')}</div>
            <div class="row"><button class="btn sm" id="toEvidence">Calibrate to evidence</button><button class="btn light sm" id="toProposal">Reset to manager's proposal</button></div></div>
          <div class="row mt calib-stats"><span>Manager's average rating given: <b>${UI.fmt(m.mean, 2)}</b> <small class="muted">(as whole-number proposals: ${UI.fmt(mean((r) => proposalOf(ctx, r)), 2)})</small></span><span>On the board: <b id="boardMean">${UI.fmt(mean(where), 2)}</b></span><span>Evidence (engine): <b>${UI.fmt(mean((r) => r.result.rating), 2)}</b></span></div>
          <p class="small muted mt">Drag a card by its handle to another column, or focus a card and press ← / → or 1–5. Orange outline = moved from the proposal.</p>
          <div class="calib mt" id="calib">${[1, 2, 3, 4, 5].map((v) => `<div class="ccol" data-v="${v}" role="list" aria-label="${v} · ${RATING[v]}"><h3 class="h6">${v} · ${esc(RATING[v])}<span class="cnt">${team.filter((r) => where(r) === v).length}</span></h3><div class="cards">${team.filter((r) => where(r) === v).map((r) => `<div class="pcard${where(r) !== proposalOf(ctx, r) ? ' moved' : ''}" role="listitem" tabindex="0" data-id="${esc(r.emp.emp_id)}" data-prop="${proposalOf(ctx, r)}" data-ev="${r.result.rating}" aria-label="${esc(`${r.emp.name}: evidence ${UI.fmt(r.result.composite, 1)}, rating ${r.result.rating}, manager proposed ${proposalOf(ctx, r)}`)}" title="Evidence: composite ${UI.fmt(r.result.composite)} → ${r.result.rating}"><span class="grip" aria-hidden="true">⠿</span><span class="nm">${esc(r.emp.name)}</span><small>${UI.fmt(r.result.composite, 1)}</small></div>`).join('')}</div></div>`).join('')}</div>
          <p class="why mt">The manager's proposal is the rounded average of the ratings he or she gave each person. The evidence is the engine's composite from KPIs, 360° feedback and growth. Calibration is where the two meet, in a room with other managers.</p></div>`;
      }
    } else if (tab === 'exec') {
      const ci = ctx.data.CheckIns || [], people = ctx.out.employees.length || 1;
      const types = {}; for (const c of ci) types[c.type] = (types[c.type] || 0) + 1;
      const changes = ci.filter((c) => c.type === 'goal change').sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
      body = `<div class="grid g3 mt"><div class="card stat"><div class="v">${UI.counter(ci.length / people, { dec: 1 })}</div><div class="l">CHECK-INS PER PERSON THIS YEAR</div><div class="d">Expected at pace ${esc(cad.pace)}: ${cad.checkins_per_year} (${esc(cad.checkins)})</div></div>
          <div class="card stat"><div class="v">${UI.counter(types['goal change'] || 0)}</div><div class="l">MID-CYCLE GOAL CHANGES</div><div class="d">Re-contracting when the plan changes</div></div>
          <div class="card stat"><div class="v">${UI.counter(types.coaching || 0)}</div><div class="l">COACHING SESSIONS</div><div class="d">${ctx.rules.built70.helix.coaching_sessions_for_rung} earn a rung on the leadership helix</div></div></div>
        <div class="grid g2 mt"><div class="card"><h2 class="h4">How employees deliver performance</h2><ul class="dots"><li><b>Clear line of sight:</b> every KPI traces back to the scorecard and the vision (Strategy DNA cascade).</li><li><b>Frequent check-ins:</b> blockers are raised in days, not at year end.</li><li><b>Re-contracting:</b> when a model launch slips or a price cut lands, goals are changed mid-cycle and logged.</li><li><b>Resources and skills:</b> gaps found in reviews go straight to the Training Engine.</li><li><b>Recognition in the moment:</b> peer kudos and spot awards, not only the year-end bonus.</li></ul></div>
          <div class="card"><h2 class="h4">Check-in mix</h2>${Object.entries(types).map(([t, c]) => `<div class="hbar"><span class="lab">${esc(t)}</span>${UI.bar((c / ci.length) * 100)}<span class="val">${c}</span></div>`).join('') || '<p class="why">No check-ins in the loaded data.</p>'}
            <h2 class="h4 mt">Latest goal changes</h2><ul class="dots">${changes.map((c) => `<li>${ctx.row(c.emp_id) ? `<a class="lnk" data-person="${esc(c.emp_id)}">${esc(ctx.idx.emp.get(c.emp_id)?.name)}</a>` : esc(ctx.idx.emp.get(c.emp_id)?.name || c.emp_id)} · ${esc(c.date)}: ${esc(c.note)}</li>`).join('') || '<li>None logged</li>'}</ul></div></div>`;
    } else {
      body = `<div class="card mt"><h2 class="s">If someone disagrees with their rating</h2><div class="flow">
        ${[['1', 'Talk to the manager', 'Within 7 days. Most disagreements end here with the evidence on the table.'], ['2', 'Written appeal', 'Within 14 days of the review, on a form that asks for evidence, not opinions.'], ['3', 'Skip-level + HR review', 'The manager\'s manager and an HR partner re-check the data and the calibration notes.'], ['4', 'Review panel decision', 'A panel with a peer manager from another team decides within 21 days. The outcome is recorded.']].map(([n, h, t]) => `<div class="fstep"><span>${n}</span><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('')}</div>
        <div class="grid g2 mt"><div class="tip">${UI.code('IN')} Workplace rules sit in standing orders above the IR Code threshold; a grievance redressal route is expected for larger establishments (⚠️ check the exact Labour Code rule before final).</div>
          <div class="tip">${UI.code('CN')} ${esc(ctx.idx.country.pms_rule_making?.CN)}. The appeal route itself should go through that consultation.</div></div></div>`;
    }
    return `${UI.pageHead({ eyebrow: 'M6 · Review & Delivery', title: 'Performance is a conversation, <em>not a form.</em>', sub: 'Two sides: how people deliver performance through the year, and how managers deliver feedback about it. Timing follows each country; calibration keeps ratings honest.' })}
      <div class="seg tabs" id="revTabs" role="tablist" aria-label="Review & Delivery sections">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-t="${k}">${esc(l)}</button>`).join('')}</div>${body}`;
  },
  mount(root, ctx) {
    root.querySelectorAll('#revTabs [data-t]').forEach((b) => b.addEventListener('click', () => ctx.setSel('reviewTab', b.dataset.t)));
    const tab = TABS.some(([k]) => k === ctx.sel('reviewTab')) ? ctx.sel('reviewTab') : 'cal';
    if (tab === 'cal' && !RM) root.querySelectorAll('.cal').forEach((c) => gsap.from(c.querySelectorAll('.cell.on'), { scale: 0, duration: 0.4, ease: 'back.out(2)', stagger: { each: 0.012, from: 'start' }, delay: 0.3 }));
    if (tab === 'talk' && root.querySelector('#talkWho')) {
      root.querySelector('#talkWho').addEventListener('change', (e) => ctx.setSel('talkPerson', e.target.value));
      const search = root.querySelector('#talkSearch');
      const pick = () => {
        const id = (search.value.match(/·\s*(\S+)\s*$/) || [])[1];
        if (id && ctx.row(id)) ctx.setSel('talkPerson', id);
      };
      search.addEventListener('change', pick);
      search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); pick(); } });
      root.querySelectorAll('#talkModel [data-m]').forEach((b) => b.addEventListener('click', () => ctx.setSel('talkModel', b.dataset.m)));
      if (!RM) gsap.from(root.querySelectorAll('#script .sl'), { opacity: 0, x: 20, stagger: 0.12, duration: 0.45, delay: 0.2 });
      root.querySelector('#copyScript').addEventListener('click', () => {
        const t = [...root.querySelectorAll('#script .sl')].map((s) => `${s.querySelector('span').textContent}: ${s.querySelector('p').textContent}`).join('\n');
        navigator.clipboard?.writeText(t).then(() => UI.toast('Script copied.'), () => UI.toast('Copy is blocked here; select the text instead.'));
      });
      feedbackMount(root, ctx, ctx.row(ctx.state.sel.talkPerson));
    }
    if (tab === 'calib' && root.querySelector('#calib')) calibMount(root, ctx);
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
    ctx.markDirty();
    cols.forEach((c) => { c.querySelector('.cnt').textContent = c.querySelectorAll('.pcard').length; });
    const vals = Object.values(m);
    root.querySelector('#boardMean').textContent = UI.fmt(vals.reduce((a, b) => a + b, 0) / (vals.length || 1), 2);
  };
  const flipMove = (cards, fn, opts) => {
    const st = window.Flip ? window.Flip.getState([...board.querySelectorAll('.pcard')]) : null;
    fn();
    if (st && !RM) window.Flip.from(st, { duration: 0.45, ease: 'power2.inOut', ...opts });
    save();
  };
  const moveAll = (fn) => flipMove(null, () => [...board.querySelectorAll('.pcard')].forEach((c) => cols[fn(c) - 1].querySelector('.cards').appendChild(c)), { duration: 0.7, ease: 'power3.inOut', stagger: 0.01, absolute: true });
  const moveCard = (card, v) => { if (v < 1 || v > 5) return; flipMove(null, () => cols[v - 1].querySelector('.cards').appendChild(card)); card.focus({ preventScroll: true }); };
  root.querySelector('#toEvidence').addEventListener('click', () => { moveAll((c) => Number(c.dataset.ev)); UI.toast('Cards moved to what the evidence says. Discuss the big moves in the room.'); });
  root.querySelector('#toProposal').addEventListener('click', () => moveAll((c) => Number(c.dataset.prop)));
  // Keyboard: ← / → move one column, 1–5 jump to a column.
  board.addEventListener('keydown', (e) => {
    const card = e.target.closest?.('.pcard');
    if (!card) return;
    const v = Number(card.closest('.ccol').dataset.v);
    if (e.key === 'ArrowLeft') { e.preventDefault(); moveCard(card, v - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveCard(card, v + 1); }
    else if (/^[1-5]$/.test(e.key)) { e.preventDefault(); moveCard(card, Number(e.key)); }
  });
  if (!window.Draggable) return;
  // On touch screens only the handle drags, so a swipe on the card still scrolls the page.
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const drags = [];
  const inBoard = (x, y) => { const b = board.getBoundingClientRect(); return y >= b.top - 30 && y <= b.bottom + 30 && x >= b.left - 30 && x <= b.right + 30; };
  board.querySelectorAll('.pcard').forEach((card) => {
    const d = window.Draggable.create(card, {
      type: 'x,y', zIndexBoost: true, trigger: coarse ? card.querySelector('.grip') : card,
      onPress() { cols.forEach((c) => c.classList.remove('hot')); },
      onDrag() { const x = this.pointerEvent.clientX, y = this.pointerEvent.clientY; cols.forEach((c) => { const r = c.getBoundingClientRect(); c.classList.toggle('hot', inBoard(x, y) && x >= r.left && x <= r.right); }); },
      onRelease() {
        const x = this.pointerEvent.clientX, y = this.pointerEvent.clientY;
        const target = inBoard(x, y) ? cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; }) : null;
        cols.forEach((c) => c.classList.remove('hot'));
        const st = window.Flip ? window.Flip.getState([...board.querySelectorAll('.pcard')]) : null;
        gsap.set(card, { x: 0, y: 0 });
        if (target) target.querySelector('.cards').appendChild(card);
        this.update();
        if (st && !RM) window.Flip.from(st, { duration: 0.45, ease: 'power2.inOut', absolute: false });
        if (target) save();
      },
    })[0];
    drags.push(d);
  });
  ctx.onCleanup(() => drags.forEach((d) => d.kill()));
}
