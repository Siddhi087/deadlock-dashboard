import { safety, request, detect, need, validate, names, orderingViolations, enforceOrdering } from './algorithms.js';
import { SAMPLE, UNSAFE_REQ, DEADLOCK } from './data.js';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const TESTS = [
  { id: 'TC1', title: 'Safe State', cond: 'Sample data: Available [3,3,2], 5 processes.', expected: 'Safe, with a complete safe sequence of all 5 processes.',
    run() { const r = safety(SAMPLE.alloc, SAMPLE.max, SAMPLE.avail);
      return { actual: r.safe ? `Safe: ${names(r.seq)}` : `Unsafe, stuck: ${names(r.stuck)}`, analysis: 'Each process in turn had Need ≤ Work, finished, and released its allocation.', pass: r.safe && r.seq.length === 5 }; } },
  { id: 'TC2', title: 'Request Exceeds Available', cond: 'Sample data; P0 requests [7,4,3] (≤ Need [7,4,3], > Available [3,3,2]).', expected: 'Waiting; allocation unchanged.',
    run() { const r = request(SAMPLE, 0, [7, 4, 3]);
      return { actual: `${r.status}; allocation unchanged: ${same(r.state, SAMPLE)}`, analysis: r.why, pass: r.status === 'Waiting' && same(r.state, SAMPLE) }; } },
  { id: 'TC3', title: 'Unsafe Request', cond: 'One resource (12 units). Alloc P0=5,P1=2,P2=2; Max 10,4,9; Available 3. P2 requests 1.', expected: 'Trial allocation unsafe; request denied; original state restored.',
    run() { const r = request(UNSAFE_REQ, 2, [1]);
      return { actual: `${r.status}; original restored: ${same(r.state, UNSAFE_REQ)}`, analysis: r.why + ' Note: unsafe ≠ deadlocked; no process is blocked yet.', pass: r.status === 'Denied' && same(r.state, UNSAFE_REQ) }; } },
  { id: 'TC4', title: 'Deadlocked Scenario', cond: 'P0 holds A, wants B; P1 holds B, wants A; P2 idle. Available [0,0].', expected: 'Deadlocked: P0 and P1.',
    run() { const d = detect(DEADLOCK.alloc, need(DEADLOCK.alloc, DEADLOCK.max), DEADLOCK.avail);
      return { actual: `Deadlocked: ${names(d.dead)}`, analysis: 'With single-instance resources, this cycle P0→B→P1→A→P0 is a genuine deadlock. P2 finished safely.', pass: same(d.dead, [0, 1]) }; } },
  { id: 'TC5', title: 'Prevention Policy (Resource Ordering)', cond: 'Deadlock dataset with ordering A<B<C enforced (circular wait eliminated).', expected: 'Violations found in original, none after enforcement, and no deadlock.',
    run() { const nd = need(DEADLOCK.alloc, DEADLOCK.max); const v = orderingViolations(DEADLOCK.alloc, nd);
      const m = enforceOrdering(DEADLOCK); const v2 = orderingViolations(m.alloc, need(m.alloc, m.max)); const d = detect(m.alloc, need(m.alloc, m.max), m.avail);
      return { actual: `Violations before: ${v.length}, after: ${v2.length}; deadlocked after: ${names(d.dead)}`, analysis: 'P1 held B while wanting A (against the order). Rolling that back removes circular wait, so the cycle cannot form.', pass: v.length > 0 && v2.length === 0 && !d.dead.length }; } },
  { id: 'TC6', title: 'Boundary and Invalid Inputs', cond: 'Zero Available, zero Need, bad process ID, negative request, Allocation > Max.', expected: 'Waiting, Invalid, Invalid, Invalid, Invalid.',
    run() { const subs = [
        ['Zero Available', request({ alloc: [[1]], max: [[3]], avail: [0] }, 0, [1]).status, 'Waiting'],
        ['Zero remaining Need', request({ alloc: [[3]], max: [[3]], avail: [2] }, 0, [1]).status, 'Invalid'],
        ['Process ID 9', request(SAMPLE, 9, [0, 0, 0]).status, 'Invalid'],
        ['Negative request', request(SAMPLE, 1, [-1, 0, 0]).status, 'Invalid'],
        ['Allocation > Max', validate({ alloc: [[4]], max: [[3]], avail: [1] }).length ? 'Invalid' : 'Valid', 'Invalid']];
      return { actual: subs.map((s) => `${s[0]}: ${s[1]}`).join(' | '), analysis: 'Waiting (Request > Available) is distinct from Invalid (Request > Need, bad ID, negative, or inconsistent data).', pass: subs.every((s) => s[1] === s[2]) }; } },
];
