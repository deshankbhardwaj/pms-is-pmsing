// M11 Data Hub: load sample · upload Excel/CSV · validate (v0.4 §10.2) · preview · commit · export. Everything stays in the browser.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
const REQUIRED = ['Org', 'Roles', 'KPIs', 'Employees', 'KPI_Actuals'];
const OPTIONAL = ['Departments', 'Competencies', 'Feedback_360', 'CheckIns', 'Dev_Goals', 'Experiences', 'Leadership_Profile', 'Training_Catalogue', 'Training_Records', 'Reward_Policy', 'Recognition', 'Country_Config'];
let pending = null; // { data, report, name }

function norm(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
    if ('result' in v) return norm(v.result);
    if ('text' in v) return String(v.text).trim();
    if ('error' in v) return '';
    return '';
  }
  return typeof v === 'string' ? v.trim() : v;
}
async function parseXlsx(buf) {
  const wb = new window.ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const out = {};
  wb.eachSheet((ws) => {
    if (ws.name === 'README') return;
    const head = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (c, i) => { head[i] = String(norm(c.value)); });
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn === 1) return;
      const o = {}; let any = false;
      head.forEach((h, i) => { if (!h) return; const v = norm(row.getCell(i).value); o[h] = v; if (v !== '') any = true; });
      if (any) rows.push(o);
    });
    out[ws.name] = rows;
  });
  return out;
}
function parseCsv(text) {
  const rows = []; let cur = [''], q = false, row = [];
  const push = () => { row.push(cur.join('')); cur = ['']; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur.push('"'); i++; } else if (ch === '"') q = false; else cur.push(ch); }
    else if (ch === '"') q = true; else if (ch === ',') push(); else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; push(); rows.push(row); row = []; } else cur.push(ch);
  }
  if (cur.join('') || row.length) { push(); rows.push(row); }
  const [h, ...rest] = rows.filter((r) => r.some((x) => x !== ''));
  return rest.map((r) => Object.fromEntries(h.map((k, i) => { const v = (r[i] ?? '').trim(); return [k.trim(), v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v]; })));
}

