// People directory: filter, search, open any profile.
import * as UI from '../ui.js';
const { esc } = UI;

export default {
  nextNote: 'Bring your own organisation',
  render(ctx) {
    const f = ctx.sel('pf', { c: 'all', role: 'all', q: '', track: 'all', limit: 60 });
    const roles = ctx.roles();
    const personaIds = new Set(ctx.out.personas.filter((p) => p.row).map((p) => p.emp_id));
    const q = String(f.q || '').trim().toLowerCase();
    if (f.track === 'persona' && !personaIds.size) f.track = 'all';
    let rows = ctx.out.employees.filter((r) => (f.c === 'all' || r.emp.country === f.c) && (f.role === 'all' || r.emp.role_id === f.role) && (f.track === 'all' || r.result.track.track === f.track || (f.track === 'persona' && personaIds.has(r.emp.emp_id))));
    if (q) rows = rows.filter((r) => `${r.emp.name} ${r.title} ${r.emp.site} ${r.emp.emp_id}`.toLowerCase().includes(q));
    rows.sort((a, b) => (personaIds.has(b.emp.emp_id) - personaIds.has(a.emp.emp_id)) || (b.result.composite ?? 0) - (a.result.composite ?? 0));
    return `
      ${UI.pageHead({ eyebrow: 'People', title: `${ctx.out.employees.length} people, <em>every number explained.</em>`, sub: 'Click anyone to open their profile: scores, gates, ranking, reward, helix and training needs, each with the rule that produced it.' })}
      <div class="card"><div class="row">
        <label class="sr-only" for="pq">Search people</label><input class="inp" id="pq" type="search" placeholder="Search name, role, site…" value="${esc(f.q)}" style="flex:1;min-width:180px">
        <div class="seg wrap" id="pc" role="group" aria-label="Country">${[['all', 'All'], ['IN', 'IN'], ['CN', 'CN']].map(([k, l]) => `<button class="${f.c === k ? 'on' : ''}" data-v="${k}" aria-pressed="${f.c === k}">${l}</button>`).join('')}</div>
        <label class="sr-only" for="pr">Role</label><select class="sel" id="pr"><option value="all">All roles</option>${roles.map((r) => `<option value="${esc(r.role_id)}"${f.role === r.role_id ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select>
        <div class="seg wrap" id="pt" role="group" aria-label="Track">${[['all', 'All'], ...(personaIds.size ? [['persona', 'Personas']] : []), ['leadership', 'Leadership'], ['rampup', 'Ramp-up'], ['standard', 'Standard']].map(([k, l]) => `<button class="${f.track === k ? 'on' : ''}" data-v="${k}" aria-pressed="${f.track === k}">${l}</button>`).join('')}</div>
      </div>
      <div class="small muted mt" role="status">${rows.length} shown${q ? ` for “${esc(String(f.q).trim())}”` : ''}</div>
      ${rows.length ? `<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Site</th><th scope="col">Composite</th><th scope="col">Rating</th><th scope="col">Track</th><th scope="col">Tier</th><th scope="col">9-box</th><th scope="col">Helix</th></tr></thead><tbody>
        ${rows.slice(0, f.limit).map((r) => `<tr class="click${personaIds.has(r.emp.emp_id) ? ' persona' : ''}" data-person="${esc(r.emp.emp_id)}"><td><div class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(r.emp.name)}<div><b>${esc(r.emp.name)}</b>${personaIds.has(r.emp.emp_id) ? '<span class="persona-dot"></span>' : ''}<div class="small muted">${esc(r.emp.emp_id)}</div></div></div></td><td class="small">${esc(r.title)}</td><td class="small">${esc(r.emp.site)} ${UI.code(r.emp.country)}</td><td><b>${UI.fmt(r.result.composite)}</b></td><td>${UI.rate(r.result.rating, r.result.capped)}</td><td><span class="tag ${r.result.track.track === 'leadership' ? 'purple' : r.result.track.track === 'rampup' ? 'info' : ''}">${esc(r.result.track.track)}</span></td><td>${r.tier ? UI.tier(r.tier.tier) : '<span class="muted small">—</span>'}</td><td class="small">${esc(r.nineBox?.label || '')}</td><td>${r.helix.built}/7</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty mt"><b>No matches.</b> <span class="why">Nobody fits ${q ? `“${esc(String(f.q).trim())}” with ` : ''}these filters.</span> <button class="btn light sm" id="pclear">Clear the filters</button></div>`}
      ${rows.length > f.limit ? `<div class="row mt" style="justify-content:center"><button class="btn light" id="more">Show more (${rows.length - f.limit} left)</button></div>` : ''}</div>`;
  },
  mount(root, ctx) {
    const f = { ...ctx.sel('pf', { c: 'all', role: 'all', q: '', track: 'all', limit: 60 }) };
    const set = (k, v) => { f[k] = v; if (k !== 'limit') f.limit = 60; ctx.setSel('pf', { ...f }); };
    root.querySelectorAll('#pc [data-v]').forEach((b) => b.addEventListener('click', () => set('c', b.dataset.v)));
    root.querySelectorAll('#pt [data-v]').forEach((b) => b.addEventListener('click', () => set('track', b.dataset.v)));
    root.querySelector('#pr').addEventListener('change', (e) => set('role', e.target.value));
    let t;
    const q = root.querySelector('#pq');
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { set('q', q.value); const n = document.querySelector('#pq'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); }, 250); });
    root.querySelector('#more')?.addEventListener('click', () => set('limit', f.limit + 80));
    root.querySelector('#pclear')?.addEventListener('click', () => ctx.setSel('pf', { c: 'all', role: 'all', q: '', track: 'all', limit: 60 }));
    ctx.onCleanup(() => clearTimeout(t));
  },
};
