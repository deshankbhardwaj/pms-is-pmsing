// PRISM app shell: boot, state, routing, country lens, person drawer, saving in this browser, tour hook.
import { runAll, loadRules } from './engine/index.js';
import { isLeadersBuiltKpi } from './engine/util.js';
import * as UI from './ui.js';
import { animateCharts } from './charts.js';
import { initLanding } from './landing.js';
import { startTour, closeTour } from './tour.js';
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
const DEFAULT_TOGGLES = { growth: true, shield: true, pairing: true, leadersBuilt: true, wallet: true };
const STORE_KEY = 'prism.session.v1';
const SAMPLE_SOURCE = 'VoltBridge sample';

const state = {
  sample: null, base: null, baseIsSample: true, data: null, rulesBase: null, rules: null, out: null, outs: {},
  lens: 'home', route: null, sel: {}, calib: {}, talk: {}, health: null, appOpen: false, source: SAMPLE_SOURCE,
  toggles: { ...DEFAULT_TOGGLES }, dirty: false, saved: null, saveError: '', restored: false,
};

const LENS_KEYS = [['performance_year', 'Performance year'], ['review_window', 'Review window'], ['year_end_reward', 'Year-end reward'],
  ['bottom_tier_action', 'Bottom-tier action'], ['feedback_style', 'Feedback style'], ['law_in_force', 'Law in force']];

/* ---------------- engine runs ---------------- */
function effectiveData() {
  let d = state.data;
  if (!state.toggles.leadersBuilt) {
    // Switch the "leaders built" KPI off and spread its weight over the role's other KPIs, so weights still add to 100.
    const off = new Set((d.KPIs || []).filter(isLeadersBuiltKpi).map((k) => k.kpi_id));
    const roles = new Set((d.KPIs || []).filter((k) => off.has(k.kpi_id)).map((k) => k.role_id));
    const rest = {};
    for (const k of d.KPIs) if (roles.has(k.role_id) && !off.has(k.kpi_id) && k.type !== 'Gate') rest[k.role_id] = (rest[k.role_id] || 0) + (Number(k.weight_pct) || 0);
    d = { ...d, KPIs: d.KPIs.map((k) => {
      if (off.has(k.kpi_id)) return { ...k, weight_pct: 0 };
      if (roles.has(k.role_id) && k.type !== 'Gate' && rest[k.role_id] > 0) return { ...k, weight_pct: Math.round((Number(k.weight_pct) || 0) * 10000 / rest[k.role_id]) / 100 };
      return k;
    }) };
  }
  return d;
}
// Forge "room to grow" switches change the rules the engine runs with (never the saved rules)
function effectiveRules() {
  const t = state.toggles, r = state.rules;
  if (t.growth && t.shield && t.pairing && t.wallet) return r;
  const b = structuredClone(r.built70);
  if (!t.growth) for (const k of Object.keys(b.weights)) { const w = b.weights[k]; b.weights[k] = { results: w.results + w.growth, behaviours: w.behaviours, growth: 0 }; }
  if (!t.shield) b.shield_enabled = false;
  if (!t.pairing) b.stamp_needs_feedback = false;
  const rw = t.wallet ? r.rewards : { ...r.rewards, learning_wallet: { ...(r.rewards.learning_wallet || {}), enabled: false } };
  return { ...r, built70: b, rewards: rw };
}
const runWith = (lensCode) => runAll(effectiveData(), effectiveRules(), { countryOverride: lensCode === 'home' ? undefined : lensCode });
function compute() {
  state.outs = {};
  state.out = runWith(state.lens);
}
// A change made by the visitor: re-run, remember it, save it in this browser.
function commit() { compute(); markDirty(); }
function outFor(lensCode) {
  if (lensCode === state.lens) return state.out;
  if (!state.outs[lensCode]) state.outs[lensCode] = runWith(lensCode);
  return state.outs[lensCode];
}

