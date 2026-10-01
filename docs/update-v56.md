# v56 — four ninja ranks and mobile navigation

## Shipped scope
- Approved four ninja designs and four separate gems, optimized transparent WebP under `img/ninjas/` and `img/gems/`. Existing art preserved.
- Novice has separate surprised and idle art. Built-in image generation edited the approved novice: preserve identity/costume/pose, narrow focused eyes, remove surprise marks, sweat and foot smoke. Source `exec-198cce35-4f1c-4949-80d7-b3f667fcebb0.png`.
- Midcourse encounters, stationary integer-cell positions and rounded smoke teleports. Catch includes purple/ultimate sweep; saved ultimate is a valid strategy.
- Five shuffled, non-repeating path layouts, each 35 steps to goal and 4 additional note-source cells. Tutorial stays original.
- Home mode cards, song selection, independent special-stage destination, character/shop/missions/settings bottom navigation. Special music is not supplied, so catalog is honestly unavailable with no purchase/start control.
- Preview controls use play/stop icons, keep 15-second excerpt and accessible names. Manual note-speed setting and stored preference retired; warp music acceleration unchanged.
- One-time shopping gift via `#gift=kurumin-v56-shopping`: +100000 to this browser's existing wallet, atomic persistence/rollback, preserved progress. Never automatic for all visitors. Test-only local ledger, not a secure real-money economy.

## Initial tuning (adjust after playtesting)
Each course rolls 28% chance; conditional ninja rank weights 60 / 30 / 9.5 / 0.5 percent. Divine per-course probability = 0.28 × 0.005 = 0.14% (1 in about 714 courses on average, not guaranteed).
Trigger at player progress 14–17; appears 2 cells ahead. First warp after 0.28 s. Jumps 3 / 4 / 6 / 8 cells; waits 12 / 11 / 10 / 9 beats. Rewards 5 / 15 / 40 / 150. If player already passed the valid encounter zone, skip rather than place behind them.

## Verification
Node regression suites cover ledger migration/purchase rollback, grant idempotency, rank awards, workshop event dedupe, ultimate charging, midcourse visibility, discrete warps, all-rank catches, pause/escape exclusions, tempo scaling, all five path lengths and shuffled ordering.
