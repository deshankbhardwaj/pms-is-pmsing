// Small UI helpers shared by every module. No framework: template strings + GSAP.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const gsap = window.gsap;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d));
export const pct = (v, d = 0) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(d)}%`);
export function money(v, cur) {
  if (v === null || v === undefined) return '—';
  const sym = cur === 'CNY' ? '¥' : '₹';
  return sym + Math.round(v).toLocaleString(cur === 'CNY' ? 'zh-CN' : 'en-IN');
}
const AV_COLORS = ['#5f7cff', '#1dab84', '#f08c3a', '#a55eea', '#e5484d', '#20b8e0', '#e0a800', '#14151c'];
export function initials(name) { return String(name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
export function avatar(name, lg = false) {
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="av${lg ? ' lg' : ''}" style="--c:${AV_COLORS[h % AV_COLORS.length]}">${esc(initials(name))}</span>`;
}
export const rate = (r, capped) => (r ? `<span class="rate r${r}" title="${capped ? 'Capped by a failed gate' : ''}">${r}${capped ? '*' : ''}</span>` : '<span class="tag">n/a</span>');
export const tier = (t) => (t ? `<span class="tier ${t}">${t}</span>` : '');
export const code = (c) => `<span class="code ${c}">${c}</span>`;
export const VERDICT_COLOR = { forced: '#e5484d', relative: '#e0a800', absolute: '#12a37a' };
export const VERDICT_SHORT = { forced: 'Forced tiers', relative: 'Relative calibration', absolute: 'Absolute standards' };

export function pageHead({ eyebrow, title, sub }) {
  return `<header class="ph"><div class="eyebrow">${esc(eyebrow)}</div><h1 class="t">${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</header>`;
}

// split headings into words and lift them out of a mask
export function splitWords(h) {
  if (!h || h.dataset.split) return;
  h.dataset.split = '1';
  const walk = (node) => {
    [...node.childNodes].forEach((k) => {
      if (k.nodeType === 3) {
        const frag = document.createDocumentFragment();
        k.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = p;
          w.appendChild(wi); frag.appendChild(w);
        });
        node.replaceChild(frag, k);
      } else if (k.nodeType === 1) {
        if (k.classList.contains('grad')) {
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi';
          node.replaceChild(w, k); wi.appendChild(k); w.appendChild(wi);
        } else walk(k);
      }
    });
  };
  walk(h);
}

