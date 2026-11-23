// Feedback toolkit for the Review & Delivery "Feedback conversation" tab (M6):
// signals before the meeting, the appraisal-interview checklist, handling a defensive employee,
// delivering criticism (with a phrase check), and what the research says (Zenger & Folkman, Dessler, Meyer et al.).
// Everything is built from the person's own data; nothing is invented about them.
import * as UI from './ui.js';
import { smart } from './modules/kpis.js';
const { esc } = UI;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RATING = ['', 'Unsatisfactory', 'Developing', 'Solid', 'Strong', 'Outstanding'];

// The appraisal-interview checklist (Dessler, Human Resource Management, "appraisal interview" checklist).
export const CHECKLIST = [
  'Did you discuss the goals and objectives established for the employee?',
  'Are you and the employee clear on the areas of agreement and disagreement?',
  'Did you and the employee cover all the positive skills, traits and accomplishments?',
  'Did you give the employee a sense of duty?',
  'Are you both clear where improvement is required?',
  'What training or development recommendations did you agree on?',
  'Did you confirm what your part and your employee\'s part will be?',
  'Did you reset good objectives for the next appraisal period?',
  'Do the goals follow the SMART system (specific, measurable, achievable, relevant, time-bound)?',
];

// "Fair-selling compliance (no fake bookings…)" → "Fair-selling compliance" inside a sentence
const short = (n) => String(n || '').replace(/\s*\([^)]*\)\s*$/, '');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const nums = (xs) => xs.map(Number).filter((x) => Number.isFinite(x));

