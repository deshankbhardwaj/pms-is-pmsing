// M0 Landing: the prism (central PMS) shatters into the modules (spec v0.4 §13.2, prototype v0.3).
import { RM, gsap, esc } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export const LANDING_CARDS = [
  ['01', 'Strategy DNA', 'Vision and pace set every default.', '#ff5a5f', 'dna'],
  ['02', 'Job Architecture', 'Job analysis → JD → KPIs.', '#ff9f43', 'jobs'],
  ['03', 'KPI & OKR Library', 'Weights, targets and gates.', '#e0a800', 'kpis'],
  ['04', 'Method Mixer', 'Traditional ↔ contemporary, per role.', '#1dd1a1', 'methods'],
  ['05', 'Ranking Engine', 'Forced ranking only where it is fair.', '#20b8e0', 'ranking'],
  ['06', 'Review & Delivery', 'Check-ins, calibration, feedback.', '#5f7cff', 'review'],
  ['07', 'Rewards', 'What, when, how and who.', '#a55eea', 'rewards'],
  ['08', 'Leadership Forge', 'Born 30 · Built 70.', '#8b5cf6', 'forge'],
];
const INDUSTRIES = [
  ['ev-auto', 'EV / automotive', 'VoltBridge · fully built', true],
  ['pharma', 'Pharmaceuticals', 'Helixa · next build', false],
  ['it', 'IT services', 'Preset · coming', false],
  ['fmcg', 'FMCG', 'Preset · coming', false],
  ['bfsi', 'BFSI', 'Preset · coming', false],
  ['qcom', 'Quick commerce', 'Preset · coming', false],
  ['health', 'Healthcare', 'Preset · coming', false],
  ['psu', 'Public sector', 'Preset · coming', false],
];