// Entrance motion for a freshly rendered page
export function enter(root) {
  if (RM || !gsap) return;
  const h = root.querySelector('.ph .t');
  if (h) { splitWords(h); gsap.from(h.querySelectorAll('.wi'), { yPercent: 115, duration: 0.8, ease: 'power4.out', stagger: 0.05 }); }
  gsap.from(root.querySelectorAll('.ph .eyebrow, .ph .sub'), { opacity: 0, y: 10, duration: 0.6, stagger: 0.08, delay: 0.1 });
  const cards = root.querySelectorAll('.card, .l-card');
  if (cards.length) gsap.from(cards, { opacity: 0, y: 22, duration: 0.6, ease: 'power3.out', stagger: { each: 0.035, from: 'start' }, delay: 0.12, clearProps: 'transform,opacity' });
  root.querySelectorAll('[data-count]').forEach((el) => countUp(el));
  root.querySelectorAll('.bar>i[data-w]').forEach((el) => gsap.to(el, { width: `${el.dataset.w}%`, duration: 0.9, ease: 'power3.out', delay: 0.25 }));
}
export function settle(root) {
  root.querySelectorAll('.bar>i[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
  root.querySelectorAll('[data-count]').forEach((el) => { el.textContent = formatCount(el, Number(el.dataset.count)); });
}
function formatCount(el, v) {
  const d = Number(el.dataset.dec || 0);
  const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  const loc = el.dataset.loc;
  const s = loc ? Math.round(v).toLocaleString(loc) : v.toFixed(d);
  return pre + s + suf;
}
export function countUp(el) {
  const to = Number(el.dataset.count);
  if (RM || !gsap) { el.textContent = formatCount(el, to); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', delay: 0.2, onUpdate: () => { el.textContent = formatCount(el, o.v); } });
}
export const counter = (v, { dec = 0, pre = '', suf = '', loc = '' } = {}) =>
  `<span data-count="${v}" data-dec="${dec}" data-pre="${esc(pre)}" data-suf="${esc(suf)}"${loc ? ` data-loc="${loc}"` : ''}>${pre}${loc ? Math.round(v).toLocaleString(loc) : Number(v).toFixed(dec)}${suf}</span>`;
export const bar = (w, color) => `<div class="bar"><i data-w="${Math.max(0, Math.min(100, w))}"${color ? ` style="background:${color}"` : ''}></i></div>`;

let toastT;
export function toast(html, ms = 3200) {
  const t = $('#toast');
  t.innerHTML = html;
  clearTimeout(toastT);
  if (gsap) gsap.to(t, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' });
  else t.style.opacity = 1;
  toastT = setTimeout(() => { if (gsap) gsap.to(t, { autoAlpha: 0, y: 40, duration: 0.3 }); else t.style.opacity = 0; }, ms);
}

// Person drawer: a modal dialog. Esc, × and the scrim close it; focus moves in, stays in, and returns.
let drawerOpen = false, lastFocus = null, onDrawerClosed = null;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';
function drawerKeys(e) {
  if (!drawerOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
  if (e.key !== 'Tab') return;
  const f = [...$('#drawer').querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
export const drawerIsOpen = () => drawerOpen;
export function openDrawer(headHtml, bodyHtml, onReady) {
  const d = $('#drawer');
  if (!drawerOpen) lastFocus = document.activeElement;
  $('#drawerHead').innerHTML = `${headHtml}<button class="x" id="drawerX" aria-label="Close">×</button>`;
  $('#drawerBody').innerHTML = bodyHtml;
  $('#drawerBody').scrollTop = 0;
  $('#drawerX').onclick = () => closeDrawer();
  $('#scrim').onclick = () => closeDrawer();
  d.inert = false; d.removeAttribute('aria-hidden');
  const app = $('#app'); if (app) app.inert = true;
  drawerOpen = true;
  document.dispatchEvent(new CustomEvent('prism:drawer-open'));   // the guided tour pauses itself
  gsap.set(d, { visibility: 'visible' });
  gsap.to(d, { xPercent: 0, duration: RM ? 0 : 0.45, ease: 'power3.out' });
  gsap.to('#scrim', { opacity: 1, duration: 0.3, pointerEvents: 'auto' });
  const body = $('#drawerBody');
  if (onReady) onReady(body);
  if (!RM) gsap.from(body.children, { opacity: 0, y: 14, stagger: 0.05, duration: 0.45, delay: 0.1 });
  body.querySelectorAll('.bar>i[data-w]').forEach((el) => gsap.to(el, { width: `${el.dataset.w}%`, duration: 0.8, delay: 0.3 }));
  $('#drawerX').focus({ preventScroll: true });
}
export function initOverlays(opts = {}) {
  onDrawerClosed = opts.onDrawerClosed || null;
  const d = $('#drawer');
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'drawerTitle');
  d.inert = true; d.setAttribute('aria-hidden', 'true');
  document.addEventListener('keydown', drawerKeys);
  // CSS parks these off-screen with a % transform; reset it so GSAP owns the transform through xPercent / yPercent only
  gsap.set(d, { x: 0, xPercent: 105, visibility: 'hidden' });
  gsap.set('#toast', { xPercent: -50, x: 0, y: 40, left: '50%', autoAlpha: 0 });
  gsap.set('#changes', { y: 0, yPercent: 30, autoAlpha: 0 });
}
// silent: closed by the app itself (route change, a button that navigates), so the address bar is not touched
export function closeDrawer({ silent = false } = {}) {
  if (!drawerOpen) return;
  drawerOpen = false;
  const d = $('#drawer');
  // hidden once parked, so its shadow never shows at the right edge of the screen
  gsap.to(d, { xPercent: 105, duration: RM ? 0 : 0.35, ease: 'power3.in', onComplete: () => { if (!drawerOpen) gsap.set(d, { visibility: 'hidden' }); } });
  gsap.to('#scrim', { opacity: 0, duration: 0.3, pointerEvents: 'none' });
  d.inert = true; d.setAttribute('aria-hidden', 'true');
  const app = $('#app'); if (app) app.inert = false;
  if (lastFocus && document.contains(lastFocus) && !silent) lastFocus.focus({ preventScroll: true });
  lastFocus = null;
  if (!silent && onDrawerClosed) onDrawerClosed();
}

// Keyboard: anything clickable that is not a native control becomes focusable and works with Enter / Space.
const CLICKABLE = '[data-person], [data-box], [data-pool], tr.click, label.drop, [data-kbd]';
export function makeKeyboardFriendly(root) {
  root.querySelectorAll(CLICKABLE).forEach((el) => {
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|OPTION)$/.test(el.tagName)) return;
    // A row that holds its own controls (a weight input, say) can't itself be a button: its first cell takes the
    // keyboard role instead, and a click there still reaches the row's handler.
    let t = el;
    if (el.querySelector('input,select,textarea,button,a[href]')) {
      t = el.querySelector(':scope > td, :scope > th');
      if (!t || t.querySelector('input,select,textarea,button,a[href]')) return;
    }
    if (!t.hasAttribute('tabindex')) t.tabIndex = 0;
    if (!t.hasAttribute('role')) t.setAttribute('role', 'button');
  });
}
export function bindKeyboardActivation(doc) {
  doc.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target;
    if (!(el instanceof HTMLElement) || el.getAttribute('role') !== 'button' || /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    e.preventDefault();
    el.click();
  });
}

let changesT;
const hideChanges = () => gsap.to('#changes', { yPercent: 30, autoAlpha: 0, duration: RM ? 0 : 0.3 });
export function showChanges(items) {
  if (!items.length) return;
  $('#changesList').innerHTML = items.map((i) => `<li>${i}</li>`).join('');
  $('#changesX').onclick = hideChanges;
  gsap.to('#changes', { yPercent: 0, autoAlpha: 1, duration: RM ? 0 : 0.5, ease: 'power3.out' });
  clearTimeout(changesT);
  changesT = setTimeout(hideChanges, 10000);
}

// Confetti burst (Rewards)
const cf = () => document.getElementById('confetti');
let parts = [], running = false;
const COLS = ['#ff5a5f', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#5f7cff', '#a55eea'];
export function confetti(x, y) {
  if (RM) return;
  const c = cf(), ctx = c.getContext('2d'), d = Math.min(2, devicePixelRatio || 1);
  c.width = innerWidth * d; c.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  for (let i = 0; i < 170; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95, sp = 7 + Math.random() * 10;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.25 + Math.random() * 0.12, w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35, c: COLS[i % 7], life: 0 });
  }
  if (running) return;
  running = true;
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life < 260 && p.y < innerHeight + 60);
    for (const p of parts) {
      p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - p.life / 260);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  requestAnimationFrame(tick);
}

