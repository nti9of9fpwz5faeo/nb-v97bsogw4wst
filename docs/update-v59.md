# v59 — Focused menus, claimable missions, and a more expressive result

## Intent and reference material

- Remove the duplicate song entry on home. Rank is a small home-header button, with details on demand. Songs show mission completion percentage, calculated from completed objectives, independent of reward receipt.
- Home opens missions; the bottom bar has Home, Songs, Shop, Settings. Missions have Daily / Normal / Song views, claimable-first ordering, explicit claim buttons and a bulk claim for the selected view.
- Results use a light background, the chosen character, an animated record count, comparison with the previous personal best, two factual performance highlights at most, earned gems and compact XP progress. Retry remains usable during the reveal. Reduced-motion preference skips the reveal.
- New records use a distinct short chime and one particle burst. Existing Firefly samples are retained. No new generation credits were spent.

Sources consulted (2026-10-02):
- https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/ — clear feedback and competence/autonomy in game engagement. This informs a design hypothesis; it does not prove this UI will delight every player.
- https://www.ea.com/en/games/apex-legends/apex-legends/news/takeover-patch-notes — XP, challenge and pass progress in the end-of-match flow. Borrow the visibility of progress, not its visual design.
- https://tk8.tekken-official.jp/en/mode/replay.php — optional deeper review and improvement tools. Detailed judgments stay behind disclosure.
- https://www.monster-strike.com/news/20251106_2.html — bulk collection of completed mission rewards.
- https://www.nngroup.com/articles/aesthetic-minimalist-design/ — remove competing, unnecessary information.
- https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101 — text size, weight and contrast. Removed inherited text shadows from menus and result text.

## Data and economy

Save schema 3 keeps the existing storage key and accepts versions 1 and 2. Previously claimed rewards stay claimed; wallet, XP, characters, songs, themes, and shopping-test grant remain intact. Completed objectives are derived from progress and only pay on explicit claim. Claims atomically persist both wallet and receipt, rolling both back on failed storage.

Daily unclaimed completions are retained when the JST day changes. Partial daily progress resets. Song completion percentage includes completed-but-unclaimed missions and legacy claimed missions.

Ninja catches and rank-up gems still pay immediately. Result mission rewards are claimed separately and do not inflate the ad multiplier. The ad adapter remains unconfigured; no actual advertising or payment service was connected in this update. The disabled ad affordance is compact and honestly marked as preparing.

## Verification

28 behavioral tests passed across progression, v58 regressions, v59 claims/migration, workshop economy hooks, engine ultimate charging, and ninja/course rules. Browser download failed in this execution environment. The deployed app was then checked through the cloud browser: compact home rank, four navigation items, song list without player rank, song-specific mission navigation, daily tab, mode selection, game start, result display and retry. A low-contrast inherited reward-label color was found visually and corrected. This browser viewport was desktop width with the mobile-width content column; a physical Android device and final audio perception were not tested.
