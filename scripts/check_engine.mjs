// Proves each persona's storyline (v0.4 §6.1) comes out of the engine, not out of hand-written copy.
// Run from the project root:  node scripts/check_engine.mjs
import { readFileSync } from 'node:fs';
import { runAll } from '../js/engine/index.js';
import { validate, buildMeta } from '../js/engine/validate.js';

const j = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const rules = Object.fromEntries(['methods', 'ranking', 'rewards', 'built70', 'training', 'dna'].map((n) => [n, j(`data/rules/${n}.json`)]));
const data = j('data/sample-org/voltbridge.json');
const out = runAll(data, rules);
const P = Object.fromEntries(out.personas.map((p) => [p.key, p.row]));
const pool = (role, c) => out.pools.find((p) => p.role_id === role && p.homeCountry === c);
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };

console.log('\n== Pools ==');
for (const p of out.pools.sort((a, b) => a.role_id.localeCompare(b.role_id) || a.homeCountry.localeCompare(b.homeCountry))) {
  console.log(`${p.role_id.padEnd(4)} ${p.homeCountry}  n=${String(p.poolSize).padStart(2)}/${String(p.members).padStart(2)}  ${p.verdict.padEnd(8)}  methods: ${p.methods.items.map((m) => `${m.name} ${m.pct}`).join(' / ')}  → ${p.methods.label}`);
}
console.log('\n== Personas ==');
for (const [k, r] of Object.entries(P)) {
  const res = r.result;
  console.log(`${k.padEnd(7)} ${r.emp.name.padEnd(14)} ${r.emp.role_id} ${r.emp.country} R/B/G=${res.results}/${res.behaviours}/${res.growth} (${res.track.track}) composite=${res.composite} rating=${res.rating}${res.capped ? ' CAPPED' : ''} tier=${r.tier?.tier || '-'} box=${r.nineBox?.label} helix=${r.helix.built}/7`);
}
console.log('');
check(pool('SAL', 'IN').verdict === 'forced', 'Sales India → forced distribution for reward tiers');
check(pool('SAL', 'CN').verdict === 'forced', 'Sales China → forced distribution for reward tiers');
check(JSON.stringify(pool('SAL', 'IN').tierPlan.map((t) => t.pct)) === '[15,75,10]', 'Pace 9 → cutthroat tiers 15/75/10');
check(pool('CSA', 'IN').verdict === 'relative', `Customer Support India (${pool('CSA', 'IN').poolSize} compared, ${pool('CSA', 'IN').shielded.length} shielded) → relative calibration`);
check(pool('CSA', 'CN').verdict === 'absolute' && pool('CSA', 'CN').poolSize === 8, 'Wang Fang: Customer Support China pool of 8 → ranking refused');
check(['ASM', 'QIN', 'CFT'].every((r) => pool(r, 'IN').verdict === 'absolute'), 'Assembly, Quality, Charging → absolute standards');
check(pool('BRD', 'CN').verdict === 'absolute' && pool('SWE', 'IN').verdict === 'absolute', 'Battery R&D, Software → absolute + calibration');
check(pool('ASM', 'IN').methods.label === 'Traditional-heavy', 'Assembly → traditional-heavy method blend');
check(pool('BRD', 'CN').methods.label === 'Contemporary' && pool('SWE', 'IN').methods.label === 'Contemporary', 'R&D/Software → contemporary method blend');
check(pool('SAL', 'IN').methods.label === 'Hybrid', 'Sales → hybrid method blend');
check(P.ritu.result.items.find((i) => i.kpi_id === 'ASM-03').score < 2.5 && P.ritu.tier === null, 'Ritu: safety near-miss shows up, never ranked');
check(P.ritu.tna.gaps.some((g) => g.courses.some((c) => c.id === 'TC-02')), 'Ritu: TNA → HV-safety refresher');
const zk = P.zhang.result.items.map((i) => i.value);
check(Math.abs(zk.reduce((s, v) => s + v, 0) / zk.length - 0.7) < 0.06 && Math.abs(P.zhang.result.results - 3.5) < 0.3, 'Zhang Wei: OKRs ~0.7 score ~3.5 (met)');
check(P.zhang.result.track.track === 'rampup' && P.zhang.shielded, 'Zhang Wei: stretch shield → ramp-up weights, out of ranking pools');
check(P.zhang.helix.built === 7, 'Zhang Wei: helix fully built (5 stamps + coaching + course)');
check(P.arjun.tier?.tier === 'Top' && P.arjun.clubTrip, 'Arjun: top tier + Club trip');
check(P.arjun.nineBox?.track === 'Accelerate', 'Arjun: 9-box → Accelerate track');
check(P.karan.result.capped && P.karan.result.rating <= 2 && P.karan.tier?.tier !== 'Top', 'Karan: failed fair-selling gate → rating capped, no top tier');
const karanUnits = P.karan.result.items.find((i) => i.kpi_id === 'SAL-01').value;
const unitsIN = out.employees.filter((x) => x.emp.role_id === 'SAL' && x.emp.country === 'IN').map((x) => x.result.items.find((i) => i.kpi_id === 'SAL-01').value).sort((a, b) => b - a);
check(unitsIN[1] === karanUnits, 'Karan: #2 on units in India');
check(P.chen.tier?.tier === 'Bottom' && P.chen.bottomTierAction?.code === 'train_reassign', 'Chen Jing: bottom tier in China → training/reassignment first');
const lensIN = runAll(data, rules, { countryOverride: 'IN' }).personas.find((p) => p.key === 'chen').row;
check(lensIN.bottomTierAction?.code === 'pip', 'Chen Jing under the India lens → documented PIP');
const vk = out.bias.managers.find((m) => m.manager_id === P.vikram.emp.emp_id);
check(vk && vk.flags.some((f) => f.type === 'leniency') && vk.mean >= 4.4, `Vikram: leniency flag (team average ${vk?.mean} vs company ${out.bias.orgMean})`);
check(P.vikram.result.items.find((i) => i.kpi_id === 'PLM-03').score < 2, 'Vikram: low "leaders built" score');
check(out.protectedLearningPct === 3, 'Pace 9 → protected learning time reduced to 3% (never 0)');

