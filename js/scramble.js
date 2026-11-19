// ランダム手順によるスクランブル生成（20手）
// 同じ面の連続（R R）や、同じ軸の3連続（R L R）を避ける。
const FACES = ['U', 'D', 'R', 'L', 'F', 'B'];
const AXIS = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
const SUFFIX = ['', "'", '2'];

export function generateScramble(length = 20, rng = Math.random) {
  const faces = [];
  const out = [];
  while (out.length < length) {
    const f = FACES[Math.floor(rng() * FACES.length)];
    const n = faces.length;
    if (n > 0 && faces[n - 1] === f) continue;
    if (n > 1 && AXIS[faces[n - 1]] === AXIS[f] && AXIS[faces[n - 2]] === AXIS[f]) continue;
    faces.push(f);
    out.push(f + SUFFIX[Math.floor(rng() * SUFFIX.length)]);
  }
  return out.join(' ');
}
