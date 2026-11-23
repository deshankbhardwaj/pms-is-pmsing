// Guided tour ("Story mode", v0.5 §14): a welcome card and ten stops that follow the performance cycle
// (plan → assess → review → reward → develop → country → renew) through the VoltBridge personas.
// Steps whose persona is not in the loaded data are skipped, so the tour also runs on an uploaded organisation.
//
// Motion: between stops the narrator card fades, the spotlight closes like an iris, the next screen loads under
// the dim, the page glides (never jumps) to the next highlight, and the iris opens onto it. Stops on the same
// screen skip the iris: the spotlight follows the content as it glides. Nothing blocks scrolling: the wheel,
// trackpad and touch scroll the page at any time and the spotlight follows. A click on the dimmed page pauses.
import { esc, gsap, RM, volty, avatar, toast, closeDrawer, fmt } from './ui.js';
import { signals } from './feedback.js';

const P = (ctx, key) => ctx.personaId(key);
const orgName = (c) => c.out.org.org_name || 'This organisation';
const short = (n) => String(n || '').replace(/\s*\([^)]*\)\s*$/, '');
const STEPS = [
  { id: 'welcome', route: null, target: null, chapter: 'Welcome', title: () => (real() >= 8 ? 'A three-minute tour of PRISM' : 'A quick tour of PRISM'),
    text: (c) => `${c.isSampleOrg() ? `You will follow ${orgName(c)}, a fictional EV maker with people in Pune and Shenzhen,` : `You will follow ${orgName(c)}`} once around the performance cycle: plan, assess, review, reward, develop. Scroll freely at any stop, press "Try it yourself" to explore a screen, or Esc to stop.`,
    why: 'Every number on every screen comes from one engine run on the loaded data. Change a rule anywhere and the whole app re-runs.' },
  { route: 'dna', target: '#dnaSliders', chapter: 'Plan', title: 'Vision sets the pace',
    text: (c) => {
      const p = Number(c.out.org.pace);
      const lead = c.isSampleOrg() ? `${orgName(c)} sells EVs in a price war, so its Pace is set to ${p}${p >= 8 ? ': "cutthroat"' : ''}.` : `${orgName(c)}'s Pace is ${p}.`;
      return `${lead} ${p >= 9 ? 'Move Pace down, then back up to 9,' : 'Move Pace to 9'} and watch the "What changed" panel: review rhythm, improvement-plan length and reward tiers all re-tune.`;
    },
    why: 'Pace ≥ 8 means monthly check-ins, quarterly reviews, sharper 15/75/10 reward tiers and shorter PIPs. The PMS follows the strategy, not habit.' },
  { route: 'jobs', need: ['ritu'], before: (c) => { c.state.sel.role = 'ASM'; }, target: '#jdFlip', who: 'ritu', chapter: 'Plan', title: "Ritu's job, on one card",
    text: 'Ritu Deshmukh leads an assembly line in Pune. Her JD comes from observation, time study and critical incidents. Flip the card: her scorecard carries a high-voltage safety gate, and her role gets a traditional-heavy appraisal blend.',
    why: 'Standardised, safety-critical work is judged best against clear standards (checklist, BARS, KPI scorecard). A gate makes safety non-negotiable: fail it and the rating is capped.' },
  { route: 'ranking', need: ['arjun', 'karan'], before: (c) => { c.state.sel.pool = 'SAL|IN'; }, target: '#lbCard', who: 'arjun', chapter: 'Assess', title: 'Arjun leads. Karan is capped.',
    text: 'Sales India is a large pool of measurable, individual work, so forced tiers are allowed, for the bonus only. Arjun tops it and earns the Club trip. Karan is #2 on units but failed the fair-selling gate: no top tier, rating capped at 2. Remember Karan: his review is three stops away.',
    why: 'How matters as much as what. The gate is checked before anyone is ranked.' },
  { route: 'ranking', need: ['wang'], before: (c) => { c.state.sel.pool = 'CSA|CN'; }, target: '#tree', who: 'wang', chapter: 'Assess', title: "Wang Fang's pool is too small",
    text: 'Same screen, another pool. Customer Support in Shenzhen has 8 people, so the engine refuses to rank them: in a pool this small, one bad month would decide a tier. They are judged against absolute standards instead.',
    why: 'Fewer than 20 comparable people → absolute standards. Fewer than 30 → calibration without quotas.' },
  { route: 'review', need: ['vikram'], before: (c) => { c.state.sel.reviewTab = 'calib'; c.state.sel.calibMgr = P(c, 'vikram'); }, target: '#calibCard', dock: 'left', who: 'vikram', chapter: 'Review', title: 'Vikram rates everyone 4.6',
    // on a phone the five columns scroll sideways: show the 4 and 5 columns, where his team sits
    after: (t) => { const b = t.querySelector('#calib'); if (b && b.scrollWidth > b.clientWidth) b.scrollLeft = b.scrollWidth; },
    text: "Vikram Rao's 24-person team averages 4.65 against a company average of 3.16: a leniency flag. Press \"Calibrate to evidence\" and watch the cards move to what the data supports, then drag any card yourself.",
    why: "Calibration is where the manager's view and the evidence meet. His \"leaders built\" score is low too, so the Consultant flags his team." },
  { route: 'review', need: ['karan'], before: (c) => { c.state.sel.reviewTab = 'talk'; c.state.sel.talkPerson = P(c, 'karan'); }, target: '.fb-before', who: 'karan', chapter: 'Review', title: "Karan's review, without surprises",
    text: (c) => {
      const r = c.row(P(c, 'karan'));
      const s = r ? signals(c, r) : null;
      const gap = s && s.mgr !== null ? ` His manager's 360 scores average ${fmt(s.mgr, 1)}, but the evidence rating is ${s.rating}${s.gate ? ` because the ${short(s.gate.name).toLowerCase()} gate failed` : ''}.` : '';
      return `Back to Karan, now in his review meeting.${gap} PRISM flags that before the meeting, fills the nine-point appraisal-interview checklist from his data and lists the four rules for a defensive employee. Scroll on: the criticism checker tests the sentence you plan to say.`;
    },
    why: 'Dessler\'s appraisal-interview checklist and his rules for defensive employees and for criticism, with Zenger & Folkman\'s research: 57% of people prefer corrective feedback, and 92% say it improves performance when it is delivered well.' },
  { route: 'rewards', before: (c) => { const a = P(c, 'arjun'); if (a) c.state.sel.rewPerson = a; }, target: '#rwTeams', who: 'ritu', chapter: 'Reward', title: 'Rewards: what, when, how, who',
    text: (c) => `${P(c, 'ritu') ? "Ritu's assembly line shares its savings through plant gainsharing (never a ranking)" : 'Plant teams share their savings through gainsharing (never a ranking)'}, and sales pays its tiers only after the fair-selling gate. Scroll on for the delivery planner for each country and the recognition wall, where anyone can send kudos.`,
    why: 'India pays with the April cycle and runs a Diwali sales contest; China pays a year-end bonus before Spring Festival and praises at team level.' },
  { route: 'forge', need: ['zhang'], before: (c) => { c.state.sel.forgePerson = P(c, 'zhang'); c.state.sel.forgeMonth = 0; c.state.forgeAutoplay = true; }, target: '#helix', who: 'zhang', chapter: 'Develop', title: 'Zhang Wei: 0.7 is a win',
    text: 'Zhang hit 0.7 on stretch OKRs, which counts as success. He is a first-time team lead on a stretch assignment, so the shield keeps him out of ranking. Watch his year build the helix: each stamp is an experience with a reflection and a feedback source.',
    why: 'Arvey et al. (2006): about 30% of the variance in leadership role occupancy was genetic. PRISM never measures that part. It is built to grow the other 70%.' },
  { route: 'lens', need: ['chen'], before: (c) => { c.state.sel.lensPerson = P(c, 'chen'); c.state.sel.lensMode = 'compare'; }, target: '.dark-card', who: 'chen', chapter: 'Country', title: 'Chen Jing, two rulebooks',
    text: 'Chen is in the bottom 10% of the China sales pool. The first line of the card is the next step: in China, training or reassignment, because a low rank alone is not a lawful exit ground. Flip the card: in India the same data leads to a documented PIP.',
    why: 'China: Labour Contract Law Art. 40(2) and SPC Guiding Case No. 18. Try the IN / CN buttons in the top bar: the whole app re-runs under that country.' },
  { route: 'consultant', target: '.mat', chapter: 'Renew', title: "The consultant's report",
    text: (c) => `Last stop. A 12-question health check, pre-filled from the data, gives ${orgName(c)} a maturity level and a ranked list of fixes. Below it: the bias detector, the development-room audit, a rollout plan and a risk register. Print it as a consultant's report.`,
    why: 'Consulting and planning on performance, in one place. Change any answer and the radar redraws.' },
];

