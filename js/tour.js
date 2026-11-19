// Guided tour ("Story mode", v0.4 §14): nine steps through the VoltBridge personas, a spotlight and a narrator card.
import { esc, gsap, RM, volty, avatar, toast, closeDrawer } from './ui.js';

const P = (ctx, key) => ctx.out.personas.find((p) => p.key === key)?.emp_id;
const STEPS = [
  { route: 'dna', target: '#dnaSliders', title: 'Vision sets the pace', who: null,
    text: 'VoltBridge sells EVs in a price war, so its Pace is 9: "cutthroat". Drag Pace down to 4 and watch the PMS personality re-tune: review rhythm, improvement-plan length and reward tiers all change.',
    why: 'Pace ≥ 8 means monthly check-ins, quarterly reviews, sharper 15/75/10 reward tiers and shorter PIPs. The PMS follows the strategy, not habit.' },
  { route: 'jobs', before: (c) => { c.state.sel.role = 'ASM'; }, target: '#jdFlip', who: 'ritu', title: "Ritu's job, on one card",
    text: 'Ritu Deshmukh leads an assembly line in Pune. Her JD comes from observation, time study and critical incidents. Flip the card: her scorecard carries a high-voltage safety gate, and her role gets a traditional-heavy appraisal blend.',
    why: 'Standardised, safety-critical work is judged best against clear standards (checklist, BARS, KPI scorecard). A gate makes safety non-negotiable: fail it and the rating is capped at 2.' },
  { route: 'forge', before: (c) => { c.state.sel.person = P(c, 'zhang'); c.state.forgeAutoplay = true; }, target: '#helix', who: 'zhang', title: 'Zhang Wei: 0.7 is a win',
    text: 'Zhang hit 0.7 on stretch OKRs, which counts as success. He is a first-time team lead on a stretch assignment, so the shield keeps him out of ranking. Watch his year build the helix: each stamp is an experience with a reflection and a feedback source.',
    why: 'Arvey et al. (2006): about 30% of the variance in leadership role occupancy was genetic. PRISM never measures that part. It is built to grow the other 70%.' },
  { route: 'ranking', before: (c) => { c.state.sel.pool = 'SAL|IN'; }, target: '#lbCard', who: 'arjun', title: 'Arjun leads. Karan is capped.',
    text: 'Sales India is a large pool of measurable, individual work, so forced tiers are allowed, for the bonus only. Arjun tops it and earns the Club trip. Karan is #2 on units but failed the fair-selling gate: no top tier, rating capped at 2.',
    why: 'How matters as much as what. The gate is checked before anyone is ranked.' },
  { route: 'ranking', before: (c) => { c.state.sel.pool = 'CSA|CN'; }, target: '#tree', who: 'wang', title: "Wang Fang's pool is too small",
    text: 'Customer Support in Shenzhen has 8 people. The engine refuses to rank them: in a pool this small, one bad month would decide a tier. They are judged against absolute standards instead.',
    why: 'Fewer than 20 comparable people → absolute standards. Fewer than 30 → calibration without quotas.' },
  { route: 'lens', before: (c) => { c.state.sel.person = P(c, 'chen'); c.state.sel.lensMode = 'compare'; }, target: '.dark-card', who: 'chen', title: 'Chen Jing, two rulebooks',
    text: 'Chen is in the bottom 10% of the China sales pool. Flip the card: in China the next step is training or reassignment, because a low rank alone is not a lawful exit ground. In India the same data leads to a documented PIP.',
    why: 'China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18. Try the IN / CN buttons in the top bar: the whole app re-runs under that country.' },
  { route: 'review', before: (c) => { c.state.sel.reviewTab = 'calib'; c.state.sel.calibMgr = P(c, 'vikram'); }, target: '#calibCard', who: 'vikram', title: 'Vikram rates everyone 4.6',
    text: "Vikram Rao's 24-person team averages 4.65 against a company average of 3.16: a leniency flag. Press \"Calibrate to evidence\" and watch the cards move to what the data supports, then drag any card yourself.",
    why: "Calibration is where the manager's view and the evidence meet. His \"leaders built\" score is low too, so the Consultant flags his team." },
  { route: 'rewards', before: (c) => { c.state.sel.person = P(c, 'arjun'); c.state.autoRelease = true; }, target: '#jar', who: 'arjun', title: 'Rewards: what, when, how, who',
    text: "Arjun's Q4 bonus drops into the jar. Scroll down for plant gainsharing on Ritu's line, sales tiers after the gate, the delivery planner for each country and the recognition wall.",
    why: 'India pays with the April cycle and runs a Diwali sales contest; China pays a year-end bonus before Spring Festival and praises at team level.' },
  { route: 'consultant', target: '.mat', who: null, title: "The consultant's report",
    text: 'A 12-question health check, pre-filled from the data, gives VoltBridge a maturity level and a ranked list of fixes. Below it: the bias detector, the development-room audit, a rollout plan and a risk register. Print it as a one-page report.',
    why: 'Consulting and planning on performance, in one place. Change any answer and the radar redraws.' },
];

