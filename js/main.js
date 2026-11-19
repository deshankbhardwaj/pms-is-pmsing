// PRISM app shell: boot, state, routing, country lens, person profile, tour hook.
import { runAll, loadRules } from './engine/index.js';
import * as UI from './ui.js';
import { animateCharts } from './charts.js';
import { initLanding } from './landing.js';
import { startTour } from './tour.js';
import overview from './modules/overview.js';
import dna from './modules/dna.js';
import jobs from './modules/jobs.js';
import kpis from './modules/kpis.js';
import methods from './modules/methods.js';
import ranking from './modules/ranking.js';
import review from './modules/review.js';
import rewards from './modules/rewards.js';
import develop from './modules/develop.js';
import forge from './modules/forge.js';
import consultant from './modules/consultant.js';
import lens from './modules/lens.js';
import people from './modules/people.js';
import datahub from './modules/datahub.js';
import about from './modules/about.js';

const { $, $$, gsap, RM, esc } = UI;
export const MODULES = [
  { id: 'overview', name: 'Overview', group: 'Start', n: 'M12', color: '#14151c', mod: overview },
  { id: 'dna', name: 'Strategy DNA', group: 'Set up', n: '01', color: '#ff5a5f', mod: dna },
  { id: 'jobs', name: 'Job Architecture', group: 'Set up', n: '02', color: '#ff9f43', mod: jobs },
  { id: 'kpis', name: 'KPI & OKR Library', group: 'Set up', n: '03', color: '#e0a800', mod: kpis },
  { id: 'methods', name: 'Method Mixer', group: 'Assess', n: '04', color: '#1dab84', mod: methods },
  { id: 'ranking', name: 'Ranking Engine', group: 'Assess', n: '05', color: '#20b8e0', mod: ranking },
  { id: 'review', name: 'Review & Delivery', group: 'Assess', n: '06', color: '#5f7cff', mod: review },
  { id: 'rewards', name: 'Rewards & Recognition', group: 'Grow & reward', n: '07', color: '#a55eea', mod: rewards },
  { id: 'develop', name: 'Development & Training', group: 'Grow & reward', n: '08', color: '#7c5cff', mod: develop },
  { id: 'forge', name: 'Leadership Forge', group: 'Grow & reward', n: '08b', color: '#8b5cf6', mod: forge },
  { id: 'consultant', name: 'PMS Consultant', group: 'Advise', n: '09', color: '#e0457b', mod: consultant },
  { id: 'lens', name: 'Country Lens', group: 'Advise', n: '10', color: '#e5484d', mod: lens },
  { id: 'people', name: 'People', group: 'Advise', n: '', color: '#20b8e0', mod: people },
  { id: 'data', name: 'Data Hub', group: 'Data', n: '11', color: '#14151c', mod: datahub },
  { id: 'about', name: 'About & Method', group: 'Data', n: '13', color: '#6b6f80', mod: about },
];
const byId = Object.fromEntries(MODULES.map((m) => [m.id, m]));

const state = {
  sample: null, data: null, rules: null, out: null, outs: {}, lens: 'home', org: {}, route: null,
  sel: {}, calib: {}, health: null, appOpen: false, source: 'VoltBridge sample',
  toggles: { growth: true, shield: true, pairing: true, leadersBuilt: true, wallet: true },
};

const LENS_KEYS = [['performance_year', 'Performance year'], ['review_window', 'Review window'], ['year_end_reward', 'Year-end reward'],
  ['bottom_tier_action', 'Bottom-tier action'], ['feedback_style', 'Feedback style'], ['law_in_force', 'Law in force']];