let spot = null, card = null, steps = STEPS, i = 0, ctxRef = null, seq = 0, busy = false, target = null, expected = null, skipped = 0, box = null, gliding = false;
// Where the card sits for this stop: beside the highlight, under it, docked at the bottom (the spotlight stops above
// the card: phones, and wide targets too tall to leave room), or docked inside it at the left (calibration board).
let mode = 'beside';
const scroller = () => document.querySelector('#content');
const phone = () => innerWidth < 760;
const barBottom = () => Math.round(document.querySelector('.topbar')?.getBoundingClientRect().bottom || 56);   // two rows on phones
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const tween = (el, vars) => new Promise((res) => { if (!el) { res(); return; } gsap.to(el, { ...vars, duration: RM ? 0 : vars.duration, onComplete: res, onInterrupt: res }); });
const real = () => steps.filter((s) => s.id !== 'welcome').length;
const num = (k) => steps.slice(0, k + 1).filter((s) => s.id !== 'welcome').length;

/* ---------------- listeners ---------------- */
let rafScroll = 0, rafResize = 0;
const onScroll = () => {
  if (!card || gliding) return;                         // the tour's own glide moves the spotlight itself
  cancelAnimationFrame(rafScroll);
  rafScroll = requestAnimationFrame(() => follow(false));
};
const onResize = () => {
  cancelAnimationFrame(rafResize);
  rafResize = requestAnimationFrame(() => { if (!card || busy) return; if (target) mode = pickMode(target, steps[i]); follow(false); placeCard(box, false); });
};
// Navigation the tour did not start (a link, Back, a typed address) pauses it instead of leaving a stale card.
const onHash = () => { if (card && location.hash.slice(1) !== expected) pause('Tour paused because the page changed. Press <b>▶ Tour</b> to pick up where you left off.'); };
const onDrawer = () => { if (card) pause('Tour paused while you look at a profile. Press <b>▶ Tour</b> to pick up where you left off.'); };
const inSpot = (x, y) => box && x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
// Clicks on the dimmed page pause the tour; the highlighted part, the card and "What changed" stay usable.
// Scrolling is never blocked: nothing covers the page except the (click-through) spotlight.
const outside = (e) => !!card && !card.contains(e.target) && !inSpot(e.clientX, e.clientY) && !e.target.closest?.('#toast, #changes');
const onPointerDown = (e) => { if (outside(e)) e.stopPropagation(); };   // no drag can start under the dim
const onClick = (e) => {
  if (!outside(e)) return;
  e.preventDefault(); e.stopPropagation();
  pause('Tour paused. Press <b>▶ Tour</b> to pick up where you left off.');
};
const onKey = (e) => {
  if (!card) return;
  if (e.key === 'Escape') { e.stopPropagation(); stop('Tour closed. Press <b>▶ Tour</b> to start again.'); return; }
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (typing || busy) return;
  if (e.key === 'ArrowRight') show(i + 1);
  if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
};
// The card sits over the page: a wheel over it still scrolls the page (unless the card itself can scroll).
const onCardWheel = (e) => {
  const c = e.currentTarget;
  const canScroll = c.scrollHeight > c.clientHeight + 1 && ((e.deltaY > 0 && c.scrollTop + c.clientHeight < c.scrollHeight - 1) || (e.deltaY < 0 && c.scrollTop > 0));
  if (!canScroll) scroller()?.scrollBy({ top: e.deltaY, left: 0 });
};

