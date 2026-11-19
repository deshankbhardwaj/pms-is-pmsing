// People directory: filter, search, open any profile.
import * as UI from '../ui.js';
const { esc } = UI;

export default {
  nextNote: 'Bring your own organisation',
  render(ctx) {
    const f = ctx.sel('pf', { c: 'all', role: 'all', q: '', track: 'all', limit: 60 });
    const roles = [...ctx.idx.role.values()].filter((r) => r.role_id !== 'EXE');
    const personaIds = new Set(ctx.out.personas.map((p) => p.emp_id));
    let rows = ctx.out.employees.filter((r) => (f.c === 'all' || r.emp.country === f.c) && (f.role === 'all' || r.emp.role_id === f.role) && (f.track === 'all' || r.result.track.track === f.track || (f.track === 'persona' && personaIds.has(r.emp.emp_id))));
    if (f.q) { const q = f.q.toLowerCase(); rows = rows.filter((r) => `${r.emp.name} ${r.title} ${r.emp.site} ${r.emp.emp_id}`.toLowerCase().includes(q)); }
    rows.sort((a, b) => (personaIds.has(b.emp.emp_id) - personaIds.has(a.emp.emp_id)) || (b.result.composite ?? 0) - (a.result.composite ?? 0));
    return `
      ${UI.pageHead({ eyebrow: 'People', title: `${ctx.out.employees.length} people, <em>every number explained.</em>`, sub: 'Click anyone to open their profile: scores, gates, ranking, reward, helix and training needs, each with the rule that produced it.' })}
      <div class="card"><div class="row">
        <input class="inp" id="pq" placeholder="Search name, role, site…" value="${esc(f.q)}" style="flex:1;min-width:180px">
        <div class="seg" id="pc">${[['all', 'All'], ['IN', 'IN'], ['CN', 'CN']].map(([k, l]) => `<button class="${f.c === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
        <select class="sel" id="pr"><option value="all">All roles</option>${roles.map((r) => `<option value="${r.role_id}"${f.role === r.role_id ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</select>
        <div class="seg" id="pt">${[['all', 'All'], ['persona', 'Personas'], ['leadership', 'Leadership'], ['rampup', 'Ramp-up'], ['standard', 'Standard']].map(([k, l]) => `<button class="${f.track === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="small muted mt">${rows.length} shown</div>
      <div style="overflow-x:auto" class="mt"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Site</th><th>Composite</th><th>Rating</th><th>Track</th><th>Tier</th><th>9-box</th><th>Helix</th></tr></thead><tbody>
        ${rows.slice(0, f.limit).map((r) => `<tr class="click${personaIds.has(r.emp.emp_id) ? ' persona' : ''}" data-person="${r.emp.emp_id}"><td><div class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(r.emp.name)}<div><b>${esc(r.emp.name)}</b>${personaIds.has(r.emp.emp_id) ? '<span class="persona-dot"></span>' : ''}<div class="small muted">${esc(r.emp.emp_id)}</div></div></div></td><td class="small">${esc(r.title)}</td><td class="small">${esc(r.emp.site)} ${UI.code(r.emp.country)}</td><td><b>${UI.fmt(r.result.composite)}</b></td><td>${UI.rate(r.result.rating, r.result.capped)}</td><td><span class="tag ${r.result.track.track === 'leadership' ? 'purple' : r.result.track.track === 'rampup' ? 'info' : ''}">${esc(r.result.track.track)}</span></td><td>${r.tier ? UI.tier(r.tier.tier) : '<span class="muted small">—</span>'}</td><td class="small">${esc(r.nineBox?.label || '')}</td><td>${r.helix.built}/7</td></tr>`).join('')}
      </tbody></table></div>
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
  },
};
