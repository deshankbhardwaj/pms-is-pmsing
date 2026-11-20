// Pure Data Hub logic (no DOM): sheet matching, CSV / JSON parsing, the review date, and the validator (v0.4 §10.2).
// Kept apart from the screen so scripts/check_engine.mjs can test it in Node.
export const REQUIRED = ['Org', 'Roles', 'KPIs', 'Employees', 'KPI_Actuals'];
export const OPTIONAL = ['Departments', 'Competencies', 'Feedback_360', 'CheckIns', 'Dev_Goals', 'Experiences', 'Leadership_Profile', 'Training_Catalogue', 'Training_Records', 'Reward_Policy', 'Recognition', 'Country_Config'];
export const SHEETS = [...REQUIRED, ...OPTIONAL];
export const CAP = 8;                             // rows listed per kind of problem; the rest are counted
export const DEFAULT_CURRENCY = { IN: 'INR', CN: 'CNY' };

// A problem with the file itself: the message is written for the user and shown as it is.
export class ReadError extends Error {}

/* ---------------- reading files ---------------- */
export const tagRow = (o, n) => Object.defineProperty(o, '_row', { value: n, enumerable: false, configurable: true });
export const rowOf = (r, i) => r?._row ?? i + 2;
export const canon = (s) => String(s).toLowerCase().replace(/\.(csv|xlsx|json)$/i, '').replace(/\s*\(\d+\)$/, '').replace(/\s*-\s*copy$/i, '').replace(/[^a-z0-9]/g, '');
export function matchSheet(name) {
  const hit = (n) => SHEETS.find((s) => canon(s) === canon(n));
  // Google Sheets names a downloaded tab "<workbook> - <sheet>.csv"
  return hit(name) || (String(name).includes(' - ') ? hit(String(name).split(' - ').pop()) : null) || null;
}
export const ID_COL = /(_id|_code|^key|grade|period)$/i;   // keep IDs as text ("0012" stays "0012")
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let cur = [], q = false, row = [];
  const push = () => { row.push(cur.join('')); cur = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur.push('"'); i++; } else if (ch === '"') q = false; else cur.push(ch); }
    else if (ch === '"') q = true; else if (ch === ',') push(); else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; push(); rows.push(row); row = []; } else cur.push(ch);
  }
  if (cur.length || row.length) { push(); rows.push(row); }
  const recs = rows.map((r, i) => ({ r, n: i + 1 })).filter(({ r }) => r.some((x) => x.trim() !== ''));
  if (!recs.length) throw new ReadError('The CSV file is empty.');
  const head = recs[0].r.map((k) => k.trim());
  if (head.length === 1 && head[0].includes(';')) throw new ReadError('This CSV uses semicolons (;) between columns. Save it with commas (in Excel: File › Save As › "CSV UTF-8 (Comma delimited)") and upload it again.');
  const cell = (k, raw) => { const v = String(raw ?? '').trim(); return v !== '' && !ID_COL.test(k) && Number.isFinite(Number(v)) ? Number(v) : v; };
  return recs.slice(1).map(({ r, n }) => { const o = {}; head.forEach((k, i) => { if (k) o[k] = cell(k, r[i]); }); return tagRow(o, n); });
}
export function parseJson(text) {
  let j;
  try { j = JSON.parse(text.replace(/^﻿/, '')); } catch { throw new ReadError('This .json file is not valid JSON. Use the file that "Data as JSON" downloads.'); }
  if (!j || typeof j !== 'object' || Array.isArray(j) || !Array.isArray(j.Employees)) throw new ReadError('This JSON is not a PRISM data file: it has no Employees list. Use the file that "Data as JSON" downloads.');
  const data = {};
  for (const s of SHEETS) if (Array.isArray(j[s])) data[s] = j[s].filter((r) => r && typeof r === 'object' && !Array.isArray(r)).map((r, i) => tagRow({ ...r }, i + 1));
  return { data, meta: j.meta && typeof j.meta === 'object' ? j.meta : null };
}

