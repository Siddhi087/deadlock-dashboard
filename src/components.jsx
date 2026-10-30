export const L = (i) => String.fromCharCode(65 + i);
export const Badge = ({ s }) => <span className={'badge ' + String(s).toLowerCase()}>{s}</span>;
export const Card = ({ title, right, children }) => (
  <section className="card"><header><h3>{title}</h3>{right}</header>{children}</section>);

// Matrix or vector table. If onChange is given the cells are editable inputs.
export function Matrix({ title, data, onChange, vector, hl = [], right }) {
  const rows = vector ? [data] : data;
  return (
    <Card title={title} right={right}><div className="scroll"><table>
      <thead><tr><th></th>{rows[0].map((_, j) => <th key={j}>{L(j)}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i} className={hl.includes(i) ? 'hl' : ''}><th>{vector ? '' : 'P' + i}</th>
          {r.map((v, j) => <td key={j}>{onChange
            ? <input type="number" min="0" value={v} onChange={(e) => onChange(vector ? 0 : i, j, Number(e.target.value))} />
            : v}</td>)}</tr>))}</tbody></table></div></Card>);
}

// Resource-allocation graph: solid = allocated (R→P), dashed = waiting (P→R)
export function Graph({ alloc, req, dead = [] }) {
  const n = alloc.length, m = alloc[0].length, W = Math.max(n, m) * 90 + 40;
  const px = (i) => 50 + i * 90, rx = (j) => 50 + j * 90;
  return (<div className="scroll"><svg width={W} height="230" className="graph">
    <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8z" fill="#8aa4d6" /></marker></defs>
    {alloc.map((r, i) => r.map((v, j) => v > 0 && <line key={'a' + i + j} x1={rx(j)} y1="165" x2={px(i)} y2="62" stroke="#4ade80" strokeWidth="2" markerEnd="url(#ar)" />))}
    {req.map((r, i) => r.map((v, j) => v > 0 && <line key={'r' + i + j} x1={px(i) + 6} y1="62" x2={rx(j) + 6} y2="165" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#ar)" />))}
    {alloc.map((_, i) => <g key={'p' + i}><circle cx={px(i)} cy="40" r="20" className={dead.includes(i) ? 'nd dead' : 'nd'} /><text x={px(i)} y="45" textAnchor="middle">P{i}</text></g>)}
    {alloc[0].map((_, j) => <g key={'q' + j}><rect x={rx(j) - 20} y="170" width="40" height="40" rx="6" className="nr" /><text x={rx(j)} y="195" textAnchor="middle">{L(j)}</text></g>)}
  </svg><p className="muted">Green solid: allocated. Amber dashed: requested/waiting. Red process: deadlocked.</p></div>);
}