function effectiveData() {
  let d = state.data;
  if (Object.keys(state.org).length) d = { ...d, Org: [{ ...(d.Org?.[0] || {}), ...state.org }] };
  if (!state.toggles.leadersBuilt) d = { ...d, KPIs: d.KPIs.map((k) => (k.kpi_id === 'PLM-03' ? { ...k, weight_pct: 0 } : k)) };
  return d;
}
// Forge "room to grow" toggles change the rules the engine runs with (never the saved rules)
function effectiveRules() {
  const t = state.toggles, r = state.rules;
  if (t.growth && t.shield && t.pairing) return r;
  const b = structuredClone(r.built70);
  if (!t.growth) for (const k of Object.keys(b.weights)) { const w = b.weights[k]; b.weights[k] = { results: w.results + w.growth, behaviours: w.behaviours, growth: 0 }; }
  if (!t.shield) b.shield_enabled = false;
  if (!t.pairing) b.stamp_needs_feedback = false;
  return { ...r, built70: b };
}
function compute() {
  state.outs = {};
  state.out = runAll(effectiveData(), effectiveRules(), { countryOverride: state.lens === 'home' ? undefined : state.lens });
}
// Lazily computed views under a fixed lens (for side-by-side comparisons)
function outFor(lensCode) {
  if (lensCode === (state.lens === 'home' ? 'home' : state.lens)) return state.out;
  if (!state.outs[lensCode]) state.outs[lensCode] = runAll(effectiveData(), effectiveRules(), { countryOverride: lensCode === 'home' ? undefined : lensCode });
  return state.outs[lensCode];
}

const ctx = {
  state, UI, MODULES,
  get out() { return state.out; },
  get data() { return state.data; },
  get rules() { return state.rules; },
  get idx() { return state.out.idx; },
  outFor,
  go,
  rerender: () => render(state.route, { soft: true }),
  rerun(rerender = true) { compute(); if (rerender) render(state.route, { soft: true }); },
  setRules(rules) { state.rules = rules; compute(); render(state.route, { soft: true }); },
  setData(data, source) { state.data = data; state.source = source || 'Uploaded workbook'; state.sel = {}; state.calib = {}; compute(); renderShell(); render(state.route, { soft: true }); },
  resetSample() { ctx.setData(structuredClone(state.sample), 'VoltBridge sample'); },
  row: (id) => state.out.employees.find((r) => r.emp.emp_id === id),
  persona: (key) => state.out.personas.find((p) => p.key === key)?.row,
  personaKey: (id) => state.out.personas.find((p) => p.emp_id === id)?.key,
  sel(key, fallback) { return state.sel[key] ?? fallback; },
  setToggle(key, val) { state.toggles[key] = val; compute(); render(state.route, { soft: true }); },
  // the person picked elsewhere (drawer buttons, tour) wins once, then the module's own picker takes over
  pickPerson(key, fallbackId, ok = () => true) {
    const p = state.sel.person;
    if (p && ctx.row(p) && ok(ctx.row(p))) { state.sel[key] = p; delete state.sel.person; }
    const id = state.sel[key];
    if (id && ctx.row(id) && ok(ctx.row(id))) return id;
    if (fallbackId && ctx.row(fallbackId)) return fallbackId;
    return fallbackId === null ? null : state.out.employees.find((r) => ok(r))?.emp.emp_id;
  },
  setSel(key, val, rerender = true) { state.sel[key] = val; if (rerender) render(state.route, { soft: true }); },
  lensCountry: (e) => (state.lens === 'home' ? e.country : state.lens),
  openPerson,
  module: (id) => byId[id],
};

/* ---------------- boot ---------------- */
async function boot() {
  try {
    const [rules, sample] = await Promise.all([loadRules('data/rules/'), fetch('data/sample-org/voltbridge.json').then((r) => r.json())]);
    state.rules = rules; state.sample = sample; state.data = structuredClone(sample);
    compute();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;max-width:640px"><h2>PRISM could not load its data</h2><p>Open the app through a local web server, not by double-clicking index.html. In the project folder run <code>python3 -m http.server 8000</code> and visit <code>http://localhost:8000</code>, or double-click <b>start-prism.command</b>.</p><p style="color:#888">${esc(err.message)}</p></div>`;
    return;
  }
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(window.Flip);
  if (window.Draggable) gsap.registerPlugin(window.Draggable);
  UI.initOverlays();
  initLanding(go);
  renderShell();
  window.addEventListener('hashchange', () => route());
  $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
  $('#tourBtn').onclick = () => startTour(ctx);
  $$('#lensSeg button').forEach((b) => b.addEventListener('click', () => setLens(b.dataset.lens)));
  $('#personaJump').addEventListener('change', (e) => { if (e.target.value) openPerson(e.target.value); e.target.value = ''; });
  route();
}

