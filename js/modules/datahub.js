// M11 Data Hub: load sample · upload Excel / CSV / JSON · validate (v0.4 §10.2) · preview · commit · export.
// Files are read in this tab. Work is kept only in this browser's storage (see main.js), never sent to a server.
import * as UI from '../ui.js';
const { esc, gsap, RM } = UI;
import { REQUIRED, SHEETS, ReadError, tagRow, matchSheet, parseCsv, parseJson, buildMeta, validate } from '../engine/validate.js';
const EXAMPLE_FILL = /FFF7D6$/i;          // the tinted example row in the blank template
let pending = null; // { name, data, report, commit, info }

/* ---------------- reading .xlsx (ExcelJS, browser only) ---------------- */
function norm(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
    if ('result' in v) return norm(v.result);
    if ('text' in v) return String(v.text).trim();
    return '';
  }
  return typeof v === 'string' ? v.trim() : v;
}
const sameAsExample = (o, ex) => Object.keys(ex).every((k) => String(o[k] ?? '') === String(ex[k] ?? ''));
async function parseXlsx(buf, sample) {
  const wb = new window.ExcelJS.Workbook();
  try { await wb.xlsx.load(buf); } catch {
    throw new ReadError('This file is not a readable Excel workbook (.xlsx). Open it in Excel or Google Sheets and save or download it as .xlsx, or upload a .csv or the "Data as JSON" file.');
  }
  const names = wb.worksheets.map((ws) => ws.name);
  if (names.includes('Results') && names.includes('Pools') && !names.some((n) => matchSheet(n) === 'Employees')) {
    throw new ReadError('This is a PRISM results export. It holds results, not the input data, so it cannot be loaded back. Upload the "Data as JSON" export or a filled template instead.');
  }
  const data = {}, ignored = [];
  let examples = 0;
  wb.eachSheet((ws) => {
    const sheet = matchSheet(ws.name);
    if (!sheet) { if (!/^readme$/i.test(ws.name.trim())) ignored.push(ws.name); return; }
    const head = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (c, i) => { head[i] = String(norm(c.value)).trim(); });
    const ex = sample[sheet]?.[0];
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn === 1) return;
      const o = {}; let any = false;
      head.forEach((h, i) => { if (!h) return; const v = norm(row.getCell(i).value); o[h] = v; if (v !== '') any = true; });
      if (!any) return;
      // the template's tinted example row, still unchanged: skip it (one message, not a list of errors)
      if (ex && EXAMPLE_FILL.test(String(row.getCell(1).fill?.fgColor?.argb || '')) && sameAsExample(o, ex)) { examples++; return; }
      rows.push(tagRow(o, rn));
    });
    data[sheet] = rows;
  });
  return { data, examples, ignored };
}

