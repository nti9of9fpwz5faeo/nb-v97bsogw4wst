# v89 精霊マークと Sombra の曲同期背景

## プレイヤー向け

- エンドレスの加速地点は、マス内の小さな流れる精霊に変更。黄色い門・線・事前の看板は削除。
- 通過後のみ HUD に速度を短く表示。上限2.2倍で速度が変わらない地点には精霊を出さない。
- 眠る精霊はスロー用として準備済み。現在のコースにスロー地点は追加していない。
- 加速による背景変更は廃止。Sombra en Movimiento は曲の場面に合わせて背景4枚を切り替える。
- 標準テーマで適用。購入済みの別テーマを選択している場合は、そのテーマを優先する。

## 背景の設定

`song-backgrounds.js` の `cues` を編集する。時間は元音源の秒数。今回の境界は試遊用の暫定値で、聴きながら微調整する前提。

| 秒 | 背景 | フェード秒 |
|---:|---|---:|
| 0 | 01_veil | 0 |
| 28 | 02_motion | 0.3 |
| 77 | 03_still | 1.2 |
| 95 | 04_crest | 0.3 |
| 134 | 03_still | 1.2 |
| 149 | 04_crest | 0.3 |
| 187 | 01_veil | 1.5 |

背景は `sourceSongPosition()` を使用。加速後・一時停止・再開・ループでも音源位置に追従し、入力タイミング補正は打ち消す。フェードも音源の秒数を使うため停止中は進まない。リザルトでは最後の表示位置を保持。動きを減らす設定では即時切替。背景画像が取得できない場合は元の背景を使う。

素材は `img/sombra/*.webp`（計約100KB）。元音源の SHA-256: `3ac9e45880e33d0a035dd80e3695e934a725ac9cef270df7ea81c62fbfc16c4f`。

## 精霊の設定・スロー追加時

`img/speed/fast.png` と `slow.png` は512×512、白一色・透過PNG。`speed-markers.js` で一度だけ落ち着いた紺色に着色し、マス幅の0.72倍の枠内に静止表示する。

`NBSpeedMarkers.kind(fromRate,toRate)` は加速なら `fast`、減速なら `slow`、変化なしなら `null`。`NBSpeedMarkers.draw(context,kind,x,y,cell,alpha)` は両方に対応済み。
今後スロー地点を追加するときは、次の地点の目標倍率から `kind` を選び、既存の `endlessClock.change()` と `songSrc.playbackRate` を同じ時刻に更新する。現在は `nextEndlessCourse()` の50マスごとの加速仕様を維持している。

## 検証

- `node --test tests/song-backgrounds.test.cjs tests/endless-clock.test.cjs tests/continuous-courses.test.cjs tests/engine.test.cjs tests/workshop.test.cjs`
- Playwright: `tests/song-backgrounds-browser.test.cjs`、`tests/continuous-browser.test.cjs`、`tests/endless-browser.test.cjs`
- 元音源の読み込み、全キューとフェード、手動補正、停止・ループ・リトライ、速度変更時の連続性、速度上限、購入テーマ、40px程度の精霊表示、4背景のスマホ画面を確認。
- 既存の25回のコース継続、必殺技、判定±20ms、ガイド音、各画面サイズ、他モード、OfflineAudioContext の速度積分検証も通過。

端末での最終調整対象は、精霊の濃さ・大きさと、曲の盛り上がりに対する暫定切替時刻。
