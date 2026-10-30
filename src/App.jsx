import { useState } from 'react';
import { LayoutDashboard, Settings, ShieldCheck, Send, AlertOctagon, GitBranch, FlaskConical, RotateCcw } from 'lucide-react';
import { SAMPLE, UNSAFE_REQ, DEADLOCK, clone } from './data.js';
import { Overview, Config, Banker, Requests, Detection, Prevention, Tests } from './pages.jsx';

const PAGES = [['Overview', LayoutDashboard], ['Configuration', Settings], ["Banker's Algorithm", ShieldCheck], ['Request Simulator', Send],
  ['Deadlock Detection', AlertOctagon], ['Prevention & Recovery', GitBranch], ['Test Cases', FlaskConical]];

export default function App() {
  const [page, setPage] = useState(0); const [sys, setSysRaw] = useState(clone(SAMPLE)); const [log, setLog] = useState(['Sample data loaded.']);
  const addLog = (m) => setLog((l) => [m, ...l].slice(0, 8));
  const setSys = (s) => setSysRaw(clone(s));
  const load = (name, d) => { setSys(d); addLog(`Loaded: ${name}`); };
  const props = { sys, setSys, addLog, log };
  const View = [Overview, Config, Banker, Requests, Detection, Prevention, Tests][page];
  return (<div className="app">
    <nav><h1>OS Deadlock Lab</h1>{PAGES.map(([t, Icon], i) => <button key={t} className={i === page ? 'on' : ''} onClick={() => setPage(i)}><Icon size={16} />{t}</button>)}</nav>
    <main><div className="top"><h2>{PAGES[page][0]}</h2><div>
      <button className="btn ghost" onClick={() => load('Sample (safe)', SAMPLE)}>Load sample</button>{' '}
      <button className="btn ghost" onClick={() => load('Unsafe-request dataset', UNSAFE_REQ)}>Unsafe-request data</button>{' '}
      <button className="btn ghost" onClick={() => load('Deadlock dataset', DEADLOCK)}>Deadlock data</button>{' '}
      <button className="btn" onClick={() => { setSys(SAMPLE); setLog(['System reset.']); }}><RotateCcw size={14} /> Reset</button></div></div>
      <View key={page + JSON.stringify(sys.avail.length)} {...props} /></main></div>);
}
