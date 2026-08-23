# QMonitor

Control **QMonitor** (multi-source video monitoring, Desktop & Android) from Bitfocus Companion over its local HTTP API.

## Setup

1. Make sure QMonitor is running on the target machine/tablet.
2. In QMonitor, open the **language / shortcuts menu** (top-right) → **API Documentation** to confirm the server is up and note the IP address shown under the button.
3. In this module's config, enter:
   - **Host / IP** — the machine running QMonitor (e.g. `127.0.0.1` if Companion runs on the same PC, or the tablet's Wi-Fi IP for Android).
   - **Port** — `2228` (default).
   - **Poll interval** — how often Companion refreshes feedback (default `400 ms`). Lower = snappier VU meters, more network traffic.
   - **Animate** — enables the live VU meters and pulsing recording buttons.
   - **Live event stream** — leave this on. State changes are then *pushed* instead of polled, so tally follows the mixer in milliseconds rather than up to one poll interval. Polling keeps running as a slow heartbeat, so nothing breaks if the stream is unavailable.

The API listens on `0.0.0.0`, so Companion can reach it from another machine on the same network.

## What you can control

Everything the keyboard shortcuts do, and more:

- **Views** — layout (1-4 tiles), select/next/previous active tile, window & tile fullscreen.
- **Audio** — global mute, per-tile channel monitoring routing.
- **Monitoring features** — VU meters, focus peaking (+ colour & sensitivity), scopes — waveform, RGB parade, vectorscope, histogram and **Diamond** — with their layout, panel assignment and dynamic range, tile label, Infos overlay (+ per-line toggles). See below.
- **Image assistance** — black & white, false colours, zebras, markers, reticle.
- **Freeze & compare** — freeze a reference still on a tile and hold the live picture against it: wipe, blend, difference, side by side. See below.
- **3D LUT** — apply, bypass, swap and dose a conversion LUT per tile. See below.
- **Alpha** — show the transparency of a keyed NDI or OMT source, and keep the matte in the recording. See below.
- **Recording** — start/stop per tile or all tiles, quality mode.
- **Tally** — force and release per-tile tally, map tiles to mixer inputs, choose the rendering and its colours. See below.
- **App** — UI language.

## Tiles

Most actions have a **Tile** option:

- **Active tile** (blank) — acts on whichever tile is currently selected in QMonitor.
- **Tile 1-4** — targets a specific tile.

> If an action seems to do nothing on screen, check the tile actually has a source. Every command response reports `hasSource` — an empty tile still accepts the command, it just has nothing to show. The `tile_N_has_source` variable and the *Tile has a source* feedback make this visible in Companion.

## Tally

QMonitor shows, per tile, whether that source is **on air** (red) or **in preview** (green) — as a border around the tile or as a lamp under its label.

Three things can drive it, and they disagree by design:

| Priority | Origin | Set by |
|---|---|---|
| 1 | **Forced** | this module, or any API caller |
| 2 | **Mixer** | vMix, ATEM, OBS or a TSL emitter |
| 3 | **Off** | nothing |

A forced state **wins until it is explicitly released**. That is why *Force state* and *Release* are separate actions: forcing a tile to `off` ("keep this dark whatever the mixer says") is not the same as releasing it ("hand it back to the mixer").

Every published state carries its **origin**, so an operator looking at a tile stuck on red can tell "it is on air" from "someone forced it three hours ago and forgot".

### Receiving tally from a mixer

QMonitor connects to the mixer itself and **only ever reads** — it never sends it a command:

| Mixer | Transport | Notes |
|---|---|---|
| **vMix** | TCP 8099 | pushes on change; input names are fetched separately |
| **ATEM** | UDP 9910 | Blackmagic protocol, tally subset only |
| **TSL UMD** | UDP 8900 | 3.1 and 5.0; also works with Ross, Grass Valley, Roland… |
| **OBS** | WebSocket 4455 | obs-websocket v5, OBS 28+ |

Configure it in QMonitor (**language menu → Tally settings**) or remotely with the **Tally: Mixer connection** action. Then map each tile to a mixer input — by **number** or by **name** — in the same panel.

### Ready-made buttons

The **Presets** tab has three tally groups:

- **Tally — lamps (display only)** — pure indicators, no action attached, so a stray press cannot override the truth from the very button meant to display it. They take the exact colours set in QMonitor's UI, so the button wall matches the screen even after you recolour the tally.
- **Tally — control** — press to force, press again to release. The feedback is already wired: the key lights only while *it* is the one holding the tile. Drop one on a page and it works.
- **Tally — appearance & link** — rendering, and the health of the mixer connection.

> **The mixer link button is worth a key.** A dark tally wall means either "nothing is on air" or "the switcher stopped talking", and only that button tells them apart.

## Alarms

QMonitor watches nine conditions per tile and raises an incident when one holds
long enough to be real. The four audio/signal ones (signal loss, freeze, silence,
clipping) are armed by default; the five video ones (**black picture**, **frame
rate**, **format change**, **bitrate collapse**, **dead audio channel**) ship
disarmed, so updating QMonitor never makes a working installation start alarming
on its own.

### The one thing to understand

**Companion can acknowledge an alarm. It cannot clear one.** An alarm resolves
when the *fault* stops — that is the whole guarantee. Acknowledging silences it
and stops the blink; the button stays amber for as long as the fault is still
there. A key that could erase a live fault would be a way to hide an incident,
not a way to handle one, so no such action exists.

### Ready-made buttons

The **Presets** tab has two alarm groups. Both come pre-wired — the feedback
paints the button and the action on the same key acknowledges it:

- **Alarms** — the incident keys.
  - **Latest alarm (press to acknowledge)** — no tile to configure. It follows
    whatever went off most recently, blinking red until somebody acknowledges it,
    and shows the tile, the condition and the detail: *Cam 2 / CHANNEL /
    Channels 2, 4*. One key, and the operator never looks at the QMonitor screen.
  - **Tile N alarm** — one key per camera. Reads `T2 / OK` when all is well
    (deliberately not blank: a dark key is indistinguishable from an
    unconfigured one), and turns into the fault when there is one.
  - **Alarm count** / **Acknowledge all**.
- **Alarms — arming** — one key per tile and per condition to arm what you
  actually want watched, plus the audible alert and the journal.

### Reading the colours

| Colour | Meaning |
|---|---|
| **Blinking red** | Something is wrong and nobody has acknowledged it |
| **Solid amber** | Still wrong, but somebody has seen it |
| **Dark** | Nothing wrong |

The blink runs at about 2 Hz and only while something is unacknowledged — a
surface that keeps shouting after you have answered it is a surface people learn
to ignore.

### The detail is the point

Every alarm carries a detail rendered by QMonitor in its own language:
*Channels 2, 4*, *42 of 50 fps*, *1920×1080 50p → 1280×720 50p*. It is on the
button, in `$(videopathe-qmonitor:alarm_latest_detail)`, and in the API. An alarm
that only says "dead channel" sends an operator hunting across sixteen faders.

> **Black picture needs pixels.** It reads the decoded picture, natively on
> Android (two numbers per frame, no pixels over the bridge) and off the tile's
> own canvas on desktop. On Android it currently covers NDI, OMT and USB
> sources; SRT, RTSP, HTTP and web pages decode straight to a GPU surface that
> never reaches the CPU, so the condition stays quiet there rather than
> guessing.

## Session journal & report

QMonitor keeps a journal of the session — every alarm raised and cleared, and
every source change — and turns it into the two files you hand over afterwards.

### Export

**Journal: Export session report** writes the file **on the QMonitor machine**,
and returns the path in Companion's log:

| Platform | Destination |
|---|---|
| Desktop | `Documents/QMonitor Reports` |
| Android | `Download/QMonitor` (visible in any file manager and over USB) |

It is not streamed back to Companion. An eight-hour session is large, the API is
unauthenticated by design, and Companion has nowhere to put a file anyway — so
QMonitor writes it where somebody can collect it. Filenames are timestamped, so
pressing the button twice gives you two reports rather than one overwritten one.

Two formats:

- **TXT** — a readable report: header, counts by severity, then one line per
  event with a `!!` / `!` severity marker. Written oldest-first, because a report
  is read as a narrative.
- **CSV** — one row per event, twelve stable columns (`timestamp`, `ended`,
  `duration`, `tile`, `tile_label`, `source_kind`, `source_name`, `kind`, `type`,
  `severity`, `message`, `value`). Semicolon-delimited with a UTF-8 BOM, so a
  French or German Excel opens it in columns with the accents intact.

The **Keep** option filters before writing — *Warning and above* produces the
report a client or an insurer actually reads, without a morning of threshold
tuning in front of it.

> **Curating the report is done in QMonitor**, in the alarm centre's Journal tab:
> filter, tick the entries you do not want, remove them, then export. Removing an
> entry edits the report only — the alarm counters and the incident history
> behind them are never touched.

### Retention

The journal survives restarts. It is bounded on **both** age and count (30 days,
2000 entries), because either bound alone eventually fails: a count alone keeps a
single entry from years ago forever, and an age alone lets a flapping source
write ten thousand lines in a night. Whatever retention removes is counted and
printed in the report — a report that quietly lost its first two hours would be
a lie by omission.

**Journal: Clear** empties it. Irreversible, and active alarms are untouched.

## Scopes

QMonitor draws five scopes, and this module can put any of them on a tile:

| Scope | What it answers |
|---|---|
| **Waveform** | how bright, line by line — the exposure scope |
| **RGB Parade** | the same, split per channel — the white-balance scope |
| **Vectorscope** | hue and saturation, with skin-tone line and 75 / 100 % targets |
| **Histogram** | the distribution of levels, ignoring where they are in the frame |
| **Diamond** | **gamut** — RGB values that fall outside the legal cube |

The Diamond is the one no other scope substitutes for. A waveform reads legal per channel and a vectorscope reads legal in chroma while the *combination* is still out of gamut, and that is exactly what a downstream legaliser will crush. On the Diamond, out-of-gamut values leave the two stacked diamonds.

### Layout decides which scope is on screen — and it is not always the one you selected

This is the single thing to get right when you build a scope page:

| Layout | Draws |
|---|---|
| **Side** | the **selected scope** (one panel beside the picture) |
| **Full** | the **selected scope** (the whole tile) |
| **Bottom** | **four panels** from the bottom slot list — the selected scope is ignored |
| **Quad** | **four panels** from the quad slot list, one of which is the picture |

So *Feature: Scope type* only changes what Side and Full show. In Bottom and Quad you assign panels with *Feature: Scope panel content* instead.

The feedbacks follow the same split, and picking the right one is what makes a key honest:

- **Tile: a given scope is on screen** — layout-aware. Matches the selected scope in Side/Full, and *any of the four panels* in Bottom/Quad, and stays dark when the scopes are off. **This is the one to use on a "Diamond" key.**
- **Tile: selected scope matches** — the narrower one: the value *Feature: Scope type* sets, whether or not that layout is in use. Pair it with the scope-type keys.

> **Diamond is in no default panel.** Bottom ships with waveform / parade / vectorscope / histogram and Quad with picture / waveform / vectorscope / histogram — so on those two layouts the Diamond has to be assigned to a panel before it can appear. The Presets tab has a ready-made key for each (*Diamond in bottom panel 4*, *Diamond in quad panel 4*).

### Dynamic range

*Feature: Scopes dynamic range* chooses the reference the graticule is drawn against:

- **Auto** — follows the source's transfer metadata, falling back to SDR. Right almost always.
- **SDR** / **HDR** — the override, for a source that declares nothing or declares it wrongly. A wrongly-referenced signal reads *legal* when it is not, which is the failure worth a key.

> The `tile_N_scope_dynamic_range` variable and its feedback report the **setting**, not what Auto resolved to. QMonitor resolves Auto at render time and does not publish the result, so a module that reported a "resolved" value would say SDR on an HDR source. Better an honest setting than a measurement nobody has.

### Ready-made buttons

The **Scopes** preset category carries four groups:

- **Layout** — bottom / side / quad / full, lit on the layout in use.
- **Scope type** — the five scopes, driving the Side/Full selection.
- **… full screen** — one key that switches the scopes on, goes Full and puts that scope up, from whatever state the tile was left in. The gamut check in one press.
- **Dynamic range**, and a per-tile readout that prints what is actually on screen — which on Bottom and Quad is the only face that can.

## Freeze & compare

Freeze a still off a tile and hold the live picture against it. Four ways to
look at the pair:

- **Wipe** — a seam you slide across the picture. The workhorse: check a new
  shot against the reference framing, or a grade against the one before it.
- **Blend** — a fade between the two, driven by a fader or a rotary.
- **Difference** — what actually changed, amplified for display. A matched pair
  reads black. **Compare: Difference gain** lifts a small mismatch out of the
  bottom two stops; it is a display gain and never a measurement, so the scopes
  keep reading the live picture.
- **Side by side** — both pictures at half size, one per half.

**Compare: Freeze / release (toggle)** is the one to put on a key: press to
freeze what is on screen and start comparing, press again to drop it and go
back to live.

### Freezing never touches a recording

The tile keeps receiving, keeps recording and keeps raising alarms on the LIVE
signal. Freezing changes what the screen shows, nothing else.

### The pulse is not decoration

**Tile comparing — pulsing (animated)** exists because a frozen picture on a
wall is the one state that can be mistaken for a live one, and the eye stops
noticing a static tint within minutes. Movement is what survives peripheral
vision. Put it on any key that can leave a comparison running.

### Where side by side and difference are unavailable

On Android, NDI / OMT / USB / SRT / RTSP / HTTP / web-page sources are decoded
straight onto a surface behind the web view, and the comparison is composited
there instead — which covers wipe, blend and difference. Side by side needs the
live picture resized rather than read, so it is refused on those sources and the
tile says so on screen rather than showing an approximation.

## 3D LUT

A conversion LUT turns a camera log signal into something judgeable — Rec.709,
typically. QMonitor loads `.cube` files (17³, 33³, 65³), and this module drives
which one a tile wears.

**The module names a LUT, it never carries one.** The file is loaded on the
QMonitor machine, from the Assistances panel, into a small library that survives
a restart. What a control surface is good for is switching between conversions
already there.

- **LUT: Apply / bypass** — the one to put on a key. Taking a conversion out for
  a second is how an operator checks whether what they are seeing is in the
  signal or in the LUT.
- **LUT: Put a LUT on a tile** — by name (`LogC 709`) or by position in the
  library (`1`, `2`, `3`…). Positions are what the shipped presets use, because
  the library differs from machine to machine; names are what to type once you
  know what is loaded.
- **LUT: Strength** — 100 % is the normal answer. Below it, the picture is a
  blend with the untouched signal, which shows what the LUT is doing but is
  never “correct”.

### A LUT never changes what is measured or recorded

This is the rule the whole feature is built on. The waveform, the vectorscope,
the histogram, focus peaking, the zebras, the false colours, the black and
freeze alarms and every recording keep working on the **source signal**. Only
the picture on the monitor is converted.

That is the answer a QC tool has to give: if the LUT moved the waveform, an
operator could pass a shot that clips in the log signal because the LUT rolled
the highlight off. The tile carries a permanent badge so the two are never
confused.

### Watch `tile_lut_applied`, not `tile_lut_enabled`

They differ, and the difference is the point. A LUT can be switched on and still
not reach the picture — the machine ran out of GPU contexts, or a recalled
configuration names a file that machine’s library does not have. The picture
then looks plausible and is **not** converted, which is the one failure an
operator cannot spot unaided.

- **Tile: LUT applied** (violet) — the picture really carries the conversion.
- **Tile: LUT switched on but NOT reaching the picture** (amber) — the warning.
  Put it on any key that also shows `tile_lut_applied`; amber wins by being
  listed last.

### Presets carry the name, not the file

A configuration preset saves which LUT a tile wore and how far it was dosed.
Recalled on a machine whose library does not have that file, the tile says the
LUT is missing and shows the picture untouched — rather than dropping it
silently and leaving somebody grading a log signal.

## Alpha

A keyed source carries transparency alongside the picture — a lower third, a
graphics fill, a virtual set element. These actions decide how that transparency
is shown on a tile.

**Only NDI and OMT carry alpha.** That is a statement about the pipeline, not a
guess: a single-link SDI has no key at all, and every other input here (USB,
SRT, RTSP, HTTP, WebRTC, screen and page capture) is 4:2:2 or H.264, neither of
which has anywhere to put an alpha channel. The actions are accepted on any
tile, but on those kinds they have nothing to draw — which is what
**Tile: alpha view on, but this source carries no alpha** is for.

- **Alpha only** — the matte on its own, in greyscale. The mode that actually
  judges a key: holes, chewed edges and semi-transparency are invisible when the
  matte is drawn over a busy picture.
- **Composite over a checkerboard** — the fastest way to see *where* a picture is
  transparent, and unmistakably transparent rather than “possibly grey”.
- **Composite over a flat colour**, with **over black** and **over white** on
  their own buttons. The check is the *pair*: flipping between the two is what
  reveals a source that is premultiplied when it should be straight, because the
  soft edges go dark against one and bright against the other.
- **Highlight** and **Zebras** — flag the transparent areas over the picture,
  when you want to keep watching the shot. The alpha zebras run along the
  opposite diagonal to the exposure zebras, so with both on you can still tell
  which stripe is telling you what.

### “Has an alpha channel” is worthless — measure it

Every NDI sender in the building produces RGBA. A feedback based on the format
would light up across the whole rack and mean nothing.

So QMonitor **measures** the frames instead, twice a second, and reports what it
found. **Tile: the source is genuinely keyed (measured)** lights only on a feed
that really has transparency in it, and `$(qmonitor:tile_1_alpha_transparent)`
gives the share of the picture that is clear. `tile_1_alpha_presence` reads
`unknown`, `none`, `partial` or `keyed`.

An RGBA feed whose alpha is uniformly opaque reports `none` — which is the
answer an operator needs *before* turning a mode on, rather than after trying
every mode and squinting.

### An alpha view never changes what is measured or recorded

Same rule as the LUT, and it bites harder here: three of these modes composite
the picture over a background. The scopes, focus peaking, the zebras, the false
colours, the alarms and every recording keep reading the **fill** — the
untouched source signal.

If they did not, a waveform would be measuring a checkerboard the source never
sent, and a recording would have the matte baked into it permanently.

### Recording the transparency

**The format decides.** Two of the recording formats have somewhere to put a key,
and on a keyed source they simply use it — nothing to enable:

| Format | Carries alpha |
| --- | --- |
| **ProRes 4444** (Desktop) | Yes — `yuva444p10le`. The one to hand to an editor. |
| **VP9 WebM** (Desktop) | Yes — `yuva420p`. Light, and what a browser wants. |
| H.264, H.265, ProRes 422 | No. MP4 and MOV have nowhere to put a key. |
| Anything on **Android** | No. See below. |

**`Alpha: Also write a key file`** covers the second column: the matte as its own
greyscale movie, `take.mp4` plus `take_key.mp4`. It applies only to formats that
cannot hold a key — on ProRes 4444 and VP9 the switch is hidden in the panel and
ignored by the recorder, because there is nothing left for it to do.

**VP9 WebM is the exception, and gets its matte anyway.** Its embedded alpha is a
second hidden stream that most decoders quietly ignore (next section), so a
`_key.webm` is written alongside every keyed WebM take, switch or no switch. The
extra leg was measured at **12 %** on top of the fill — 6.23 s against 5.58 s for
200 frames of 720p, both comfortably inside the 8.00 s that is real time — so it
costs far less than a take nobody can composite.

On Android it is the only way, full stop: MediaCodec has no ProRes encoder on any
SoC, and WebM alpha is a container trick — a second hidden stream in
`BlockAdditional` — that `MediaMuxer` does not write.

### "It says it has alpha but the background is black"

This is the one genuinely awkward thing about WebM alpha, and it is worth
understanding before choosing the format.

WebM does not store alpha as part of the picture. It stores a **second hidden VP9
stream** in the block's `BlockAdditional` field, and a decoder has to know to go
and fetch it. Most do not:

| Decoder | Alpha |
| --- | --- |
| FFmpeg's built-in `vp9` (the default) | **Ignored — every pixel decodes opaque** |
| `vp9_cuvid`, `vp9_qsv` (hardware) | Ignored |
| `libvpx-vp9` (must be asked for by name) | Correct |
| Chrome / Chromium | Correct |

The container tag survives all of them, so a MediaInfo panel reads
`alpha_mode : 1` and reports "Alpha: yes" while the frames coming out are solid.
That combination — *metadata says alpha, picture says opaque* — is this and
nothing else.

Measured on one file, same frames, two decoders:

```
alpha_mode : 1          (both)
default vp9  -> 255, 255, 255, 255, 255
libvpx-vp9   ->   0,  32, 129, 224, 255
```

**If you are integrating the file:** select the decoder by name rather than by
codec id — `avcodec_find_decoder_by_name("libvpx-vp9")` instead of
`avcodec_find_decoder(AV_CODEC_ID_VP9)`, or `-c:v libvpx-vp9` on the command
line. The build needs `--enable-libvpx`; check with `ffmpeg -decoders | grep vp9`.

**If you would rather not think about it:** use **ProRes 4444**. Its alpha is an
ordinary plane of the pixel format, so every decoder returns it with no special
selection — the same test file decodes to `yuva444p12le` and the correct ramp
straight off the default decoder. The **key file** is the other universal option.

Worth knowing:

- The key file costs a **second encode**; an embedded alpha does not.
- ProRes 4444 runs at roughly **three times the data rate of ProRes 422**, and
  its quality switch is greyed out because 4444 has no lighter variant that keeps
  an alpha plane. It costs far less *encoder time* than that ratio suggests —
  measured at 83 fps against 101 for 422 at 720p, on the same machine.
- **ProRes missing from the picker** means this machine was measured and cannot
  hold it in real time at the size and rate you are recording. It is judged on
  the OUTPUT, so capping the recording resolution can bring it back.
- The pair is written by **one encoder from one set of frames**, so the fill and
  the key cannot drift apart.
- **Choosing an alpha format does not make a source keyed.** QMonitor decides
  from the frames that actually arrive — an ordinary NDI source arrives as 4:2:2,
  which has no alpha at all, and records opaque. Nothing is invented. (This is
  not caution for its own sake: forcing a key out of a 4:2:2 input aborts the
  shared encode and loses *both* files.)
- On Android, if the key leg fails to start the whole take is refused rather than
  quietly writing a lone fill.
- The key file carries no audio. The sound belongs to the fill.
- Asking for a key file on Windows gives up the D3D11 GPU recorder for that take:
  it writes one finished H.264 file and has nowhere to put a second output.

## Configuration presets

A preset is a whole setup: layout, sources, scopes, VU meters, alarm thresholds,
assists, tally appearance. **Preset: Recall configuration** puts it all back on
one key.

Presets are bound **by name**, not by an internal id — set up "Plateau A" on a
key and it keeps working after the preset is re-saved or imported on another
machine, where the generated id differs.

### Two ways to recall

- **Restore sources too** (default) — the full setup, sources included.
- **Presentation only** — applies scopes, VU meters, thresholds and assists, and
  leaves what is on air exactly where it is. This is the one to put on a key
  during a show.

> **Recording tiles are never touched.** QMonitor refuses, whatever the preset
> says: swapping a source under a running recording is how you lose a take. When
> that happens the action logs how many tiles were skipped, because a button
> press has no other way to tell you.

### What a preset does not carry

Recording directories and keyboard shortcuts stay out: the first is a path on one
machine, the second is how a person likes to work. The **obs-websocket password
is never written into a preset or its exported file** — a preset is something
people email each other. The machine recalling it keeps its own credential.

## VU meters

Every source kind publishes audio levels, and the two ways they are measured are
not equally good:

| Source | Measured from |
|---|---|
| NDI, OMT, USB, DeckLink | the decoded **PCM** stream, per source channel |
| SRT, RTSP on Android | the native player's own levels |
| SRT, RTSP, HTTP on desktop, WebRTC, screen capture, web page | QMonitor's **WebAudio analyser** on the playing element |

The PCM path is the better one: it reads the source channels as they arrive. The
analyser reads what the browser decoded, **after any downmix** — so a 16-channel
SRT feed that Chromium folds to stereo shows two bars, not sixteen. The levels
are real either way; only the channel count can differ from the source's.

> **One condition on the analyser path:** the tile's VU meters must be switched
> **on** in QMonitor for it to measure. The meter does not have to be visible —
> a Full scope layout covering it is fine — but a tile whose VU is switched off
> publishes no levels for those source kinds. Native sources are unaffected:
> they measure whether or not anything is displayed.

Web page sources on Android are the one combination with no levels at all.

## Notable feedbacks

- **Tile VU meter — live bar (animated)** — a moving VU meter drawn right on the button. Works on every source kind.
- **Tile / Any recording — pulsing** — the button pulses red while recording.
- **Tally: Tile lit — uses QMonitor colours** — paints the button with the colour QMonitor is actually drawing.
- **Tally: Tile state is forced** / **origin matches** / **mixer state is stale** — why a tile is lit, not just that it is.
- **Tally: Mixer link is up / down** — the connection to the switcher.
- **Alarm: Latest incident** — text and colour for the most recent alarm, blinking until acknowledged.
- **Alarm: Tile alarm** — the same, for one camera.
- **Alarm: Tile is armed** / **Audible alert is on** — what is actually being watched.
- **Journal: Entry count** — how many entries the session holds, amber when some are critical.
- **Preset: Name and contents** — the preset a key is bound to; dim when no preset by that name exists, so a renamed one looks wrong rather than empty.
- **Tile comparing — pulsing** — the button pulses cyan while a comparison is on screen.
- **Tile: Reference frozen** / **Comparison showing** / **in a given mode** — frozen and showing are separate on purpose: a reference can be held while the comparison is hidden.
- **Tile: a given scope is on screen** — layout-aware, so a Diamond key lights whether the Diamond is the selected scope or sits in a Bottom/Quad panel.
- **Tile: selected scope matches** / **scopes layout matches** / **scopes dynamic range matches** — the three settings behind a scope page.
- **Tile is the active tile**, **Layout matches**, **Global audio muted**, feature/assist on-states, source-kind match, and more.

Check the **Presets** tab for ready-made buttons, including the live VU meters and pulsing REC buttons.