function attach() {
  detach();
  scroller()?.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('keydown', onKey, true);
  addEventListener('hashchange', onHash);
  document.addEventListener('prism:drawer-open', onDrawer);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
  document.body.classList.add('touring');
}
function detach() {
  scroller()?.removeEventListener('scroll', onScroll);
  removeEventListener('resize', onResize); removeEventListener('keydown', onKey, true); removeEventListener('hashchange', onHash);
  document.removeEventListener('prism:drawer-open', onDrawer);
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('click', onClick, true);
  document.body.classList.remove('touring');
}

function els() {
  if (card) return;
  spot = document.createElement('div'); spot.className = 'tour-spot';
  card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'tourTitle'); card.tabIndex = -1;
  card.addEventListener('wheel', onCardWheel, { passive: true });
  document.body.append(spot, card);
  gsap.set(spot, { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0, opacity: 0 });
  gsap.set(card, { autoAlpha: 0, left: (innerWidth - Math.min(380, innerWidth * 0.92)) / 2, top: innerHeight / 2 - 120 });
  box = null; mode = 'beside';
}
// Close with local references, so a tour started again straight away gets fresh elements that nothing removes later.
function close(msg) {
  if (!card) return;
  const s = spot, c = card;
  spot = card = null; target = null; expected = null; box = null; seq++; busy = false; gliding = false;
  detach();
  gsap.killTweensOf([s, c]);
  gsap.to([s, c], { opacity: 0, duration: RM ? 0 : 0.25, onComplete: () => { s.remove(); c.remove(); } });
  if (msg) toast(msg, 4200);
}
const pause = (msg) => close(msg);                    // keeps the step: ▶ Tour resumes it
function stop(msg) { i = 0; close(msg); }             // Esc and the last card start from the welcome next time
export function closeTour() { close(); }