function renderShell() {
  const org = state.out.org;
  $('#orgchip').innerHTML = `<b>${esc(org.org_name || 'Your organisation')}</b>${esc(state.source)} · ${state.out.employees.length} people scored<br><span class="ind">★ ${esc(org.industry === 'ev-auto' ? 'EV / AUTOMOTIVE' : String(org.industry || 'CUSTOM').toUpperCase())}</span>`;
  let html = '', grp = '';
  for (const m of MODULES) {
    if (m.group !== grp) { grp = m.group; html += `<div class="grp">${esc(grp)}</div>`; }
    html += `<a href="#${m.id}" data-id="${m.id}" style="--c:${m.color === '#14151c' ? '#c6c8d6' : m.color}"><i></i>${esc(m.name)}${m.n ? `<small>${m.n}</small>` : ''}</a>`;
  }
  $('#nav').innerHTML = html;
  $$('#nav a').forEach((a) => a.addEventListener('click', () => $('#side').classList.remove('open')));
  $('#personaJump').innerHTML = `<option value="">Jump to a persona…</option>${state.out.personas.map((p) => `<option value="${p.emp_id}">${esc(p.row?.emp.name)} · ${esc(p.row?.title)}</option>`).join('')}`;
}

/* ---------------- routing ---------------- */
function go(r, evt) {
  if (r === 'tour') { openApp(evt); location.hash = 'overview'; setTimeout(() => startTour(ctx), 650); return; }
  if (r === 'home') { location.hash = ''; showLanding(); return; }
  if (!state.appOpen) openApp(evt);
  if (location.hash.slice(1) === r) render(r); else location.hash = r;
}
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h || h === 'home') { showLanding(); return; }
  if (h.startsWith('person-')) { if (!state.appOpen) openApp(); render(state.route || 'people'); openPerson(h.slice(7)); return; }
  if (!byId[h]) { location.hash = 'overview'; return; }
  if (!state.appOpen) openApp();
  render(h);
}
function openApp(evt) {
  if (state.appOpen) return;
  state.appOpen = true;
  document.body.classList.add('in-app');
  const app = $('#app');
  app.classList.remove('hidden');
  if (!RM) {
    const x = evt?.clientX ?? innerWidth / 2, y = evt?.clientY ?? innerHeight / 2;
    gsap.fromTo(app, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' });
  }
}
function showLanding() {
  if (!state.appOpen) return;
  state.appOpen = false;
  const app = $('#app');
  const done = () => { app.classList.add('hidden'); document.body.classList.remove('in-app'); window.ScrollTrigger?.refresh(); };
  if (RM) done(); else gsap.to(app, { opacity: 0, duration: 0.35, onComplete: () => { gsap.set(app, { opacity: 1 }); done(); } });
}

function render(id, { soft = false } = {}) {
  if (!id || !byId[id]) return;
  const m = byId[id];
  const changed = state.route !== id;
  state.route = id;
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.id === id));
  $('#crumb').innerHTML = `${esc(m.name)} <span>· ${esc(state.out.org.org_name || '')}${state.lens !== 'home' ? ` · ${state.lens} lens` : ''}</span>`;
  const content = $('#content');
  const keepScroll = soft && !changed ? content.scrollTop : 0;
  let html;
  try { html = m.mod.render(ctx); } catch (e) { console.error(e); html = `<div class="card">This screen hit an error: ${esc(e.message)}</div>`; }
  const i = MODULES.indexOf(m), nx = MODULES[(i + 1) % MODULES.length];
  const next = `<div class="next-mod no-print"><span>${esc(m.mod.nextNote || 'Next stage of the cycle')}</span><button class="btn ${m.mod.dark ? 'light' : ''}" data-go="${nx.id}">Next: ${esc(nx.name)} →</button></div>`;
  html += next;
  content.innerHTML = `<div class="page${m.mod.dark ? ' dark' : ''}" id="page" style="--mc:${m.color}">${m.mod.dark ? `<div class="inner">${html}</div>` : html}</div>`;
  const page = $('#page');
  page.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => go(b.dataset.go, e)));
  page.querySelectorAll('[data-person]').forEach((b) => b.addEventListener('click', () => openPerson(b.dataset.person)));
  content.scrollTop = keepScroll;
  try { m.mod.mount?.(page, ctx, { soft: soft && !changed }); } catch (e) { console.error(e); }
  if (soft && !changed) { UI.settle(page); animateCharts(page); return; }
  if (!RM) gsap.fromTo(page, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform' });
  UI.enter(page);
  animateCharts(page);
}

