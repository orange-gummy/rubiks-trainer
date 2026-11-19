// 3x3 ルービックキューブの論理モデル
// 座標系: x = 右(R), y = 上(U), z = 手前(F)。各ステッカーを「位置」と「法線」で表す。

export const COLORS = {
  U: '#ffffff', // 白
  D: '#ffd500', // 黄
  F: '#009b48', // 緑
  B: '#0046ad', // 青
  R: '#b71234', // 赤
  L: '#ff5800', // オレンジ
};

// [回転軸, 対象レイヤー, 時計回りのときの回転方向(+1 = 軸の正方向から見て反時計回り)]
export const MOVE_DEFS = {
  R: ['x', [1], -1], L: ['x', [-1], 1], M: ['x', [0], 1],
  U: ['y', [1], -1], D: ['y', [-1], 1], E: ['y', [0], 1],
  F: ['z', [1], -1], B: ['z', [-1], 1], S: ['z', [0], -1],
  r: ['x', [0, 1], -1], l: ['x', [-1, 0], 1],
  u: ['y', [0, 1], -1], d: ['y', [-1, 0], 1],
  f: ['z', [0, 1], -1], b: ['z', [-1, 0], 1],
  x: ['x', [-1, 0, 1], -1], y: ['y', [-1, 0, 1], -1], z: ['z', [-1, 0, 1], -1],
};

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

export function normalToFace([x, y, z]) {
  if (x === 1) return 'R';
  if (x === -1) return 'L';
  if (y === 1) return 'U';
  if (y === -1) return 'D';
  if (z === 1) return 'F';
  return 'B';
}

const FACE_NORMALS = {
  R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1],
};

// 軸まわりに s*90° 回転 (s = ±1)
function rot90([x, y, z], axis, s) {
  if (axis === 'x') return [x, -s * z, s * y];
  if (axis === 'y') return [s * z, y, -s * x];
  return [-s * y, s * x, z];
}

/**
 * 回転記号の文字列を解析する。例: "R U R' U'", "(R U2 R') y Rw"
 * 戻り値: [{ name: 'R', turns: 1 | -1 | 2 }]
 */
export function parseAlg(input) {
  const s = String(input)
    .replace(/[()[\],]/g, ' ')
    .replace(/[’′`´]/g, "'");
  const re = /([RLUDFBMESrludfbxyz])(w?)(\d*)(')?/g;
  const moves = [];
  let last = 0;
  let m;
  const checkGap = (gap) => {
    if (gap.trim() !== '') throw new Error(`解析できない記号があります: "${gap.trim()}"`);
  };
  while ((m = re.exec(s))) {
    checkGap(s.slice(last, m.index));
    last = re.lastIndex;
    let name = m[1];
    if (m[2]) {
      if (!'RLUDFB'.includes(name)) throw new Error(`"${name}w" は使えません`);
      name = name.toLowerCase();
    }
    const n = m[3] === '' ? 1 : parseInt(m[3], 10);
    const q = (((m[4] ? -n : n) % 4) + 4) % 4;
    if (q === 0) continue;
    moves.push({ name, turns: q === 3 ? -1 : q });
  }
  checkGap(s.slice(last));
  return moves;
}

export function moveToString({ name, turns }) {
  return name + (turns === 2 ? '2' : turns === -1 ? "'" : '');
}

export function algToString(moves) {
  return moves.map(moveToString).join(' ');
}

export function invertMoves(moves) {
  return moves
    .slice()
    .reverse()
    .map(({ name, turns }) => ({ name, turns: turns === 2 ? 2 : -turns }));
}

export function invertAlg(str) {
  return algToString(invertMoves(parseAlg(str)));
}

export class CubeState {
  constructor() {
    this.reset();
  }

  reset() {
    this.stickers = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const p = [x, y, z];
          for (let a = 0; a < 3; a++) {
            if (Math.abs(p[a]) !== 1) continue;
            const n = [0, 0, 0];
            n[a] = p[a];
            this.stickers.push({ pos: p.slice(), normal: n, color: normalToFace(n) });
          }
        }
      }
    }
    return this;
  }

  applyMove(move) {
    const def = MOVE_DEFS[move.name];
    if (!def) throw new Error(`未知の回転記号: ${move.name}`);
    const [axis, layers, dir] = def;
    const ai = AXIS_INDEX[axis];
    const steps = move.turns === 2 ? 2 : 1;
    const s = move.turns === 2 ? dir : dir * move.turns;
    for (const st of this.stickers) {
      if (!layers.includes(st.pos[ai])) continue;
      for (let i = 0; i < steps; i++) {
        st.pos = rot90(st.pos, axis, s);
        st.normal = rot90(st.normal, axis, s);
      }
    }
    return this;
  }

  apply(alg) {
    const moves = typeof alg === 'string' ? parseAlg(alg) : alg;
    for (const mv of moves) this.applyMove(mv);
    return this;
  }

  // 持ち替え(x, y, z)をしていても、各面が単色なら完成とみなす
  isSolved() {
    const seen = {};
    for (const st of this.stickers) {
      const key = st.normal.join(',');
      if (seen[key] === undefined) seen[key] = st.color;
      else if (seen[key] !== st.color) return false;
    }
    return true;
  }

  // 展開図用に 3x3 の色配列を返す（各面を正面から見た向き）
  faceGrid(face) {
    const n = FACE_NORMALS[face];
    const grid = [[null, null, null], [null, null, null], [null, null, null]];
    for (const st of this.stickers) {
      if (st.normal.join() !== n.join()) continue;
      const [x, y, z] = st.pos;
      let row, col;
      switch (face) {
        case 'U': row = z + 1; col = x + 1; break;
        case 'D': row = 1 - z; col = x + 1; break;
        case 'F': row = 1 - y; col = x + 1; break;
        case 'B': row = 1 - y; col = 1 - x; break;
        case 'R': row = 1 - y; col = 1 - z; break;
        case 'L': row = 1 - y; col = z + 1; break;
      }
      grid[row][col] = st.color;
    }
    return grid;
  }
}

// 展開図(十字型)を描画する
export function renderNet(container, state) {
  container.innerHTML = '';
  container.classList.add('net');
  const layout = { U: [1, 2], L: [2, 1], F: [2, 2], R: [2, 3], B: [2, 4], D: [3, 2] };
  for (const [face, [row, col]] of Object.entries(layout)) {
    const f = document.createElement('div');
    f.className = 'net-face';
    f.style.gridRow = row;
    f.style.gridColumn = col;
    for (const line of state.faceGrid(face)) {
      for (const c of line) {
        const cell = document.createElement('div');
        cell.className = 'net-cell';
        cell.style.background = COLORS[c];
        f.appendChild(cell);
      }
    }
    container.appendChild(f);
  }
}
