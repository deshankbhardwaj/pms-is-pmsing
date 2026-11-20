// Guided tour ("Story mode", v0.4 §14): nine steps through the VoltBridge personas, a spotlight and a narrator card.
// Steps whose persona is not in the loaded data are skipped, so the tour also runs on an uploaded organisation.
import { esc, gsap, RM, volty, avatar, toast, closeDrawer } from './ui.js';

const P = (ctx, key) => ctx.personaId(key);
const orgName = (c) => c.out.org.org_name || 'This organisation';
const STEPS = [
  { route: 'dna', target: '#dnaSliders', who: null, title: 'Vision sets the pace',
    text: (c) => {
      const p = Number(c.out.org.pace);
      const lead = c.isSampleOrg() ? `${orgName(c)} sells EVs in a price war, so its Pace is set to ${p}${p >= 8 ? ': "cutthroat"' : ''}.` : `${orgName(c)}'s Pace is ${p}.`;
      return `${lead} ${p >= 9 ? 'Move Pace down, then back up to 9,' : 'Move Pace to 9'} and watch the PMS personality re-tune: review rhythm, improvement-plan length and reward tiers all change.`;
    },
    why: 'Pace ≥ 8 means monthly check-ins, quarterly reviews, sharper 15/75/10 reward tiers and shorter PIPs. The PMS follows the strategy, not habit.' },
  { route: 'jobs', need: ['ritu'], before: (c) => { c.state.sel.role = 'ASM'; }, target: '#jdFlip', who: 'ritu', title: "Ritu's job, on one card",
    text: 'Ritu Deshmukh leads an assembly line in Pune. Her JD comes from observation, time study and critical incidents. Flip the card: her scorecard carries a high-voltage safety gate, and her role gets a traditional-heavy appraisal blend.',
    why: 'Standardised, safety-critical work is judged best against clear standards (checklist, BARS, KPI scorecard). A gate makes safety non-negotiable: fail it and the rating is capped.' },
  { route: 'forge', need: ['zhang'], before: (c) => { c.state.sel.forgePerson = P(c, 'zhang'); c.state.sel.forgeMonth = 0; c.state.forgeAutoplay = true; }, target: '#helix', who: 'zhang', title: 'Zhang Wei: 0.7 is a win',
    text: 'Zhang hit 0.7 on stretch OKRs, which counts as success. He is a first-time team lead on a stretch assignment, so the shield keeps him out of ranking. Watch his year build the helix: each stamp is an experience with a reflection and a feedback source.',
    why: 'Arvey et al. (2006): about 30% of the variance in leadership role occupancy was genetic. PRISM never measures that part. It is built to grow the other 70%.' },
  { route: 'ranking', need: ['arjun', 'karan'], before: (c) => { c.state.sel.pool = 'SAL|IN'; }, target: '#lbCard', who: 'arjun', title: 'Arjun leads. Karan is capped.',
    text: 'Sales India is a large pool of measurable, individual work, so forced tiers are allowed, for the bonus only. Arjun tops it and earns the Club trip. Karan is #2 on units but failed the fair-selling gate: no top tier, rating capped at 2.',
    why: 'How matters as much as what. The gate is checked before anyone is ranked.' },
  { route: 'ranking', need: ['wang'], before: (c) => { c.state.sel.pool = 'CSA|CN'; }, target: '#tree', who: 'wang', title: "Wang Fang's pool is too small",
    text: 'Customer Support in Shenzhen has 8 people. The engine refuses to rank them: in a pool this small, one bad month would decide a tier. They are judged against absolute standards instead.',
    why: 'Fewer than 20 comparable people → absolute standards. Fewer than 30 → calibration without quotas.' },
  { route: 'lens', need: ['chen'], before: (c) => { c.state.sel.lensPerson = P(c, 'chen'); c.state.sel.lensMode = 'compare'; }, target: '.dark-card', who: 'chen', title: 'Chen Jing, two rulebooks',
    text: 'Chen is in the bottom 10% of the China sales pool. The first line of the card is the next step: in China, training or reassignment, because a low rank alone is not a lawful exit ground. Flip the card: in India the same data leads to a documented PIP.',
    why: 'China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18. Try the IN / CN buttons in the top bar: the whole app re-runs under that country.' },
  { route: 'review', need: ['vikram'], before: (c) => { c.state.sel.reviewTab = 'calib'; c.state.sel.calibMgr = P(c, 'vikram'); }, target: '#calibCard', dock: 'left', who: 'vikram', title: 'Vikram rates everyone 4.6',
    // on a phone the five columns scroll sideways: show the 4 and 5 columns, where his team sits
    after: (t) => { const b = t.querySelector('#calib'); if (b && b.scrollWidth > b.clientWidth) b.scrollLeft = b.scrollWidth; },
    text: "Vikram Rao's 24-person team averages 4.65 against a company average of 3.16: a leniency flag. Press \"Calibrate to evidence\" and watch the cards move to what the data supports, then drag any card yourself.",
    why: "Calibration is where the manager's view and the evidence meet. His \"leaders built\" score is low too, so the Consultant flags his team." },
  { route: 'rewards', before: (c) => { const a = P(c, 'arjun'); if (a) c.state.sel.rewPerson = a; }, target: '#rwTeams', who: 'ritu', title: 'Rewards: what, when, how, who',
    text: (c) => `${P(c, 'ritu') ? "Ritu's assembly line shares its savings through plant gainsharing (never a ranking)" : 'Plant teams share their savings through gainsharing (never a ranking)'}, and sales pays its tiers only after the fair-selling gate. Scroll on for the delivery planner for each country and the recognition wall, where anyone can send kudos.`,
    why: 'India pays with the April cycle and runs a Diwali sales contest; China pays a year-end bonus before Spring Festival and praises at team level.' },
  { route: 'consultant', target: '.mat', who: null, title: "The consultant's report",
    text: (c) => `A 12-question health check, pre-filled from the data, gives ${orgName(c)} a maturity level and a ranked list of fixes. Below it: the bias detector, the development-room audit, a rollout plan and a risk register. Print it as a consultant's report.`,
    why: 'Consulting and planning on performance, in one place. Change any answer and the radar redraws.' },
];

