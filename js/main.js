import { CubeState, COLORS, parseAlg, invertMoves, algToString, renderNet } from './cube-model.js';
import { generateScramble } from './scramble.js';
import { GUIDE_STEPS } from './guide.js';
import { KEYMAPS, moveForKey, renderKeyboard } from './keymap.js';

const $ = (sel) => document.querySelector(sel);

// ---------- 設定の保存 ----------
const OPT_KEY = 'rubiks-trainer.options.v1';

function loadOptions() {
  try {
    return JSON.parse(localStorage.getItem(OPT_KEY)) ?? {};
  } catch {
    return {};
  }
}
function saveOptions() {
  try {
    localStorage.setItem(OPT_KEY, JSON.stringify(options));
  } catch {
    /* 保存できない環境では無視 */
  }
}

const options = { keymap: 'hands', speed: 220, ...loadOptions() };
if (!KEYMAPS[options.keymap]) options.keymap = 'hands';

// ---------- タブ ----------
let activeTab = 'cube';
const tabButtons = document.querySelectorAll('.tab');

function showTab(name) {
  activeTab = name;
  for (const b of tabButtons) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const p of document.querySelectorAll('.panel')) p.hidden = p.id !== `panel-${name}`;
  window.scrollTo(0, 0);
  if (name === 'cube') ensureCube3D();
}
for (const b of tabButtons) b.addEventListener('click', () => showTab(b.dataset.tab));

// ---------- キューブ ----------
const model = new CubeState();
let cube3d = null;
let cubeLoading = null;
let history = [];
let pendingSetup = [];
let movesSinceScramble = 0;
let scrambled = false;
let solveStart = null;

function ensureCube3D() {
  if (!cubeLoading) {
    cubeLoading = import('./cube3d.js')
      .then(({ Cube3D }) => {
        // 読み込み前に論理モデルへ適用済みの手順を、3D側にだけ反映する
        cube3d = new Cube3D($('#cube-canvas'), { onSwipe: (mv) => doMoves([mv]) });
        cube3d.setSpeed(options.speed);
        if (pendingSetup.length) cube3d.enqueue(pendingSetup, { instant: true });
        pendingSetup = [];
        cube3d.onMove = afterMove;
      })
      .catch((err) => {
        console.error(err);
        $('#cube-canvas').innerHTML =
          '<p class="fallback">3D表示を読み込めませんでした（ネットワーク接続を確認してください）。ボタンと展開図で操作できます。</p>';
      });
  }
  return cubeLoading;
}

function afterMove(mv) {
  model.applyMove(mv);
  updateCubeStatus();
}

function doMoves(moves, { instant = false, record = true } = {}) {
  if (!moves.length) return;
  if (record) {
    history.push(...moves);
    movesSinceScramble += moves.length;
    if (scrambled && solveStart === null) solveStart = performance.now();
  }
  if (cube3d) {
    cube3d.enqueue(moves, { instant });
  } else {
    // 3D 読み込み前・失敗時は論理モデルだけ更新する
    pendingSetup.push(...moves);
    moves.forEach((m) => model.applyMove(m));
    updateCubeStatus();
  }
}

function resetCube() {
  model.reset();
  history = [];
  pendingSetup = [];
  movesSinceScramble = 0;
  scrambled = false;
  solveStart = null;
  cube3d?.reset();
  updateCubeStatus();
}

// 崩した状態からの練習を開始
function startPractice(setupMoves) {
  resetCube();
  doMoves(setupMoves, { instant: true, record: false });
  scrambled = true;
  updateCubeStatus();
}

function updateCubeStatus() {
  const el = $('#cube-status');
  const solved = model.isSolved();
  el.classList.toggle('solved', solved && scrambled && movesSinceScramble > 0);
  if (solved && scrambled && movesSinceScramble > 0) {
    // 1回だけ所要時間を確定
    if (solveStart !== null && !el.dataset.done) {
      el.dataset.time = ((performance.now() - solveStart) / 1000).toFixed(1);
      el.dataset.done = '1';
    }
    el.textContent = `完成！ 🎉 ${movesSinceScramble}手 / ${el.dataset.time ?? '-'}秒`;
  } else {
    delete el.dataset.done;
    if (solved) el.textContent = '揃っています';
    else el.textContent = scrambled ? `${movesSinceScramble}手目` : '未完成';
  }
  renderNet($('#cube-net'), model);
}

