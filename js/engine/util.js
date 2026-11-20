// PRISM engine helpers. Pure functions, no DOM, so the same code runs in the browser and in Node.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) ? null : Number(v);
export const list = (v) => String(v ?? '').split(';').map((s) => s.trim()).filter(Boolean);
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
// The "leaders built" KPI for people managers (spec §8.6 rule 5); the Forge can switch it off.
export const isLeadersBuiltKpi = (k) => k.kpi_id === 'PLM-03' || /leaders built/i.test(String(k.kpi_name));
export const round = (x, d = 2) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);
export function monthsBetween(isoA, isoB) {
  const a = new Date(isoA), b = new Date(isoB);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() - a.getDate()) / 30;
}
const group = (rows, key) => {
  const m = new Map();
  for (const r of rows || []) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

// Index every sheet once so lookups are cheap.
export function indexData(data) {
  const meta = data.meta || {};
  const org = (data.Org || [])[0] || {};
  const emp = new Map((data.Employees || []).map((e) => [e.emp_id, e]));
  const role = new Map((data.Roles || []).map((r) => [r.role_id, r]));
  const actuals = new Map();
  for (const a of data.KPI_Actuals || []) {
    if (!actuals.has(a.emp_id)) actuals.set(a.emp_id, new Map());
    const m = actuals.get(a.emp_id);
    if (!m.has(a.kpi_id)) m.set(a.kpi_id, []);
    m.get(a.kpi_id).push({ period: a.period, actual: num(a.actual) });
  }
  const country = {};
  for (const r of data.Country_Config || []) {
    country[r.key] = { IN: r.india_value, CN: r.china_value, note: r.note };
  }
  return {
    data, meta, org, emp, role,
    kpisByRole: group(data.KPIs, 'role_id'),
    kpi: new Map((data.KPIs || []).map((k) => [k.kpi_id, k])),
    actuals,
    fb: group(data.Feedback_360, 'ratee_id'),
    checkins: group(data.CheckIns, 'emp_id'),
    devGoals: group(data.Dev_Goals, 'emp_id'),
    experiences: group(data.Experiences, 'emp_id'),
    lp: new Map((data.Leadership_Profile || []).map((r) => [r.emp_id, r])),
    training: group(data.Training_Records, 'emp_id'),
    course: new Map((data.Training_Catalogue || []).map((c) => [c.course_id, c])),
    reports: group((data.Employees || []).filter((e) => e.manager_id), 'manager_id'),
    competency: new Map((data.Competencies || []).map((c) => [c.comp_id, c])),
    policy: data.Reward_Policy || [],
    country,
    asOf: meta.review_date || new Date().toISOString().slice(0, 10),
    personas: meta.personas || [],
  };
}
