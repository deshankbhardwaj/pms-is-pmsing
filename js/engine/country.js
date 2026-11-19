// Country lens (v0.4 §9): India / China values from the Country_Config sheet.
export function lens(idx, country) {
  const out = {};
  for (const [k, v] of Object.entries(idx.country)) out[k] = { value: v[country], note: v.note };
  return out;
}
export function compare(idx, keys) {
  return (keys || Object.keys(idx.country)).map((k) => ({ key: k, IN: idx.country[k]?.IN, CN: idx.country[k]?.CN, note: idx.country[k]?.note }));
}
export function bottomTierAction(idx, country) {
  const c = idx.country.bottom_tier_action;
  const code = idx.country.bottom_tier_action_code?.[country];
  return { code, text: c?.[country] };
}
