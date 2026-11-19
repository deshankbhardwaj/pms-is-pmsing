// M12 Overview dashboard
import * as UI from '../ui.js';
import { histogram, hbars } from '../charts.js';
const { esc } = UI;
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

export default {
  render(ctx) {
    const out = ctx.out, emps = out.employees, org = out.org;
    const comp = emps.map((r) => r.result.composite).filter((v) => v !== null);
    const hi = emps.filter((r) => r.result.rating >= 4).length;
    const lt = emps.filter((r) => r.leadershipTrack).length;
    const sh = emps.filter((r) => r.shielded).length;
    const roles = [...out.idx.role.values()].filter((r) => r.role_id !== 'EXE');
    const roleBars = roles.map((r) => ({ label: r.title, value: avg(emps.filter((x) => x.emp.role_id === r.role_id).map((x) => x.result.results).filter((v) => v !== null)) }))
      .sort((a, b) => b.value - a.value);
    const top = emps.filter((r) => r.nineBox?.topThree);
    const risk = top.filter((r) => r.emp.flight_risk === 'H');
    const cmp = ['IN', 'CN'].map((c) => {
      const rs = emps.filter((r) => r.emp.country === c);
      return { c, n: rs.length, avg: avg(rs.map((r) => r.result.composite)), hi: (rs.filter((r) => r.result.rating >= 4).length / (rs.length || 1)) * 100 };
    });
    const pp = out.personas.filter((p) => p.row);
    const forced = out.pools.filter((p) => p.verdict === 'forced').length;
    return `
      ${UI.pageHead({ eyebrow: 'Overview · M12', title: `${esc(org.org_name)}: <em>one core, many lenses.</em>`, sub: `${esc(org.vision)} A fictional EV maker with ${emps.length} people scored across India and China. Every number below comes from the engine, not from hand-written copy.` })}
      <div class="grid g4">
        <div class="card stat"><div class="v">${UI.counter(emps.length)}</div><div class="l">PEOPLE SCORED</div><div class="d">${cmp[0].n} India · ${cmp[1].n} China</div></div>
        <div class="card stat"><div class="v">${UI.counter(avg(comp), { dec: 2 })}</div><div class="l">AVERAGE COMPOSITE (1–5)</div><div class="d">${UI.pct((hi / emps.length) * 100)} rated Strong or Outstanding</div></div>
        <div class="card stat"><div class="v">${UI.counter(lt)}</div><div class="l">ON THE LEADERSHIP TRACK</div><div class="d">Growth carries 20% of their score</div></div>
        <div class="card stat"><div class="v">${UI.counter(sh)}</div><div class="l">SHIELDED FROM RANKING</div><div class="d">New role or stretch assignment (Built 70)</div></div>
      </div>
      <div class="grid g21 mt">
        <div class="card"><div class="row between"><h3 class="s">How performance is really spread</h3><button class="btn light sm" data-go="ranking">Ranking Engine →</button></div>
          ${histogram(comp, { color: '#5f7cff' })}
          <p class="why mt">A few stars and a long middle, not a neat bell. That is why PRISM ranks only where a role and a pool allow it (${forced} of ${out.pools.length} pools).</p></div>
        <div class="card"><h3 class="s">Talent at a glance</h3>
          <div class="kv"><dt>Top three 9-box boxes</dt><dd>${top.length} people</dd><dt>…of whom high flight risk</dt><dd>${risk.length}${risk.length ? ` (${risk.slice(0, 3).map((r) => esc(r.emp.name)).join(', ')}${risk.length > 3 ? '…' : ''})` : ''}</dd>
          <dt>Managers flagged for rating bias</dt><dd>${out.bias.managers.filter((m) => m.flags.length).length}</dd>
          <dt>Bonus pool used</dt><dd>IN ${out.budget.IN.utilisationPct}% · CN ${out.budget.CN.utilisationPct}%</dd>
          <dt>Protected learning time</dt><dd>${out.protectedLearningPct}% of hours (pace ${esc(org.pace)})</dd></div>
          <div class="row mt"><button class="btn light sm" data-go="develop">9-box →</button><button class="btn light sm" data-go="consultant">Bias check →</button></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><h3 class="s">Results score by role</h3>${hbars(roleBars, { max: 5, dec: 2 })}<p class="why mt">Average of each role's weighted KPI/OKR scores (1 = threshold, 3 = target, 5 = stretch).</p></div>
        <div class="card"><h3 class="s">India vs China</h3>
          ${cmp.map((c) => `<div class="row mt" style="align-items:flex-start"><div style="width:44px">${UI.code(c.c)}</div><div style="flex:1"><div class="hbar"><span class="lab">Average composite</span>${UI.bar((c.avg / 5) * 100)}<span class="val">${UI.fmt(c.avg)}</span></div><div class="hbar"><span class="lab">Rated 4–5</span>${UI.bar(c.hi, '#1dab84')}<span class="val">${UI.fmt(c.hi, 0)}%</span></div></div></div>`).join('')}
          <p class="why mt">Same engine, same rules. The country lens (top bar) changes timing, rewards and what happens to the bottom tier.</p></div>
      </div>
      <div class="card mt"><div class="row between"><h3 class="s">Seven people carry the story</h3><button class="btn pri sm" data-go="tour">▶ Take the guided tour</button></div>
        <div class="grid g4 mt">${pp.map((p) => `<div class="li" data-person="${p.emp_id}">${UI.avatar(p.row.emp.name)}<div class="grow"><b>${esc(p.row.emp.name)}</b><small>${esc(p.row.title)} · ${esc(p.row.emp.site)}</small></div>${UI.rate(p.row.result.rating, p.row.result.capped)}</div>`).join('')}</div></div>`;
  },
};
