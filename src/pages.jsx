import { useState } from 'react';
import { Badge, Card, Matrix, Graph, L } from './components.jsx';
import { need, safety, detect, request, validate, names, orderingViolations, enforceOrdering, holdWait, terminate } from './algorithms.js';
import { TESTS } from './tests.js';

const sumCol = (a, j) => a.reduce((x, r) => x + r[j], 0);
const Vec = ({ v }) => <code>[{v.join(', ')}]</code>;

export function Overview({ sys, log }) {
  const n = need(sys.alloc, sys.max), s = safety(sys.alloc, sys.max, sys.avail), d = detect(sys.alloc, n, sys.avail);
  const done = n.filter((r) => r.every((v) => v === 0)).length;
  const state = d.dead.length ? 'Deadlocked' : s.safe ? 'Safe' : 'Unsafe';
  const total = sys.avail.map((a, j) => a + sumCol(sys.alloc, j));
  const stats = [['Processes', sys.alloc.length], ['Resource types', sys.avail.length], ['Available', `[${sys.avail}]`], ['Active', sys.alloc.length - done], ['Completed (Need=0)', done], ['Deadlocked', d.dead.length]];
  return (<>
    <div className="grid stats">{stats.map(([k, v]) => <div className="stat" key={k}><span>{k}</span><b>{v}</b></div>)}
      <div className="stat"><span>System state</span><Badge s={state} /></div></div>
    <div className="grid two">
      <Card title="Resource utilization">{total.map((t, j) => { const used = t - sys.avail[j], pct = t ? Math.round(used / t * 100) : 0;
        return <div key={j} className="bar"><span>{L(j)} ({used}/{t})</span><div><i style={{ width: pct + '%' }} /></div><em>{pct}%</em></div>; })}</Card>
      <Card title="Recent activity"><ul className="log">{log.length ? log.map((l, i) => <li key={i}>{l}</li>) : <li>No activity yet.</li>}</ul></Card></div></>);
}

const resize = (M, r, c) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (M[i]?.[j] ?? 0)));
export function Config({ sys, setSys }) {
  const n = sys.alloc.length, m = sys.avail.length, errs = validate(sys);
  const setDim = (nn, mm) => { nn = Math.min(8, Math.max(1, nn || 1)); mm = Math.min(6, Math.max(1, mm || 1));
    setSys({ alloc: resize(sys.alloc, nn, mm), max: resize(sys.max, nn, mm), avail: resize([sys.avail], 1, mm)[0] }); };
  const edit = (key) => (i, j, v) => setSys({ ...sys, [key]: key === 'avail' ? sys.avail.map((x, k) => (k === j ? v : x)) : sys[key].map((r, a) => (a === i ? r.map((x, b) => (b === j ? v : x)) : r)) });
  return (<>
    <Card title="Dimensions"><label>Processes <input type="number" min="1" max="8" value={n} onChange={(e) => setDim(+e.target.value, m)} /></label>{' '}
      <label>Resource types <input type="number" min="1" max="6" value={m} onChange={(e) => setDim(n, +e.target.value)} /></label></Card>
    {errs.length ? <Card title="Validation errors"><ul className="err">{errs.map((e, i) => <li key={i}>{e}</li>)}</ul></Card> : <Card title="Validation"><Badge s="Safe" /> All inputs valid.</Card>}
    <div className="grid two"><Matrix title="Allocation (editable)" data={sys.alloc} onChange={edit('alloc')} /><Matrix title="Maximum (editable)" data={sys.max} onChange={edit('max')} /></div>
    <div className="grid two"><Matrix title="Available (editable)" data={sys.avail} vector onChange={edit('avail')} />
      <Matrix title="Need = Maximum − Allocation" data={need(sys.alloc, sys.max)} /></div></>);
}

