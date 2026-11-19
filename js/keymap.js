// キーボード操作の割り当て
// 「両手」配置: 右手で R / U、左手で L / U' などを打てるように、
// ホームポジション付近に左右対称に回転を割り当てる（バーチャルキューブで一般的な配置）。
// キーボード配列(JIS / US)に依存しないよう KeyboardEvent.code で判定する。

export const KEYMAPS = {
  hands: {
    label: '両手配置（おすすめ）',
    keys: {
      KeyI: "R", KeyK: "R'",
      KeyD: "L", KeyE: "L'",
      KeyJ: "U", KeyF: "U'",
      KeyS: "D", KeyL: "D'",
      KeyH: "F", KeyG: "F'",
      KeyW: "B", KeyO: "B'",
      KeyU: "r", KeyM: "r'",
      KeyV: "l", KeyR: "l'",
      Digit5: "M", Digit6: "M",
      KeyX: "M'", Period: "M'",
      KeyT: "x", KeyY: "x",
      KeyB: "x'", KeyN: "x'",
      Semicolon: "y", KeyA: "y'",
      KeyP: "z", KeyQ: "z'",
    },
  },
  notation: {
    label: '記号どおり（Shiftで逆）',
    keys: Object.fromEntries(
      ['U', 'D', 'R', 'L', 'F', 'B', 'M', 'E', 'S'].map((f) => [`Key${f}`, f])
        .concat(['x', 'y', 'z'].map((f) => [`Key${f.toUpperCase()}`, f])),
    ),
    shiftInverts: true,
  },
};

const ROWS = [
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

const KEY_LABEL = { Semicolon: ';', Comma: ',', Period: '.', Slash: '/' };
const keyLabel = (code) => KEY_LABEL[code] ?? code.replace(/^(Key|Digit)/, '');

// e から回転記号を返す（該当なしは null）
export function moveForKey(mapName, e) {
  const map = KEYMAPS[mapName] ?? KEYMAPS.hands;
  const mv = map.keys[e.code];
  if (!mv) return null;
  if (map.shiftInverts && e.shiftKey) return mv + "'";
  return mv;
}

// キーボードの図を描画する
export function renderKeyboard(container, mapName) {
  const map = KEYMAPS[mapName] ?? KEYMAPS.hands;
  container.innerHTML = '';
  ROWS.forEach((row, i) => {
    const r = document.createElement('div');
    r.className = 'kb-row';
    r.style.paddingLeft = `${i * 0.35}em`;
    for (const code of row) {
      const k = document.createElement('div');
      const mv = map.keys[code];
      k.className = 'kb-key' + (mv ? ' on' : '');
      if (mv) k.dataset.face = mv[0].toUpperCase();
      k.innerHTML = '<span class="kb-cap"></span><span class="kb-move"></span>';
      k.querySelector('.kb-cap').textContent = keyLabel(code);
      k.querySelector('.kb-move').textContent = mv ?? '';
      r.appendChild(k);
    }
    container.appendChild(r);
  });
}