/* ---------------- geometry ---------------- */
// The part of the target that is on screen, between the top bar and (on phones) the docked card.
function visible(t) {
  if (!t?.isConnected) return { box: null, off: null };
  const vw = innerWidth, vh = innerHeight, pad = 10, top0 = barBottom() + 4;
  const ch = card?.offsetHeight || 300;
  const limit = mode === 'dock' ? vh - ch - 18 : vh - 8;
  const r = t.getBoundingClientRect();
  const top = Math.max(r.top - pad, top0), bottom = Math.min(r.bottom + pad, limit);
  if (bottom - top > 24) return { box: { left: Math.max(r.left - pad, 6), top, width: Math.min(r.width + pad * 2, vw - 12), height: bottom - top }, off: null };
  return { box: null, off: r.bottom < top0 ? 'above' : 'below' };
}
function setSpot(b, dur = 0) {
  if (!spot) return;
  box = b;
  const to = b ? { left: b.left, top: b.top, width: b.width, height: b.height } : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  gsap.to(spot, { ...to, opacity: 1, duration: RM ? 0 : dur, ease: 'power3.inOut', overwrite: 'auto' });
}
// Keep the spotlight on the target while the user scrolls; say where it went when it leaves the screen.
function follow(animate) {
  const v = visible(target);
  if (target) setSpot(v.box, animate ? 0.35 : 0.12);
  const back = card?.querySelector('.tour-return');
  if (back) {
    back.hidden = !target || !!v.box;
    if (v.off) back.textContent = v.off === 'above' ? '↑ Back to the highlight' : '↓ Back to the highlight';
  }
}
function placeCard(b, animate = true) {
  if (!card) return;
  const vw = innerWidth, vh = innerHeight;
  const ch = card.offsetHeight || 300, cw = card.offsetWidth || Math.min(380, vw * 0.92);
  let x, y;
  if (mode === 'dock') { x = phone() || !b ? (vw - cw) / 2 : Math.min(vw - cw - 14, Math.max(14, b.left + (b.width - cw) / 2)); y = vh - ch - 10; }
  else if (!b) { x = (vw - cw) / 2; y = (vh - ch) / 2; }
  else if (mode === 'left') { x = Math.max(14, b.left + 12); y = vh - ch - 14; }
  else if (b.left + b.width + cw + 24 < vw) { x = b.left + b.width + 16; y = Math.min(Math.max(barBottom() + 14, b.top), vh - ch - 14); }
  else if (b.left - cw - 24 > 0) { x = b.left - cw - 16; y = Math.min(Math.max(barBottom() + 14, b.top), vh - ch - 14); }
  else if (b.top + b.height + ch + 20 < vh) { x = Math.min(vw - cw - 14, Math.max(14, b.left)); y = b.top + b.height + 12; }
  else if (b.top - ch - 12 > barBottom()) { x = Math.min(vw - cw - 14, Math.max(14, b.left)); y = b.top - ch - 12; }
  else { x = vw - cw - 18; y = vh - ch - 18; }
  gsap.to(card, { left: x, top: Math.max(8, y), duration: animate && !RM ? 0.45 : 0, ease: 'power3.out', overwrite: 'auto' });
}
// Pick the card's place for a stop from the target's size, once the card holds the stop's words.
function pickMode(t, s) {
  if (phone()) return 'dock';
  if (s?.dock === 'left') return 'left';
  if (!t) return 'beside';
  const r = t.getBoundingClientRect(), cw = card?.offsetWidth || 380, ch = card?.offsetHeight || 300;
  if (r.right + cw + 34 < innerWidth || r.left - cw - 34 > 0) return 'beside';
  return r.height + 20 + ch + 24 < innerHeight - barBottom() ? 'below' : 'dock';
}
// Where the page should scroll: a target with the card beside it is centred when it fits; otherwise it goes just
// under the top bar, so the card fits underneath (or docks below the part that shows) instead of covering it.
function scrollGoal(t) {
  const sc = scroller();
  if (!t?.isConnected || !sc) return null;
  const r = t.getBoundingClientRect();
  const top = barBottom() + 14;
  let delta;
  if (mode !== 'beside') delta = r.top - top;
  else {
    const free = innerHeight - top - 8;
    delta = r.height > free ? r.top - top : r.top - top - (free - r.height) / 2;
  }
  return Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + delta));
}
// A glide, not a jump. While it runs the spotlight chases the target (stops on the same screen) or stays closed.
function glideTo(t, chase) {
  const sc = scroller(), goal = scrollGoal(t);
  if (goal === null || Math.abs(goal - sc.scrollTop) < 4) return Promise.resolve();
  const o = { y: sc.scrollTop };
  const dist = Math.abs(goal - o.y);
  gliding = true;
  return new Promise((res) => {
    gsap.to(o, {
      y: goal, duration: RM ? 0 : Math.min(0.9, 0.35 + dist / 2400), ease: 'power2.inOut',
      onUpdate: () => {
        sc.scrollTop = o.y;
        if (chase && spot) { const v = visible(t); if (v.box) { gsap.set(spot, { left: v.box.left, top: v.box.top, width: v.box.width, height: v.box.height }); box = v.box; } }
      },
      onComplete: () => { gliding = false; res(); }, onInterrupt: () => { gliding = false; res(); },
    });
  });
}
async function find(sel) {
  for (let k = 0; k < 40; k++) { const e = document.querySelector(`#page ${sel}`); if (e) return e; await wait(50); }
  return null;
}
async function pageSwap(old) {
  for (let k = 0; k < 40; k++) { const p = document.querySelector('#page'); if (p && p !== old) return p; await wait(30); }
  return document.querySelector('#page');
}
// The page's entrance motion (cards rising in) runs under the closed iris; finish it before measuring the target.
function finishEntrance(page) {
  if (!page) return;
  gsap.getTweensOf([page, ...page.querySelectorAll('.card, .ph .wi, .ph .eyebrow, .ph .sub')]).forEach((t) => t.progress(1));
}
function closeMenu() {
  document.querySelector('#side')?.classList.remove('open');
  document.querySelector('#sideScrim')?.classList.remove('on');
  document.querySelector('#menuBtn')?.setAttribute('aria-expanded', 'false');
}