let spot = null, card = null, blockers = [], steps = STEPS, i = 0, ctxRef = null, seq = 0, busy = false, target = null, expected = null, skipped = 0;
let onScroll = () => {};
const scroller = () => document.querySelector('#content');
const phone = () => innerWidth < 760;
const barBottom = () => Math.round(document.querySelector('.topbar')?.getBoundingClientRect().bottom || 56);   // two rows on phones
const handler = () => onScroll();
let resizeRaf = 0;
const onResize = () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => { if (!card || busy) return; if (target?.isConnected) { bringIntoView(target); place(target, false); } else place(null, false); });
};
// Navigation the tour did not start (a link, Back, a typed address) pauses it instead of leaving a stale card.
const onHash = () => { if (card && location.hash.slice(1) !== expected) pause('Tour paused because the page changed. Press <b>▶ Tour</b> to pick up where you left off.'); };
const onDrawer = () => { if (card) pause('Tour paused while you look at a profile. Press <b>▶ Tour</b> to pick up where you left off.'); };
const onKey = (e) => {
  if (!card) return;
  if (e.key === 'Escape') { e.stopPropagation(); stop('Tour closed. Press <b>▶ Tour</b> to start again.'); return; }
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (typing || busy) return;
  if (e.key === 'ArrowRight') show(i + 1);
  if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
};

function els() {
  if (card) return;
  spot = document.createElement('div'); spot.className = 'tour-spot'; spot.style.opacity = '0';
  // four clear panes around the spotlight: they stop clicks reaching the dimmed page, and a click on them pauses the tour
  blockers = [0, 1, 2, 3].map(() => { const b = document.createElement('div'); b.className = 'tour-block'; b.addEventListener('click', () => pause('Tour paused. Press <b>▶ Tour</b> to pick up where you left off.')); return b; });
  card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'tourTitle'); card.tabIndex = -1;
  document.body.append(spot, ...blockers, card);
}
function detach() {
  scroller()?.removeEventListener('scroll', handler);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey, true); removeEventListener('hashchange', onHash);
  document.removeEventListener('prism:drawer-open', onDrawer);
  onScroll = () => {};
}
// Close with local references, so a tour started again straight away gets fresh elements that nothing removes later.
function close(msg) {
  if (!card) return;
  const s = spot, c = card, bl = blockers;
  spot = card = null; blockers = []; target = null; expected = null; seq++; busy = false;
  detach();
  bl.forEach((b) => b.remove());
  gsap.killTweensOf([s, c]);
  gsap.to([s, c], { opacity: 0, duration: RM ? 0 : 0.25, onComplete: () => { s.remove(); c.remove(); } });
  if (msg) toast(msg, 4200);
}
const pause = (msg) => close(msg);                    // keeps the step: ▶ Tour resumes it
function stop(msg) { i = 0; close(msg); }             // Esc and the last card start from step 1 next time
export function closeTour() { close(); }