export function Banker({ sys }) {
  const [k, setK] = useState(0); const r = safety(sys.alloc, sys.max, sys.avail);
  const kk = Math.min(k, r.steps.length), work = kk ? r.steps[kk - 1].after : sys.avail, next = r.steps[kk]?.p;
  const doneSet = r.steps.slice(0, kk).map((s) => s.p);
  return (<>
    <Card title="Result" right={<Badge s={r.safe ? 'Safe' : 'Unsafe'} />}>
      {r.safe ? <p>Safe sequence: <b>{names(r.seq)}</b></p> : <p>No safe sequence. Processes that cannot finish: <b>{names(r.stuck)}</b>. (Unsafe means deadlock is possible, not that it has occurred.)</p>}
      <p>Work = <Vec v={work} /> after {kk} of {r.steps.length} completions. {next !== undefined ? <>Next runnable: <b>P{next}</b> (Need <Vec v={r.steps[kk].need} /> ≤ Work).</> : 'No further process can run.'}</p>
      <button className="btn" disabled={!kk} onClick={() => setK(kk - 1)}>Previous</button>{' '}
      <button className="btn" disabled={kk >= r.steps.length} onClick={() => setK(kk + 1)}>Next step</button>{' '}
      <button className="btn ghost" onClick={() => setK(r.steps.length)}>Show all</button>{' '}<button className="btn ghost" onClick={() => setK(0)}>Restart</button></Card>
    <div className="grid two"><Matrix title="Allocation" data={sys.alloc} hl={next !== undefined ? [next] : []} /><Matrix title="Maximum" data={sys.max} />
      <Matrix title="Need" data={need(sys.alloc, sys.max)} hl={next !== undefined ? [next] : []} /><Matrix title="Work (current)" data={work} vector /></div>
    <Card title="Step log"><table><thead><tr><th>Step</th><th>Process</th><th>Need ≤ Work?</th><th>Work before</th><th>Work after (+Alloc)</th></tr></thead>
      <tbody>{r.steps.slice(0, kk).map((s, i) => <tr key={i}><td>{i + 1}</td><td>P{s.p}</td><td><Vec v={s.need} /> ≤ <Vec v={s.before} /></td><td><Vec v={s.before} /></td><td><Vec v={s.after} /></td></tr>)}</tbody></table></Card></>);
}

export function Requests({ sys, setSys, addLog }) {
  const [p, setP] = useState(0); const [req, setReq] = useState(sys.avail.map(() => 0)); const [res, setRes] = useState(null);
  const R = req.length === sys.avail.length ? req : sys.avail.map(() => 0);
  const submit = () => { const r = request(sys, +p, R); setRes(r); addLog(`P${p} requested [${R}] → ${r.status}`); if (r.status === 'Granted') setSys(r.state); };
  return (<>
    <Card title="Resource request">
      <label>Process <select value={p} onChange={(e) => setP(+e.target.value)}>{sys.alloc.map((_, i) => <option key={i} value={i}>P{i}</option>)}</select></label>{' '}
      {sys.avail.map((_, j) => <label key={j}>{L(j)} <input type="number" value={R[j]} onChange={(e) => setReq(R.map((x, k) => (k === j ? Number(e.target.value) : x)))} /></label>)}{' '}
      <button className="btn" onClick={submit}>Submit request</button>
      <p className="muted">Need P{p}: <Vec v={need(sys.alloc, sys.max)[p]} /> · Available: <Vec v={sys.avail} /></p></Card>
    {res && <Card title="Decision" right={<Badge s={res.status} />}><p>{res.why}</p>
      {res.check && <p>Safety check on trial state: {res.check.safe ? `safe sequence ${names(res.check.seq)}` : `stuck processes ${names(res.check.stuck)}`}</p>}
      {res.status === 'Granted' && <p>Allocation updated. New Available: <Vec v={res.state.avail} /></p>}
      {res.status === 'Denied' && <p>Original allocation restored. Available stays <Vec v={sys.avail} />.</p>}</Card>}</>);
}

export function Detection({ sys }) {
  const q = need(sys.alloc, sys.max), d = detect(sys.alloc, q, sys.avail);
  return (<>
    <Card title="Detection result" right={<Badge s={d.dead.length ? 'Deadlocked' : 'Safe'} />}>
      <p>{d.dead.length ? <>Deadlocked processes: <b>{names(d.dead)}</b></> : 'No deadlock: every process can eventually finish.'}</p>
      <p className="muted"><b>Assumptions:</b> resource types have multiple instances; a cycle is only a deadlock if every instance is held (a cycle alone is necessary, not sufficient, unless each type has one instance). Pending Request of each process = its remaining Need. Processes holding nothing start as Finished. This module is independent of the Banker's safety check.</p></Card>
    <div className="grid two"><Matrix title="Allocation" data={sys.alloc} hl={d.dead} /><Matrix title="Request (= Need)" data={q} hl={d.dead} /></div>
    <div className="grid two"><Matrix title="Available" data={sys.avail} vector /><Matrix title="Final Work" data={d.work} vector /></div>
    <Card title="Finish vector"><table><thead><tr><th>Process</th><th>Finish</th></tr></thead><tbody>{d.fin.map((f, i) => <tr key={i} className={d.dead.includes(i) ? 'hl' : ''}><td>P{i}</td><td>{f ? 'true' : 'false'}</td></tr>)}</tbody></table>
      <p>Order of completion:</p><ol>{d.steps.map((s, i) => <li key={i}>P{s.p}: Work <Vec v={s.before} /> → <Vec v={s.after} /></li>)}</ol></Card>
    <Card title="Resource dependency graph"><Graph alloc={sys.alloc} req={q} dead={d.dead} /></Card></>);
}