/* ---------------- steps ---------------- */
function fill(s, ctx) {
  const whoRow = s.who ? ctx.row(P(ctx, s.who)) : null;
  const text = typeof s.text === 'function' ? s.text(ctx) : s.text;
  const title = typeof s.title === 'function' ? s.title(ctx) : s.title;
  const n = real(), k = num(i), welcome = s.id === 'welcome';
  card.classList.remove('final');
  card.innerHTML = `<div class="who">${whoRow ? avatar(whoRow.emp.name) : volty('happy')}<div><div class="step">${welcome ? `Welcome · ${n} stops` : `Step ${k} of ${n} · ${esc(s.chapter)}`}</div><h2 class="h5" id="tourTitle">${esc(title)}</h2></div></div>
    <p>${esc(text)}</p>${welcome && skipped ? `<p class="small muted">${skipped} ${skipped === 1 ? 'stop follows a VoltBridge persona and is' : 'stops follow VoltBridge personas and are'} skipped for this organisation.</p>` : ''}<div class="why-tip" hidden>${esc(s.why)}</div>
    <button class="tour-return" type="button" hidden>↑ Back to the highlight</button>
    ${welcome ? '' : `<div class="tdots" aria-hidden="true">${steps.filter((x) => x.id !== 'welcome').map((_, j) => `<i class="${j === k - 1 ? 'on' : j < k - 1 ? 'done' : ''}"></i>`).join('')}</div>`}
    <div class="row between tour-btns"><div class="row" style="gap:6px">${welcome ? '' : '<button class="btn light sm" data-a="back" aria-label="Previous step">←</button>'}<button class="btn light sm" data-a="why" aria-expanded="false">Why?</button>${k > 1 ? '<button class="btn ghost sm" data-a="restart">↺ Start over</button>' : ''}</div>
    <div class="row" style="gap:6px">${welcome ? '' : '<button class="btn ghost sm" data-a="try">Try it yourself</button>'}<button class="btn pri sm" data-a="next">${welcome ? 'Start the tour →' : i === steps.length - 1 ? 'Finish' : 'Next →'}</button></div></div>`;
  wire();
}