// What the data says about this conversation before it starts.
export function signals(ctx, r) {
  const id = r.emp.emp_id;
  const fb = ctx.idx.fb.get(id) || [];
  const rel = (k) => nums(fb.filter((f) => f.relationship === k).map((f) => f.score));
  const self = mean(rel('self')), mgr = mean(rel('manager'));
  const cis = [...(ctx.idx.checkins.get(id) || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const expected = Number(ctx.out.cadence.checkins_per_year) || 4;
  const gate = r.result.gates.find((g) => g.passed === false);
  const rating = r.result.rating;
  const proposal = mgr === null ? null : Math.max(1, Math.min(5, Math.round(mgr)));
  const manager = ctx.out.bias.managers.find((m) => m.manager_id === r.emp.manager_id);
  const kudos = (ctx.data.Recognition || []).filter((x) => x.to_emp_id === id);
  const reasons = [];
  if (gate) reasons.push(`the failed ${short(gate.name).toLowerCase()} gate`);
  if (rating && rating <= 2) reasons.push(`a rating of ${rating} (${RATING[rating]})`);
  if (proposal !== null && rating && proposal - rating >= 2) reasons.push(`your 360 scores for them average ${UI.fmt(mgr, 1)}, but the evidence says ${rating}`);
  if (self !== null && mgr !== null && self - mgr >= 0.75) reasons.push(`they rate themselves ${UI.fmt(self, 1)} against your ${UI.fmt(mgr, 1)}`);
  return {
    self, mgr, proposal, rating, gate, cis, expected, last: cis[cis.length - 1]?.date || null, manager, kudos,
    surprise: proposal !== null && rating ? proposal - rating >= 2 : false,
    fewCheckins: cis.length < Math.ceil(expected * 0.75),
    reasons, risk: reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'some' : 'low',
  };
}

// One line of evidence per checklist item, from the person's data.
function evidence(ctx, r, s) {
  const first = String(r.emp.name).split(' ')[0];
  const ks = ctx.idx.kpisByRole.get(r.emp.role_id) || [];
  const goals = ctx.idx.devGoals.get(r.emp.emp_id) || [];
  const items = [...r.result.items].filter((i) => i.score !== null).sort((a, b) => b.score - a.score);
  const best = items.slice(0, 2), worst = items.filter((i) => i.score < 3).slice(-2).reverse();
  const fb = ctx.idx.fb.get(r.emp.emp_id) || [];
  const comps = new Map();
  for (const f of fb) {
    const c = comps.get(f.comp_id) || { self: [], others: [] };
    (f.relationship === 'self' ? c.self : c.others).push(Number(f.score));
    comps.set(f.comp_id, c);
  }
  const cname = (id) => ctx.idx.competency.get(id)?.name || id;
  const compRows = [...comps].map(([id, c]) => ({ id, self: mean(nums(c.self)), others: mean(nums(c.others)) }));
  const withSelf = compRows.filter((c) => c.self !== null && c.others !== null).sort((a, b) => Math.abs(b.self - b.others) - Math.abs(a.self - a.others));
  const bestComp = compRows.filter((c) => c.others !== null).sort((a, b) => b.others - a.others)[0];
  const role = ctx.idx.role.get(r.emp.role_id) || {};
  const gates = ks.filter((k) => k.type === 'Gate');
  const course = r.tna.gaps.flatMap((g) => g.courses.map((c) => ({ ...c, source: g.source }))).slice(0, 2);
  const cc = ctx.lensCountry(r.emp);
  const fyStart = Number(ctx.idx.country.fy_start_month?.[cc]) || (cc === 'IN' ? 4 : 1);
  const scored = ks.filter((k) => k.type !== 'Gate');
  const smartOk = scored.filter((k) => smart(k).every(([, , ok]) => ok));
  const misses = scored.filter((k) => !smart(k).every(([, , ok]) => ok)).map((k) => `${k.kpi_name} (missing ${smart(k).filter(([, , ok]) => !ok).map(([, t]) => t.toLowerCase()).join(', ')})`);
  const item = (i) => `${esc(i.name)}: ${esc(i.value)} (score ${UI.fmt(i.score, 1)})`;
  return [
    `${ks.length} measures on ${esc(first)}'s scorecard${ks.length ? `: ${esc(ks.slice(0, 3).map((k) => k.kpi_name).join(', '))}${ks.length > 3 ? '…' : ''}` : ''}. ${goals.length} development goal${goals.length === 1 ? '' : 's'} on file.`,
    withSelf.length
      ? `Furthest apart: ${esc(cname(withSelf[0].id))} (self ${UI.fmt(withSelf[0].self, 1)}, others ${UI.fmt(withSelf[0].others, 1)}). Closest: ${esc(cname(withSelf[withSelf.length - 1].id))}.${s.surprise ? ` Your own 360 scores average ${UI.fmt(s.mgr, 1)}; the evidence says ${s.rating}.` : ''}`
      : `No self-rating on file: ask ${esc(first)} to rate themselves first, so the agreements and disagreements are on the table.${s.surprise ? ` Your own 360 scores average ${UI.fmt(s.mgr, 1)}; the evidence says ${s.rating}.` : ''}`,
    `${best.length ? best.map(item).join('; ') : 'No KPI results yet'}${bestComp ? `. Strongest behaviour: ${esc(cname(bestComp.id))} (${UI.fmt(bestComp.others, 1)} from others)` : ''}. ${s.kudos.length} kud${s.kudos.length === 1 ? 'o' : 'os'} received this year${s.kudos.length ? ` (${esc([...new Set(s.kudos.map((k) => k.badge))].slice(0, 3).join(', '))})` : ''}.`,
    `${role.purpose ? `Why the role exists: ${esc(role.purpose)}` : 'Link each goal to the scorecard it feeds.'}${gates.length ? ` Non-negotiable: ${esc(gates.map((g) => g.kpi_name).join(', '))}.` : ''}`,
    `${s.gate ? `Gate not met: ${esc(s.gate.name)}${s.gate.failedPeriods?.length ? ` (${esc(s.gate.failedPeriods.join(', '))})` : ''}. ` : ''}${worst.length ? `Below target: ${worst.map(item).join('; ')}.` : s.gate ? '' : 'Nothing is below target: agree one stretch area instead.'}`,
    course.length ? course.map((c) => `${esc(c.source)} → ${esc(c.name)} (${esc(c.mode)}, ${esc(c.status)})`).join('; ') : `No training gap in the data: offer a stretch experience (Leadership Forge) or a coaching goal.`,
    `${esc(first)}: owns the plan for ${esc((worst[0] || s.gate || best[0])?.name?.toLowerCase() || 'the next goal')}. You: ${esc(ctx.out.cadence.checkins)} check-ins${course[0] ? `, book ${esc(course[0].name)}` : ''}, and clear the blockers you own.`,
    `The next performance year starts in ${MONTHS[(((fyStart - 1) % 12) + 12) % 12]} (${cc === 'IN' ? 'India' : 'China'} rules). Set next year's targets in the KPI & OKR Library.`,
    scored.length ? `${smartOk.length} of ${scored.length} of the role's measures pass all five SMART tests${misses.length ? `. Fix: ${esc(misses.slice(0, 2).join('; '))}` : ''}.` : 'No scored measures for this role yet.',
  ];
}

const DEFENSIVE = (first, s) => [
  ['Recognise defensive behaviour as normal', 'Denial, blaming others, anger or going quiet are normal ways to protect self-esteem. Don\'t take it personally and don\'t push harder.', `"It's natural to see this differently, ${first}. Let's look at the numbers together."`],
  ['Never attack a person\'s defences', 'Don\'t explain the person to themselves ("You\'re only saying that because…"). Stay on the specific behaviour and the evidence.', s.gate ? `"Let's stay with ${s.gate.failedPeriods?.length ? s.gate.failedPeriods.join(' and ') : 'the quarters'}, when the ${short(s.gate.name).toLowerCase()} check wasn't met."` : '"Let\'s stay with what happened and what we can change."'],
  ['Postpone action', 'If emotions run high, stop. Give the person time to think and meet again in a day or two. (Pause the decision, not the conversation: the talk itself should not be put off.)', '"Let\'s take a break and pick this up on Thursday, once we\'ve both had time to think."'],
  ['Recognise your own limitations', 'You are a manager, not a counsellor. If the problem is personal (health, family, stress), say so kindly and point to HR or an assistance programme.', '"That sounds hard. HR can put you in touch with someone who can help with that part."'],
];
const CRITICISM = [
  ['Let the person keep their dignity', 'Talk about the work, never the person: no labels such as lazy or careless.'],
  ['Criticise in private, and constructively', 'One-to-one, and always with what should happen next.'],
  ['Give daily feedback, so the review has no surprises', 'Nothing in the review should be news. If it is, the check-ins failed, not the employee.'],
  ['Never say the person is always wrong', '"Always" and "never" are rarely true and start an argument about the word, not the work.'],
  ['Be objective and free of bias', 'Cite numbers, dates and examples; check your own rating pattern first.'],
];

// Plain-language check of a sentence a manager plans to say (one row per rule, plus two Folkman habits).
export function checkPhrase(text) {
  const t = String(text || '');
  const has = (re) => re.test(t);
  const label = t.match(/\b(lazy|careless|useless|hopeless|stupid|incompetent|sloppy|attitude problem|bad attitude|unprofessional|disappointment|a failure|clueless)\b/i);
  const youAre = t.match(/\byou(?:'re| are) (?:so |too |really |just )?(?:a |an )?(\w+)/i);
  const abs = t.match(/\b(always|never|every time|constantly|all the time|nothing right|everything wrong)\b/i);
  const fact = has(/\d/) || has(/\b(Q[1-4]|quarter|month|week|target|kpi|gate|check|units|score|percent|%)\b/i);
  const next = has(/\b(next|going forward|from now|let's|let us|could you|can we|will you|plan|by the|try|aim|agree)\b/i);
  const compare = t.match(/\b(unlike|compared (?:to|with)|why can't you be like|as good as)\b/i);
  const ask = has(/\?/);
  const sentences = t.split(/[.!?]+/).filter((x) => x.trim().length > 3).length;
  return [
    [1, !label && !(youAre && /^(lazy|careless|useless|hopeless|stupid|incompetent|sloppy|unprofessional|failure|clueless|wrong)$/i.test(youAre[1] || '')), label ? `Drop the label "${label[1]}": describe what happened instead.` : 'Talks about the work, not the person.'],
    [2, next, next ? 'Says what should happen next.' : 'Add what should happen next ("Next quarter, let\'s…").'],
    [4, !abs, abs ? `"${abs[1]}" turns one gap into a verdict on the person. Name the specific times.` : 'No "always" or "never".'],
    [5, fact && !compare, compare ? 'Don\'t compare them with colleagues: compare with the target.' : fact ? 'Cites a fact (a number, a period, a target).' : 'Add a fact: a number, a quarter or the target.'],
    ['F', ask, ask ? 'Asks for their view (Folkman: asking rather than telling shows respect).' : 'Ask for their view before you describe the change you want.'],
    ['F', sentences <= 4, sentences <= 4 ? 'Short enough: one or two issues.' : 'Long: keep it to one or two issues per conversation (Folkman).'],
  ];
}

function draftFor(r, s) {
  const items = [...r.result.items].filter((i) => i.score !== null).sort((a, b) => a.score - b.score);
  if (s.gate) return `In ${s.gate.failedPeriods?.join(' and ') || 'this year'}, the ${short(s.gate.name).toLowerCase()} check was not met, so the rating is capped this year. What got in the way? Next quarter, let's agree how every deal passes the check.`;
  if (items[0] && items[0].score < 3) return `On ${items[0].name.toLowerCase()} you averaged ${items[0].value} this year, below the target. What would help? Let's aim for the target by the next review.`;
  return 'Your results are on target. Which one area do you want to stretch next year, and how can I help?';
}

export function feedbackHtml(ctx, r) {
  const s = signals(ctx, r);
  const first = String(r.emp.name).split(' ')[0];
  const saved = ctx.state.talk?.[r.emp.emp_id] || {};
  const ticks = Array.isArray(saved.checks) ? saved.checks : [];
  const done = CHECKLIST.filter((_, i) => ticks[i]).length;
  const ev = evidence(ctx, r, s);
  const c = ctx.lensCountry(r.emp);
  const flags = s.manager?.flags || [];
  const draft = typeof saved.draft === 'string' ? saved.draft : draftFor(r, s);
  const tile = (ok, title, body) => `<div class="sig ${ok ? 'ok' : 'warn'}"><b>${ok ? '✓' : '!'} ${title}</b><p>${body}</p></div>`;
  return `
    <div class="card mt fb-before"><h2 class="s">Before the meeting</h2><div class="sigs">
      ${tile(!s.fewCheckins && !s.surprise, 'No surprises', `${s.cis.length} check-in${s.cis.length === 1 ? '' : 's'} logged this year (${s.expected} expected at pace ${esc(ctx.out.cadence.pace)})${s.last ? `, last on ${esc(s.last)}` : ''}.${s.surprise ? ` <b>The rating will land well below what your 360 scores signalled: tell ${esc(first)} before the review, not in it.</b>` : ''}`)}
      ${tile(s.risk === 'low', `Defensiveness: ${s.risk}`, s.reasons.length ? `Expect push-back: ${esc(s.reasons.join('; '))}. Read the four rules below.` : 'Nothing in the data points to a hard conversation.')}
      ${tile(!flags.length, 'Objective, free of bias', flags.length ? `Your ratings carry a flag: ${esc(flags.map((f) => `${f.type} (${f.text})`).join('; '))}. Check your view against the evidence first.` : `The evidence rating is ${s.rating ? `${s.rating} (${RATING[s.rating]})` : 'not set'}; no rater flag on ${esc(s.manager?.name || 'the manager')}.`)}
      ${tile(true, 'In private', `${UI.code(c)} ${c === 'CN' ? 'One-to-one only; any praise for the team can be public.' : 'One-to-one, direct and data-led; public praise is welcome.'}`)}
    </div></div>
    <div class="grid g21 mt">
      <div class="card" id="fbChecklist"><div class="row between"><h2 class="s" style="margin:0">Appraisal interview checklist</h2><span class="ck-count" id="ckCount" aria-live="polite"><b>${done}</b> of ${CHECKLIST.length}</span></div>
        <div class="ck-bar mt" aria-hidden="true"><i style="width:${(done / CHECKLIST.length) * 100}%"></i></div>
        <ol class="cklist mt">${CHECKLIST.map((q, i) => `<li class="${ticks[i] ? 'on' : ''}"><label><input type="checkbox" data-ck="${i}" ${ticks[i] ? 'checked' : ''}><span>${esc(q)}</span></label><p class="ev">${ev[i]}</p>${i === 7 || i === 8 ? `<button class="btn ghost sm" data-kpirole="${esc(r.emp.role_id)}">Open the KPI & OKR Library →</button>` : ''}</li>`).join('')}</ol>
        <div class="row mt"><button class="btn light sm" id="ckClear">Clear the ticks</button><span class="small muted">Ticks are kept for ${esc(first)} in this browser.</span></div></div>
      <div class="card${s.risk === 'low' ? '' : ' hot'}" id="fbDefensive"><h2 class="s">If ${esc(first)} gets defensive</h2>${s.risk === 'low' ? '' : `<p class="likely">Likely here: ${esc(s.reasons.join('; '))}.</p>`}
        <ol class="rules mt">${DEFENSIVE(first, s).map(([t, why, say]) => `<li><b>${esc(t)}</b><p>${esc(why)}</p><p class="say">${esc(say)}</p></li>`).join('')}</ol></div>
    </div>
    <div class="grid g2 mt">
      <div class="card" id="fbCriticism"><h2 class="s">Delivering criticism</h2>
        <ol class="rules">${CRITICISM.map(([t, why], i) => `<li><b>${esc(t)}</b><p>${esc(why)}${i === 2 ? ` <span class="${s.fewCheckins ? 'bad-t' : 'ok-t'}">${esc(first)}: ${s.cis.length} of ${s.expected} check-ins.</span>` : ''}${i === 4 && flags.length ? ' <span class="bad-t">Your ratings carry a flag (see above).</span>' : ''}</p></li>`).join('')}</ol>
        <h3 class="h4 mt2"><label for="critText">Try the sentence you plan to say</label></h3>
        <textarea class="inp crit" id="critText" rows="3">${esc(draft)}</textarea>
        <ul class="critcheck mt" id="critCheck" aria-live="polite"></ul></div>
      <div class="card" id="fbResearch"><h2 class="s">What the research says</h2>
        <ul class="research">
          <li><b>People want corrective feedback.</b> In Zenger & Folkman's 2014 survey (about 2,700 people, reported in HBR), 57% preferred corrective feedback to praise, 72% said their performance would improve if their manager gave it, and 92% agreed that negative feedback, delivered appropriately, improves performance.</li>
          <li><b>Managers avoid giving it.</b> The same research found leaders about twice as likely to give positive feedback as corrective feedback, while 94% of people said corrective feedback helps when it is presented well.</li>
          <li><b>How Folkman says to give it.</b> Signal the tone at once; describe the behaviour briefly, ask for their view, then describe the change you want; one or two issues per talk; rehearse the serious ones; ask rather than tell.</li>
          <li><b>What not to do.</b> Don't bundle a backlog of grievances, play down a serious issue, deliver it coldly, or keep putting the talk off.</li>
          <li><b>Mostly praise.</b> Zenger & Folkman cite Heaphy & Losada: the best-performing teams made about 5.6 positive comments for every negative one (1.9 for medium teams, 0.36 for the weakest). The maths behind that model was later challenged (Brown, Sokal & Friedman, 2013), so read 5.6 as a pattern, not a rule. ${esc(first)} received ${s.kudos.length} kud${s.kudos.length === 1 ? 'o' : 'os'} this year.</li>
          <li><b>Keep the rating and the development talk apart.</b> Meyer, Kay & French (1965): criticism in the rating talk made people defensive and blocked improvement, so PRISM books the development talk ${esc(ctx.rules.built70.split_conversation_min_weeks)}+ weeks later.</li>
        </ul>
        <p class="small muted mt">Sources: J. Zenger & J. Folkman, "Your Employees Want the Negative Feedback You Hate to Give" (HBR, Jan 2014), "The Ideal Praise-to-Criticism Ratio" (HBR, Mar 2013) and "Feedback: The Powerful Paradox" (white paper); M. Losada & E. Heaphy (2004); G. Dessler, <i>Human Resource Management</i> (Pearson), appraisal-interview checklist, defensive employees and criticism; H. Meyer, E. Kay & J. French, HBR 1965.</p></div>
    </div>`;
}

export function feedbackMount(root, ctx, r) {
  const id = r.emp.emp_id;
  const store = () => { ctx.state.talk ||= {}; return (ctx.state.talk[id] ||= {}); };
  const boxes = [...root.querySelectorAll('#fbChecklist [data-ck]')];
  const sync = () => {
    const ticks = boxes.map((b) => b.checked);
    store().checks = ticks;
    boxes.forEach((b) => b.closest('li').classList.toggle('on', b.checked));
    const n = ticks.filter(Boolean).length;
    root.querySelector('#ckCount b').textContent = n;
    root.querySelector('.ck-bar i').style.width = `${(n / CHECKLIST.length) * 100}%`;
    ctx.markDirty();
    if (n === CHECKLIST.length) UI.toast(`Checklist complete for <b>${esc(r.emp.name)}</b>. Book the development talk next.`);
  };
  boxes.forEach((b) => b.addEventListener('change', sync));
  root.querySelector('#ckClear')?.addEventListener('click', () => { boxes.forEach((b) => { b.checked = false; }); sync(); });
  root.querySelectorAll('[data-kpirole]').forEach((b) => b.addEventListener('click', () => { ctx.state.sel.role = b.dataset.kpirole; ctx.go('kpis'); }));
  const ta = root.querySelector('#critText'), out = root.querySelector('#critCheck');
  if (!ta || !out) return;
  const paint = () => {
    out.innerHTML = checkPhrase(ta.value).map(([rule, ok, msg]) => `<li class="${ok ? 'ok' : 'no'}"><span class="rn">${rule === 'F' ? 'Folkman' : `Rule ${rule}`}</span>${ok ? '✓' : '!'} ${esc(msg)}</li>`).join('');
  };
  let t = 0;
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { paint(); store().draft = ta.value; ctx.markDirty(); }, 180); });
  ctx.onCleanup(() => clearTimeout(t));
  paint();
}
