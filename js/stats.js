// 記録の集計（WCA方式の ao5 / ao12）
// solve: { time: ミリ秒, penalty: null | '+2' | 'DNF', scramble, date }

export function effectiveTime(solve) {
  if (solve.penalty === 'DNF') return Infinity;
  return solve.time + (solve.penalty === '+2' ? 2000 : 0);
}

export function formatTime(ms) {
  if (ms === null || ms === undefined) return '-';
  if (!Number.isFinite(ms)) return 'DNF';
  const cs = Math.floor(ms / 10);
  const min = Math.floor(cs / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const frac = String(cs % 100).padStart(2, '0');
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')}.${frac}` : `${sec}.${frac}`;
}

export function formatSolve(solve) {
  if (solve.penalty === 'DNF') return `DNF(${formatTime(solve.time)})`;
  const t = formatTime(effectiveTime(solve));
  return solve.penalty === '+2' ? `${t}+` : t;
}

// solves は古い順。直近 n 回の平均（最速と最遅を除く）。回数不足なら null。
export function averageOf(solves, n) {
  if (solves.length < n) return null;
  const times = solves.slice(-n).map(effectiveTime).sort((a, b) => a - b);
  const trim = Math.ceil(n * 0.05);
  const middle = times.slice(trim, n - trim);
  if (middle.some((t) => !Number.isFinite(t))) return Infinity;
  return middle.reduce((a, b) => a + b, 0) / middle.length;
}

export function best(solves) {
  if (!solves.length) return null;
  return Math.min(...solves.map(effectiveTime));
}

export function bestAverageOf(solves, n) {
  let result = null;
  for (let i = n; i <= solves.length; i++) {
    const avg = averageOf(solves.slice(0, i), n);
    if (result === null || avg < result) result = avg;
  }
  return result;
}

export function mean(solves) {
  const finite = solves.map(effectiveTime).filter(Number.isFinite);
  if (!finite.length) return null;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}