// 回転ボタン
const MOVE_ROWS = [
  ['U', 'D', 'R', 'L', 'F', 'B'],
  ["U'", "D'", "R'", "L'", "F'", "B'"],
  ['U2', 'D2', 'R2', 'L2', 'F2', 'B2'],
  ['M', 'E', 'S', 'x', 'y', 'z'],
  ["M'", "E'", "S'", "x'", "y'", "z'"],
];
const moveGrid = $('#move-grid');
for (const row of MOVE_ROWS) {
  for (const m of row) {
    const b = document.createElement('button');
    b.className = 'move-btn';
    b.textContent = m;
    const face = m[0];
    if (COLORS[face]) b.style.setProperty('--face-color', COLORS[face]);
    else b.classList.add('no-dot');
    b.addEventListener('click', () => doMoves(parseAlg(m)));
    moveGrid.appendChild(b);
  }
}

// キーボード
function isTyping(e) {
  const t = e.target;
  return t instanceof HTMLElement && (t.matches('input[type="text"], textarea, select') || t.isContentEditable);
}

document.addEventListener('keydown', (e) => {
  if (activeTab !== 'cube' || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const mv = moveForKey(options.keymap, e);
  if (!mv) return;
  e.preventDefault();
  doMoves(parseAlg(mv));
});

const keymapSelect = $('#keymap');
for (const [id, { label }] of Object.entries(KEYMAPS)) keymapSelect.add(new Option(label, id));
keymapSelect.value = options.keymap;
renderKeyboard($('#keyboard-map'), options.keymap);
keymapSelect.addEventListener('change', () => {
  options.keymap = keymapSelect.value;
  saveOptions();
  renderKeyboard($('#keyboard-map'), options.keymap);
  keymapSelect.blur();
});

// 手順入力
function readAlgInput() {
  const err = $('#alg-error');
  try {
    const moves = parseAlg($('#alg-input').value);
    err.hidden = true;
    return moves;
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
    return null;
  }
}

$('#btn-play').addEventListener('click', () => {
  const moves = readAlgInput();
  if (moves) doMoves(moves);
});
$('#btn-setup').addEventListener('click', () => {
  const moves = readAlgInput();
  if (moves) startPractice(invertMoves(moves));
});
$('#alg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btn-play').click();
});

// 操作ボタン
$('#btn-undo').addEventListener('click', () => {
  const last = history.pop();
  if (!last) return;
  movesSinceScramble = Math.max(0, movesSinceScramble - 1);
  doMoves(invertMoves([last]), { record: false });
});
$('#btn-random').addEventListener('click', () => {
  const s = generateScramble();
  startPractice(parseAlg(s));
  $('#alg-input').value = s;
});
$('#btn-reset').addEventListener('click', resetCube);
$('#btn-view').addEventListener('click', () => cube3d?.resetView());
const speed = $('#speed');
speed.value = options.speed;
speed.addEventListener('input', () => {
  options.speed = Number(speed.value);
  saveOptions();
  cube3d?.setSpeed(options.speed);
});

// ---------- ガイド ----------
function renderGuide() {
  const root = $('#guide-steps');
  for (const step of GUIDE_STEPS) {
    const card = document.createElement('article');
    card.className = 'step-card';
    const h = document.createElement('h3');
    h.textContent = step.title;
    card.appendChild(h);
    for (const para of step.body) {
      const p = document.createElement('p');
      p.textContent = para;
      card.appendChild(p);
    }
    for (const a of step.algs) {
      const row = document.createElement('div');
      row.className = 'alg-row';
      row.innerHTML = '<span class="alg-name"></span><code class="alg-code"></code>';
      row.querySelector('.alg-name').textContent = a.name;
      row.querySelector('.alg-code').textContent = a.alg;
      const btn = document.createElement('button');
      btn.className = 'btn primary small';
      btn.textContent = '3Dで練習';
      btn.addEventListener('click', () => practiceAlg(a));
      row.appendChild(btn);
      card.appendChild(row);
    }
    if (!step.algs.length) {
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = 'ランダムに崩して練習';
      btn.style.marginTop = '8px';
      btn.addEventListener('click', () => {
        showTab('cube');
        $('#btn-random').click();
      });
      card.appendChild(btn);
    }
    root.appendChild(card);
  }
}

async function practiceAlg({ alg, setup }) {
  showTab('cube');
  await ensureCube3D();
  const moves = parseAlg(alg);
  startPractice([...parseAlg(setup || ''), ...invertMoves(moves)]);
  $('#alg-input').value = algToString(moves);
}

// ---------- 起動 ----------
renderGuide();
updateCubeStatus();
ensureCube3D();