/* ---------------- report ---------------- */
function reportHtml(rep, data, info = {}) {
  const counts = data ? Object.entries(data).filter(([k]) => SHEETS.includes(k)).map(([k, v]) => `<span class="tag">${esc(k)} · ${v.length}</span>`).join('') : '';
  const word = info.rowWord || 'row';
  const li = (x) => `<li><b>${esc(x.sheet)}</b>${x.row ? ` ${word} ${x.row}` : ''}: ${esc(x.msg)}</li>`;
  const notes = [];
  if (info.reviewDate) notes.push(`Review date used: <b>${esc(info.reviewDate)}</b> (${esc(info.reviewWhy)}). Ramp-up shields and “in role” months are counted to this date.`);
  if (info.examples) notes.push(`Skipped ${info.examples} tinted example ${info.examples === 1 ? 'row' : 'rows'} from the template.`);
  if (info.ignored?.length) notes.push(`Ignored ${info.ignored.length === 1 ? 'a sheet' : 'sheets'} PRISM doesn't read: ${info.ignored.map(esc).join(', ')}.`);
  if (info.csv) notes.push(info.csv);
  if (info.personas > 0) notes.push(`${info.personas} persona${info.personas === 1 ? '' : 's'} kept${info.personasDropped ? ` (${info.personasDropped} whose person is not in this file dropped)` : ''}.`);
  else if ('sameOrg' in info) notes.push('No personas for this organisation: their story cards and shortcuts are hidden.');
  return `${counts ? `<div class="chips">${counts}</div>` : ''}
    <div class="vsum mt"><span class="tag ${rep.nErr ? 'bad' : 'good'}">${rep.nErr ? `✕ ${rep.nErr} ${rep.nErr === 1 ? 'error' : 'errors'}` : '✓ No errors'}</span><span class="tag ${rep.nWarn ? 'warn' : ''}">${rep.nWarn} ${rep.nWarn === 1 ? 'warning' : 'warnings'}</span></div>
    ${notes.length ? `<ul class="dots mt small">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    ${rep.errs.length ? `<h3 class="h4 mt">Errors (fix these in the file)</h3><ul class="dots vlist">${rep.errs.slice(0, 80).map(li).join('')}</ul>` : ''}
    ${rep.warns.length ? `<h3 class="h4 mt">Warnings</h3><ul class="dots vlist">${rep.warns.slice(0, 60).map(li).join('')}</ul>` : ''}`;
}
const failReport = (msg) => ({ errs: [{ sheet: 'File', row: null, msg }], warns: [], nErr: 1, nWarn: 0 });
const slug = (s) => String(s || 'prism').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prism';

export default {
  nextNote: 'How it all works, for the evaluator',
  render(ctx) {
    const d = ctx.data;
    const sampleName = ctx.state.sample.Org?.[0]?.org_name || 'sample';
    const saved = ctx.saveError ? `<span class="tag warn">⚠ ${esc(ctx.saveError)}</span>`
      : ctx.savedAt ? `<span class="tag good">✓ Saved in this browser</span> <span class="muted">${esc(new Date(ctx.savedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))}</span>`
        : '<span class="muted">Nothing saved yet: edits and uploads are saved in this browser automatically.</span>';
    return `
      ${UI.pageHead({ eyebrow: 'M11 · Data Hub', title: 'Bring your own organisation. <em>It never leaves this browser.</em>', sub: 'Start from the Excel template, fill it in, and upload it here. PRISM checks it, shows every problem with its sheet and row, and re-runs every screen on your data.' })}
      <div class="grid g3">
        <div class="card"><h2 class="h4">1 · Get the template</h2><p class="why">One sheet per part of the PMS, with a README, drop-downs and one tinted example row per sheet (overwrite or delete it).</p>
          <div class="row mt"><a class="btn sm" href="data/templates/pms_input_template.xlsx" download>⬇ Blank template</a><a class="btn light sm" href="data/templates/voltbridge_filled.xlsx" download>⬇ ${esc(sampleName)} filled</a></div></div>
        <div class="card"><h2 class="h4">2 · Upload</h2><label class="drop" id="drop" aria-describedby="dropHint"><input type="file" id="file" accept=".xlsx,.csv,.json" multiple hidden><b>Drop a file here</b><span id="dropHint">or press to choose · .xlsx workbook, the “Data as JSON” file, or .csv files named after the sheet they replace (Employees.csv)</span></label></div>
        <div class="card"><h2 class="h4">Loaded now</h2><p style="font-weight:800">${esc(ctx.state.source)}</p><p class="why">${esc(ctx.out.org.org_name)} · ${d.Employees.length} employees · ${d.KPIs.length} measures · ${d.KPI_Actuals.length} actuals · review date ${esc(ctx.out.asOf)}</p>
          <p class="small mt" id="saveState">${saved}</p>
          <div class="row mt"><button class="btn light sm" id="loadSample">Reload ${esc(sampleName)} sample</button><button class="btn light sm" id="valNow">Validate current data</button>${ctx.savedAt ? '<button class="btn light sm" id="forget">Forget saved work</button>' : ''}</div></div>
      </div>
      <div class="card mt" id="report" ${pending ? '' : 'hidden'} aria-live="polite"><div class="row between"><h2 class="s" style="margin:0" id="repTitle">${pending ? `Checked: ${esc(pending.name)}` : ''}</h2><div class="row"><button class="btn pri sm" id="commit" ${pending && !pending.report.nErr && pending.commit ? '' : 'hidden'}>Use this data →</button><button class="btn light sm" id="discard">Close</button></div></div><div id="repBody" class="mt">${pending ? reportHtml(pending.report, pending.data, pending.info) : ''}</div></div>
      <div class="grid g2 mt">
        <div class="card"><h2 class="h4">3 · Export</h2><p class="why">Take your data and PRISM's results with you. The JSON file loads straight back in here.</p>
          <div class="row mt"><button class="btn sm" id="exJson">⬇ Data as JSON</button><button class="btn sm" id="exXlsx">⬇ Results workbook (.xlsx)</button></div></div>
        <div class="card"><h2 class="h4">Privacy</h2><ul class="dots"><li>Files are read by JavaScript in this tab. Nothing is uploaded to a server.</li><li>Your work is kept only in this browser's own storage, so a reload doesn't lose it. <b>Forget saved work</b> (or reloading the sample) clears it.</li><li>${UI.code('IN')} ${esc(ctx.idx.country.data_privacy?.IN || '—')}. ${UI.code('CN')} ${esc(ctx.idx.country.data_privacy?.CN || '—')}.</li><li>Use pseudonymous IDs for real employees; the sample data is fictional.</li></ul></div>
      </div>
      <div class="card mt"><h2 class="h4">Sheets PRISM reads</h2><div class="sheets">${SHEETS.map((s) => `<div><b>${esc(s)}</b>${REQUIRED.includes(s) ? '<span class="tag bad">required</span>' : '<span class="tag">optional</span>'}<small>${esc(Object.keys(ctx.state.sample[s]?.[0] || {}).join(', '))}</small></div>`).join('')}</div></div>`;
  },
  mount(root, ctx) {
    const sample = ctx.state.sample;
    const show = (name, data, report, commit, info = {}) => {
      pending = { name, data, report, commit, info };
      const card = root.querySelector('#report');
      card.hidden = false;
      root.querySelector('#repTitle').textContent = `Checked: ${name}`;
      root.querySelector('#repBody').innerHTML = reportHtml(report, data, info);
      root.querySelector('#commit').hidden = !(commit && !report.nErr);
      if (!RM) gsap.from(card, { opacity: 0, y: 20, duration: 0.4 });
      card.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    };
    const kind = (f) => (/\.xlsx$/i.test(f.name) ? 'xlsx' : /\.csv$/i.test(f.name) ? 'csv' : /\.json$/i.test(f.name) ? 'json' : /\.xls$/i.test(f.name) ? 'xls' : 'other');
    const handle = async (list) => {
      const files = [...(list || [])];
      if (!files.length) return;
      const label = files.length === 1 ? files[0].name : `${files.length} CSV files`;
      try {
        for (const f of files) {
          const k = kind(f);
          if (k === 'xls') throw new ReadError(`${f.name} is an old .xls workbook. Save it as .xlsx (Excel: File › Save As › Excel Workbook) and upload that.`);
          if (k === 'other') throw new ReadError(`${f.name} isn't a file PRISM reads. Upload an .xlsx workbook, the “Data as JSON” file, or .csv files named after a sheet.`);
          if (!f.size) throw new ReadError(`${f.name} is empty (0 bytes).`);
        }
        if (files.length > 1 && files.some((f) => kind(f) !== 'csv')) throw new ReadError('Upload one workbook or JSON file at a time. Several .csv files can go together.');
        UI.toast(`Reading ${esc(label)}…`);
        let data, own = null, info = {};
        const k = kind(files[0]);
        if (k === 'csv') {
          data = structuredClone(ctx.data);
          own = data.meta || null;
          delete data.meta;
          info.ownLabel = 'the data loaded now';
          const done = [];
          for (const f of files) {
            const sheet = matchSheet(f.name);
            if (!sheet) throw new ReadError(`${f.name} doesn't match a sheet. Name each .csv after the sheet it replaces, for example Employees.csv or KPI_Actuals.csv.`);
            const rows = parseCsv(await f.text());
            done.push(`${esc(f.name)} replaces <b>${esc(sheet)}</b> (${(ctx.base[sheet] || []).length} → ${rows.length} rows)`);
            data[sheet] = rows;
          }
          info.csv = `${done.join('; ')}. Every other sheet comes from the data loaded now (${esc(ctx.state.source)}).`;
          // a CSV changes one sheet of the loaded organisation, so its personas stay if their people are still there
        } else if (k === 'json') {
          ({ data, meta: own } = parseJson(await files[0].text()));
          info.rowWord = 'entry';
        } else {
          if (!window.ExcelJS) throw new ReadError('The Excel reader has not loaded yet. Try again in a second.');
          const x = await parseXlsx(await files[0].arrayBuffer(), sample);
          data = x.data; info.examples = x.examples; info.ignored = x.ignored;
          if (x.examples && REQUIRED.every((s) => !(data[s] || []).length)) throw new ReadError(`This is the blank template: its only rows are the ${x.examples} tinted example rows. Fill in your organisation (overwrite or delete the examples) and upload it again.`);
        }
        const m = buildMeta(data, own, sample, info.ownLabel);
        delete info.ownLabel;
        data.meta = m.meta;
        info = { ...info, ...m.info };
        UI.toast(`Checked ${esc(label)}.`, 1500);
        show(label, data, validate(data, sample, data.meta), true, info);
      } catch (err) {
        if (!(err instanceof ReadError)) console.error(err);
        const msg = err instanceof ReadError ? err.message : `Something went wrong while reading the file: ${err.message}`;
        UI.toast(esc(msg), 6000);
        show(label, null, failReport(msg), false);
      } finally {
        inp.value = '';   // so the same file can be chosen again after a fix
      }
    };
    const inp = root.querySelector('#file'), drop = root.querySelector('#drop');
    inp.addEventListener('change', () => handle(inp.files));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => handle(e.dataTransfer.files));
    root.querySelector('#commit').addEventListener('click', () => {
      const p = pending;
      if (!p?.data) return;
      try {
        ctx.setData(p.data, p.name);
        pending = null;
        UI.toast(`<b>${esc(p.name)}</b> loaded. Every screen now runs on it.`);
      } catch (err) {
        console.error(err);
        // setData has already put the previous organisation back
        p.report.errs.unshift({ sheet: 'Engine', row: null, msg: `PRISM could not run on this data, so nothing was changed: ${err.message}` });
        p.report.nErr++;
        show(p.name, p.data, p.report, false, p.info);
        UI.toast(`Could not use ${esc(p.name)}: ${esc(err.message)}. Nothing was changed.`, 6000);
      }
    });
    root.querySelector('#discard').addEventListener('click', () => { pending = null; root.querySelector('#report').hidden = true; });
    root.querySelector('#loadSample').addEventListener('click', () => { pending = null; ctx.resetSample(); UI.toast(`${esc(sample.Org?.[0]?.org_name || 'Sample')} reloaded. Saved work was cleared from this browser.`); });
    root.querySelector('#forget')?.addEventListener('click', () => { ctx.forgetSaved(); ctx.rerender(); UI.toast('Saved work removed from this browser. What is on screen stays until you reload.'); });
    root.querySelector('#valNow').addEventListener('click', () => show(`${ctx.state.source} (current)`, ctx.data, validate(ctx.data, sample, ctx.data.meta || {}), false, { reviewDate: ctx.out.asOf, reviewWhy: 'the data loaded now' }));
    root.querySelector('#exJson').addEventListener('click', () => {
      const out = { ...ctx.data, _prism: { app: 'PRISM', file: 'data', exported_at: new Date().toISOString(), source: ctx.state.source, note: 'Load this file back in the Data Hub. Screen settings (lens, switches, rule sliders) are not part of the data.' } };
      UI.download(`prism-data-${slug(ctx.out.org.org_name)}.json`, new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    });
    root.querySelector('#exXlsx').addEventListener('click', async () => {
      if (!window.ExcelJS) { UI.toast('The Excel writer has not loaded yet.'); return; }
      const o = ctx.out;
      const wb = new window.ExcelJS.Workbook();
      const add = (name, cols, rows) => {
        const ws = wb.addWorksheet(name);
        ws.columns = cols.map(([h, w, fmt]) => ({ header: h, key: h, width: w || 14, style: fmt ? { numFmt: fmt } : {} }));
        rows.forEach((r) => ws.addRow(r));
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14151C' } };
        ws.eachRow((row, i) => { if (i > 1) row.font = { name: 'Arial', size: 10 }; });
        ws.views = [{ state: 'frozen', ySplit: 1 }];
      };
      const gain = new Map();
      for (const g of Object.values(o.gainsharing || {})) for (const p of g.perHead || []) gain.set(p.emp_id, p.amount);
      const extra = (r, n) => r.rewards?.extras?.filter((x) => x.name === n).reduce((s, x) => s + (x.amount || 0), 0) ?? '';
      const gate = (r) => { const g = r.result.gates || []; return !g.length ? 'none' : g.some((x) => x.passed === false) ? 'failed' : g.some((x) => x.passed === null) ? 'no data' : 'passed'; };
      const M = '#,##0', D2 = '0.00';
      add('Results', [['emp_id'], ['name', 22], ['role', 26], ['site', 12], ['country', 8], ['track'], ['results', 9, D2], ['behaviours', 10, D2], ['growth', 9, D2], ['composite', 10, D2], ['rating', 8], ['gate', 9], ['tier', 9], ['pool_position', 12], ['bottom_tier_action', 40], ['shielded', 9], ['nine_box', 18], ['helix_built', 10], ['currency', 9], ['base_pay', 12, M], ['bonus', 11, M], ['commission', 12, M], ['kicker', 10, M], ['total_variable', 13, M], ['gainsharing', 12, M], ['merit_pct', 9, D2], ['new_base', 12, M], ['learning_wallet', 14, M], ['total_rewards', 13, M]],
        o.employees.map((r) => ({
          emp_id: r.emp.emp_id, name: r.emp.name, role: r.title, site: r.emp.site, country: r.emp.country, track: r.result.track.track,
          results: r.result.results ?? '', behaviours: r.result.behaviours ?? '', growth: r.result.growth ?? '', composite: r.result.composite ?? '', rating: r.result.rating ?? '',
          gate: gate(r), tier: r.tier?.tier || '', pool_position: r.tier ? `${r.tier.position} of ${r.tier.of}` : '', bottom_tier_action: r.bottomTierAction?.text || '', shielded: r.shielded ? 'Y' : '',
          nine_box: r.nineBox?.label || '', helix_built: r.helix.built, currency: r.emp.currency, base_pay: r.rewards?.base ?? (Number(r.emp.base_pay) || ''),
          bonus: r.rewards?.bonus ?? '', commission: extra(r, 'Sales commission'), kicker: extra(r, 'Top-20% kicker'), total_variable: r.rewards?.total ?? '',
          gainsharing: gain.get(r.emp.emp_id) ?? '', merit_pct: r.rewards?.meritPct ?? '', new_base: r.rewards?.newBase ?? '', learning_wallet: r.rewards?.learningWallet ?? '', total_rewards: r.rewards?.totalRewards ?? '',
        })));
      add('Pools', [['role', 26], ['country'], ['verdict', 30], ['pool_size'], ['shielded'], ['bottom_tier_action', 40], ['reason', 60], ['method_blend', 50]],
        o.pools.map((p) => ({ role: ctx.idx.role.get(p.role_id)?.title || p.role_id, country: p.homeCountry, verdict: p.label, pool_size: p.poolSize, shielded: p.shielded.length, bottom_tier_action: p.bottomTierAction || '', reason: p.reason, method_blend: p.methods.items.map((i) => `${i.name} ${i.pct}%`).join(' / ') })));
      const org = o.org, b = o.budget || {};
      const lensName = { home: 'Home rules (each person\'s own country)', IN: 'India rules for everyone', CN: 'China rules for everyone' }[ctx.state.lens] || ctx.state.lens;
      add('Settings', [['setting', 34], ['value', 70]], [
        ['Organisation', org.org_name], ['Data source', ctx.state.source], ['Review date', o.asOf], ['Exported', new Date().toISOString()],
        ['Country lens', lensName],
        ...['pace', 'innovation', 'cost_focus', 'team_orientation', 'risk_appetite', 'customer_intimacy'].map((k) => [`Strategy DNA: ${k}`, org[k]]),
        ['Review rhythm', `${o.cadence.checkins} check-ins (${o.cadence.checkins_per_year} a year), ${o.cadence.reviews} reviews, PIP ${o.cadence.pip_days}`],
        ['Key results scored as', o.mode?.okr ? 'OKRs (0.7 = 3.5)' : 'KPIs (threshold / target / stretch)'],
        ['Customer KPI weight multiplier', o.mode?.customerBoost ?? 1],
        ...Object.entries(ctx.state.toggles).map(([k, v]) => [`Switch: ${k}`, v ? 'on' : 'off']),
        ['Company factor', ctx.rules.rewards.company_factor],
        ...['IN', 'CN'].filter((c) => b[c]).map((c) => [`${c} bonus pool`, `target ${b[c].targetPool.toLocaleString('en-IN')}, paid ${b[c].paid.toLocaleString('en-IN')} (${b[c].utilisationBeforePct}% before the guard${b[c].strict && b[c].factor < 1 ? `, strict guard ×${b[c].factor.toFixed(3)}` : ''})`]),
      ].map(([setting, value]) => ({ setting, value: value ?? '' })));
      add('README', [['about', 110]], [
        { about: 'PRISM results export, generated in the browser from the data loaded in the Data Hub. It cannot be loaded back in: use "Data as JSON" for that.' },
        { about: 'Composite = weighted Results / Behaviours / Growth (weights depend on the track). Rating = rounded composite, capped if a gate failed. gate: passed / failed / no data / none.' },
        { about: 'Money is in each person\'s own currency (see the currency column). total_variable = bonus + commission + kicker. Gainsharing is paid from the plant pool and shown separately.' },
        { about: 'total_rewards = base_pay + total_variable + learning_wallet. Settings lists the lens, Strategy DNA and switches the numbers were run with.' },
        { about: 'All VoltBridge data is fictional (MDI Gurgaon PMS course project).' },
      ]);
      const buf = await wb.xlsx.writeBuffer();
      UI.download(`prism-results-${slug(org.org_name)}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    });
  },
};
