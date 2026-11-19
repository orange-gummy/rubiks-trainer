# Rubik's Trainer

3x3 ルービックキューブの練習用 Web アプリです。ビルド不要の HTML / JavaScript だけで動きます。

## 機能

- **タイマー**
  - 20手のスクランブル自動生成（展開図プレビュー付き）
  - スペースキー長押し → 離してスタート、任意のキーでストップ（スマホは画面タップ）
  - 15秒インスペクション（+2 / DNF 自動判定）
  - ベスト・ao5・ao12・ベストao5・平均を自動計算、+2 / DNF の付け替え
  - 記録はブラウザ（localStorage）に保存
- **3Dキューブ**
  - ドラッグで視点を回転、ボタンまたはキーボードで回す（Shift で逆回転）
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

キューブの回転ロジック、スクランブル、ガイドの手順、統計計算を Node.js 標準のテストランナーで検証します。

## ファイル構成

```
index.html          画面
css/style.css       スタイル（ライト / ダークモード対応）
js/main.js          画面の制御
js/cube-model.js    キューブの論理モデル・回転記号の解析・展開図
js/cube3d.js        three.js による 3D 表示
js/scramble.js      スクランブル生成
js/timer.js         タイマー
js/stats.js         ao5 / ao12 などの集計
js/guide.js         解法ガイドの内容
test/               テスト
```