/* ---------------- what changed (downstream, not just the screen you are on) ---------------- */
export function diffOut(a, b) {
  const items = [];
  if (!a || !b) return items;
  const title = (id) => b.idx.role.get(id)?.title || id;
  const pk = (p) => `${p.role_id}|${p.homeCountry}`;
  const pa = new Map(a.pools.map((p) => [pk(p), p]));
  for (const p of b.pools) {
    const o = pa.get(pk(p));
    if (o && o.verdict !== p.verdict) items.push(`<span>${esc(title(p.role_id))} ${esc(p.homeCountry)} ranking:</span> ${esc(UI.VERDICT_SHORT[o.verdict])} → <b>${esc(UI.VERDICT_SHORT[p.verdict])}</b>`);
  }
  const blends = (out) => { const m = new Map(); for (const p of out.pools) if (!m.has(p.role_id) || p.homeCountry === 'IN') m.set(p.role_id, p.methods.items.map((i) => `${i.name} ${i.pct}`).join(' / ')); return m; };
  const ba = blends(a), bb = blends(b), changedBlends = [...bb].filter(([r, v]) => ba.has(r) && ba.get(r) !== v);
  if (changedBlends.length) items.push(`<span>Method blends changed (Method Mixer):</span> <b>${changedBlends.length} role${changedBlends.length > 1 ? 's' : ''}</b>, e.g. ${esc(title(changedBlends[0][0]))}: ${esc(changedBlends[0][1])}`);
  const ta = new Map(a.employees.map((r) => [r.emp.emp_id, r.tier?.tier || null]));
  const moves = {};
  for (const r of b.employees) {
    if (!ta.has(r.emp.emp_id)) continue;
    const t0 = ta.get(r.emp.emp_id), t1 = r.tier?.tier || null;
    if (t0 !== t1) { const k = `${t0 || 'no tier'} → ${t1 || 'no tier'}`; moves[k] = (moves[k] || 0) + 1; }
  }
  for (const [k, n] of Object.entries(moves)) items.push(`<span>Reward tier ${esc(k)}:</span> <b>${n} ${n === 1 ? 'person' : 'people'}</b>`);
  const ra = new Map(a.employees.map((r) => [r.emp.emp_id, r.result.rating]));
  const rm = b.employees.filter((r) => ra.has(r.emp.emp_id) && ra.get(r.emp.emp_id) !== r.result.rating).length;
  if (rm) items.push(`<span>Ratings that moved:</span> <b>${rm}</b>`);
  const bo = new Map(a.employees.map((r) => [r.emp.emp_id, r.rewards?.total ?? null]));
  const bm = b.employees.filter((r) => bo.has(r.emp.emp_id) && bo.get(r.emp.emp_id) !== (r.rewards?.total ?? null)).length;
  if (bm) items.push(`<span>People whose pay-out changed (Rewards):</span> <b>${bm}</b>`);
  if (a.protectedLearningPct !== b.protectedLearningPct) items.push(`<span>Protected learning time:</span> ${a.protectedLearningPct}% → <b>${b.protectedLearningPct}%</b>`);
  const ca = a.cadence, cb = b.cadence;
  if (ca && cb && (ca.checkins !== cb.checkins || ca.reviews !== cb.reviews)) items.push(`<span>Review rhythm (Review & Delivery):</span> ${esc(ca.checkins)} check-ins, ${esc(ca.reviews)} reviews → <b>${esc(cb.checkins)} check-ins, ${esc(cb.reviews)} reviews</b>`);
  if (ca && cb && ca.pip_days !== cb.pip_days) items.push(`<span>Improvement-plan length (India):</span> ${esc(ca.pip_days)} → <b>${esc(cb.pip_days)}</b>`);
  for (const c of ['IN', 'CN']) {
    const x = a.budget[c], y = b.budget[c];
    if (x && y && (x.utilisationBeforePct !== y.utilisationBeforePct || x.strict !== y.strict)) items.push(`<span>${c} bonus pool:</span> ${x.utilisationBeforePct}% → <b>${y.utilisationBeforePct}%</b>${y.factor < 1 ? ` (rescaled ×${y.factor.toFixed(2)})` : y.utilisationBeforePct > 100 ? ' (over budget, warning only)' : ''}`);
  }
  const ga = Object.values(a.gainsharing)[0], gb = Object.values(b.gainsharing)[0];
  if (ga && gb && ga.sharePct !== gb.sharePct) items.push(`<span>Gainsharing share of savings:</span> ${ga.sharePct}% → <b>${gb.sharePct}%</b>`);
  if (a.mode && b.mode) {
    if (a.mode.okr !== b.mode.okr) items.push(`<span>Key results scored as:</span> ${a.mode.okr ? 'OKRs (0.7 = 3.5)' : 'KPIs'} → <b>${b.mode.okr ? 'OKRs (0.7 = 3.5)' : 'KPIs (threshold / target / stretch)'}</b>`);
    if (a.mode.customerBoost !== b.mode.customerBoost) items.push(`<span>Customer KPIs weight:</span> ×${a.mode.customerBoost} → <b>×${b.mode.customerBoost}</b>`);
    if (a.mode.strictGates !== b.mode.strictGates) items.push(`<span>Failed gate caps the rating at:</span> ${a.mode.strictGates ? 'strict cap' : 'normal cap'} → <b>${b.mode.strictGates ? 'strict cap' : 'normal cap'}</b>`);
  }
  return items;
}
function changes(title, before, extra = []) {
  const items = [...extra, ...diffOut(before, state.out)];
  UI.showChanges([title, ...(items.length ? items : ['<span>Nothing else in the PMS changed.</span>'])]);
}