console.log('\n== Data Hub validator ==');
const vs = validate(data, data, data.meta);
check(vs.nErr === 0, `The sample passes its own validator (${vs.nErr} errors, ${vs.nWarn} warnings)`);
const bad = (label, f, expect) => { const d = structuredClone(data); f(d); d.meta = buildMeta(d, null, data).meta; const r = validate(d, data, d.meta); check(r.errs.some((e) => expect.test(e.msg)), `Validator catches: ${label}`); };
bad('potential 2.5', (d) => { d.Employees[5].potential = 2.5; }, /potential must be 1, 2 or 3/);
bad('pay_range_mid in thousands', (d) => { d.Employees[5].pay_range_mid = 600; }, /compa-ratio/);
bad('base_pay 1e15', (d) => { d.Employees[5].base_pay = 1e15; }, /base_pay must be a positive/);
bad('grade missing from Reward_Policy', (d) => { d.Employees[7].grade = 'Z9'; }, /has no IN row in Reward_Policy|has no CN row in Reward_Policy/);
bad('currency that does not match the country', (d) => { d.Employees[8].currency = d.Employees[8].country === 'IN' ? 'CNY' : 'INR'; }, /currency must be/);
bad('text actual', (d) => { d.KPI_Actuals.find((a) => a.kpi_id === 'SAL-01').actual = 'n/a'; }, /is not a number/);
bad('OKR actual of 70', (d) => { d.KPI_Actuals.find((a) => a.kpi_id === 'BRD-K1').actual = 70; }, /scores from 0 to 1/);
bad('own manager', (d) => { d.Employees[10].manager_id = d.Employees[10].emp_id; }, /own manager/);
bad('unknown Feedback_360 ratee', (d) => { d.Feedback_360[0].ratee_id = 'NOPE'; }, /ratee_id "NOPE"/);
bad('weights that add to 99.5', (d) => { d.KPIs[0].weight_pct = Number(d.KPIs[0].weight_pct) - 0.5; }, /add to 99\.5/);
bad('role start after the review date', (d) => { d.Employees[11].role_start_date = '2027-05-01'; }, /after the review date/);
const noGate = structuredClone(data); noGate.KPI_Actuals = noGate.KPI_Actuals.filter((a) => !(a.kpi_id === 'SAL-G1' && a.emp_id === P.arjun.emp.emp_id));
const ng = validate(noGate, data, data.meta), ngOut = runAll(noGate, rules).employees.find((x) => x.emp.emp_id === P.arjun.emp.emp_id);
check(ng.nErr === 0 && ng.warns.some((w) => /no data for the gate SAL-G1/.test(w.msg)) && !ngOut.result.capped && ngOut.result.gatePassed, 'Missing gate rows: a warning, no penalty (Arjun not capped)');
console.log(`\nBudget guard: IN ${out.budget.IN.utilisationPct}% of target pool, CN ${out.budget.CN.utilisationPct}%`);
console.log(`Arjun total reward: ${P.arjun.rewards.total} ${P.arjun.rewards.currency} (${P.arjun.rewards.extras.map((x) => x.name + ' ' + x.amount).join(', ')})`);
console.log(`\n${fails ? fails + ' FAILED' : 'All persona checks passed'}`);
process.exit(fails ? 1 : 0);
