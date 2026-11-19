// Hand-rolled SVG charts (light, offline, animated with GSAP).
import { esc, RM, gsap } from './ui.js';

const W = 560;

// Histogram of 1-5 scores with a bell curve and a "best and the rest" (log-normal) overlay
export function histogram(values, { bins = 16, lo = 1, hi = 5, color = '#5f7cff', height = 220, mark = [] } = {}) {
  const v = values.filter((x) => x !== null && x !== undefined);
  const H = height, pad = { l: 30, r: 10, t: 12, b: 26 };
  const bw = (hi - lo) / bins;
  const counts = Array.from({ length: bins }, () => 0);
  v.forEach((x) => { counts[Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / bw)))]++; });
  const maxC = Math.max(1, ...counts);
  const X = (x) => pad.l + ((x - lo) / (hi - lo)) * (W - pad.l - pad.r);
  const Y = (c) => H - pad.b - (c / maxC) * (H - pad.t - pad.b);
  const n = v.length || 1, mean = v.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1)) || 0.5;
  const shift = Math.min(...v) - 0.3;
  const lv = v.map((x) => Math.log(x - shift));
  const mu = lv.reduce((s, x) => s + x, 0) / n;
  const sg = Math.sqrt(lv.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, n - 1)) || 0.3;
  const pts = (fn) => {
    const out = [];
    for (let i = 0; i <= 80; i++) { const x = lo + ((hi - lo) * i) / 80; out.push([X(x), Y(fn(x) * n * bw)]); }
    return out.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${Math.max(pad.t, p[1]).toFixed(1)}`).join('');
  };
  const normal = (x) => Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
  const lognorm = (x) => (x - shift <= 0 ? 0 : Math.exp(-((Math.log(x - shift) - mu) ** 2) / (2 * sg * sg)) / ((x - shift) * sg * Math.sqrt(2 * Math.PI)));
  const rects = counts.map((c, i) => `<rect class="hb" x="${(X(lo + i * bw) + 1).toFixed(1)}" y="${Y(c).toFixed(1)}" width="${(X(lo + bw) - X(lo) - 2).toFixed(1)}" height="${(H - pad.b - Y(c)).toFixed(1)}" rx="3" fill="${color}" opacity=".75"/>`).join('');
  const ticks = [1, 2, 3, 4, 5].map((t) => `<text x="${X(t)}" y="${H - 8}" text-anchor="middle">${t}</text>`).join('');
  const marks = mark.map((m) => `<line x1="${X(m.x)}" x2="${X(m.x)}" y1="${pad.t}" y2="${H - pad.b}" stroke="${m.color || '#8b5cf6'}" stroke-dasharray="3 3"/><text x="${X(m.x) + 4}" y="${pad.t + 10}" fill="${m.color || '#8b5cf6'}" style="fill:${m.color || '#8b5cf6'};font-weight:800">${esc(m.label)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" data-anim="hist">${rects}
    <path class="ln" d="${pts(normal)}" fill="none" stroke="#e0a800" stroke-width="2.5"/>
    <path class="ln" d="${pts(lognorm)}" fill="none" stroke="#e5484d" stroke-width="2.5"/>
    <line x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}" stroke="rgba(120,120,140,.3)"/>${ticks}${marks}</svg>
    <div class="legend"><span><i style="background:${color}"></i>People (composite score)</span><span><i style="background:#e0a800"></i>Bell curve (what forced ranking assumes)</span><span><i style="background:#e5484d"></i>"Best and the rest" (O'Boyle & Aguinis, 2012)</span></div>`;
}

export function radar(axes, { max = 5, color = '#5f7cff', size = 300, second = null, secondColor = '#8d91a6' } = {}) {
  const c = size / 2, r = size / 2 - 46, n = axes.length;
  const P = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + Math.cos(a) * r * (v / max), c + Math.sin(a) * r * (v / max)]; };
  const ring = (f) => axes.map((_, i) => P(i, max * f).join(',')).join(' ');
  const poly = (vals) => vals.map((v, i) => P(i, Math.max(0, v)).join(',')).join(' ');
  const labels = axes.map((a, i) => { const [x, y] = P(i, max * 1.2); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" style="font-weight:700">${esc(a.label)}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${size} ${size}" data-anim="radar" style="max-width:${size + 40}px;margin:0 auto">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" fill="none" stroke="rgba(120,120,140,.2)"/>`).join('')}
    ${second ? `<polygon class="rp" points="${poly(second)}" fill="${secondColor}" fill-opacity=".12" stroke="${secondColor}" stroke-dasharray="4 3" style="transform-origin:${c}px ${c}px"/>` : ''}
    <polygon class="rp" points="${poly(axes.map((a) => a.value))}" fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="2.5" style="transform-origin:${c}px ${c}px"/>
    ${axes.map((a, i) => { const [x, y] = P(i, Math.max(0, a.value)); return `<circle class="rd" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`; }).join('')}
    ${labels}</svg>`;
}

export function donut(items, { size = 180, hole = 0.62, label = '' } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1, c = size / 2, r = size / 2 - 6;
  let a0 = -Math.PI / 2;
  const arcs = items.map((it) => {
    const a1 = a0 + (it.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a, rr) => [c + Math.cos(a) * rr, c + Math.sin(a) * rr];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, r * hole), [x3, y3] = p(a0, r * hole);
    const d = `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r * hole},${r * hole} 0 ${large} 0 ${x3},${y3} Z`;
    a0 = a1;
    return `<path class="dn" d="${d}" fill="${it.color}"><title>${esc(it.label)}: ${it.value}</title></path>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${size} ${size}" data-anim="donut" style="max-width:${size}px">${arcs}<text x="${c}" y="${c - 4}" text-anchor="middle" style="font-family:var(--display);font-size:28px;fill:currentColor">${esc(label)}</text><text x="${c}" y="${c + 16}" text-anchor="middle">weights</text></svg>`;
}