export function validate(data, sample) {
  const errs = [], warns = [];
  const E = (sheet, row, msg) => errs.push({ sheet, row, msg }), W = (sheet, row, msg) => warns.push({ sheet, row, msg });
  for (const s of REQUIRED) if (!data[s] || !data[s].length) E(s, null, 'Required sheet is missing or empty');
  for (const s of OPTIONAL) if (!data[s]) W(s, null, 'Optional sheet not found; screens that use it will be thinner');
  for (const s of [...REQUIRED, ...OPTIONAL]) {
    if (!data[s]?.length || !sample[s]?.length) continue;
    const cols = Object.keys(sample[s][0]), have = Object.keys(data[s][0]);
    const miss = cols.filter((c) => !have.includes(c));
    if (miss.length) E(s, 1, `Missing columns: ${miss.join(', ')}`);
  }
  if (errs.length) return { errs, warns };
  const uniq = (s, key) => { const seen = new Set(); data[s].forEach((r, i) => { if (seen.has(r[key])) E(s, i + 2, `Duplicate ${key} "${r[key]}"`); if (r[key] === '') E(s, i + 2, `Empty ${key}`); seen.add(r[key]); }); return seen; };
  const roles = uniq('Roles', 'role_id'), emps = uniq('Employees', 'emp_id'), kpis = uniq('KPIs', 'kpi_id');
  const org = data.Org[0];
  for (const k of ['pace', 'innovation', 'cost_focus', 'team_orientation', 'risk_appetite', 'customer_intimacy']) { const v = Number(org[k]); if (!(v >= 1 && v <= 10)) E('Org', 2, `${k} must be 1–10 (got "${org[k]}")`); }
  data.Roles.forEach((r, i) => { for (const k of ['measurability', 'interdependence', 'standardisation', 'innovation', 'talent_supply', 'digital_access', 'seniority', 'regulatory_criticality']) { const v = Number(r[k]); if (!(v >= 1 && v <= 5)) E('Roles', i + 2, `${k} must be 1–5`); } });
  const wsum = {};
  data.KPIs.forEach((k, i) => {
    if (!roles.has(k.role_id)) E('KPIs', i + 2, `role_id "${k.role_id}" is not in Roles`);
    if (!['KPI', 'KR', 'Behaviour', 'Gate'].includes(k.type)) E('KPIs', i + 2, `type must be KPI, KR, Behaviour or Gate (got "${k.type}")`);
    if (k.type !== 'Gate') {
      wsum[k.role_id] = (wsum[k.role_id] || 0) + Number(k.weight_pct || 0);
      const a = Number(k.threshold), b = Number(k.target), c = Number(k.stretch);
      if (!((a < b && b < c) || (a > b && b > c))) E('KPIs', i + 2, `threshold → target → stretch must run in one direction (${k.threshold} → ${k.target} → ${k.stretch})`);
      if (k.type === 'KPI' && ((k.polarity === 'lower') !== (a > b))) W('KPIs', i + 2, `polarity "${k.polarity}" does not match the direction of the targets`);
    }
  });
  for (const [r, s] of Object.entries(wsum)) if (Math.round(s) !== 100) E('KPIs', null, `Weights for role ${r} add to ${s}, not 100`);
  const dateOk = (v) => v === '' || !Number.isNaN(Date.parse(v));
  data.Employees.forEach((e, i) => {
    if (!roles.has(e.role_id)) E('Employees', i + 2, `role_id "${e.role_id}" is not in Roles`);
    if (e.manager_id && !emps.has(e.manager_id)) E('Employees', i + 2, `manager_id "${e.manager_id}" is not an employee`);
    if (!['INR', 'CNY'].includes(e.currency)) E('Employees', i + 2, `currency must be INR or CNY (got "${e.currency}")`);
    if (!['IN', 'CN'].includes(e.country)) E('Employees', i + 2, `country must be IN or CN (got "${e.country}")`);
    for (const k of ['hire_date', 'role_start_date']) if (!dateOk(e[k])) E('Employees', i + 2, `${k} is not a date`);
    if (!(Number(e.potential) >= 1 && Number(e.potential) <= 3)) W('Employees', i + 2, 'potential should be 1–3');
  });
  let bad = 0;
  data.KPI_Actuals.forEach((a, i) => { if (!emps.has(a.emp_id) || !kpis.has(a.kpi_id)) { bad++; if (bad <= 10) E('KPI_Actuals', i + 2, `Unknown ${!emps.has(a.emp_id) ? `emp_id "${a.emp_id}"` : `kpi_id "${a.kpi_id}"`}`); } });
  if (bad > 10) E('KPI_Actuals', null, `…and ${bad - 10} more rows with unknown IDs`);
  (data.Feedback_360 || []).forEach((f, i) => { const v = Number(f.score); if (!(v >= 1 && v <= 5)) E('Feedback_360', i + 2, 'score must be 1–5'); });
  (data.CheckIns || []).forEach((c, i) => { if (!dateOk(c.date)) E('CheckIns', i + 2, 'date is not a date'); });
  let noFb = 0;
  (data.Experiences || []).forEach((x, i) => { if (x.status === 'done' && !x.feedback_source_id) { noFb++; if (noFb <= 5) W('Experiences', i + 2, `${x.emp_id} ${x.experience_type}: a stretch experience needs a feedback source (Built-70 rule 3); no stamp until it has one`); } });
  if (noFb > 5) W('Experiences', null, `…and ${noFb - 5} more experiences without a feedback source`);
  return { errs, warns };
}

function reportHtml(rep, data) {
  const counts = Object.entries(data).filter(([k]) => k !== 'meta').map(([k, v]) => `<span class="tag">${esc(k)} · ${v.length}</span>`).join('');
  const li = (x) => `<li><b>${esc(x.sheet)}</b>${x.row ? ` row ${x.row}` : ''}: ${esc(x.msg)}</li>`;
  return `<div class="chips">${counts}</div>
    <div class="vsum mt"><span class="tag ${rep.errs.length ? 'bad' : 'good'}">${rep.errs.length ? `✕ ${rep.errs.length} errors` : '✓ No errors'}</span><span class="tag warn">${rep.warns.length} warnings</span></div>
    ${rep.errs.length ? `<h4 class="mt">Errors (fix these in the workbook)</h4><ul class="dots vlist">${rep.errs.slice(0, 40).map(li).join('')}</ul>` : ''}
    ${rep.warns.length ? `<h4 class="mt">Warnings</h4><ul class="dots vlist">${rep.warns.slice(0, 20).map(li).join('')}</ul>` : ''}`;
}