// Original mascot "Volty" (a small battery). Inline SVG, no external files.
export const volty = (mood = 'happy') => `<svg class="volty" viewBox="0 0 48 48" aria-hidden="true">
  <rect x="9" y="8" width="30" height="36" rx="8" fill="#8b5cf6"/><rect x="18" y="3" width="12" height="6" rx="2" fill="#5f3fd6"/>
  <rect x="13" y="${mood === 'happy' ? 24 : 30}" width="22" height="${mood === 'happy' ? 16 : 10}" rx="4" fill="#48dbfb" opacity=".9"/>
  <circle cx="19" cy="19" r="2.6" fill="#fff"/><circle cx="29" cy="19" r="2.6" fill="#fff"/>
  <path d="${mood === 'happy' ? 'M19 25 Q24 30 29 25' : 'M19 28 Q24 25 29 28'}" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

export function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// A darker shade of an accent colour that reads as text on white and on the paper background (WCAG AA, 4.5:1).
const _lum = (h) => { const n = String(h).replace('#', ''); const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const _ratio = (a, b) => { const x = _lum(a), y = _lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export function textOn(hex, min = 4.5) {
  if (!/^#[0-9a-f]{6}$/i.test(String(hex))) return hex;
  const n = hex.slice(1);
  for (let k = 1; k > 0.05; k -= 0.02) {
    const c = `#${[0, 2, 4].map((i) => Math.round(parseInt(n.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;
    if (_ratio(c, '#ffffff') >= min && _ratio(c, '#f4f1ea') >= min) return c;
  }
  return '#14151c';
}