function setBlockers(box) {
  const vw = innerWidth, vh = innerHeight;
  const rects = box
    ? [[0, 0, vw, box.top], [0, box.top + box.height, vw, Math.max(0, vh - box.top - box.height)], [0, box.top, box.left, box.height], [box.left + box.width, box.top, Math.max(0, vw - box.left - box.width), box.height]]
    : [[0, 0, vw, vh], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  blockers.forEach((b, k) => { const [l, t, w, h] = rects[k]; Object.assign(b.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` }); });
}
// Phones: the card sits at the bottom, so the target goes just under the top bar, above the card.
function bringIntoView(t) {
  const sc = scroller();
  if (!t?.isConnected || !sc) return;
  const r = t.getBoundingClientRect();
  const top = barBottom() + 14;
  if (phone()) { sc.scrollTop += r.top - top; return; }
  const free = innerHeight - top - 8;
  sc.scrollTop += r.height > free ? r.top - top : r.top - top - (free - r.height) / 2;
}
function place(t, animate = true) {
  if (!spot || !card) return;
  const vw = innerWidth, vh = innerHeight, pad = 10, top0 = barBottom() + 4;
  const ch = card.offsetHeight || 300;
  let box = null;
  if (t?.isConnected) {
    const r = t.getBoundingClientRect();
    const limit = phone() ? vh - ch - 18 : vh - 8;      // on phones, never under the card
    const top = Math.max(r.top - pad, top0), bottom = Math.min(r.bottom + pad, limit);
    if (bottom - top > 20) box = { left: Math.max(r.left - pad, 6), top, width: Math.min(r.width + pad * 2, vw - 12), height: bottom - top };
  }
  if (box) gsap.to(spot, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, opacity: 1, duration: animate && !RM ? 0.5 : 0, ease: 'power3.inOut' });
  else gsap.to(spot, { left: vw / 2, top: vh / 2, width: 0, height: 0, opacity: 1, duration: RM ? 0 : 0.4 });
  setBlockers(box);
  const cw = card.offsetWidth || Math.min(380, vw * 0.92);
  const s = steps[i];
  let x, y;
  if (phone()) { x = (vw - cw) / 2; y = vh - ch - 10; }
  else if (!box) { x = (vw - cw) / 2; y = (vh - ch) / 2; }
  else if (s?.dock === 'left') { x = Math.max(14, box.left + 12); y = vh - ch - 14; }
  else if (box.left + box.width + cw + 24 < vw) { x = box.left + box.width + 16; y = Math.min(Math.max(70, box.top), vh - ch - 14); }
  else if (box.left - cw - 24 > 0) { x = box.left - cw - 16; y = Math.min(Math.max(70, box.top), vh - ch - 14); }
  else if (box.top + box.height + ch + 20 < vh) { x = Math.min(vw - cw - 14, Math.max(14, box.left)); y = box.top + box.height + 12; }
  else if (box.top - ch - 12 > 64) { x = Math.min(vw - cw - 14, Math.max(14, box.left)); y = box.top - ch - 12; }
  else { x = vw - cw - 18; y = vh - ch - 18; }
  gsap.to(card, { left: x, top: Math.max(8, y), duration: animate && !RM ? 0.45 : 0, ease: 'power3.out' });
}
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
async function find(sel) {
  for (let k = 0; k < 40; k++) { const e = document.querySelector(`#page ${sel}`); if (e) return e; await wait(60); }
  return null;
}
function closeMenu() {
  document.querySelector('#side')?.classList.remove('open');
  document.querySelector('#sideScrim')?.classList.remove('on');
  document.querySelector('#menuBtn')?.setAttribute('aria-expanded', 'false');
}

async function show(n) {
  const ctx = ctxRef;
  if (!card || !ctx) return;
  const token = ++seq;
  busy = true;                                          // ignore clicks and arrow keys until this step is drawn
  card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  i = Math.max(0, n);
  if (i >= steps.length) { busy = false; final(); return; }
  const s = steps[i];
  closeMenu();
  closeDrawer({ silent: true });
  s.before?.(ctx);
  expected = s.route;
  ctx.go(s.route);
  await wait(RM ? 80 : 520);
  if (token !== seq || !card) return;
  const t = await find(s.target);
  if (token !== seq || !card) return;
  target = t;
  const whoRow = s.who ? ctx.row(P(ctx, s.who)) : null;
  const text = typeof s.text === 'function' ? s.text(ctx) : s.text;
  card.classList.remove('final');
  card.innerHTML = `<div class="who">${whoRow ? avatar(whoRow.emp.name) : volty('happy')}<div><div class="step">Step ${i + 1} of ${steps.length}</div><h2 class="h5" id="tourTitle">${esc(s.title)}</h2></div></div>
    <p>${esc(text)}</p>${i === 0 && skipped ? `<p class="small muted">${skipped} ${skipped === 1 ? 'step follows a VoltBridge persona and is' : 'steps follow VoltBridge personas and are'} skipped for this organisation.</p>` : ''}<div class="why-tip" hidden>${esc(s.why)}</div>
    <div class="tdots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}</div>
    <div class="row between tour-btns"><div class="row" style="gap:6px"><button class="btn light sm" data-a="back" ${i ? '' : 'disabled'} aria-label="Previous step">←</button><button class="btn light sm" data-a="why" aria-expanded="false">Why?</button>${i ? '<button class="btn ghost sm" data-a="restart">↺ Start over</button>' : ''}</div>
    <div class="row" style="gap:6px"><button class="btn ghost sm" data-a="try">Try it yourself</button><button class="btn pri sm" data-a="next">${i === steps.length - 1 ? 'Finish' : 'Next →'}</button></div></div>`;
  wire();
  if (t) { bringIntoView(t); s.after?.(t); }
  await wait(60);
  if (token !== seq || !card) return;
  place(t);
  if (!RM) gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
  else gsap.set(card, { opacity: 1 });
  onScroll = () => place(t, false);
  card.querySelector('[data-a="next"]')?.focus({ preventScroll: true });
  busy = false;
}
function final() {
  if (!card) return;
  const ctx = ctxRef;
  onScroll = () => {};
  target = null; expected = location.hash.slice(1);
  // the page is no longer dimmed and stays usable behind the last card
  gsap.killTweensOf(spot);
  gsap.to(spot, { opacity: 0, duration: RM ? 0 : 0.35 });
  blockers.forEach((b) => Object.assign(b.style, { width: '0px', height: '0px' }));
  card.classList.add('final');
  card.innerHTML = `<div class="who">${volty('happy')}<div><div class="step">Tour complete</div><h2 class="h5" id="tourTitle">One engine, one industry so far</h2></div></div>
    <p>You have seen ${esc(orgName(ctx))}'s PMS from vision to payout. Switch the industry and the same engine produces a different PMS: different roles, gates, ranking verdicts and country rules. Pharma (Helixa) is the next build.</p>
    <div class="why-tip">Explore freely: every number opens a "why". The Data Hub takes your own organisation's workbook.</div>
    <div class="row between tour-btns"><button class="btn light sm" data-a="industry">Switch industry →</button><div class="row" style="gap:6px"><button class="btn light sm" data-a="data">Use my data</button><button class="btn pri sm" data-a="end">Explore freely</button></div></div>`;
  wire();
  gsap.killTweensOf(card);
  gsap.set(card, { left: (innerWidth - card.offsetWidth) / 2, top: Math.max(8, (innerHeight - card.offsetHeight) / 2) });
  if (!RM) gsap.fromTo(card, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
  else gsap.set(card, { opacity: 1 });
  card.querySelector('[data-a="end"]')?.focus({ preventScroll: true });
  const b = card.getBoundingClientRect();
  import('./ui.js').then((u) => u.confetti?.(b.left + b.width / 2, b.top));
}
function wire() {
  card.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    if (busy) return;                                   // a double-click must not skip a step
    const a = b.dataset.a;
    if (a === 'next') show(i + 1);
    else if (a === 'back') show(Math.max(0, i - 1));
    else if (a === 'restart') show(0);
    else if (a === 'why') { const w = card.querySelector('.why-tip'); w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); place(target, false); }
    else if (a === 'try') pause('Tour paused. Press <b>▶ Tour</b> in the top bar to pick up where you left off.');
    else if (a === 'end') stop();
    else if (a === 'industry') { const c = ctxRef; stop(); c.go('home'); setTimeout(() => document.querySelector('#lensPick')?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' }), RM ? 0 : 500); }
    else if (a === 'data') { const c = ctxRef; stop(); c.go('data'); }
  }));
}

export function startTour(ctx) {
  ctxRef = ctx;
  steps = STEPS.filter((s) => !s.need || s.need.every((k) => P(ctx, k)));
  skipped = STEPS.length - steps.length;
  const resume = card ? i : (i > 0 && i < steps.length ? i : 0);
  els();
  detach();
  scroller()?.addEventListener('scroll', handler, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey, true);
  addEventListener('hashchange', onHash);
  document.addEventListener('prism:drawer-open', onDrawer);
  show(resume);
}