export default {
  nextNote: 'How it all works, for the evaluator',
  render(ctx) {
    const d = ctx.data;
    return `
      ${UI.pageHead({ eyebrow: 'M11 · Data Hub', title: 'Bring your own organisation. <em>It never leaves this browser.</em>', sub: 'Start from the Excel template, fill it in, and upload it here. PRISM checks it, shows every problem with its sheet and row, and re-runs every screen on your data.' })}
      <div class="grid g3">
        <div class="card"><h4>1 · Get the template</h4><p class="why">One sheet per part of the PMS, with a README, drop-downs and one example row.</p>
          <div class="row mt"><a class="btn sm" href="data/templates/pms_input_template.xlsx" download>⬇ Blank template</a><a class="btn light sm" href="data/templates/voltbridge_filled.xlsx" download>⬇ VoltBridge filled</a></div></div>
        <div class="card"><h4>2 · Upload</h4><label class="drop" id="drop"><input type="file" id="file" accept=".xlsx,.csv" hidden><b>Drop an .xlsx here</b><span>or click to choose · a .csv replaces the sheet with the same name</span></label></div>
        <div class="card"><h4>Loaded now</h4><p style="font-weight:800">${esc(ctx.state.source)}</p><p class="why">${esc(ctx.out.org.org_name)} · ${d.Employees.length} employees · ${d.KPIs.length} measures · ${d.KPI_Actuals.length} actuals</p>
          <div class="row mt"><button class="btn light sm" id="loadSample">Reload VoltBridge sample</button><button class="btn light sm" id="valNow">Validate current data</button></div></div>
      </div>
      <div class="card mt" id="report" ${pending ? '' : 'hidden'}><div class="row between"><h3 class="s" style="margin:0" id="repTitle">${pending ? `Checked: ${esc(pending.name)}` : ''}</h3><div class="row"><button class="btn pri sm" id="commit" ${pending && !pending.report.errs.length && pending.commit ? '' : 'hidden'}>Use this data →</button><button class="btn light sm" id="discard">Close</button></div></div><div id="repBody" class="mt">${pending ? reportHtml(pending.report, pending.data) : ''}</div></div>
      <div class="grid g2 mt">
        <div class="card"><h4>3 · Export</h4><p class="why">Take your data and PRISM's results with you.</p>
          <div class="row mt"><button class="btn sm" id="exJson">⬇ Data as JSON</button><button class="btn sm" id="exXlsx">⬇ Results workbook (.xlsx)</button></div></div>
        <div class="card"><h4>Privacy</h4><ul class="dots"><li>Files are read by JavaScript in this tab. Nothing is uploaded to a server; close the tab and it is gone.</li><li>${UI.code('IN')} ${esc(ctx.idx.country.data_privacy?.IN)}. ${UI.code('CN')} ${esc(ctx.idx.country.data_privacy?.CN)}.</li><li>Use pseudonymous IDs for real employees; the sample data is fictional.</li></ul></div>
      </div>
      <div class="card mt"><h4>Sheets PRISM reads</h4><div class="sheets">${[...REQUIRED, ...OPTIONAL].map((s) => `<div><b>${esc(s)}</b>${REQUIRED.includes(s) ? '<span class="tag bad">required</span>' : '<span class="tag">optional</span>'}<small>${esc(Object.keys(ctx.state.sample[s]?.[0] || {}).join(', '))}</small></div>`).join('')}</div></div>`;
  },
  mount(root, ctx) {
    const show = (name, data, report, commit) => {
      pending = { name, data, report, commit };
      root.querySelector('#report').hidden = false;
      root.querySelector('#repTitle').textContent = `Checked: ${name}`;
      root.querySelector('#repBody').innerHTML = reportHtml(report, data);
      root.querySelector('#commit').hidden = !(commit && !report.errs.length);
      if (!RM) gsap.from(root.querySelector('#report'), { opacity: 0, y: 20, duration: 0.4 });
      root.querySelector('#report').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    };
    const handle = async (file) => {
      if (!file) return;
      UI.toast(`Reading ${esc(file.name)}…`);
      try {
        let data;
        if (/\.csv$/i.test(file.name)) {
          const sheet = file.name.replace(/\.csv$/i, '').replace(/^.*[\\/]/, '');
          data = { ...structuredClone(ctx.data), [sheet]: parseCsv(await file.text()) };
        } else {
          if (!window.ExcelJS) throw new Error('The Excel reader has not loaded yet. Try again in a second.');
          data = await parseXlsx(await file.arrayBuffer());
        }
        const sameOrg = data.Employees?.some((e) => ctx.state.sample.meta.personas.some((p) => p.emp_id === e.emp_id));
        data.meta = sameOrg ? structuredClone(ctx.state.sample.meta) : { review_date: new Date().toISOString().slice(0, 10), personas: [] };
        show(file.name, data, validate(data, ctx.state.sample), true);
      } catch (err) { console.error(err); UI.toast(`Could not read that file: ${esc(err.message)}`, 5000); }
    };
    const inp = root.querySelector('#file'), drop = root.querySelector('#drop');
    inp.addEventListener('change', () => handle(inp.files[0]));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => handle(e.dataTransfer.files[0]));
    root.querySelector('#commit').addEventListener('click', () => { const p = pending; pending = null; ctx.setData(p.data, p.name); UI.toast(`<b>${esc(p.name)}</b> loaded. Every screen now runs on it.`); });
    root.querySelector('#discard').addEventListener('click', () => { pending = null; root.querySelector('#report').hidden = true; });
    root.querySelector('#loadSample').addEventListener('click', () => { pending = null; ctx.resetSample(); UI.toast('VoltBridge sample reloaded.'); });
    root.querySelector('#valNow').addEventListener('click', () => show(`${ctx.state.source} (current)`, ctx.data, validate(ctx.data, ctx.state.sample), false));
    root.querySelector('#exJson').addEventListener('click', () => UI.download('prism-data.json', new Blob([JSON.stringify(ctx.data, null, 1)], { type: 'application/json' })));
    root.querySelector('#exXlsx').addEventListener('click', async () => {
      if (!window.ExcelJS) { UI.toast('The Excel writer has not loaded yet.'); return; }
      const wb = new window.ExcelJS.Workbook();
      const add = (name, cols, rows) => {
        const ws = wb.addWorksheet(name);
        ws.columns = cols.map(([h, w]) => ({ header: h, key: h, width: w || 14 }));
        rows.forEach((r) => ws.addRow(r));
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14151C' } };
        ws.eachRow((row, i) => { if (i > 1) row.font = { name: 'Arial', size: 10 }; });
        ws.views = [{ state: 'frozen', ySplit: 1 }];
      };
      add('Results', [['emp_id'], ['name', 22], ['role', 26], ['country', 8], ['track'], ['results'], ['behaviours'], ['growth'], ['composite'], ['rating'], ['gate_failed'], ['tier'], ['nine_box', 18], ['helix_built'], ['bonus'], ['merit_pct'], ['currency']],
        ctx.out.employees.map((r) => ({ emp_id: r.emp.emp_id, name: r.emp.name, role: r.title, country: r.emp.country, track: r.result.track.track, results: r.result.results, behaviours: r.result.behaviours, growth: r.result.growth, composite: r.result.composite, rating: r.result.rating, gate_failed: r.result.gatePassed ? '' : 'Y', tier: r.tier?.tier || '', nine_box: r.nineBox?.label || '', helix_built: r.helix.built, bonus: r.rewards?.bonus ?? '', merit_pct: r.rewards?.meritPct ?? '', currency: r.emp.currency })));
      add('Pools', [['role', 26], ['country'], ['verdict', 30], ['pool_size'], ['shielded'], ['reason', 60], ['method_blend', 50]],
        ctx.out.pools.map((p) => ({ role: ctx.idx.role.get(p.role_id)?.title, country: p.homeCountry, verdict: p.label, pool_size: p.poolSize, shielded: p.shielded.length, reason: p.reason, method_blend: p.methods.items.map((i) => `${i.name} ${i.pct}%`).join(' / ') })));
      add('README', [['about', 100]], [{ about: 'PRISM results export. Generated in the browser from the data loaded in the Data Hub.' }, { about: 'Composite = weighted Results / Behaviours / Growth (weights depend on the track). Rating = rounded composite, capped at 2 if a gate failed.' }, { about: 'All VoltBridge data is fictional (MDI Gurgaon PMS course project).' }]);
      const buf = await wb.xlsx.writeBuffer();
      UI.download('prism-results.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    });
  },
};