let spot, card, i = 0, ctxRef = null, onScroll = () => {}, seq = 0;
const handler = () => onScroll();
const onKey = (e) => {
  if (!spot) return;
  if (e.key === 'Escape') close('Tour closed.');
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (!typing && e.key === 'ArrowRight') show(i + 1);
  if (!typing && e.key === 'ArrowLeft' && i > 0) show(i - 1);
};

function els() {
  if (spot) return;
  spot = document.createElement('div'); spot.className = 'tour-spot'; spot.style.opacity = '0';
  card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Guided tour');
  document.body.append(spot, card);
}
function close(msg) {
  if (!spot) return;
  gsap.to([spot, card], { opacity: 0, duration: RM ? 0 : 0.25, onComplete: () => { spot?.remove(); card?.remove(); spot = card = null; } });
  document.querySelector('#content')?.removeEventListener('scroll', handler);
  removeEventListener('resize', handler); removeEventListener('keydown', onKey);
  onScroll = () => {};
  if (msg) toast(msg, 4200);
}
function place(target, animate = true) {
  if (!spot || !card) return;
  const vw = innerWidth, vh = innerHeight, pad = 10;
  let r = target ? target.getBoundingClientRect() : null;
  if (r) {
    const top = Math.max(r.top - pad, 64), bottom = Math.min(r.bottom + pad, vh - 8);
    const box = { left: Math.max(r.left - pad, 6), top, width: Math.min(r.width + pad * 2, vw - 12), height: Math.max(40, bottom - top) };
    gsap.to(spot, { ...Object.fromEntries(Object.entries(box).map(([k, v]) => [k, `${v}px`])), opacity: 1, duration: animate && !RM ? 0.5 : 0, ease: 'power3.inOut' });
    r = box;
  } else gsap.to(spot, { left: vw / 2, top: vh / 2, width: 0, height: 0, opacity: 1, duration: RM ? 0 : 0.4 });
  const cw = Math.min(380, vw * 0.92), ch = card.offsetHeight || 300;
  let x, y;
  if (vw < 760 || !r) { x = (vw - cw) / 2; y = r ? vh - ch - 14 : (vh - ch) / 2; }
  else if (r.left + r.width + cw + 24 < vw) { x = r.left + r.width + 16; y = Math.min(Math.max(70, r.top), vh - ch - 14); }
  else if (r.left - cw - 24 > 0) { x = r.left - cw - 16; y = Math.min(Math.max(70, r.top), vh - ch - 14); }
  else if (r.top + r.height + ch + 20 < vh) { x = Math.min(vw - cw - 14, Math.max(14, r.left)); y = r.top + r.height + 12; }
  else if (r.top - ch - 12 > 64) { x = Math.min(vw - cw - 14, Math.max(14, r.left)); y = r.top - ch - 12; }
  else { x = vw - cw - 18; y = vh - ch - 18; }
  gsap.to(card, { left: x, top: y, duration: animate && !RM ? 0.45 : 0, ease: 'power3.out' });
}
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
async function find(sel) {
  for (let k = 0; k < 40; k++) { const e = document.querySelector(`#page ${sel}`); if (e) return e; await wait(60); }
  return null;
}

