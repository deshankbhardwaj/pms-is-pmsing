// Country lens (v0.4 §9): India / China values from the Country_Config sheet.
export function lens(idx, country) {
  const out = {};
  for (const [k, v] of Object.entries(idx.country)) out[k] = { value: v[country], note: v.note };
  return out;
}
export function compare(idx, keys) {
  return (keys || Object.keys(idx.country)).map((k) => ({ key: k, IN: idx.country[k]?.IN, CN: idx.country[k]?.CN, note: idx.country[k]?.note }));
}
// One source of truth: the Country_Config sheet (editable in the Country Lens). Pace sets the PIP length.
export function bottomTierAction(idx, country, cadence, fallback = {}) {
  const raw = String(idx.country.bottom_tier_action?.[country] ?? '').trim();
  const code = String(idx.country.bottom_tier_action_code?.[country] ?? '').trim() || (country === 'CN' ? 'train_reassign' : 'pip');
  let text = raw || fallback[country] || (code === 'pip' ? 'Documented improvement plan (PIP)' : 'Training or reassignment first');
  if (code === 'pip' && cadence?.pip_days && !text.includes(cadence.pip_days)) text = `${text}, ${cadence.pip_days}`;
  return { code, text };
}