/* ---------------- dates and the review date ---------------- */
export const iso = (d) => d.toISOString().slice(0, 10);
export const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && iso(new Date(v)) === v;
export function periodEnd(p) {
  const s = String(p ?? '').trim(); let m;
  if ((m = /^(\d{4})-?Q([1-4])$/i.exec(s))) return iso(new Date(Date.UTC(+m[1], +m[2] * 3, 0)));
  if ((m = /^(\d{4})-(\d{2})$/.exec(s)) && +m[2] >= 1 && +m[2] <= 12) return iso(new Date(Date.UTC(+m[1], +m[2], 0)));
  if ((m = /^(\d{4})$/.exec(s))) return `${m[1]}-12-31`;
  return isDate(s) ? s : null;
}
const maxOf = (xs) => xs.filter(Boolean).sort().pop() || null;
export function deriveReviewDate(data) {
  const ends = (data.KPI_Actuals || []).map((a) => [periodEnd(a.period), a.period]).filter(([d]) => d).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (ends.length) { const [d, p] = ends[ends.length - 1]; return { date: d, why: `end of the latest KPI_Actuals period (${p})` }; }
  const act = maxOf([...(data.CheckIns || []).map((r) => r.date), ...(data.Experiences || []).map((r) => r.end || r.start), ...(data.Training_Records || []).map((r) => r.completed_on), ...(data.Recognition || []).map((r) => r.date)].filter(isDate));
  if (act) return { date: act, why: 'the latest dated activity in the workbook' };
  return { date: iso(new Date()), why: 'today (the workbook has no periods or dates)' };
}
// The meta block holds what isn't a sheet: personas, titles, the review date. Only what fits the uploaded people is kept.
export function buildMeta(data, own, sample, ownLabel = 'the JSON file') {
  const ids = new Set((data.Employees || []).map((e) => String(e.emp_id)));
  const orgName = (d) => String(d?.Org?.[0]?.org_name ?? '').trim().toLowerCase();
  const sameOrg = !!orgName(data) && orgName(data) === orgName(sample);
  const src = own || (sameOrg ? sample.meta || {} : {});
  const meta = structuredClone({ ...src });
  meta.personas = (src.personas || []).filter((p) => p && ids.has(String(p.emp_id)));
  meta.titles = Object.fromEntries(Object.entries(src.titles || {}).filter(([id]) => ids.has(id)));
  meta.leadership_track_ids = (src.leadership_track_ids || []).filter((id) => ids.has(String(id)));
  const explicit = data.Org?.[0]?.review_date;
  let rd;
  if (isDate(explicit)) rd = { date: explicit, why: 'the review_date column in Org' };
  else if (isDate(src.review_date)) rd = { date: src.review_date, why: own ? ownLabel : 'the sample (same organisation)' };
  else rd = deriveReviewDate(data);
  meta.review_date = rd.date;
  return { meta, info: { reviewDate: rd.date, reviewWhy: rd.why, sameOrg, personas: meta.personas.length, personasDropped: (src.personas || []).length - meta.personas.length } };
}

/* ---------------- validation (v0.4 §10.2) ---------------- */
const blank = (v) => v === '' || v === null || v === undefined;
const num = (v) => (blank(v) || typeof v === 'boolean' ? NaN : Number(v));
const fin = (v) => Number.isFinite(num(v));
const inRange = (v, a, b) => fin(v) && num(v) >= a && num(v) <= b;
const intIn = (v, a, b) => inRange(v, a, b) && Number.isInteger(num(v));

