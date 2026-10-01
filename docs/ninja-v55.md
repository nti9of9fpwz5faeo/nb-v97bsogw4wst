# ダイヤ忍者 v55

- 専用の3種類×2ポーズの透過アトラス。のんびり＝青緑、すばやい＝紫、疾風＝コーラル。
- 素材: `img/characters/diamond-runners-v55.webp`。組み込み画像生成ツールで制作、WebPに変換して実装。ダイヤの色と忍者の速さは独立。
- スタートは5/6/7マス先、ワープ後は13/14/15マス先。ワープ時の距離は必殺技の最大移動距離+3/4/5から算出。ゲージの状態やボタン操作で距離を変更しない。
- ためた必殺技は維持。追跡中の無敵・瞬間移動・追加加速なし。発生率と報酬も維持。
- 16件のテストに合格。3タイプ×1.0/1.5/2.2倍速で、ワープ直後の10マス移動では捕まらず、その後の前進で捕まえられることを確認。

## 生成プロンプト

Use case: stylized-concept. Create a production-ready transparent PNG sprite atlas for the diamond-carrying thief NPC in the rhythm game Neon Blade. Reference image is STYLE ONLY: match its bold clean contours, compact 2.5-head-tall hooded ninjas, angular cel shading and polished mobile-game illustration. New characters, no swords. Atlas: exactly 3 columns by 2 rows, six equally sized cells, transparent background, no text, no labels, no grid. Each column is one ninja type; top row run pose A, bottom row run pose B (opposite legs), consistent feet baselines and scale in all cells. All face LEFT in three-quarter side view, leaning forward fleeing, one hand clutching a small dark treasure satchel against the front of their chest, other arm trailing. Satchel has a simple silver clasp; no diamond itself (the game adds colored gems over it). Column 1: stocky compact courier with rounded charcoal hood, teal scarf with broad tails, cyan eye slit, armored soft boots. Column 2: balanced agile thief with angular deep-indigo hood, violet scarf, pale violet eye slit, layered charcoal tunic. Column 3: slim swift ninja with swept-back pointed hood, hot coral scarf with two narrow long tails, warm coral eyes, streamlined shin guards. Stylish, mischievous, mysterious; not babyish. Strong readable silhouette and large head, clear separated limbs; flowing scarf and cape tips sell motion. At game size 64 pixels each character must remain clear. Flat crisply shaded professional sprite illustration, restrained highlights, dark outlines, no photoreal materials, no floor, no shadows on background, no smoke or aura, no extra objects. Fill roughly 80 percent of each cell with generous transparent margins; no touching or overlapping adjacent cells.
