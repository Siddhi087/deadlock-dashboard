export const SAMPLE = { alloc: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]], max: [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]], avail: [3,3,2] };
// 1 resource type (12 units): P2 requesting 1 unit makes the state unsafe (but no deadlock yet)
export const UNSAFE_REQ = { alloc: [[5],[2],[2]], max: [[10],[4],[9]], avail: [3] };
// Genuine deadlock: P0 holds A wants B, P1 holds B wants A, one instance each
export const DEADLOCK = { alloc: [[1,0],[0,1],[0,0]], max: [[1,1],[1,1],[0,0]], avail: [0,0] };
export const clone = (x) => JSON.parse(JSON.stringify(x));