/* ---------------- country lens ---------------- */
function setLens(l) {
  if (l === state.lens) return;
  const prev = state.lens;
  const before = new Map(state.out.employees.map((r) => [r.emp.emp_id, r.bottomTierAction?.code || null]));
  state.lens = l;
  $$('#lensSeg button').forEach((b) => b.classList.toggle('on', b.dataset.lens === l));
  compute();
  const cfg = state.out.idx.country;
  const val = (code, key) => (code === 'home' ? 'each person\'s home country' : cfg[key]?.[code]);
  const items = [`<b>${prev === 'home' ? 'Home rules' : prev + ' lens'} → ${l === 'home' ? 'home rules' : l + ' lens'}</b>`];
  for (const [k, label] of LENS_KEYS) {
    const a = val(prev, k), b = val(l, k);
    if (a !== b) items.push(`<span>${esc(label)}:</span> ${esc(a)} → <b>${esc(b)}</b>`);
  }
  let moved = 0;
  for (const r of state.out.employees) if ((before.get(r.emp.emp_id) || null) !== (r.bottomTierAction?.code || null)) moved++;
  if (moved) items.push(`<span>Bottom-tier people whose next step changed:</span> <b>${moved}</b>`);
  UI.showChanges(items);
  render(state.route, { soft: true });
}

