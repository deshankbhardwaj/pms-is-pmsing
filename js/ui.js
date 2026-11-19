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
  return `<header class="ph"><div class="eyebrow">${esc(eyebrow)}</div><h2 class="t">${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</header>`;
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
  const h = root.querySelector('h2.t');
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
  if (gsap) gsap.to(t, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' });
  else t.style.opacity = 1;
  toastT = setTimeout(() => { if (gsap) gsap.to(t, { opacity: 0, y: 40, duration: 0.3 }); else t.style.opacity = 0; }, ms);
}

export function openDrawer(headHtml, bodyHtml, onReady) {
  $('#drawerHead').innerHTML = `${headHtml}<button class="x" id="drawerX" aria-label="Close">×</button>`;
  $('#drawerBody').innerHTML = bodyHtml;
  $('#drawerX').onclick = closeDrawer;
  $('#scrim').onclick = closeDrawer;
  gsap.to('#drawer', { xPercent: 0, duration: RM ? 0 : 0.45, ease: 'power3.out' });
  gsap.to('#scrim', { opacity: 1, duration: 0.3, pointerEvents: 'auto' });
  const body = $('#drawerBody');
  if (onReady) onReady(body);
  if (!RM) gsap.from(body.children, { opacity: 0, y: 14, stagger: 0.05, duration: 0.45, delay: 0.1 });
  body.querySelectorAll('.bar>i[data-w]').forEach((el) => gsap.to(el, { width: `${el.dataset.w}%`, duration: 0.8, delay: 0.3 }));
}
export function initOverlays() {
  // CSS parks these off-screen with a % transform; reset it so GSAP owns the transform through xPercent / yPercent only
  gsap.set('#drawer', { x: 0, xPercent: 105 });
  gsap.set('#toast', { xPercent: -50, x: 0, y: 40, left: '50%' });
  gsap.set('#changes', { y: 0, yPercent: 130 });
}
export function closeDrawer() {
  gsap.to('#drawer', { xPercent: 105, duration: RM ? 0 : 0.35, ease: 'power3.in' });
  gsap.to('#scrim', { opacity: 0, duration: 0.3, pointerEvents: 'none' });
}

let changesT;
export function showChanges(items) {
  if (!items.length) return;
  $('#changesList').innerHTML = items.map((i) => `<li>${i}</li>`).join('');
  $('#changesX').onclick = () => gsap.to('#changes', { yPercent: 130, duration: 0.3 });
  gsap.to('#changes', { yPercent: 0, duration: RM ? 0 : 0.5, ease: 'power3.out' });
  clearTimeout(changesT);
  changesT = setTimeout(() => gsap.to('#changes', { yPercent: 130, duration: 0.4 }), 9000);
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