/* ---------------- saving in this browser ---------------- */
let saveT;
function markDirty() { state.dirty = true; clearTimeout(saveT); saveT = setTimeout(save, 500); }
function save() {
  if (!state.dirty) return;
  const payload = {
    v: 1, savedAt: new Date().toISOString(), source: state.source, lens: state.lens, toggles: state.toggles,
    calib: state.calib, talk: state.talk, health: state.health, rules: state.rules, data: state.data, base: state.baseIsSample ? null : state.base,
  };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    state.saved = payload.savedAt; state.saveError = ''; state.dirty = false;
  } catch {
    state.saveError = 'This browser would not save the session (storage full or blocked). Export the data as JSON to keep it.';
  }
}
function readSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s?.v !== 1 || !Array.isArray(s.data?.Employees) || !s.rules?.ranking) return null;
    return s;
  } catch { return null; }
}
function forgetSaved() {
  clearTimeout(saveT); state.dirty = false; state.saved = null;
  try { localStorage.removeItem(STORE_KEY); } catch { /* storage blocked */ }
}

/* ---------------- context passed to every screen ---------------- */
const cleanups = [];
const ctx = {
  state, UI, MODULES,
  get out() { return state.out; },
  get data() { return state.data; },
  get base() { return state.base; },
  get rules() { return state.rules; },
  get idx() { return state.out.idx; },
  outFor, go, diffOut,
  rerender: () => render(state.route, { soft: true }),
  rerun(rerender = true) { commit(); if (rerender) render(state.route, { soft: true }); },
  changes,
  markDirty,
  setRules(rules) { state.rules = rules; commit(); render(state.route, { soft: true }); },
  resetRules(part) { state.rules = { ...state.rules, [part]: structuredClone(state.rulesBase[part]) }; commit(); render(state.route, { soft: true }); },
  // Load a new organisation (or the sample). Everything that belonged to the old one is reset.
  // If the engine cannot run on it, nothing changes and the error is thrown back to the caller.
  setData(data, source, { isSample = false } = {}) {
    const keep = { ...state, toggles: { ...state.toggles }, sel: { ...state.sel } };
    try {
      state.base = structuredClone(data); state.data = structuredClone(data); state.baseIsSample = isSample;
      state.source = source || 'Uploaded workbook';
      state.rules = structuredClone(state.rulesBase); state.toggles = { ...DEFAULT_TOGGLES };
      state.sel = {}; state.calib = {}; state.talk = {}; state.health = null; state.lens = 'home';
      compute();
      if (!state.out.employees.length) throw new Error('No scored employees: every employee is an executive or has no role.');
    } catch (err) {
      Object.assign(state, keep);
      compute();
      throw err;
    }
    syncLensButtons(); markDirty(); renderShell(); render(state.route, { soft: true });
  },
  // The sample needs nothing saved: going back to it clears what this browser kept.
  resetSample() { ctx.setData(state.sample, SAMPLE_SOURCE, { isSample: true }); forgetSaved(); },
  forgetSaved,
  get savedAt() { return state.saved; },
  get saveError() { return state.saveError; },
  row: (id) => state.out.employees.find((r) => r.emp.emp_id === id),
  persona: (key) => state.out.personas.find((p) => p.key === key)?.row,
  personaId: (key) => state.out.personas.find((p) => p.key === key && p.row)?.emp_id || null,
  personaKey: (id) => state.out.personas.find((p) => p.emp_id === id)?.key,
  isSampleOrg: () => state.out.org.org_name === state.sample.Org?.[0]?.org_name,
  sel(key, fallback) { return state.sel[key] ?? fallback; },
  setSel(key, val, rerender = true) { state.sel[key] = val; if (rerender) render(state.route, { soft: true }); },
  setToggle(key, val) { state.toggles[key] = val; commit(); render(state.route, { soft: true }); },
  setLens,
  // The person a screen should show: its own remembered choice if still valid, else the fallback, else the first person that fits.
  pickPerson(key, fallbackId, ok = () => true) {
    const id = state.sel[key];
    if (id && ctx.row(id) && ok(ctx.row(id))) return id;
    if (fallbackId && ctx.row(fallbackId) && ok(ctx.row(fallbackId))) return fallbackId;
    return state.out.employees.find((r) => ok(r))?.emp.emp_id || null;
  },
  // Roles that can be shown (not executives). Falls back gracefully on any uploaded organisation.
  roles: () => [...state.out.idx.role.values()].filter((r) => r.role_id !== 'EXE'),
  pickRole(key, pref = 'ASM') {
    const ids = ctx.roles().map((r) => r.role_id);
    const cur = state.sel[key];
    if (cur && ids.includes(cur)) return cur;
    if (ids.includes(pref)) return pref;
    const withKpis = ids.find((id) => (state.out.idx.kpisByRole.get(id) || []).length);
    return withKpis || ids[0] || null;
  },
  lensCountry: (e) => (state.lens === 'home' ? e.country : state.lens),
  openPerson,
  onCleanup(fn) { cleanups.push(fn); },
  module: (id) => byId[id],
};

