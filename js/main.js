import { CubeState, COLORS, parseAlg, invertMoves, algToString, renderNet } from './cube-model.js';
import { generateScramble } from './scramble.js';
import { formatSolve, formatTime, averageOf, bestAverageOf, best, mean } from './stats.js';
import { SpeedTimer } from './timer.js';
import { GUIDE_STEPS } from './guide.js';

const $ = (sel) => document.querySelector(sel);

// ---------- 保存 ----------
const STORE_KEY = 'rubiks-trainer.solves.v1';
const OPT_KEY = 'rubiks-trainer.options.v1';

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できない環境では無視 */
  }
}

// ---------- タブ ----------
let activeTab = 'timer';
const tabButtons = document.querySelectorAll('.tab');

function showTab(name) {
  activeTab = name;
  for (const b of tabButtons) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  for (const p of document.querySelectorAll('.panel')) p.hidden = p.id !== `panel-${name}`;
  window.scrollTo(0, 0);
  if (name !== 'timer') timer.cancel();
  if (name === 'cube') ensureCube3D();
  if (name === 'timer') $('#timer-area').focus({ preventScroll: true });
}
for (const b of tabButtons) b.addEventListener('click', () => showTab(b.dataset.tab));

// ---------- タイマー ----------
let solves = load(STORE_KEY, []);
const options = load(OPT_KEY, { inspection: false });
const scrambleHistory = [];
let scramble = '';

function setScramble(s) {
  scramble = s;
  $('#scramble-text').textContent = s;
  renderNet($('#scramble-net'), new CubeState().apply(s));
  $('#btn-prev-scramble').disabled = scrambleHistory.length === 0;
}

function nextScramble() {
  if (scramble) scrambleHistory.push(scramble);
  if (scrambleHistory.length > 50) scrambleHistory.shift();
  setScramble(generateScramble());
}

$('#btn-new-scramble').addEventListener('click', nextScramble);
$('#btn-prev-scramble').addEventListener('click', () => {
  if (scrambleHistory.length) setScramble(scrambleHistory.pop());
});
$('#btn-scramble-3d').addEventListener('click', async () => {
  showTab('cube');
  await ensureCube3D();
  resetCube();
  doMoves(parseAlg(scramble), { instant: true, record: false });
  $('#alg-input').value = scramble;
});

const inspectionBox = $('#opt-inspection');
inspectionBox.checked = !!options.inspection;
inspectionBox.addEventListener('change', () => {
  options.inspection = inspectionBox.checked;
  save(OPT_KEY, options);
  inspectionBox.blur();
});

const timer = new SpeedTimer({
  area: $('#timer-area'),
  display: $('#timer-display'),
  getInspection: () => options.inspection,
  onStateChange: (s) => {
    document.body.classList.toggle('solving', ['running', 'inspecting', 'ready', 'holding'].includes(s) &&
      !(s === 'holding' && timer.afterHold === 'idle'));
  },
  onFinish: (time, penalty) => {
    solves.push({ time, penalty, scramble, date: Date.now() });
    save(STORE_KEY, solves);
    renderSolves();
    nextScramble();
  },
});

function isTyping(e) {
  const t = e.target;
  return t instanceof HTMLElement && (t.matches('input[type="text"], textarea') || t.isContentEditable);
}

document.addEventListener('keydown', (e) => {
  if (activeTab !== 'timer' || isTyping(e)) return;
  if (timer.state === 'running') {
    e.preventDefault();
    timer.press();
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) timer.press();
  }
});
document.addEventListener('keyup', (e) => {
  if (activeTab !== 'timer' || isTyping(e)) return;
  if (e.code === 'Space' || timer.state === 'stopped') {
    e.preventDefault();
    timer.release();
  }
});

const timerArea = $('#timer-area');
timerArea.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, label, input')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  timer.press();
});
window.addEventListener('pointerup', () => {
  if (activeTab === 'timer') timer.release();
});
timerArea.addEventListener('contextmenu', (e) => e.preventDefault());

function renderSolves() {
  const list = $('#solve-list');
  list.innerHTML = '';
  $('#empty-history').hidden = solves.length > 0;
  solves.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'solve-item';
    li.innerHTML = `
      <span class="solve-no">${i + 1}.</span>
      <span class="solve-time"></span>
      <span class="solve-scramble"></span>
      <span class="solve-actions">
        <button class="btn small${s.penalty === '+2' ? ' active' : ''}" data-act="+2">+2</button>
        <button class="btn small${s.penalty === 'DNF' ? ' active' : ''}" data-act="DNF">DNF</button>
        <button class="btn small ghost danger" data-act="del" aria-label="削除">✕</button>
      </span>`;
    li.querySelector('.solve-time').textContent = formatSolve(s);
    const sc = li.querySelector('.solve-scramble');
    sc.textContent = s.scramble;
    sc.title = `${new Date(s.date).toLocaleString()}\n${s.scramble}`;
    li.querySelector('.solve-actions').addEventListener('click', (e) => {
      const act = e.target.closest('button')?.dataset.act;
      if (!act) return;
      if (act === 'del') {
        if (!confirm(`記録 ${i + 1}（${formatSolve(s)}）を削除しますか？`)) return;
        solves.splice(i, 1);
      } else {
        s.penalty = s.penalty === act ? null : act;
      }
      save(STORE_KEY, solves);
      renderSolves();
    });
    list.prepend(li);
  });

  const fmt = (v) => (v === null ? '-' : formatTime(v));
  $('#stat-best').textContent = fmt(best(solves));
  $('#stat-ao5').textContent = fmt(averageOf(solves, 5));
  $('#stat-ao12').textContent = fmt(averageOf(solves, 12));
  $('#stat-bao5').textContent = fmt(bestAverageOf(solves, 5));
  $('#stat-mean').textContent = fmt(mean(solves));
  $('#stat-count').textContent = String(solves.length);
}

