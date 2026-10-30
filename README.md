# Deadlock Analysis & Resource Allocation Dashboard
Setup: `npm install` then `npm run dev` (open the printed localhost URL).
Files: src/algorithms.js (all OS logic, no UI), src/data.js (sample datasets), src/tests.js (TC1-TC6),
src/components.jsx (Matrix, Badge, Card, Graph), src/pages.jsx (pages), src/App.jsx (layout/state).
Assumption for detection: multiple-instance resources; each process's pending Request = its remaining Need (Max - Allocation).