export function Prevention({ sys, setSys, addLog }) {
  const [p, setP] = useState(0); const q = need(sys.alloc, sys.max);
  const base = detect(sys.alloc, q, sys.avail), viol = orderingViolations(sys.alloc, q), ord = enforceOrdering(sys);
  const ordD = detect(ord.alloc, need(ord.alloc, ord.max), ord.avail), hw = holdWait(sys);
  const rec = terminate(sys, p), recD = detect(rec.alloc, need(rec.alloc, rec.max), rec.avail);
  return (<>
    <Card title="Original policy (hold-and-wait, no ordering)" right={<Badge s={base.dead.length ? 'Deadlocked' : 'Safe'} />}>
      <p>Deadlocked: {names(base.dead)}. Processes may hold some resources while waiting for others.</p></Card>
    <div className="grid two">
      <Card title="Prevention 1: fixed resource ordering (A &lt; B &lt; C)" right={<Badge s={ordD.dead.length ? 'Deadlocked' : 'Safe'} />}>
        <p>Order violations (hold higher, want lower): {viol.length ? viol.map((v) => `P${v.p} holds ${L(v.holds)} wants ${L(v.wants)}`).join('; ') : 'none'}.</p>
        <p>After rolling back violating holdings: Available <Vec v={ord.avail} />; deadlocked: {names(ordD.dead)}.</p>
        <p className="muted">Eliminates <b>circular wait</b>. Trade-off: some work is rolled back / processes must acquire early, which can leave resources idle.</p></Card>
      <Card title="Prevention 2: eliminate hold-and-wait">
        <p>Each process requests its entire Max at once (or holds nothing). Total system resources: <Vec v={hw.total} />.</p>
        <p>Processes that can start together: <b>{names(hw.admitted)}</b> ({hw.admitted.length}/{sys.alloc.length}). {hw.runnableAlone ? 'Every process can run eventually.' : 'Some process claims more than the system owns (starvation).'}</p>
        <p className="muted">Trade-off: no deadlock, but lower concurrency and idle reserved resources (reserved units: {hw.reserved}), and possible starvation.</p></Card></div>
    <Card title="Recovery: terminate a process">
      <label>Victim <select value={p} onChange={(e) => setP(+e.target.value)}>{sys.alloc.map((_, i) => <option key={i} value={i}>P{i}</option>)}</select></label>{' '}
      <button className="btn" onClick={() => { setSys(rec); addLog(`Terminated P${p}; Available now [${rec.avail}]`); }}>Terminate &amp; apply</button>
      <p>Preview: releases <Vec v={sys.alloc[p]} /> → new Available <Vec v={rec.avail} />. Deadlocked after: {names(recD.dead)}.</p></Card></>);
}

export function Tests() {
  const [res, setRes] = useState({}); const run = (t) => setRes((r) => ({ ...r, [t.id]: t.run() }));
  return (<><button className="btn" onClick={() => TESTS.forEach(run)}>Run all tests</button>
    {TESTS.map((t) => { const r = res[t.id]; return (
      <Card key={t.id} title={`${t.id}: ${t.title}`} right={r && <Badge s={r.pass ? 'Pass' : 'Fail'} />}>
        <p><b>System condition:</b> {t.cond}</p><p><b>Expected:</b> {t.expected}</p>
        {r && <><p><b>Actual:</b> {r.actual}</p><p><b>Analysis:</b> {r.analysis}</p></>}
        <button className="btn ghost" onClick={() => run(t)}>Run {t.id}</button></Card>); })}</>);
}