async function show(n) {
  const ctx = ctxRef, token = ++seq;
  i = n;
  if (n >= STEPS.length) return final();
  const s = STEPS[n];
  closeDrawer();
  s.before?.(ctx);
  ctx.go(s.route);
  await wait(RM ? 80 : 520);
  if (token !== seq || !card) return;
  const t = await find(s.target);
  if (token !== seq || !card) return;
  if (t) t.scrollIntoView({ block: t.offsetHeight > innerHeight * 0.7 ? 'start' : 'center', behavior: 'auto' });
  await wait(80);
  const who = s.who ? ctx.row(P(ctx, s.who)) : null;
  card.innerHTML = `<div class="who">${who ? avatar(who.emp.name) : volty('happy')}<div><div class="step">Step ${n + 1} of ${STEPS.length}</div><h5>${esc(s.title)}</h5></div></div>
    <p>${esc(s.text)}</p><div class="why-tip" hidden>${esc(s.why)}</div>
    <div class="tdots">${STEPS.map((_, k) => `<i class="${k === n ? 'on' : k < n ? 'done' : ''}"></i>`).join('')}</div>
    <div class="row between"><div class="row" style="gap:6px"><button class="btn light sm" data-a="back" ${n ? '' : 'disabled'}>←</button><button class="btn light sm" data-a="why">Why?</button></div>
    <div class="row" style="gap:6px"><button class="btn ghost sm" data-a="try">Try it yourself</button><button class="btn pri sm" data-a="next">${n === STEPS.length - 1 ? 'Finish' : 'Next →'}</button></div></div>`;
  wire();
  place(t);
  if (!RM) gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
  else gsap.set(card, { opacity: 1 });
  onScroll = () => place(t, false);
}
function final() {
  if (!card) return;
  onScroll = () => {};
  gsap.to(spot, { opacity: 0.001, width: 0, height: 0, left: innerWidth / 2, top: innerHeight / 2, duration: RM ? 0 : 0.4 });
  card.innerHTML = `<div class="who">${volty('happy')}<div><div class="step">Tour complete</div><h5>One engine, one industry so far</h5></div></div>
    <p>You have seen VoltBridge's PMS from vision to payout. The same engine will produce a different PMS for pharma (Helixa, the next build): different roles, gates, ranking verdicts and country rules.</p>
    <div class="why-tip">Explore freely: every number opens a "why". The Data Hub takes your own organisation's workbook.</div>
    <div class="row between"><button class="btn light sm" data-a="home">Back to start</button><div class="row" style="gap:6px"><button class="btn light sm" data-a="data">Use my data</button><button class="btn pri sm" data-a="end">Explore freely</button></div></div>`;
  wire();
  place(null);
  if (!RM) gsap.fromTo(card, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
  const b = card.getBoundingClientRect();
  import('./ui.js').then((u) => u.confetti(b.left + b.width / 2, b.top));
}
function wire() {
  card.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'next') show(i + 1);
    else if (a === 'back') show(Math.max(0, i - 1));
    else if (a === 'why') { const w = card.querySelector('.why-tip'); w.hidden = !w.hidden; place(document.querySelector(`#page ${STEPS[i]?.target}`), false); }
    else if (a === 'try') close('Tour paused. Press <b>▶ Tour</b> in the top bar to pick up where you left off.');
    else if (a === 'end') { i = 0; close(); }
    else if (a === 'home') { i = 0; close(); ctxRef.go('home'); }
    else if (a === 'data') { i = 0; close(); ctxRef.go('data'); }
  }));
}

export function startTour(ctx) {
  ctxRef = ctx;
  const resume = spot ? i : (i > 0 && i < STEPS.length ? i : 0);
  els();
  const scroller = document.querySelector('#content');
  scroller?.removeEventListener('scroll', handler); removeEventListener('resize', handler); removeEventListener('keydown', onKey);
  scroller?.addEventListener('scroll', handler, { passive: true });
  addEventListener('resize', handler);
  addEventListener('keydown', onKey);
  show(resume);
}