/* ---------------- boot ---------------- */
async function boot() {
  try {
    const [rules, sample] = await Promise.all([
      loadRules('data/rules/'),
      fetch('data/sample-org/voltbridge.json').then((r) => { if (!r.ok) throw new Error(`Could not load the sample data (${r.status})`); return r.json(); }),
    ]);
    state.rulesBase = rules; state.rules = structuredClone(rules); state.sample = sample;
    state.base = structuredClone(sample); state.data = structuredClone(sample);
    compute();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;max-width:640px"><h1 style="font-size:24px">PRISM could not load its data</h1><p>Open the app through a local web server, not by double-clicking index.html. In the project folder run <code>python3 -m http.server 8000</code> and visit <code>http://localhost:8000</code>, or double-click <b>start-prism.command</b>.</p><p style="color:#666">${esc(err.message)}</p></div>`;
    return;
  }
  const saved = readSaved();
  if (saved) {
    const keep = { data: state.data, base: state.base, rules: state.rules };
    try {
      state.data = saved.data; state.base = saved.base || structuredClone(state.sample); state.baseIsSample = !saved.base;
      state.rules = { ...structuredClone(state.rulesBase), ...saved.rules }; state.toggles = { ...DEFAULT_TOGGLES, ...(saved.toggles || {}) };
      state.lens = ['home', 'IN', 'CN'].includes(saved.lens) ? saved.lens : 'home';
      state.calib = saved.calib || {}; state.talk = saved.talk && typeof saved.talk === 'object' ? saved.talk : {}; state.health = saved.health || null; state.source = saved.source || SAMPLE_SOURCE; state.saved = saved.savedAt;
      compute();
      state.restored = true;
    } catch (err) {
      console.warn('Saved session could not be restored', err);
      Object.assign(state, keep, { toggles: { ...DEFAULT_TOGGLES }, lens: 'home', calib: {}, talk: {}, health: null, source: SAMPLE_SOURCE, saved: null, baseIsSample: true });
      forgetSaved();
      compute();
    }
  }
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  if (window.Flip) gsap.registerPlugin(window.Flip);
  if (window.Draggable) gsap.registerPlugin(window.Draggable);
  UI.initOverlays({ onDrawerClosed: onDrawerClosedByUser });
  initLanding(go);
  renderShell();
  syncLensButtons();
  window.addEventListener('hashchange', route);
  $('#menuBtn').addEventListener('click', () => setMenu(!$('#side').classList.contains('open')));
  $('#sideScrim').addEventListener('click', () => setMenu(false));
  $('#tourBtn').addEventListener('click', () => { setMenu(false); startTour(ctx); });
  $$('#lensSeg button').forEach((b) => b.addEventListener('click', () => setLens(b.dataset.lens)));
  // Persona jump: a mouse pick opens at once; keyboard users move with the arrows and press Enter.
  const pj = $('#personaJump');
  UI.enhanceSelects($('.topbar'));
  let kbNav = false;
  pj.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) kbNav = true;
    if (e.key === 'Enter' && pj.value) { e.preventDefault(); const v = pj.value; pj.value = ''; kbNav = false; openPerson(v); }
  });
  pj.addEventListener('change', () => { if (kbNav || !pj.value) return; const v = pj.value; pj.value = ''; openPerson(v); });
  pj.addEventListener('blur', () => { kbNav = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#side').classList.contains('open')) setMenu(false); });
  UI.bindKeyboardActivation(document);
  route();
  if (state.restored) {
    UI.toast(`Restored your last session from this browser (${esc(state.source)}). <button class="btn light sm" id="startFresh">Start fresh</button>`, 8000);
    $('#startFresh')?.addEventListener('click', () => { ctx.resetSample(); UI.toast('Back to the VoltBridge sample. Nothing is saved.'); });
  }
}

function setMenu(open) {
  $('#side').classList.toggle('open', open);
  $('#sideScrim').classList.toggle('on', open);
  $('#menuBtn').setAttribute('aria-expanded', String(open));
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
  $$('#nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  const ps = state.out.personas.filter((p) => p.row);
  const opts = ps.length
    ? ps.map((p) => `<option value="${esc(p.emp_id)}">${esc(p.row.emp.name)} · ${esc(p.row.title)}</option>`)
    : [...state.out.employees].sort((a, b) => String(a.emp.name).localeCompare(String(b.emp.name))).map((r) => `<option value="${esc(r.emp.emp_id)}">${esc(r.emp.name)} · ${esc(r.title)}</option>`);
  $('#personaJump').innerHTML = `<option value="">${ps.length ? 'Jump to a persona…' : 'Jump to a person…'}</option>${opts.join('')}`;
}
function syncLensButtons() {
  $$('#lensSeg button').forEach((b) => { const on = b.dataset.lens === state.lens; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
}

/* ---------------- routing ---------------- */
let fadeTween = null;
function go(r, evt) {
  if (r === 'tour') { openApp(evt); if (location.hash.slice(1) !== 'overview') location.hash = 'overview'; else render('overview'); setTimeout(() => startTour(ctx), 650); return; }
  if (r === 'home') { if (location.hash) history.pushState(null, '', location.pathname + location.search); showLanding(); return; }
  if (!byId[r]) return;
  if (!state.appOpen) openApp(evt);
  if (location.hash.slice(1) === r) render(r); else location.hash = r;
}
function route() {
  let h;
  try { h = decodeURIComponent(location.hash.slice(1)); } catch { h = null; }
  if (h === null) { history.replaceState(null, '', location.pathname + location.search); showLanding(); return; }
  if (!h || h === 'home') { if (UI.drawerIsOpen()) UI.closeDrawer({ silent: true }); showLanding(); return; }
  if (h.startsWith('person-')) {
    if (!state.appOpen) openApp();
    if (!state.route || !$('#page')) render('people');
    openPerson(h.slice(7), { fromHash: true });
    return;
  }
  if (!byId[h]) { history.replaceState(null, '', '#overview'); h = 'overview'; }
  if (!state.appOpen) openApp();
  if (UI.drawerIsOpen()) UI.closeDrawer({ silent: true });
  if (h !== state.route || !$('#page')) render(h);
  else document.title = `${byId[h].name} · PRISM`;   // back from the landing: the screen is still there
}
function openApp(evt) {
  if (fadeTween) { fadeTween.kill(); fadeTween = null; gsap.set('#app', { opacity: 1 }); }
  const app = $('#app');
  app.classList.remove('hidden');
  document.body.classList.add('in-app');
  $('#landing').inert = true;
  $('#landing').setAttribute('aria-hidden', 'true');
  if (state.appOpen) return;
  state.appOpen = true;
  if (!RM) {
    const x = evt?.clientX ?? innerWidth / 2, y = evt?.clientY ?? innerHeight / 2;
    gsap.fromTo(app, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' });
  }
}
function showLanding() {
  document.title = 'PRISM · Performance Management System';
  closeTour();
  setMenu(false);
  if (!state.appOpen) return;
  state.appOpen = false;
  const app = $('#app');
  const done = () => {
    fadeTween = null;
    if (state.appOpen) return;   // the app was reopened during the fade (Back then Forward): leave it visible
    app.classList.add('hidden'); document.body.classList.remove('in-app');
    $('#landing').inert = false; $('#landing').removeAttribute('aria-hidden');
    window.ScrollTrigger?.refresh();
  };
  if (RM) done(); else fadeTween = gsap.to(app, { opacity: 0, duration: 0.35, onComplete: () => { gsap.set(app, { opacity: 1 }); done(); } });
}

// Remember where focus was so a re-render (tabs, edits) does not drop it to <body>.
function focusKey() {
  const a = document.activeElement;
  if (!a || a === document.body || !$('#content').contains(a)) return null;
  if (a.id) return `#${CSS.escape(a.id)}`;
  for (const at of a.attributes) if (at.name.startsWith('data-') && at.name !== 'data-split') return `${a.tagName.toLowerCase()}[${at.name}="${CSS.escape(at.value)}"]`;
  return null;
}
function render(id, { soft = false } = {}) {
  if (!id || !byId[id]) return;
  UI.closeCombo();
  const m = byId[id];
  const changed = state.route !== id;
  const fk = soft && !changed ? focusKey() : null;
  while (cleanups.length) { try { cleanups.pop()(); } catch (e) { console.error(e); } }
  if (changed && UI.drawerIsOpen()) UI.closeDrawer({ silent: true });
  state.route = id;
  document.title = `${m.name} · PRISM`;
  $$('#nav a').forEach((a) => { const on = a.dataset.id === id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#crumb').innerHTML = `${esc(m.name)} <span>· ${esc(state.out.org.org_name || '')}${state.lens !== 'home' ? ` · ${esc(state.lens)} lens` : ''}</span>`;
  const content = $('#content');
  const keepScroll = soft && !changed ? content.scrollTop : 0;
  let html;
  try { html = m.mod.render(ctx); } catch (e) { console.error(e); html = `${UI.pageHead({ eyebrow: m.name, title: 'This screen could not be drawn', sub: '' })}<div class="card"><p>The data loaded in the Data Hub is missing something this screen needs (${esc(e.message)}). Reload the VoltBridge sample from the Data Hub, or check the workbook.</p><button class="btn sm mt" data-go="data">Open the Data Hub</button></div>`; }
  const i = MODULES.indexOf(m), nx = MODULES[(i + 1) % MODULES.length];
  html += `<div class="next-mod no-print"><span>${esc(m.mod.nextNote || 'Next stage of the cycle')}</span><button class="btn ${m.mod.dark ? 'light' : ''}" data-go="${nx.id}">Next: ${esc(nx.name)} →</button></div>`;
  content.innerHTML = `<div class="page${m.mod.dark ? ' dark' : ''}" id="page" style="--mc:${m.color};--mt:${m.mod.dark ? m.color : UI.textOn(m.color)}">${m.mod.dark ? `<div class="inner">${html}</div>` : html}</div>`;
  const page = $('#page');
  page.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => go(b.dataset.go, e)));
  page.querySelectorAll('[data-person]').forEach((b) => b.addEventListener('click', () => openPerson(b.dataset.person)));
  content.scrollTop = keepScroll;
  try { m.mod.mount?.(page, ctx, { soft: soft && !changed }); } catch (e) { console.error(e); }
  UI.makeKeyboardFriendly(page);
  UI.enhanceSelects(page);
  if (fk) page.querySelector(fk)?.focus({ preventScroll: true });
  if (soft && !changed) { UI.settle(page); animateCharts(page); return; }
  if (!RM) gsap.fromTo(page, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform' });
  UI.enter(page);
  animateCharts(page);
}

/* ---------------- country lens ---------------- */
function setLens(l) {
  if (!['home', 'IN', 'CN'].includes(l) || l === state.lens) return;
  const prev = state.lens, before = state.out;
  state.lens = l;
  syncLensButtons();
  commit();
  const cfg = state.out.idx.country;
  const val = (code, key) => (code === 'home' ? 'each person\'s home country' : cfg[key]?.[code]);
  const items = [];
  for (const [k, label] of LENS_KEYS) {
    const a = val(prev, k), b = val(l, k);
    if (a !== b) items.push(`<span>${esc(label)}:</span> ${esc(a)} → <b>${esc(b)}</b>`);
  }
  let moved = 0;
  const bt = new Map(before.employees.map((r) => [r.emp.emp_id, r.bottomTierAction?.text || null]));
  for (const r of state.out.employees) if ((bt.get(r.emp.emp_id) || null) !== (r.bottomTierAction?.text || null)) moved++;
  if (moved) items.push(`<span>Bottom-tier people whose next step changed:</span> <b>${moved}</b>`);
  items.push('<span>Pay stays in each person\'s own currency and pay policy.</span>');
  changes(`<b>${prev === 'home' ? 'Home rules' : esc(prev) + ' lens'} → ${l === 'home' ? 'home rules' : esc(l) + ' lens'}</b>`, before, items);
  render(state.route, { soft: true });
}

/* ---------------- person profile (drawer) ---------------- */
let drawerPushed = false;
function onDrawerClosedByUser() {
  // × / Esc / scrim: take the #person- entry back off the address bar so Back and reload behave
  if (!location.hash.startsWith('#person-')) return;
  if (drawerPushed) { drawerPushed = false; history.back(); }
  else history.replaceState(null, '', `#${state.route || 'overview'}`);
}
const GO_FROM_DRAWER = {
  forge: (id) => { state.sel.forgePerson = id; state.sel.forgeMonth = 11; },
  rewards: (id) => { state.sel.rewPerson = id; },
  review: (id) => { state.sel.reviewTab = 'talk'; state.sel.talkPerson = id; },
  lens: (id) => { state.sel.lensPerson = id; },
};
export function openPerson(id, { fromHash = false } = {}) {
  const r = ctx.row(id);
  if (!r) {
    UI.toast('That person is not in the scored data (executives and unknown IDs are not scored).');
    if (fromHash) history.replaceState(null, '', `#${state.route || 'overview'}`);
    return;
  }
  const e = r.emp, res = r.result, pk = ctx.personaKey(id);
  const story = state.out.personas.find((p) => p.emp_id === id)?.story;
  const pool = state.out.pools.find((p) => p.role_id === e.role_id && p.homeCountry === e.country);
  const country = ctx.lensCountry(e);
  const head = `${UI.avatar(e.name, true)}<div><div id="drawerTitle" style="font-family:var(--display);font-size:22px">${esc(e.name)}${pk ? ' <span class="tag purple">persona</span>' : ''}</div><div class="muted small">${esc(r.title)} · ${esc(e.site)} ${UI.code(e.country)} · ${esc(e.emp_id)}</div></div>`;
  const items = res.items.map((i) => `<div class="hbar"><span class="lab">${esc(i.name)}${i.boosted ? ' <span class="tag info">×customer</span>' : ''}</span>${UI.bar(((i.score ?? 0) / 5) * 100, i.score === null ? '#c6c8d6' : i.score < 2.5 ? '#e5484d' : i.score >= 4 ? '#1dab84' : '#5f7cff')}<span class="val">${i.score === null ? 'no data' : UI.fmt(i.score, 1)}</span></div>`).join('');
  const gates = res.gates.map((g) => (g.passed === null
    ? `<span class="tag warn">? ${esc(g.name)}: no gate data (no penalty)</span>`
    : `<span class="tag ${g.passed ? 'good' : 'bad'}">${g.passed ? '✓' : '✕'} ${esc(g.name)}${g.failedPeriods.length ? ` (${esc(g.failedPeriods.join(', '))})` : ''}</span>`)).join(' ');
  const w = res.track.weights;
  const rw = r.rewards;
  const body = `
    ${story ? `<div class="card" style="background:rgba(139,92,246,.07);box-shadow:none"><h3 class="h4">Storyline</h3><p class="why" style="color:#4b3a8c">${esc(story)}</p></div>` : ''}
    <div class="row mt"><div><h3 class="h4">Rating</h3>${UI.rate(res.rating, res.capped)} <b>${esc(res.ratingLabel)}</b></div><div><h3 class="h4">Composite</h3><b style="font-family:var(--display);font-size:24px">${UI.fmt(res.composite)}</b></div><div><h3 class="h4">Tier</h3>${r.tier ? UI.tier(r.tier.tier) : `<span class="tag">${esc(UI.VERDICT_SHORT[pool?.verdict] || '—')}</span>`}</div><div><h3 class="h4">9-box</h3><span class="tag purple">${esc(r.nineBox?.label || '—')}</span></div></div>
    ${res.why ? `<p class="why mt" style="color:#b4232c">${esc(res.why)}</p>` : ''}
    <div class="mt"><h3 class="h4">Results · Behaviours · Growth (${esc(res.track.track)} weights ${w.results}/${w.behaviours}/${w.growth})</h3>
      <div class="hbar"><span class="lab">Results</span>${UI.bar(((res.results || 0) / 5) * 100, '#5f7cff')}<span class="val">${UI.fmt(res.results, 1)}</span></div>
      <div class="hbar"><span class="lab">Behaviours</span>${UI.bar(((res.behaviours || 0) / 5) * 100, '#1dab84')}<span class="val">${UI.fmt(res.behaviours, 1)}</span></div>
      <div class="hbar"><span class="lab">Growth</span>${UI.bar(((res.growth || 0) / 5) * 100, '#8b5cf6')}<span class="val">${UI.fmt(res.growth, 1)}</span></div>
      <p class="why">${esc(res.track.why)}</p></div>
    <div class="mt"><h3 class="h4">KPI & OKR scores (1–5)</h3>${items || '<p class="why">No KPIs for this role.</p>'}${gates ? `<div class="row mt">${gates}</div>` : ''}</div>
    <div class="mt"><h3 class="h4">Ranking · ${UI.code(country)} rules</h3><p class="why">${esc(pool?.label || '')}: ${esc(pool?.reason || '')}${r.shielded ? ' · <b>Out of the ranking pool (ramp-up / stretch shield)</b>' : ''}${r.tier ? ` · Position ${r.tier.position} of ${r.tier.of}` : ''}${r.bottomTierAction?.text ? ` · <b>Next step: ${esc(r.bottomTierAction.text)}</b>` : ''}</p></div>
    ${rw ? `<div class="mt"><h3 class="h4">Reward</h3><div class="formula">${esc(rw.formula)} ${esc(rw.currency)}</div><p class="why mt">Merit increase ${rw.meritPct}% (compa ${rw.compa}, ${esc(rw.compaBand)} band) → new base ${UI.money(rw.newBase, rw.currency)}${rw.extras.length ? ' · ' + rw.extras.map((x) => `${esc(x.name)} ${x.amount === null ? esc(x.detail) : UI.money(x.amount, rw.currency)}`).join(' · ') : ''}${r.clubTrip ? ' · <b>Club trip ✈</b>' : ''} · Learning wallet ${UI.money(rw.learningWallet, rw.currency)}</p></div>` : '<div class="mt"><h3 class="h4">Reward</h3><p class="why">No reward calculated: base pay is missing or not a positive number.</p></div>'}
    <div class="mt"><h3 class="h4">Built 70 · helix ${r.helix.built}/7</h3>${UI.bar(r.helix.builtPct / 0.7, '#8b5cf6')}<p class="why">${r.helix.rungs.map((x) => esc(x.label)).join(' · ') || 'No built rungs yet'}</p></div>
    ${r.tna.gaps.length ? `<div class="mt"><h3 class="h4">Training needs</h3><ul class="dots">${r.tna.gaps.map((g) => `<li>${esc(g.source)}${g.score !== null ? ` (${UI.fmt(g.score, 1)})` : ''} → ${g.courses.map((c) => `${esc(c.name)} <span class="tag ${c.status === 'done' ? 'good' : c.status === 'assigned' ? 'warn' : ''}">${esc(c.status)}</span>`).join(', ') || 'coaching'}</li>`).join('')}</ul></div>` : ''}
    <div class="row mt2"><button class="btn sm" data-goto="forge">Open in Leadership Forge</button><button class="btn light sm" data-goto="rewards">Rewards</button><button class="btn light sm" data-goto="review">Review conversation</button><button class="btn light sm" data-goto="lens">Country lens</button></div>`;
  UI.openDrawer(head, body, (b) => {
    UI.makeKeyboardFriendly(b);
    UI.enhanceSelects(b);
    b.querySelectorAll('[data-goto]').forEach((btn) => btn.addEventListener('click', () => {
      const target = btn.dataset.goto;
      GO_FROM_DRAWER[target]?.(id);
      UI.closeDrawer({ silent: true });
      drawerPushed = false;
      history.replaceState(null, '', `#${target}`);   // replace the #person- entry: Back returns to where the drawer was opened
      if (!state.appOpen) openApp();
      render(target);
    }));
  });
  if (!fromHash) { history.pushState(null, '', `#person-${id}`); drawerPushed = true; }
  else drawerPushed = false;
}

boot();
