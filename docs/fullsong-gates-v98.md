# v98: full-song endless gates

Full-song endless now extends the same path through a gate every 35 physical tiles.
The character, pending judgments, notes, audio source, beat index and speed remain
on the same timeline at a gate. Previewed source cells are preserved when the next
section is revealed. The floor palette changes and the gate count advances.
Distance gems remain at 15, 30, 45, ... absolute physical tiles, including during
ultimate movement. The legacy endless mode retains its 35-tile audio-restart warp.

After the complete audio ends, full-song endless pauses for five seconds. It then
restarts the song at +0.1 playback speed, capped at 2.2, keeping the current position,
HP, accumulated steps and ultimate charge. Pause freezes the rest countdown;
retry and returning to the song list cancel it. Gate-mode best scores use a new
key, preserving previous full-song endless records.

## Audio supplied separately by the owner

Add the supplied file **without renaming it** at:

`audio/Futuristic Action.mp3`

The catalog entry uses 150 BPM and an initial beat offset of 0.30 seconds. The
supplied MP3 decodes to about 64.01 seconds. The rhythmic portion ends around
61.3 seconds; full-song mode stops issuing judgments in the remaining outro and
plays the audio to completion before resting. These timing values come from
automatic onset analysis and can be adjusted after play testing.

Until the owner uploads the MP3, selecting that song shows a preparation message
and returns to a usable song list. All existing songs remain available.

In GitHub, open the repository's `audio` folder, use **Add file → Upload files**,
upload `Futuristic Action.mp3`, and commit to `main`. After Pages finishes deploying,
reload the game, select **フル曲エンドレス**, and play **Futuristic Action**.

## Verification

Browser tests cover continuous geometry and preserved source cells, retained
notes/deadlines/audio, song-end rest and speed increases, pause/resume/retry,
ultimate landing, 15-tile gem accounting, speed cap and legacy endless behavior.