export function validate(data, sample, meta = data.meta || {}) {
  const errs = [], warns = [], counts = new Map();
  // Each kind of problem lists its first CAP rows; the rest are counted in one line.
  const add = (tag, list, sheet, row, msg, kind) => {
    const key = `${tag}|${sheet}|${kind || msg}`;
    const c = counts.get(key) || { tag, list, sheet, kind: kind || msg, n: 0 };
    c.n++; counts.set(key, c);
    if (c.n <= CAP) list.push({ sheet, row, msg });
  };
  const E = (s, r, m, kind) => add('E', errs, s, r, m, kind), W = (s, r, m, kind) => add('W', warns, s, r, m, kind);
  const finish = () => {
    let nErr = 0, nWarn = 0;
    for (const c of counts.values()) {
      if (c.n > CAP) c.list.push({ sheet: c.sheet, row: null, msg: `…and ${c.n - CAP} more like this (${c.kind})` });
      if (c.tag === 'E') nErr += c.n; else nWarn += c.n;
    }
    return { errs, warns, nErr, nWarn };
  };

  for (const s of REQUIRED) if (!data[s] || !data[s].length) E(s, null, 'Required sheet is missing or empty');
  for (const s of OPTIONAL) if (!data[s]) W(s, null, 'Optional sheet not found; screens that use it will be thinner');
  for (const s of SHEETS) {
    if (!data[s]?.length || !sample[s]?.length) continue;
    const have = new Set(data[s].flatMap((r) => Object.keys(r)));
    const miss = Object.keys(sample[s][0]).filter((c) => !have.has(c));
    if (miss.length) E(s, 1, `Missing columns: ${miss.join(', ')} (header names must match the template exactly)`);
  }
  if (errs.length) return finish();

  const ids = (s, key, need = true) => {
    const set = new Set();
    (data[s] || []).forEach((r, i) => {
      const v = String(r[key] ?? '').trim();
      if (!v) { if (need) E(s, rowOf(r, i), `Empty ${key}`, `empty ${key}`); return; }
      if (set.has(v)) E(s, rowOf(r, i), `Duplicate ${key} "${v}"`, `duplicate ${key}`);
      set.add(v);
    });
    return set;
  };
  const has = (set, v) => set.has(String(v ?? '').trim());
  const roles = ids('Roles', 'role_id'), emps = ids('Employees', 'emp_id'), kpis = ids('KPIs', 'kpi_id');
  const depts = data.Departments ? ids('Departments', 'dept_id') : null;
  const comps = data.Competencies ? ids('Competencies', 'comp_id') : null;
  const courses = data.Training_Catalogue ? ids('Training_Catalogue', 'course_id') : null;
  const empById = new Map(data.Employees.map((e) => [String(e.emp_id).trim(), e]));
  const reviewDate = isDate(meta.review_date) ? meta.review_date : deriveReviewDate(data).date;

  // Org
  const org = data.Org[0];
  if (data.Org.length > 1) W('Org', rowOf(data.Org[1], 1), 'Only the first row of Org is used');
  if (blank(org.org_name)) E('Org', rowOf(org, 0), 'org_name is empty');
  for (const k of ['pace', 'innovation', 'cost_focus', 'team_orientation', 'risk_appetite', 'customer_intimacy']) if (!inRange(org[k], 1, 10)) E('Org', rowOf(org, 0), `${k} must be a number from 1 to 10 (got "${org[k]}")`);
  if ('review_date' in org && !blank(org.review_date) && !isDate(org.review_date)) E('Org', rowOf(org, 0), `review_date must be YYYY-MM-DD (got "${org.review_date}")`);
  if ('fy_start_month' in org && !blank(org.fy_start_month) && !intIn(org.fy_start_month, 1, 12)) E('Org', rowOf(org, 0), `fy_start_month must be a whole number from 1 to 12 (got "${org.fy_start_month}")`);

  // Roles
  data.Roles.forEach((r, i) => {
    for (const k of ['measurability', 'interdependence', 'standardisation', 'innovation', 'talent_supply', 'digital_access', 'seniority', 'regulatory_criticality']) if (!inRange(r[k], 1, 5)) E('Roles', rowOf(r, i), `${r.role_id}: ${k} must be a number from 1 to 5 (got "${r[k]}")`, 'role scores 1–5');
    if (!blank(r.leadership_track) && !['Y', 'N'].includes(String(r.leadership_track).trim())) W('Roles', rowOf(r, i), `leadership_track should be Y or N (got "${r.leadership_track}")`, 'leadership_track Y/N');
    // a role can sit in several departments (D-PUN-MFG;D-CSA-MFG); a note in brackets, such as "(team's department)", is allowed
    if (depts && !blank(r.dept_id)) for (const d of String(r.dept_id).split(';').map((x) => x.trim()).filter((x) => x && !x.startsWith('('))) if (!depts.has(d)) W('Roles', rowOf(r, i), `dept_id "${d}" is not in Departments`, 'unknown department');
  });

  // KPIs
  const wsum = {}, scoredBy = {}, gatesBy = {};
  data.KPIs.forEach((k, i) => {
    const r = rowOf(k, i), t = String(k.type).trim();
    if (!has(roles, k.role_id)) E('KPIs', r, `role_id "${k.role_id}" is not in Roles`, 'unknown role');
    if (!['KPI', 'KR', 'Behaviour', 'Gate'].includes(t)) { E('KPIs', r, `type must be KPI, KR, Behaviour or Gate (got "${k.type}")`, 'type'); return; }
    if (t === 'Gate') {
      (gatesBy[k.role_id] ||= []).push(k);
      if (fin(k.weight_pct) && num(k.weight_pct) !== 0) W('KPIs', r, `${k.kpi_id} is a gate (pass/fail): its weight_pct is not used, set it to 0`, 'gate weight');
      return;
    }
    scoredBy[k.role_id] = (scoredBy[k.role_id] || 0) + 1;
    if (!inRange(k.weight_pct, 0, 100)) E('KPIs', r, `${k.kpi_id}: weight_pct must be a number from 0 to 100 (got "${k.weight_pct}")`, 'weight 0–100');
    else wsum[k.role_id] = (wsum[k.role_id] || 0) + num(k.weight_pct);
    const [a, b, c] = [k.threshold, k.target, k.stretch].map(num);
    if (![a, b, c].every(Number.isFinite)) { E('KPIs', r, `${k.kpi_id}: threshold, target and stretch must all be numbers`, 'targets not numbers'); return; }
    if (!((a < b && b < c) || (a > b && b > c))) E('KPIs', r, `${k.kpi_id}: threshold → target → stretch must run in one direction (${k.threshold} → ${k.target} → ${k.stretch})`, 'target direction');
    if (t === 'KR' && ![a, b, c].every((x) => x >= 0 && x <= 1)) E('KPIs', r, `${k.kpi_id}: key results are scored 0 to 1, so threshold, target and stretch must be between 0 and 1`, 'KR targets 0–1');
    if (t === 'KPI') {
      if (!['higher', 'lower'].includes(String(k.polarity).trim())) E('KPIs', r, `${k.kpi_id}: polarity must be higher or lower (got "${k.polarity}")`, 'polarity');
      else if ((k.polarity === 'lower') !== (a > b)) W('KPIs', r, `${k.kpi_id}: polarity "${k.polarity}" does not match the direction of the targets`, 'polarity vs targets');
    }
  });
  for (const [r, s] of Object.entries(wsum)) if (Math.abs(s - 100) > 0.01) E('KPIs', null, `Weights for role ${r} add to ${Math.round(s * 100) / 100}, not 100`);

  // Employees
  const ccfg = Object.fromEntries((data.Country_Config || []).filter((x) => x.key === 'currency').flatMap((x) => [['IN', String(x.india_value).trim()], ['CN', String(x.china_value).trim()]]));
  const curOf = (c) => ccfg[c] || DEFAULT_CURRENCY[c];
  const policy = data.Reward_Policy ? new Set(data.Reward_Policy.filter((p) => !blank(p.grade) && !blank(p.target_bonus_pct)).map((p) => `${String(p.country).trim()}|${String(p.grade).trim()}`)) : null;
  const scoredRoles = new Set();
  data.Employees.forEach((e, i) => {
    const r = rowOf(e, i), id = String(e.emp_id).trim();
    if (!has(roles, e.role_id)) E('Employees', r, `role_id "${e.role_id}" is not in Roles`, 'unknown role');
    const exec = String(e.role_id).trim() === 'EXE';
    if (!exec) scoredRoles.add(String(e.role_id).trim());
    if (depts && !blank(e.dept_id) && !depts.has(String(e.dept_id).trim())) E('Employees', r, `dept_id "${e.dept_id}" is not in Departments`, 'unknown department');
    if (!blank(e.manager_id)) {
      if (String(e.manager_id).trim() === id) E('Employees', r, `${id} is listed as their own manager`, 'own manager');
      else if (!emps.has(String(e.manager_id).trim())) E('Employees', r, `manager_id "${e.manager_id}" is not an employee`, 'unknown manager');
    }
    const c = String(e.country).trim();
    if (!['IN', 'CN'].includes(c)) E('Employees', r, `country must be IN or CN (got "${e.country}")`, 'country');
    else if (String(e.currency).trim() !== curOf(c)) E('Employees', r, `${id}: currency must be ${curOf(c)} for ${c} (got "${e.currency}")`, 'currency vs country');
    for (const k of ['hire_date', 'role_start_date']) {
      if (!isDate(e[k])) E('Employees', r, `${k} must be a date written YYYY-MM-DD (got "${e[k]}")`, `${k} not a date`);
      else if (e[k] > reviewDate) E('Employees', r, `${id}: ${k} ${e[k]} is after the review date (${reviewDate})`, `${k} after the review date`);
    }
    if (isDate(e.hire_date) && isDate(e.role_start_date) && e.role_start_date < e.hire_date) W('Employees', r, `${id}: role_start_date is before hire_date`, 'role start before hire');
    if (!intIn(e.potential, 1, 3)) E('Employees', r, `${id}: potential must be 1, 2 or 3 (got "${e.potential}")`, 'potential 1/2/3');
    const base = num(e.base_pay), mid = num(e.pay_range_mid);
    const baseOk = Number.isFinite(base) && base > 0 && base < 1e9, midOk = Number.isFinite(mid) && mid > 0 && mid < 1e9;
    if (!baseOk) E('Employees', r, `${id}: base_pay must be a positive number below 1,000,000,000 (got "${e.base_pay}")`, 'base_pay');
    if (!midOk) E('Employees', r, `${id}: pay_range_mid must be a positive number below 1,000,000,000 (got "${e.pay_range_mid}")`, 'pay_range_mid');
    if (baseOk && midOk && !(base / mid >= 0.5 && base / mid <= 2)) E('Employees', r, `${id}: compa-ratio ${(base / mid).toFixed(2)} is out of range (base_pay ÷ pay_range_mid must be 0.5–2.0; check both are in the same unit)`, 'compa-ratio');
    if (policy && !exec && !policy.has(`${c}|${String(e.grade).trim()}`)) E('Employees', r, `${id}: grade "${e.grade}" has no ${c} row in Reward_Policy (target bonus and learning wallet come from it)`, 'grade not in Reward_Policy');
    if (!blank(e.flight_risk) && !['L', 'M', 'H'].includes(String(e.flight_risk).trim())) W('Employees', r, `flight_risk should be L, M or H (got "${e.flight_risk}")`, 'flight_risk');
  });
  // manager loops (A reports to B, B reports to A)
  for (const [id, e0] of empById) {
    if (String(e0.manager_id ?? '').trim() === id) continue;   // already reported as "own manager"
    let cur = id; const path = new Set();
    while (cur && empById.has(cur) && !path.has(cur)) { path.add(cur); cur = String(empById.get(cur).manager_id ?? '').trim(); }
    if (cur && path.has(cur) && cur === id) { E('Employees', rowOf(empById.get(id), data.Employees.indexOf(empById.get(id))), `${id} is in a reporting loop (the chain of managers comes back to them)`, 'reporting loop'); }
  }
  for (const rid of scoredRoles) if (has(roles, rid) && !scoredBy[rid]) E('KPIs', null, `Role ${rid} has people but no KPIs, key results or behaviours to score them on`);

  // KPI_Actuals
  const kpiById = new Map(data.KPIs.map((k) => [String(k.kpi_id).trim(), k]));
  const gotGate = new Set(), gotAny = new Set();
  data.KPI_Actuals.forEach((a, i) => {
    const r = rowOf(a, i), eid = String(a.emp_id ?? '').trim(), kid = String(a.kpi_id ?? '').trim();
    if (!emps.has(eid)) { E('KPI_Actuals', r, `Unknown emp_id "${a.emp_id}"`, 'unknown emp_id'); return; }
    if (!kpis.has(kid)) { E('KPI_Actuals', r, `Unknown kpi_id "${a.kpi_id}"`, 'unknown kpi_id'); return; }
    const k = kpiById.get(kid), e = empById.get(eid);
    if (String(k.role_id).trim() !== String(e.role_id).trim()) W('KPI_Actuals', r, `${eid} is a ${e.role_id}, but ${kid} belongs to ${k.role_id}: this row is ignored`, 'measure of another role');
    if (periodEnd(a.period) === null) W('KPI_Actuals', r, `period "${a.period}" should look like 2026-Q1, 2026-07 or 2026`, 'period format');
    if (blank(a.actual)) { W('KPI_Actuals', r, `${eid} ${kid}: actual is blank, so this period counts as no data`, 'blank actual'); return; }
    if (!fin(a.actual)) { E('KPI_Actuals', r, `${eid} ${kid}: actual "${a.actual}" is not a number`, 'actual not a number'); return; }
    const v = num(a.actual), t = String(k.type).trim();
    gotAny.add(eid);
    if (t === 'Gate') { gotGate.add(`${eid}|${kid}`); if (v !== 0 && v !== 1) E('KPI_Actuals', r, `${eid} ${kid}: a gate actual must be 1 (passed) or 0 (failed), got ${a.actual}`, 'gate actual 0/1'); return; }
    if (t === 'KR') { if (v < 0 || v > 1) E('KPI_Actuals', r, `${eid} ${kid}: key-result actuals are scores from 0 to 1 (0.7 = 70%), got ${a.actual}`, 'KR actual 0–1'); return; }
    const [x, y, z] = [k.threshold, k.target, k.stretch].map(num);
    if ([x, y, z].every(Number.isFinite)) {
      const lo = Math.min(x, z), hi = Math.max(x, z), span = hi - lo || Math.abs(y) || 1;
      if (v < lo - 10 * span || v > hi + 10 * span) E('KPI_Actuals', r, `${eid} ${kid}: actual ${a.actual} is far outside the target range (${k.threshold} → ${k.stretch}); check the unit`, 'actual far out of range');
    }
  });
  const peopleRoles = data.Employees.filter((e) => String(e.role_id).trim() !== 'EXE');
  for (const [rid, gs] of Object.entries(gatesBy)) for (const g of gs) {
    const miss = peopleRoles.filter((e) => String(e.role_id).trim() === rid && !gotGate.has(`${String(e.emp_id).trim()}|${String(g.kpi_id).trim()}`));
    if (miss.length) W('KPI_Actuals', null, `${miss.length} ${rid} ${miss.length === 1 ? 'person has' : 'people have'} no data for the gate ${g.kpi_id} (${g.kpi_name}): no penalty, the gate shows as "no data" (${miss.slice(0, 3).map((e) => e.emp_id).join(', ')}${miss.length > 3 ? ', …' : ''})`);
  }
  const noAct = peopleRoles.filter((e) => !gotAny.has(String(e.emp_id).trim()));
  if (noAct.length) W('KPI_Actuals', null, `${noAct.length} ${noAct.length === 1 ? 'person has' : 'people have'} no actuals at all, so their Results score is empty (${noAct.slice(0, 3).map((e) => e.emp_id).join(', ')}${noAct.length > 3 ? ', …' : ''})`);

  // optional sheets: every reference must resolve (spec §10.2)
  const ref = (s, r, field, v, set, what, isErr = true) => { if (blank(v)) return; if (!has(set, v)) (isErr ? E : W)(s, r, `${field} "${v}" is not ${what}`, `unknown ${field}`); };
  (data.Departments || []).forEach((d, i) => { ref('Departments', rowOf(d, i), 'head_emp_id', d.head_emp_id, emps, 'an employee'); if (!String(d.country).split(';').map((x) => x.trim()).every((x) => ['IN', 'CN'].includes(x))) E('Departments', rowOf(d, i), `country must be IN, CN or IN;CN (got "${d.country}")`, 'country'); });
  (data.Feedback_360 || []).forEach((f, i) => {
    const r = rowOf(f, i);
    ref('Feedback_360', r, 'ratee_id', f.ratee_id, emps, 'an employee');
    if (comps) ref('Feedback_360', r, 'comp_id', f.comp_id, comps, 'in Competencies');
    if (!inRange(f.score, 1, 5)) E('Feedback_360', r, `score must be a number from 1 to 5 (got "${f.score}")`, 'score 1–5');
    if (!['self', 'manager', 'peer', 'report', 'customer'].includes(String(f.relationship).trim())) W('Feedback_360', r, `relationship should be self, manager, peer, report or customer (got "${f.relationship}")`, 'relationship');
  });
  (data.CheckIns || []).forEach((c, i) => {
    const r = rowOf(c, i);
    ref('CheckIns', r, 'emp_id', c.emp_id, emps, 'an employee');
    if (!isDate(c.date)) E('CheckIns', r, `date must be YYYY-MM-DD (got "${c.date}")`, 'date');
    else if (c.date > reviewDate) W('CheckIns', r, `date ${c.date} is after the review date (${reviewDate})`, 'after the review date');
  });
  (data.Dev_Goals || []).forEach((g, i) => {
    const r = rowOf(g, i);
    ref('Dev_Goals', r, 'emp_id', g.emp_id, emps, 'an employee');
    ref('Dev_Goals', r, 'feedback_source_id', g.feedback_source_id, emps, 'an employee', false);
    if (![70, 20, 10].includes(num(g.bucket))) W('Dev_Goals', r, `bucket should be 70, 20 or 10 (got "${g.bucket}")`, 'bucket');
    if (!inRange(g.progress_pct, 0, 100)) E('Dev_Goals', r, `progress_pct must be a number from 0 to 100 (got "${g.progress_pct}")`, 'progress 0–100');
    if (!blank(g.due) && !isDate(g.due)) E('Dev_Goals', r, `due must be YYYY-MM-DD (got "${g.due}")`, 'due date');
  });
  let noFb = 0;
  const EXP = ['first_team', 'fix_it', 'new_line', 'cross_border', 'scope_jump', 'influence', 'crisis', 'failure_recovery'];
  (data.Experiences || []).forEach((x, i) => {
    const r = rowOf(x, i);
    ref('Experiences', r, 'emp_id', x.emp_id, emps, 'an employee');
    ref('Experiences', r, 'feedback_source_id', x.feedback_source_id, emps, 'an employee', false);
    if (!EXP.includes(String(x.experience_type).trim())) W('Experiences', r, `experience_type "${x.experience_type}" is not one of ${EXP.join(', ')}`, 'experience_type');
    for (const k of ['start', 'end']) if (!blank(x[k]) && !isDate(x[k])) E('Experiences', r, `${k} must be YYYY-MM-DD (got "${x[k]}")`, `${k} date`);
    if (!['done', 'in progress'].includes(String(x.status).trim())) W('Experiences', r, `status should be done or in progress (got "${x.status}")`, 'status');
    if (x.status === 'done' && blank(x.feedback_source_id)) { noFb++; W('Experiences', r, `${x.emp_id} ${x.experience_type}: a stretch experience needs a feedback source (Built-70 rule 3); no stamp until it has one`, 'no feedback source'); }
  });
  (data.Leadership_Profile || []).forEach((p, i) => {
    const r = rowOf(p, i);
    ref('Leadership_Profile', r, 'emp_id', p.emp_id, emps, 'an employee');
    if (!blank(p.learning_agility) && !inRange(p.learning_agility, 1, 5)) W('Leadership_Profile', r, `learning_agility should be 1–5 (got "${p.learning_agility}")`, 'learning_agility');
    if (!blank(p.on_stretch) && !['Y', 'N'].includes(String(p.on_stretch).trim())) W('Leadership_Profile', r, `on_stretch should be Y or N (got "${p.on_stretch}")`, 'on_stretch');
  });
  (data.Training_Catalogue || []).forEach((c, i) => {
    const r = rowOf(c, i);
    if (![70, 20, 10].includes(num(c.bucket_70_20_10))) W('Training_Catalogue', r, `bucket_70_20_10 should be 70, 20 or 10 (got "${c.bucket_70_20_10}")`, 'bucket');
    if (!blank(c.cost) && !(fin(c.cost) && num(c.cost) >= 0)) W('Training_Catalogue', r, `cost should be a number of 0 or more (got "${c.cost}")`, 'cost');
  });
  (data.Training_Records || []).forEach((t, i) => {
    const r = rowOf(t, i);
    ref('Training_Records', r, 'emp_id', t.emp_id, emps, 'an employee');
    if (courses) ref('Training_Records', r, 'course_id', t.course_id, courses, 'in Training_Catalogue');
    ref('Training_Records', r, 'l4_kpi_link', t.l4_kpi_link, kpis, 'a kpi_id', false);
    if (!blank(t.completed_on) && !isDate(t.completed_on)) E('Training_Records', r, `completed_on must be YYYY-MM-DD (got "${t.completed_on}")`, 'completed_on');
    if (!blank(t.kirkpatrick_l1) && !inRange(t.kirkpatrick_l1, 1, 5)) W('Training_Records', r, `kirkpatrick_l1 should be 1–5 (got "${t.kirkpatrick_l1}")`, 'kirkpatrick_l1');
    if (!blank(t.l2_score) && !inRange(t.l2_score, 0, 100)) W('Training_Records', r, `l2_score should be 0–100 (got "${t.l2_score}")`, 'l2_score');
  });
  (data.Reward_Policy || []).forEach((p, i) => {
    const r = rowOf(p, i);
    if (!['IN', 'CN'].includes(String(p.country).trim())) E('Reward_Policy', r, `country must be IN or CN (got "${p.country}")`, 'country');
    if (!blank(p.target_bonus_pct) && !inRange(p.target_bonus_pct, 0, 100)) E('Reward_Policy', r, `target_bonus_pct must be 0–100 (got "${p.target_bonus_pct}")`, 'target_bonus_pct');
    if (!blank(p.merit_budget_pct) && !inRange(p.merit_budget_pct, 0, 100)) E('Reward_Policy', r, `merit_budget_pct must be 0–100 (got "${p.merit_budget_pct}")`, 'merit_budget_pct');
    if (!blank(p.multiplier) && !(fin(p.multiplier) && num(p.multiplier) >= 0)) E('Reward_Policy', r, `multiplier must be a number of 0 or more (got "${p.multiplier}")`, 'multiplier');
    if (!blank(p.merit_pct) && !inRange(p.merit_pct, 0, 100)) E('Reward_Policy', r, `merit_pct must be 0–100 (got "${p.merit_pct}")`, 'merit_pct');
    if (!blank(p.compa_band) && !['low', 'mid', 'high'].includes(String(p.compa_band).trim())) E('Reward_Policy', r, `compa_band must be low, mid or high (got "${p.compa_band}")`, 'compa_band');
    if (!blank(p.learning_wallet) && !(fin(p.learning_wallet) && num(p.learning_wallet) >= 0)) E('Reward_Policy', r, `learning_wallet must be a number of 0 or more (got "${p.learning_wallet}")`, 'learning_wallet');
  });
  (data.Recognition || []).forEach((x, i) => {
    const r = rowOf(x, i);
    ref('Recognition', r, 'from_emp_id', x.from_emp_id, emps, 'an employee');
    ref('Recognition', r, 'to_emp_id', x.to_emp_id, emps, 'an employee');
    if (!blank(x.from_emp_id) && String(x.from_emp_id).trim() === String(x.to_emp_id).trim()) W('Recognition', r, `${x.from_emp_id} recognised themselves`, 'self-recognition');
    if (!isDate(x.date)) E('Recognition', r, `date must be YYYY-MM-DD (got "${x.date}")`, 'date');
    if (!blank(x.points) && !(fin(x.points) && num(x.points) >= 0)) W('Recognition', r, `points should be a number of 0 or more (got "${x.points}")`, 'points');
  });
  const cfg = new Map((data.Country_Config || []).map((x, i) => [String(x.key).trim(), { x, i }]));
  if (data.Country_Config) {
    const fy = cfg.get('fy_start_month');
    if (fy) for (const f of ['india_value', 'china_value']) if (!intIn(fy.x[f], 1, 12)) E('Country_Config', rowOf(fy.x, fy.i), `fy_start_month ${f} must be a whole number from 1 to 12 (got "${fy.x[f]}")`);
    const cur = cfg.get('currency');
    if (cur && (String(cur.x.india_value).trim() !== 'INR' || String(cur.x.china_value).trim() !== 'CNY')) E('Country_Config', rowOf(cur.x, cur.i), 'currency must be INR (India) and CNY (China): PRISM pays each person in their own currency');
    const code = cfg.get('bottom_tier_action_code');
    if (code) for (const f of ['india_value', 'china_value']) if (!['pip', 'train_reassign'].includes(String(code.x[f]).trim())) E('Country_Config', rowOf(code.x, code.i), `bottom_tier_action_code ${f} must be pip or train_reassign (got "${code.x[f]}")`);
    for (const k of ['bottom_tier_action', 'performance_year', 'year_end_reward', 'law_in_force']) {
      const c = cfg.get(k);
      if (!c) W('Country_Config', null, `No "${k}" row: the Country Lens shows "—" for it`, 'missing key');
      else if (blank(c.x.india_value) || blank(c.x.china_value)) W('Country_Config', rowOf(c.x, c.i), `${k} is empty for ${blank(c.x.india_value) ? 'India' : 'China'}: the built-in default text is used`, 'empty value');
    }
  }
  return finish();
}

