# 大型更新・合意仕様（2026-10-01）

## v52で先行実装
- 曲選択とショップに特別ステージの「近日追加」枠を表示。
- progression.js の specialStages に予約レコードを保持。曲・価格は未設定。購入・プレイ操作は付けずダイヤを消費しない。
- 特別ステージの楽曲はユーザーが後日追加する。背景色変更だけの既存コーステーマとは別枠。

## 次の大型更新で実装する合意内容
- ヴェノのブレイク、リザルト、ワープ到達、ダイヤ獲得、ミッションクリア通知のSE。
- 反復して心地よいかを最優先に、キャラ・場面に合う音を選ぶ。BGMと連続再生で比較する。候補選定はアシスタントに一任、必要なら再生成。未試聴を試聴済みと扱わない。
- Firefly購入完了画面を確認。750クレジット/月、調査時のSE生成は10クレジット/回。実際の消費を確認して管理。
- ダイヤマスと拍ごとの上下分岐案は廃止。忍者風キャラを追いついて捕まえる方式。
- 初回スタートと各ワープ後の区間開始で出現抽選。区間途中での出現はなし。少し先から独立したペースで逃げ、追いつけばダイヤ。
- 出現率、開始距離、逃走速度、報酬は調整対象。ワープまで逃げられたら追跡終了は提案段階。
- 必殺技は手動発動のみ。
- モードはエンドレス／曲終了までの到達距離チャレンジの2つ。
- 最初の3曲は無料。選曲はアシスタントに一任。
- プレイヤーランクの節目で一部の曲とダイヤを報酬にする案。全曲をランクだけで解放する案は採用しない。
- その他の曲・キャラはダイヤで解放。無料で得たダイヤも使える。
- キャラクターは通常曲より高めの価格帯。凝った特別ステージも高め。具体的な価格は無料ダイヤ供給、曲数、解放までのプレイ時間を見て決める（未確定）。
- 未解放曲の15秒試聴。自動購入や試聴課金はなし。メニューBGMと重ねない。
- ミッションの容易さと通知過多を調整。通知SEはプレイの邪魔をしない。
- プレイ回数は無制限。将来の収益はダイヤ販売と広告削除、広告。

v52は上の予告枠のみの先行変更。SE、追跡、ランク、曲・キャラ購入は未実装。


## v53 implementation (2026-10-01)

- Ninja chance: 35% at run/warp start only. Normal / star / rainbow: 70% / 25% / 5%, awards 5 / 12 / 30 gems. Independently selected slow / swift / fast: 50% / 35% / 15%, 0.12 / 0.20 / 0.28 cells per beat, gaps 5 / 6 / 7 cells, 2-beat grace. Crossing detection catches purple and ultimate advances; pauses use the stopped song clock.
- Exactly two selectable modes: one-song distance (raw steps, unconditional warp) and endless (existing combo-weighted steps and speedup). Tutorial remains separate. Manual ultimate only.
- Free songs: Shatter Forward, Zombie Protocol, Metronomic Drive. Neon Rush: rank 3 or 80 gems; Frostbite: rank 6 or 100; Stutter:120; Bass Arcade:140. Locked previews last 15s and do not spend gems; unlock is a separate two-tap action.
- Characters: Neon free, Volt350, Prism400, Veno450, Echo500. Migration keeps wallet, best records, previous mission claims, theme and previously selected character. Existing rank-purchased songs are never charged twice.
- Player rank earns 0.5 XP per valid GREAT/PERFECT plus actual moved cells, settled once per run; 10 gems per rank. This progression rank is separate from accuracy ratings. Special stages remain unavailable placeholders, no song/price/purchase.
- Mission thresholds raised; queued notifications spaced 8 seconds apart, compact grouping.
- Five Firefly requests, displayed 10 credits each (50 total expected), one original WAV downloaded per use. Original WAV metadata retained; runtime envelope/filter/gain adjusted. Technical audio measurements completed; subjective listening cannot be performed in this environment. No real-money billing added.
- Automated progression and workshop integration tests cover migration, duplicate prevention, purchase rollback, milestones, chase movement, paused/tutorial exclusions. Browser test fixture updated to new economy.