/* ---------------- searchable dropdowns ---------------- */
// Every <select class="sel"> in the app becomes a button that opens a list with a search box (type part of a name,
// a role, a site or a group: all words must match, accents ignored). The native select stays in the page, hidden,
// and keeps the value: a pick sets it and fires its "change" event, so each screen's own listener works unchanged.
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let cb = null;      // the open list: { sel, btn, pop, input, items, active, close }
let cbSeq = 0;
export function enhanceSelects(root) {
  if (!root) return;
  root.querySelectorAll('select.sel:not([data-cb])').forEach(makeCombo);
}
function cbOptions(sel) {
  const out = [];
  const push = (o, group) => { if (!o.disabled) out.push({ o, group }); };
  for (const el of sel.children) {
    if (el.tagName === 'OPTGROUP') for (const o of el.children) push(o, el.label);
    else if (el.tagName === 'OPTION') push(el, '');
  }
  // A leading empty option ("Jump to a persona…") is a prompt, not a choice: it becomes the button text instead.
  const prompt = out[0] && out[0].o.value === '' && out.length > 1 ? out.shift().o.textContent : '';
  return { items: out, prompt };
}
const cbLabel = (sel) => (sel.getAttribute('aria-label') || sel.labels?.[0]?.textContent || sel.title || 'Choose').trim();
function makeCombo(sel) {
  sel.dataset.cb = '1';
  const id = sel.id || `cb${++cbSeq}`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = `${id}Cb`;
  btn.className = ['cb-btn', ...[...sel.classList].filter((c) => c !== 'sel')].join(' ');
  if (sel.getAttribute('style')) btn.setAttribute('style', sel.getAttribute('style'));
  if (sel.title) btn.title = sel.title;
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="cb-val"></span><svg class="cb-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  sel.after(btn);
  sel.classList.add('cb-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  const sync = () => {
    const o = sel.selectedOptions[0];
    const { prompt } = cbOptions(sel);
    const text = o && o.value !== '' ? o.textContent : prompt || o?.textContent || '';
    btn.querySelector('.cb-val').textContent = text;
    btn.setAttribute('aria-label', `${cbLabel(sel)}: ${text}`);
    btn.disabled = sel.disabled;
  };
  sync();
  sel.addEventListener('change', sync);
  sel._cbSync = sync;
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  btn.addEventListener('click', () => (cb?.btn === btn ? cb.close(true) : openCombo(sel, btn)));
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openCombo(sel, btn); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openCombo(sel, btn, e.key); }
  });
}
function openCombo(sel, btn, typed = '') {
  cb?.close(false);
  const { items, prompt } = cbOptions(sel);
  const label = cbLabel(sel);
  const lid = `${btn.id}List`;
  const pop = document.createElement('div');
  pop.className = 'cb-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', label);
  let html = '', grp = null;
  items.forEach((it, i) => {
    if (it.group !== grp) { grp = it.group; if (grp) html += `<div class="cb-grp" data-g="${esc(grp)}" role="presentation">${esc(grp)}</div>`; }
    html += `<div class="cb-opt${it.o.selected && it.o.value !== '' ? ' on' : ''}" role="option" id="${lid}${i}" data-i="${i}" data-g="${esc(it.group)}" aria-selected="${it.o.selected && it.o.value !== ''}">${esc(it.o.textContent)}</div>`;
  });
  pop.innerHTML = `<div class="cb-search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m10.6 10.6 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <input type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${lid}" aria-label="Search: ${esc(label)}" placeholder="Search ${items.length} option${items.length === 1 ? '' : 's'}…" autocomplete="off" spellcheck="false"></div>
    <div class="cb-list" role="listbox" id="${lid}" aria-label="${esc(label)}">${html}</div>
    <p class="cb-empty" hidden>No match. Try part of a name, a role or a site.</p>
    <p class="cb-count" aria-live="polite"></p>`;
  document.body.append(pop);
  const input = pop.querySelector('input'), list = pop.querySelector('.cb-list');
  const els = [...pop.querySelectorAll('.cb-opt')];
  const keys = items.map((it) => fold(`${it.o.textContent} ${it.group}`));
  let shown = els.map((_, i) => i);
  let active = Math.max(0, items.findIndex((it) => it.o.selected && it.o.value !== ''));
  const setActive = (i, scroll = true) => {
    els[active]?.classList.remove('act');
    active = i;
    const el = els[i];
    if (!el) { input.removeAttribute('aria-activedescendant'); return; }
    el.classList.add('act');
    input.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  };
  const filter = () => {
    const words = fold(input.value).split(/\s+/).filter(Boolean);
    shown = [];
    els.forEach((el, i) => {
      const hit = words.every((w) => keys[i].includes(w));
      el.hidden = !hit;
      if (hit) shown.push(i);
      // mark the first word inside the option's own text
      const t = items[i].o.textContent;
      const at = words.length ? fold(t).indexOf(words[0]) : -1;
      el.innerHTML = at >= 0 ? `${esc(t.slice(0, at))}<mark>${esc(t.slice(at, at + words[0].length))}</mark>${esc(t.slice(at + words[0].length))}` : esc(t);
    });
    pop.querySelectorAll('.cb-grp').forEach((g) => { g.hidden = !els.some((el) => !el.hidden && el.dataset.g === g.dataset.g); });
    pop.querySelector('.cb-empty').hidden = shown.length > 0;
    pop.querySelector('.cb-count').textContent = words.length ? `${shown.length} of ${items.length}` : '';
    setActive(shown.includes(active) && !words.length ? active : shown[0] ?? -1);
  };
  const place = () => {
    if (!btn.isConnected) { close(false); return; }
    const r = btn.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const w = Math.min(Math.max(r.width, 280), vw - 16);
    const left = Math.min(Math.max(8, r.left), vw - w - 8);
    const below = vh - r.bottom - 12, above = r.top - 12;
    const down = below >= 260 || below >= above;
    const room = Math.max(160, Math.min(420, down ? below : above));
    pop.style.width = `${w}px`;
    pop.style.left = `${left}px`;
    list.style.maxHeight = `${room - 64}px`;
    pop.style.top = down ? `${r.bottom + 6}px` : '';
    pop.style.bottom = down ? '' : `${vh - r.top + 6}px`;
  };
  let raf = 0;
  const onMove = (e) => { if (pop.contains(e.target)) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  const onDown = (e) => { if (!pop.contains(e.target) && !btn.contains(e.target)) close(false); };
  const pick = (i) => {
    const it = items[i];
    if (!it) return;
    const bid = btn.id;
    close(false);
    if (sel.value !== it.o.value) {
      sel.value = it.o.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel._cbSync?.();       // a listener may have changed the value again (the persona jump resets itself)
    }
    // the screen may have redrawn itself on "change": focus the button that is there now
    (document.getElementById(bid) || btn).focus({ preventScroll: true });
  };
  function close(refocus) {
    if (cb?.pop !== pop) return;
    cb = null;
    removeEventListener('scroll', onMove, true);
    removeEventListener('resize', onMove);
    document.removeEventListener('pointerdown', onDown, true);
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('open');
    pop.remove();
    if (refocus && btn.isConnected) btn.focus({ preventScroll: true });
  }
  cb = { sel, btn, pop, close };
  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    const pos = shown.indexOf(active);
    const move = (k) => { e.preventDefault(); if (shown.length) setActive(shown[Math.max(0, Math.min(shown.length - 1, k))]); };
    if (e.key === 'ArrowDown') move(pos + 1);
    else if (e.key === 'ArrowUp') move(pos - 1);
    else if (e.key === 'PageDown') move(pos + 8);
    else if (e.key === 'PageUp') move(pos - 8);
    else if (e.key === 'Home' && e.ctrlKey) move(0);
    else if (e.key === 'End' && e.ctrlKey) move(shown.length - 1);
    else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0 && !els[active]?.hidden) pick(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') { e.preventDefault(); close(true); }
  });
  list.addEventListener('pointermove', (e) => { const o = e.target.closest('.cb-opt'); if (o && Number(o.dataset.i) !== active) setActive(Number(o.dataset.i), false); });
  list.addEventListener('click', (e) => { const o = e.target.closest('.cb-opt'); if (o) pick(Number(o.dataset.i)); });
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('open');
  place();
  addEventListener('scroll', onMove, true);
  addEventListener('resize', onMove);
  document.addEventListener('pointerdown', onDown, true);
  if (typed) input.value = typed;
  filter();
  if (!typed && active >= 0) setActive(active);
  input.focus({ preventScroll: true });
  if (!RM && gsap) gsap.fromTo(pop, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' });
}
export const closeCombo = () => cb?.close(false);
