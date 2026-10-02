# v61 ダイヤ争奪イベント

## 変更
- 旧「捕まえる／育てる」と常駐パネルを撤去。開始・ワープ時に1回だけ出現抽選。
- 35マスの道のりの中央（17.5）にダイヤ、ゴール（35）にハンター。10マスの必殺技では開始地点から届かない。
- 演出は短い予告→ダイヤ→対戦相手→プレイヤーへ復帰→曲の拍で3カウント。実際のマップと既存の画像を使用。演出省略後もカウントは残す。
- 演出中はBGMを止めず少し音量を下げる。移動・入力・ノーツ判定は停止し、復帰時に過ぎた拍をスキップ。曲や譜面の時計をずらさず、最初のノーツを3マス前に用意。
- 初回ブレイクで移動ロックが解除されてから相手も動き始める。ノーツ待ち時間に相手が先行しない。
- 通常3階級は1マスずつ移動。神級は歩行と予告付きの3マスドロンを併用。最後の接近は必ず徒歩。
- 先着で決着、同時はプレイヤー勝利。必殺技は移動先を内部更新した瞬間ではなく、実際に中央を通過した時刻で判定。
- 勝利した場合のみ既存のダイヤ報酬を1度支給。ミッションの既存データを維持し、表示文言を争奪戦に変更。

## テスト機能
ホーム→「ダイヤハンターをテスト」。全4階級・通常・イベントなしを選択できる。選んだ相手は開始・ワープごとに登場。ポーズ中も変更でき、再スタートボタンあり。
「登場演出を省略」「必殺技を満タンで開始」（特定の階級を選択したときだけ）も利用可能。設定はセッション内のみ。テスト中の勝利も通常どおり報酬が支給される。

## 仮の調整値
通常出現率22%。出現した場合の階級分布は初級60%・中級28%・上級11%・神級1%。
歩行間隔は初級2.2拍・中級1.7拍・上級1.25拍・神級1拍。神級のドロン予兆1.5拍。
これらは参考資料の推奨値ではなく、試遊を始めるための調整値。実際の難易度は曲のノーツ配置・プレイヤーの技量で変化する。

## 演出の参考資料
- Game Accessibility Guidelines: 一時的な重要情報を視線から離れた位置に置かない。
  https://gameaccessibilityguidelines.com/avoid-placing-essential-temporary-information-outside-the-players-eye-line/
- FINAL FANTASY XIV公式UIガイド: 既に見たカットシーンをスキップする設定の実例。
  https://na.finalfantasyxiv.com/uiguide/faq/faq-other/setting_cs_skip.html
- GDC公開講演概要「Environment Design as Spatial Cinematography」: カメラ・画面構成・空間・注意の関係。本編映像を視聴したという意味ではない。
  https://www.gdcvault.com/play/1025736/Environment-Design-as-Spatial-Cinematography

## 検証
`node --test tests/chase-courses.test.cjs tests/workshop.test.cjs tests/progression.test.cjs tests/engine.test.cjs tests/update58.test.cjs tests/update59.test.cjs`

Playwright: `node tests/race-browser.test.cjs`（必要ならCHROMIUM_PATHを指定）
- 実音源・固定譜面、初回とワープ、入力停止、演出中ポーズ復帰、必殺技の中央通過、報酬1回、敗北、再試行、イベントOFF、チュートリアル除外。
- 390×844 / 320×568、動きを減らす設定、日本語表示を確認。
- 自動テストは体感難易度・実機の音声遅延の評価を代替しない。