$('#btn-clear').addEventListener('click', () => {
  if (!solves.length || !confirm('すべての記録を削除しますか？この操作は取り消せません。')) return;
  solves = [];
  save(STORE_KEY, solves);
  renderSolves();
});

// ---------- 3D キューブ ----------
const model = new CubeState();
let cube3d = null;
let cubeLoading = null;
let history = [];
let movesSinceScramble = 0;
let scrambled = false;

function ensureCube3D() {
  if (!cubeLoading) {
    cubeLoading = import('./cube3d.js')
      .then(({ Cube3D }) => {
        // 読み込み前に論理モデルへ適用済みの手順を、3D側にだけ反映する
        cube3d = new Cube3D($('#cube-canvas'));
        cube3d.setSpeed(Number($('#speed').value));
        if (pendingSetup.length) cube3d.enqueue(pendingSetup, { instant: true });
        pendingSetup = [];
        cube3d.onMove = afterMove;
      })
      .catch((err) => {
        console.error(err);
        $('#cube-canvas').innerHTML =
          '<p class="fallback">3D表示を読み込めませんでした（ネットワーク接続を確認してください）。展開図で操作できます。</p>';
      });
  }
  return cubeLoading;
}

let pendingSetup = [];

function afterMove(mv) {
  model.applyMove(mv);
  updateCubeStatus();
}

function doMoves(moves, { instant = false, record = true } = {}) {
  if (!moves.length) return;
  if (record) {
    history.push(...moves);
    movesSinceScramble += moves.length;
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
  cube3d?.reset();
  updateCubeStatus();
}

function markScrambled() {
  scrambled = true;
  movesSinceScramble = 0;
  history = [];
}

function updateCubeStatus() {
  const el = $('#cube-status');
  const solved = model.isSolved();
  el.classList.toggle('solved', solved);
  if (solved) {
    el.textContent = scrambled && movesSinceScramble > 0 ? `完成！ 🎉 ${movesSinceScramble}手` : '揃っています';
  } else {
    el.textContent = scrambled ? `${movesSinceScramble}手目` : '未完成';
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
    b.addEventListener('click', () => {
      ensureCube3D();
      doMoves(parseAlg(m));
    });
    moveGrid.appendChild(b);
  }
}

document.addEventListener('keydown', (e) => {
  if (activeTab !== 'cube' || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  const name = /^[udrlfbmes]$/i.test(k) ? k.toUpperCase() : /^[xyz]$/i.test(k) ? k.toLowerCase() : null;
  if (!name) return;
  e.preventDefault();
  doMoves([{ name, turns: e.shiftKey ? -1 : 1 }]);
});

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
  if (!moves) return;
  resetCube();
  doMoves(invertMoves(moves), { instant: true, record: false });
  markScrambled();
  updateCubeStatus();
});
$('#alg-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#btn-play').click();
});
$('#btn-undo').addEventListener('click', () => {
  const last = history.pop();
  if (!last) return;
  movesSinceScramble = Math.max(0, movesSinceScramble - 1);
  doMoves(invertMoves([last]), { record: false });
});
$('#btn-random').addEventListener('click', () => {
  const s = generateScramble();
  resetCube();
  doMoves(parseAlg(s), { instant: true, record: false });
  markScrambled();
  updateCubeStatus();
  $('#alg-input').value = s;
});
$('#btn-reset').addEventListener('click', resetCube);
$('#btn-view').addEventListener('click', () => cube3d?.resetView());
$('#speed').addEventListener('input', (e) => cube3d?.setSpeed(Number(e.target.value)));

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
      btn.addEventListener('click', () => practice(a));
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

async function practice({ alg, setup }) {
  showTab('cube');
  await ensureCube3D();
  resetCube();
  const moves = parseAlg(alg);
  doMoves([...parseAlg(setup || ''), ...invertMoves(moves)], { instant: true, record: false });
  markScrambled();
  updateCubeStatus();
  $('#alg-input').value = algToString(moves);
}

// ---------- 起動 ----------
renderGuide();
renderSolves();
setScramble(generateScramble());
updateCubeStatus();
$('#timer-area').focus({ preventScroll: true });