export function initLanding(go) {
  const rnd = mulberry(42);
  const spectrumG = document.getElementById('spectrum'), labelsG = document.getElementById('labels'), shardsG = document.getElementById('shards');
  const COLORS = ['#ff5a5f', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#5f7cff', '#a55eea'];
  const STAGES = ['Plan', 'Coach', 'Assess', 'Review', 'Reward', 'Develop', 'Renew'];
  const ox = 665, oy = 322;
  const labels = COLORS.map((c, k) => {
    const ty = 230 + k * 55, tx = 1240;
    el('line', { x1: ox, y1: oy, x2: tx, y2: ty, stroke: c, 'stroke-width': 10, opacity: 0.28, filter: 'url(#soft)', class: 'draw' }, spectrumG);
    el('line', { x1: ox, y1: oy, x2: tx, y2: ty, stroke: c, 'stroke-width': 3.5, class: 'draw beam' }, spectrumG);
    const t = el('text', { fill: c, 'font-weight': 800, 'letter-spacing': '2', 'font-family': 'Manrope, system-ui, sans-serif' }, labelsG);
    t.textContent = STAGES[k].toUpperCase();
    return { t, tx, ty };
  });
  // On tablets and phones the scene is narrower (see main.css), so the labels sit nearer the prism and are drawn larger.
  const narrow = matchMedia('(max-width: 900px)');
  const placeLabels = () => {
    const [f, size] = narrow.matches ? [0.6, innerWidth < 500 ? 28 : 22] : [0.74, 16];
    labels.forEach(({ t, tx, ty }) => { t.setAttribute('x', ox + (tx - ox) * f); t.setAttribute('y', oy + (ty - oy) * f - 10); t.setAttribute('font-size', size); });
  };
  placeLabels();
  narrow.addEventListener?.('change', placeLabels);
  const P = { A: [600, 210], B: [470, 435], C: [730, 435], M1: [535, 322.5], M2: [665, 322.5], M3: [600, 435], P1: [600, 300], P2: [545, 380], P3: [655, 380], P4: [600, 410] };
  const TRIS = [['A', 'M1', 'P1'], ['A', 'P1', 'M2'], ['M1', 'P2', 'P1'], ['P1', 'P3', 'M2'], ['P1', 'P2', 'P4'], ['P1', 'P4', 'P3'], ['M1', 'B', 'P2'], ['B', 'M3', 'P2'], ['P2', 'M3', 'P4'], ['M2', 'P3', 'C'], ['P3', 'M3', 'C'], ['P3', 'P4', 'M3']];
  const vec = [];
  const shards = TRIS.map((t) => {
    const cx = (P[t[0]][0] + P[t[1]][0] + P[t[2]][0]) / 3, cy = (P[t[0]][1] + P[t[1]][1] + P[t[2]][1]) / 3;
    const dx = cx - 600, dy = cy - 345, len = Math.hypot(dx, dy) || 1, dist = 420 + rnd() * 420;
    vec.push({ x: dx / len * dist, y: dy / len * dist + 80, r: (rnd() * 2 - 1) * 260, s: 0.25 + rnd() * 0.4 });
    return el('polygon', { points: t.map((k) => P[k].join(',')).join(' '), fill: 'url(#glass)', stroke: '#fff', 'stroke-opacity': 0, 'stroke-width': 1.3, 'stroke-linejoin': 'round' }, shardsG);
  });
  document.querySelectorAll('#scene .draw').forEach((l) => {
    const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
    l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
  });

  const box = document.getElementById('lcards');
  box.innerHTML = LANDING_CARDS.map((m, i) => `<button class="l-card${i === 7 ? ' hl' : ''}" style="--c:${m[3]}" data-go="${m[4]}"><div class="n">${m[0]}</div><h3>${esc(m[1])}</h3><p>${esc(m[2])}</p></button>`).join('');
  const cards = [...box.children];
  const wrapEl = document.querySelector('.cards-wrap');
  const centerOffset = (c) => {
    let x = c.offsetLeft + c.offsetWidth / 2, y = c.offsetTop + c.offsetHeight / 2, p = c.offsetParent;
    while (p && p !== wrapEl) { x += p.offsetLeft; y += p.offsetTop; p = p.offsetParent; }
    return { x: wrapEl.clientWidth / 2 - x, y: wrapEl.clientHeight / 2 - y };
  };
  document.getElementById('lensPick').innerHTML = INDUSTRIES.map((i) => `<button class="${i[3] ? 'on' : ''}" ${i[3] ? 'data-go="overview"' : 'disabled'}><b>${i[3] ? '★ ' : ''}${esc(i[1])}</b><small>${esc(i[2])}</small></button>`).join('');
  document.querySelectorAll('#landing [data-go]').forEach((b) => b.addEventListener('click', (e) => go(b.dataset.go, e)));

  // scramble title
  const title = document.getElementById('title');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+<>/', start = performance.now();
  const f = (now) => {
    const p = Math.min(1, (now - start) / 1300); let out = '';
    for (let i = 0; i < 5; i++) out += (p * 5 * 1.3 - i * 0.3 > 1) ? 'PRISM'[i] : chars[Math.floor(Math.random() * chars.length)];
    title.textContent = out; if (p < 1) requestAnimationFrame(f); else title.textContent = 'PRISM';
  };

  gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  // Past the hero, the fixed header gets a solid bar, so "PRISM" and the fictional-data label never print over the text below.
  // Created after the pinned hero (below), so its start accounts for the pin's extra scroll length.
  const solidHeader = () => window.ScrollTrigger?.create({ trigger: '.l-below', start: 'top 64px', toggleClass: { targets: '.l-top', className: 'solid' } });
  if (RM) {
    solidHeader();
    gsap.set(['#scene', '.hero-title', '.scroll-hint', '.glow'], { display: 'none' });
    gsap.set('.stage', { backgroundColor: '#f4f1ea' });
    gsap.set([...cards, '.cards-head', '#lcta'], { autoAlpha: 1 });
    return;
  }
  requestAnimationFrame(f);
  const intro = gsap.timeline({ delay: 0.15 });
  intro.from('.glow', { opacity: 0, duration: 1.4 }, 0)
    .to('#beamIn .draw', { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0.2)
    .from('#prism', { scale: 0.6, opacity: 0, transformOrigin: '50% 60%', duration: 1, ease: 'expo.out' }, 0.55)
    .to('#spectrum .draw', { strokeDashoffset: 0, duration: 1, ease: 'power3.out', stagger: 0.05 }, 1.0)
    .from('#labels text', { opacity: 0, x: -14, duration: 0.6, stagger: 0.06 }, 1.35)
    .from('.hero-title p', { opacity: 0, y: 10, duration: 0.8 }, 1.2)
    .from('.sh-in', { opacity: 0, duration: 0.8 }, 1.8);   // the inner part: the scroll timeline owns .scroll-hint itself
  gsap.to('#spectrum .beam', { opacity: 0.55, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: { each: 0.25, repeat: -1, yoyo: true }, delay: 2.4 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=2200', scrub: 0.8, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
  tl.to('.hero-title', { y: -90, opacity: 0, duration: 0.16 }, 0)
    .to('.scroll-hint', { autoAlpha: 0, duration: 0.05 }, 0)
    .to(shards, { attr: { 'stroke-opacity': 0.9 }, duration: 0.1, stagger: 0.008 }, 0.1)
    .to('#outline', { attr: { 'stroke-opacity': 0.25 }, duration: 0.08 }, 0.16)
    .to('#prism', { keyframes: { x: [0, -7, 6, -5, 4, -2, 0] }, duration: 0.14, ease: 'none' }, 0.18)
    .fromTo('#flash', { attr: { r: 10 }, opacity: 0 }, { attr: { r: 190 }, opacity: 0.9, duration: 0.04, ease: 'power2.out' }, 0.3)
    .to('#flash', { opacity: 0, duration: 0.08 }, 0.34)
    .to(['#beamIn', '#spectrum', '#labels', '#outline', '#inner'], { opacity: 0, duration: 0.1 }, 0.3)
    .to(shards, { x: (i) => vec[i].x, y: (i) => vec[i].y, rotation: (i) => vec[i].r, scale: (i) => vec[i].s, opacity: 0, transformOrigin: '50% 50%', duration: 0.32, ease: 'power2.out' }, 0.31)
    .to(shards, { attr: { stroke: '#8b5cf6' }, duration: 0.04 }, 0.36)
    .fromTo('#flood', { attr: { r: 0 } }, { attr: { r: 1500 }, duration: 0.16, ease: 'power2.in' }, 0.33)
    .to('.glow', { opacity: 0, duration: 0.1 }, 0.32)
    .set('.stage', { backgroundColor: '#f4f1ea' }, 0.49)
    // autoAlpha, not opacity: until they appear the cards and buttons are hidden, so they can't be clicked or tabbed to
    .fromTo(cards, { x: (i, c) => centerOffset(c).x, y: (i, c) => centerOffset(c).y, scale: 0.15, rotation: () => (rnd() * 2 - 1) * 35, autoAlpha: 0 },
      { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.4, stagger: 0.035, ease: 'power3.out' }, 0.48)
    .fromTo('.cards-head', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.18 }, 0.74)
    .fromTo('#lcta', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.16 }, 0.82)
    .to({}, { duration: 0.12 });
  solidHeader();
  gsap.set(cards, { transformPerspective: 800 });
  cards.forEach((c) => {
    const rx = gsap.quickTo(c, 'rotationX', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: 0.45, ease: 'power3' });
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); rx(-((e.clientY - r.top) / r.height - 0.5) * 12); ry(((e.clientX - r.left) / r.width - 0.5) * 14); });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}
