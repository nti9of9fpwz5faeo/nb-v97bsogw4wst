# v68 — ネオンアーケードのリザルトと通過ダイヤ

- リザルトの背景を不透明な紺に変更。主記録・自己ベストとの差・再挑戦を優先し、判定、所持ダイヤ、ランク、ミッション、プレイ記録は「プレイの詳細」にまとめた。
- 通常の失敗時は450ms、新記録・完走時は850msの数値演出。演出中も再挑戦でき、再挑戦で旧演出をキャンセルする。動きを減らす設定にも対応。
- 花モードとダイヤハンターの実行コード・UI・入力制限を撤去。
- コースの7・14・21・28マスに1個ずつダイヤを配置。通常移動・紫への突進・必殺技で通過すると自動獲得し、同じコースの同じダイヤは一度だけ獲得する。ワープで配置を更新。チュートリアル・ポーズ中は獲得しない。
- セーブ形式・通貨・解放・自己ベストを維持。既存のダイヤ獲得ミッションはIDを維持し、表示名をダイヤコレクターに変更。過去のプレイ記録に含まれるハンター情報は引き続き読める。
- 移動計測の共通処理をmovement.jsへ移し、通常のプレイ計測とJSON/TXT出力を維持。

## 検証

`node --test tests/engine.test.cjs tests/gems.test.cjs tests/workshop.test.cjs tests/progression.test.cjs tests/playtest.test.cjs tests/movement-courses.test.cjs tests/update58.test.cjs tests/update59.test.cjs`

`CHROMIUM_PATH=/tmp/chromium node tests/browser.test.cjs`

`CHROMIUM_PATH=/tmp/chromium node tests/playtest-browser.test.cjs`

純粋テスト41件。ブラウザでは通過獲得・二重獲得防止・再挑戦・永続化・買い物・計測と出力・320pxでの再挑戦表示・新記録と完走の表示を確認。
