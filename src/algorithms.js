// Pure algorithm logic. No React here.
export const need = (a, m) => m.map((r, i) => r.map((v, j) => v - a[i][j]));
export const le = (a, b) => a.every((v, i) => v <= b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
export const names = (list) => list.map((i) => 'P' + i).join(' → ') || '—';

// Shared core: repeatedly finish any process whose demand <= Work, then Work += Allocation.
function run(alloc, demand, avail, fin) {
  let work = [...avail]; fin = [...fin]; const steps = []; let go = true;
  while (go) {
    go = false;
    alloc.forEach((row, i) => {
      if (!fin[i] && le(demand[i], work)) {
        const before = work; work = add(work, row); fin[i] = true; go = true;
        steps.push({ p: i, need: demand[i], before, after: work });
      }
    });
  }
  const stuck = fin.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
  return { steps, fin, work, stuck };
}

// Banker's Safety Algorithm (avoidance): demand = Need
export const safety = (a, m, v) => {
  const r = run(a, need(a, m), v, a.map(() => false));
  return { ...r, safe: !r.stuck.length, seq: r.steps.map((s) => s.p) };
};
// Deadlock Detection (multi-instance): demand = pending Request; zero-allocation processes start Finished
export const detect = (a, q, v) => {
  const r = run(a, q, v, a.map((x) => x.every((y) => y === 0)));
  return { ...r, dead: r.stuck };
};

export function validate(s) {
  const e = [];
  s.alloc.forEach((r, i) => r.forEach((v, j) => {
    if (!Number.isInteger(v) || v < 0) e.push(`Allocation[P${i}][${j}] must be a non-negative integer.`);
    if (!Number.isInteger(s.max[i][j]) || s.max[i][j] < 0) e.push(`Max[P${i}][${j}] must be a non-negative integer.`);
    if (v > s.max[i][j]) e.push(`P${i}: Allocation exceeds Maximum for resource ${String.fromCharCode(65 + j)}.`);
  }));
  s.avail.forEach((v, j) => { if (!Number.isInteger(v) || v < 0) e.push(`Available[${j}] must be a non-negative integer.`); });
  return e;
}

// Resource-Request Algorithm. Status: Invalid | Waiting | Granted | Denied
export function request(s, p, req) {
  const n = need(s.alloc, s.max);
  if (!Number.isInteger(p) || p < 0 || p >= s.alloc.length) return { status: 'Invalid', why: 'Process ID does not exist.' };
  if (req.length !== s.avail.length || req.some((v) => !Number.isInteger(v) || v < 0))
    return { status: 'Invalid', why: 'Request must be non-negative integers, one per resource type.' };
  if (!le(req, n[p])) return { status: 'Invalid', why: `Request [${req}] > Need [${n[p]}]: process exceeds its declared maximum claim.` };
  if (!le(req, s.avail)) return { status: 'Waiting', why: `Request [${req}] ≤ Need but > Available [${s.avail}]. P${p} must wait; allocation is unchanged (this is not an error).`, state: s };
  const t = { ...s, avail: sub(s.avail, req), alloc: s.alloc.map((r, i) => (i === p ? add(r, req) : r)) };
  const check = safety(t.alloc, t.max, t.avail);
  return check.safe
    ? { status: 'Granted', why: `Request ≤ Need and ≤ Available. Trial allocation is SAFE (${names(check.seq)}), so it is granted.`, state: t, check }
    : { status: 'Denied', why: 'Trial allocation leads to an UNSAFE state, so the request is denied and the original allocation is restored.', state: s, check };
}

// Prevention: circular-wait elimination by resource ordering (A<B<C). A process holding resource a may not want b<a.
export function orderingViolations(alloc, nd) {
  const out = [];
  alloc.forEach((r, i) => r.forEach((h, a) => { if (h > 0) nd[i].forEach((w, b) => { if (w > 0 && b < a) out.push({ p: i, holds: a, wants: b }); }); }));
  return out;
}
// Enforce ordering: violating holdings are rolled back (released) so the process re-acquires in order.
export function enforceOrdering(s) {
  const v = orderingViolations(s.alloc, need(s.alloc, s.max));
  const alloc = s.alloc.map((r) => [...r]); const avail = [...s.avail];
  v.forEach(({ p, holds }) => { avail[holds] += alloc[p][holds]; alloc[p][holds] = 0; });
  return { ...s, alloc, avail };
}
// Prevention: no hold-and-wait. A process must acquire its whole Max at once, otherwise it holds nothing.
export function holdWait(s) {
  const total = s.avail.map((a, j) => a + s.alloc.reduce((x, r) => x + r[j], 0));
  let left = [...total]; const admitted = [];
  s.max.forEach((m, i) => { if (le(m, left)) { left = sub(left, m); admitted.push(i); } });
  const idle = admitted.reduce((x, i) => x + need(s.alloc, s.max)[i].reduce((a, b) => a + b, 0) + s.alloc[i].reduce((a, b) => a + b, 0) - s.max[i].reduce((a, b) => a + b, 0) + s.max[i].reduce((a, b) => a + b, 0) - s.alloc[i].reduce((a, b) => a + b, 0), 0);
  return { total, admitted, runnableAlone: s.max.every((m) => le(m, total)), reserved: idle };
}
// Recovery: terminate process p and release its resources.
export function terminate(s, p) {
  return { ...s, alloc: s.alloc.map((r, i) => (i === p ? r.map(() => 0) : r)), max: s.max.map((r, i) => (i === p ? r.map(() => 0) : r)), avail: add(s.avail, s.alloc[p]) };
}