/* ---------------- person profile (drawer) ---------------- */
export function openPerson(id) {
  const r = ctx.row(id);
  if (!r) { UI.toast('That person is not in the scored data.'); return; }
  const e = r.emp, res = r.result, pk = ctx.personaKey(id);
  const story = state.out.personas.find((p) => p.emp_id === id)?.story;
  const pool = state.out.pools.find((p) => p.role_id === e.role_id && p.homeCountry === e.country);
  const country = ctx.lensCountry(e);
  const head = `${UI.avatar(e.name, true)}<div><div style="font-family:var(--display);font-size:22px">${esc(e.name)}${pk ? ' <span class="tag purple">persona</span>' : ''}</div><div class="muted small">${esc(r.title)} · ${esc(e.site)} ${UI.code(e.country)} · ${esc(e.emp_id)}</div></div>`;
  const items = res.items.map((i) => `<div class="hbar"><span class="lab" title="${esc(i.name)}">${esc(i.name)}</span>${UI.bar((i.score / 5) * 100, i.score < 2.5 ? '#e5484d' : i.score >= 4 ? '#1dab84' : '#5f7cff')}<span class="val">${UI.fmt(i.score, 1)}</span></div>`).join('');
  const gates = res.gates.map((g) => `<span class="tag ${g.passed ? 'good' : 'bad'}">${g.passed ? '✓' : '✕'} ${esc(g.name)}${g.failedPeriods.length ? ` (${g.failedPeriods.join(', ')})` : ''}</span>`).join(' ');
  const w = res.track.weights;
  const rw = r.rewards;
  const body = `
    ${story ? `<div class="card" style="background:rgba(139,92,246,.07);box-shadow:none"><h4>Storyline</h4><p class="why" style="color:#4b3a8c">${esc(story)}</p></div>` : ''}
    <div class="row mt"><div><h4>Rating</h4>${UI.rate(res.rating, res.capped)} <b>${esc(res.ratingLabel)}</b></div><div><h4>Composite</h4><b style="font-family:var(--display);font-size:24px">${UI.fmt(res.composite)}</b></div><div><h4>Tier</h4>${r.tier ? UI.tier(r.tier.tier) : `<span class="tag">${esc(UI.VERDICT_SHORT[pool?.verdict] || '—')}</span>`}</div><div><h4>9-box</h4><span class="tag purple">${esc(r.nineBox?.label || '—')}</span></div></div>
    ${res.why ? `<p class="why mt" style="color:#b4232c">${esc(res.why)}</p>` : ''}
    <div class="mt"><h4>Results · Behaviours · Growth (${esc(res.track.track)} weights ${w.results}/${w.behaviours}/${w.growth})</h4>
      <div class="hbar"><span class="lab">Results</span>${UI.bar((res.results / 5) * 100, '#5f7cff')}<span class="val">${UI.fmt(res.results, 1)}</span></div>
      <div class="hbar"><span class="lab">Behaviours</span>${UI.bar(((res.behaviours || 0) / 5) * 100, '#1dab84')}<span class="val">${UI.fmt(res.behaviours, 1)}</span></div>
      <div class="hbar"><span class="lab">Growth</span>${UI.bar(((res.growth || 0) / 5) * 100, '#8b5cf6')}<span class="val">${UI.fmt(res.growth, 1)}</span></div>
      <p class="why">${esc(res.track.why)}</p></div>
    <div class="mt"><h4>KPI & OKR scores (1–5)</h4>${items}${gates ? `<div class="row mt">${gates}</div>` : ''}</div>
    <div class="mt"><h4>Ranking · ${UI.code(country)} rules</h4><p class="why">${esc(pool?.label || '')}: ${esc(pool?.reason || '')}${r.shielded ? ' · <b>Out of the ranking pool (ramp-up / stretch shield)</b>' : ''}${r.tier ? ` · Position ${r.tier.position} of ${r.tier.of}` : ''}${r.bottomTierAction ? ` · <b>Next step: ${esc(r.bottomTierAction.text)}</b>` : ''}</p></div>
    ${rw ? `<div class="mt"><h4>Reward</h4><div class="formula">${esc(rw.formula)} ${esc(rw.currency)}</div><p class="why mt">Merit increase ${rw.meritPct}% (compa ${rw.compa}, ${rw.compaBand} band) → new base ${UI.money(rw.newBase, rw.currency)}${rw.extras.length ? ' · ' + rw.extras.map((x) => `${esc(x.name)} ${x.amount === null ? esc(x.detail) : UI.money(x.amount, rw.currency)}`).join(' · ') : ''}${r.clubTrip ? ' · <b>Club trip ✈</b>' : ''}</p></div>` : ''}
    <div class="mt"><h4>Built 70 · helix ${r.helix.built}/7</h4>${UI.bar(r.helix.builtPct / 0.7, '#8b5cf6')}<p class="why">${r.helix.rungs.map((x) => esc(x.label)).join(' · ') || 'No built rungs yet'}</p></div>
    ${r.tna.gaps.length ? `<div class="mt"><h4>Training needs</h4><ul class="dots">${r.tna.gaps.map((g) => `<li>${esc(g.source)}${g.score !== null ? ` (${UI.fmt(g.score, 1)})` : ''} → ${g.courses.map((c) => `${esc(c.name)} <span class="tag ${c.status === 'done' ? 'good' : c.status === 'assigned' ? 'warn' : ''}">${c.status}</span>`).join(', ') || 'coaching'}</li>`).join('')}</ul></div>` : ''}
    <div class="row mt2"><button class="btn sm" data-goto="forge" data-p="${id}">Open in Leadership Forge</button><button class="btn light sm" data-goto="rewards" data-p="${id}">Rewards</button><button class="btn light sm" data-goto="review" data-p="${id}">Review conversation</button><button class="btn light sm" data-goto="lens" data-p="${id}">Country lens</button></div>`;
  UI.openDrawer(head, body, (b) => {
    b.querySelectorAll('[data-goto]').forEach((btn) => btn.addEventListener('click', () => {
      state.sel.person = btn.dataset.p; UI.closeDrawer(); go(btn.dataset.goto);
    }));
  });
}

boot();