export function gauge(pctVal, { left = 'Traditional', right = 'Contemporary', dark = true } = {}) {
  const rot = -90 + pctVal * 1.8;
  return `<svg class="chart" viewBox="0 0 240 130" data-anim="gauge" style="max-width:240px;margin:0 auto">
    <defs><linearGradient id="gg${Math.round(pctVal)}" x1="0" x2="1"><stop offset="0" stop-color="#ff9f43"/><stop offset="1" stop-color="#48dbfb"/></linearGradient></defs>
    <path d="M20 112 A100 100 0 0 1 220 112" fill="none" stroke="${dark ? '#272938' : '#e6e3dc'}" stroke-width="16" stroke-linecap="round"/>
    <path d="M20 112 A100 100 0 0 1 220 112" fill="none" stroke="url(#gg${Math.round(pctVal)})" stroke-width="6" stroke-linecap="round"/>
    <line class="needle" data-rot="${rot}" x1="120" y1="112" x2="120" y2="30" stroke="${dark ? '#fff' : '#14151c'}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="120" cy="112" r="9" fill="${dark ? '#fff' : '#14151c'}"/></svg>
    <div class="lbls" style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8d91a6"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
}

export function hbars(items, { max = null, suffix = '', dec = 1, color = null } = {}) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return items.map((i) => `<div class="hbar"><span class="lab" title="${esc(i.label)}">${esc(i.label)}</span><div class="bar"><i data-w="${(i.value / m) * 100}" style="background:${i.color || color || 'var(--mc)'}"></i></div><span class="val">${i.value === null ? '—' : Number(i.value).toFixed(dec)}${suffix}</span></div>`).join('');
}

export function animateCharts(root) {
  if (!gsap) return;
  root.querySelectorAll('svg.chart').forEach((svg) => {
    const kind = svg.dataset.anim;
    if (RM) {
      svg.querySelectorAll('.needle').forEach((n) => gsap.set(n, { rotation: Number(n.dataset.rot), svgOrigin: '120 112' }));
      return;
    }
    if (kind === 'hist') {
      gsap.from(svg.querySelectorAll('.hb'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.7, stagger: 0.025, ease: 'power3.out' });
      svg.querySelectorAll('.ln').forEach((p, i) => { const L = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.3, delay: 0.4 + i * 0.25, ease: 'power2.inOut' }); });
    } else if (kind === 'radar') {
      gsap.from(svg.querySelectorAll('.rp'), { scale: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.15 });
      gsap.from(svg.querySelectorAll('.rd'), { opacity: 0, duration: 0.4, delay: 0.6, stagger: 0.04 });
    } else if (kind === 'donut') {
      gsap.from(svg.querySelectorAll('.dn'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', svgOrigin: `${svg.viewBox.baseVal.width / 2} ${svg.viewBox.baseVal.height / 2}`, duration: 0.6, stagger: 0.06, ease: 'back.out(1.6)' });
    } else if (kind === 'gauge') {
      svg.querySelectorAll('.needle').forEach((n) => gsap.fromTo(n, { rotation: -90, svgOrigin: '120 112' }, { rotation: Number(n.dataset.rot), svgOrigin: '120 112', duration: 1.5, ease: 'elastic.out(1,0.4)' }));
    }
  });
}