async function show(n) {
  const ctx = ctxRef;
  if (!card || !ctx) return;
  const token = ++seq;
  const live = () => token === seq && !!card;
  busy = true;
  card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  i = Math.max(0, n);
  if (i >= steps.length) { busy = false; final(); return; }
  const s = steps[i];
  closeMenu();
  closeDrawer({ silent: true });
  const here = !s.route || (ctx.state.appOpen && ctx.state.route === s.route && !!document.querySelector('#page'));
  // 1 · out: the card fades; between screens the spotlight closes like an iris
  const shown = Number(gsap.getProperty(card, 'opacity')) > 0.05;
  await Promise.all([
    shown ? tween(card, { autoAlpha: 0, y: 8, duration: 0.2, ease: 'power2.in' }) : null,
    !here && box ? tween(spot, { left: box.left + box.width / 2, top: box.top + box.height / 2, width: 0, height: 0, duration: 0.3, ease: 'power2.in' }) : null,
  ]);
  if (!live()) return;
  if (!here) box = null;
  // 2 · the screen
  s.before?.(ctx);
  if (s.route) {
    expected = s.route;
    if (here) ctx.rerender();                              // same screen: redraw in place, keep the scroll
    else {
      const old = document.querySelector('#page');
      ctx.go(s.route);
      const page = await pageSwap(old);
      await wait(RM ? 0 : 320);                            // a moment of the page arriving under the dim
      if (!live()) return;
      finishEntrance(page);
    }
  }
  if (!live()) return;
  // 3 · the target, the card's words, the glide
  const t = s.target ? await find(s.target) : null;
  if (!live()) return;
  target = t;
  fill(s, ctx);
  card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  mode = pickMode(t, s);
  if (t) { s.after?.(t); await glideTo(t, here && !!box); }
  if (!live()) return;
  // 4 · in: the iris opens on the target (or the spotlight settles on it) and the card slides in beside it
  const v = visible(t);
  if (!box && v.box) gsap.set(spot, { left: v.box.left + v.box.width / 2, top: v.box.top + v.box.height / 2, width: 0, height: 0, opacity: 1 });
  setSpot(v.box, 0.5);
  placeCard(v.box, false);
  gsap.fromTo(card, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: RM ? 0 : 0.38, delay: RM ? 0 : 0.12, ease: 'power3.out' });
  follow(false);
  card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  card.querySelector('[data-a="next"]')?.focus({ preventScroll: true });
  busy = false;
}
async function final() {
  if (!card) return;
  const ctx = ctxRef;
  const token = ++seq;
  busy = true;
  target = null; expected = location.hash.slice(1);
  await Promise.all([tween(card, { autoAlpha: 0, y: 8, duration: 0.2 }), tween(spot, { opacity: 0, duration: 0.35 })]);
  if (token !== seq || !card) return;
  box = null; mode = 'beside';                          // the page is no longer dimmed and stays usable behind the last card
  card.classList.add('final');
  card.innerHTML = `<div class="who">${volty('happy')}<div><div class="step">Tour complete</div><h2 class="h5" id="tourTitle">One engine, one industry so far</h2></div></div>
    <p>You have seen ${esc(orgName(ctx))}'s PMS from vision to payout. Switch the industry and the same engine produces a different PMS: different roles, gates, ranking verdicts and country rules. Pharma (Helixa) is the next build.</p>
    <div class="why-tip">Explore freely: every number opens a "why". The Data Hub takes your own organisation's workbook.</div>
    <div class="row between tour-btns"><button class="btn light sm" data-a="industry">Switch industry →</button><div class="row" style="gap:6px"><button class="btn light sm" data-a="data">Use my data</button><button class="btn pri sm" data-a="end">Explore freely</button></div></div>`;
  wire();
  gsap.set(card, { left: (innerWidth - card.offsetWidth) / 2, top: Math.max(8, (innerHeight - card.offsetHeight) / 2) });
  gsap.fromTo(card, { autoAlpha: 0, scale: 0.92, y: 0 }, { autoAlpha: 1, scale: 1, duration: RM ? 0 : 0.5, ease: 'back.out(1.6)' });
  card.querySelector('[data-a="end"]')?.focus({ preventScroll: true });
  busy = false;
  const b = card.getBoundingClientRect();
  import('./ui.js').then((u) => u.confetti?.(b.left + b.width / 2, b.top));
}
function wire() {
  card.querySelector('.tour-return')?.addEventListener('click', async () => { if (busy || !target) return; await glideTo(target, false); follow(true); });
  card.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
    if (busy) return;                                   // a double-click must not skip a step
    const a = b.dataset.a;
    if (a === 'next') show(i + 1);
    else if (a === 'back') show(Math.max(0, i - 1));
    else if (a === 'restart') show(steps[0]?.id === 'welcome' ? 1 : 0);
    else if (a === 'why') { const w = card.querySelector('.why-tip'); w.hidden = !w.hidden; b.setAttribute('aria-expanded', String(!w.hidden)); placeCard(box, true); }
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
  attach();
  show(resume);
}
