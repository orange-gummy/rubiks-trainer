# Rubik's Trainer

3x3 ルービックキューブを画面上の 3D キューブで揃える練習ができる Web アプリです。スマホにも対応しています。ビルド不要の HTML / JavaScript だけで動きます。

## 機能

- **練習（3Dキューブ）**
  - 「ランダムに崩す」で20手のスクランブル、揃えると手数と時間を表示
  - **キューブの面をスワイプ**（マウスならドラッグ）するとその列が回る。キューブの外側をドラッグ、またはPCでは右ドラッグで視点を回転
  - ボタンやキーボードでも回せる
  - キー配置は2種類（画面にキーボードの図を表示）
    - **両手配置（標準）**：`I`/`K` = R/R'、`J`/`F` = U/U'、`D`/`E` = L/L'、`H`/`G` = F/F'、`S`/`L` = D/D'、`W`/`O` = B/B'、`T`/`B` = x/x'、`;`/`A` = y/y'、`P`/`Q` = z/z' など
    - **記号どおり**：`R` で R、Shift+`R` で R'
  - 手順を入力して再生、「逆手順をセット」でその手順で揃う状態を作成
  - 1手戻す・ランダムに崩す・展開図表示・完成判定
- **解法ガイド**
  - 初心者向け LBL 法の7ステップ解説
  - 各手順の「3Dで練習」で、その手順で揃う状態を 3D キューブにセット

## 使い方

`index.html` をそのまま開くのではなく、ローカルサーバー経由で開いてください（ES Modules を使うため）。

```bash
npx serve .
```

または

```bash
python3 -m http.server 8000
```

3D 表示は [three.js](https://threejs.org/) を CDN（jsDelivr）から読み込みます。

## GitHub Pages で公開

リポジトリの **Settings → Pages** で「Deploy from a branch」→ `main` / `(root)` を選ぶと、
`https://<ユーザー名>.github.io/rubiks-trainer/` で公開できます。

## テスト

```bash
npm test
```

キューブの回転ロジック、スクランブル、ガイドの手順、キー配置を Node.js 標準のテストランナーで検証します。

## ファイル構成

```
index.html          画面
css/style.css       スタイル（ライト / ダークモード対応）
js/main.js          画面の制御
js/cube-model.js    キューブの論理モデル・回転記号の解析・展開図
js/cube3d.js        three.js による 3D 表示
js/scramble.js      スクランブル生成
js/guide.js         解法ガイドの内容
js/keymap.js        キーボードの割り当て
test/               テスト
```
