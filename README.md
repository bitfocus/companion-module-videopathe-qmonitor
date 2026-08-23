A [Bitfocus Companion](https://bitfocus.io/companion) module to control **QMonitor**, the multi-source
video-monitoring application (Electron desktop + Android), over its local HTTP API.

QMonitor is available for free on [videopathe.com](https://videopathe.com) for Windows, macOS and Android.

See [HELP.md](./companion/HELP.md) for the in-Companion help page, and [LICENSE](./LICENSE).

## Scope

The module targets the remote-control API exposed by QMonitor on port `2228`. It uses a **hybrid** model: a
`GET /api/status` snapshot on a timer, plus a live `GET /api/events` stream that pushes state changes as they
happen. While the stream is up, polling drops to a slow 5 s heartbeat rather than stopping — a stream can
stall without closing, and a wall of buttons showing a state from ten minutes ago is worse than one that is
merely a second late. If `/api/events` is unavailable, the module falls back to plain polling and retries
with a widening delay.

The default poll interval is `250 ms`, fast enough to drive the live VU meters; the animated feedbacks
(VU bars, pulsing REC, pulsing compare, alarm blink) are interpolated between updates so they keep moving
smoothly.

It covers:

- views: layout (1–4 tiles), active tile selection, window and per-tile solo fullscreen
- audio: global mute, per-tile monitoring channel routing
- monitoring features: VU meters, focus peaking (+ colour & sensitivity), tile label, Infos overlay and its
  individual lines
- scopes: waveform, RGB parade, vectorscope, histogram and **Diamond** (gamut), with their layout, panel
  assignment and SDR/HDR dynamic range
- image assistance: black & white, false colours, zebras, markers, reticle
- freeze & compare: freeze a reference still and hold the live picture against it — wipe, blend, difference,
  side by side, with seam direction, wipe position, blend amount and difference gain
- 3D LUT: apply, bypass, swap and dose a conversion LUT per tile
- alpha: show the transparency of a keyed NDI or OMT source, and keep the matte in the recording
- recording: per tile or all tiles, quality mode
- tally: force and release per tile, tile-to-mixer-input mapping, rendering and colours, and the mixer
  connection itself (vMix, ATEM, TSL UMD, OBS)
- alarms: nine conditions per tile, arming, acknowledgement, audible alert
- session journal: export a TXT or CSV report on the QMonitor machine, clear the journal
- configuration presets: recall, save and delete a whole setup by name
- UI language switching
- 231 Companion variables covering views, sources, scopes, LUT, alpha, recording, tally, alarms and journal
- 67 feedbacks, including five animated ones (VU bars, tile REC, any REC, comparing, alarm blink)
- ready-made presets grouped by Views, Active tile features, Active tile assist, Scopes, Freeze & compare,
  3D LUT, Alpha, Audio, Live VU meters, Recording, Tally, Alarms, Journal, Configuration presets and Readouts

## Requirements

- QMonitor running on the target machine or tablet, with its remote-control server active
- The QMonitor machine and the Companion machine on the same network
- Companion 3.x

## Setup

1. Start QMonitor on the desktop machine or the Android device.
2. In QMonitor, open the **language / shortcuts menu** (top-right) → **API Documentation** to confirm the
   server is up and note the IP address shown under the button.
3. In Companion, add a **Videopathe: QMonitor** connection and fill in:

| Field                                     | Default     | Description                                                                                            |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| **QMonitor host / IP**                    | `127.0.0.1` | Machine running QMonitor — `127.0.0.1` if Companion is on the same PC, the tablet's Wi-Fi IP otherwise |
| **Port**                                  | `2228`      | QMonitor remote-control API port                                                                       |
| **Poll interval (ms)**                    | `250`       | Snapshot refresh rate. Lower = snappier VU meters, more network traffic                                |
| **Animate VU meters & recording buttons** | on          | Enables the live VU bars and the pulsing REC / compare / alarm buttons                                 |
| **Live event stream**                     | on          | State changes are pushed instead of polled — tally follows the mixer in milliseconds                   |

4. Save, and confirm the connection reaches the `ok` status.
5. Drag presets from the module onto your buttons.

The API listens on `0.0.0.0`, so Companion can reach it from another machine on the same network.

### Tiles

Most actions carry a **Tile** option. Left blank (**Active tile**) it acts on whichever tile is currently
selected in QMonitor; `Tile 1`–`Tile 4` target a specific one.

> If an action seems to do nothing on screen, check the tile actually has a source. Every command response
> reports `hasSource` — an empty tile still accepts the command, it just has nothing to show. The
> `tile_N_has_source` variable and the _Tile has a source_ feedback make that visible in Companion.

## Actions

67 actions. Unless stated otherwise, every on/off option is **toggle / on / off**.

| Action                                                                   | Options                                                                  | Notes                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| General: Refresh state now                                               | —                                                                        | Forces an immediate poll                                                                      |
| View: Set layout (tile count)                                            | 1 / 2 / 3 / 4 tiles                                                      |                                                                                               |
| View: Select active tile / next / previous                               | tile (for _select_)                                                      |                                                                                               |
| View: Window fullscreen                                                  | state                                                                    |                                                                                               |
| View: Tile solo fullscreen                                               | tile, state                                                              |                                                                                               |
| Audio: Global mute                                                       | state                                                                    |                                                                                               |
| Audio: Route monitored channels                                          | tile, left `1–16`, right `1–16`                                          | Which source channels feed the monitoring output                                              |
| Feature: VU meters / Focus peaking / Scopes / Tile label / Infos overlay | tile, state                                                              |                                                                                               |
| Feature: Focus peaking colour / sensitivity                              | tile, colour / low-medium-high                                           | Green, amber, red, cyan or the stored custom colour                                           |
| Feature: Scopes layout                                                   | tile, bottom / side / quad / full                                        | **Bottom and Quad draw their four-panel list, not the selected scope**                        |
| Feature: Scope type                                                      | tile, waveform / parade / vectorscope / histogram / diamond              | Only affects the Side and Full layouts                                                        |
| Feature: Scope panel content                                             | tile, layout, panel `1–4`, scope                                         | Assigns a scope to one of the four Bottom or Quad panels                                      |
| Feature: Scopes dynamic range (SDR / HDR)                                | tile, auto / SDR / HDR                                                   | Auto follows the source's transfer metadata, falling back to SDR                              |
| Feature: Infos line                                                      | tile, line, state                                                        | Codec, audio, bitrate, link, frames, real FPS, performance                                    |
| Assist: Black & white / False colours / Zebras / Markers / Reticle       | tile, state                                                              |                                                                                               |
| Compare: Freeze reference / Show comparison                              | tile, state                                                              | Frozen and showing are separate: a reference can be held while the comparison is hidden       |
| Compare: Freeze / release (toggle)                                       | tile                                                                     | **The one to put on a key** — press to freeze and compare, press again to go back to live     |
| Compare: Mode                                                            | tile, wipe / blend / difference / side by side                           |                                                                                               |
| Compare: Seam direction / Wipe position / Blend amount / Difference gain | tile, value                                                              | Position and blend `0–100 %`; the difference gain is a display gain, never a measurement      |
| Compare: Swap sides                                                      | tile, state                                                              |                                                                                               |
| LUT: Apply / bypass                                                      | tile, state                                                              | Taking the conversion out for a second is how you tell the signal from the LUT                |
| LUT: Put a LUT on a tile                                                 | tile, name or library position                                           | The module names a LUT, it never carries one — the `.cube` file lives on the QMonitor machine |
| LUT: Take the LUT off a tile / Strength                                  | tile, `100 / 75 / 50 / 25 / 0 %`                                         | 100 % is the normal answer; below it the picture is a blend with the untouched signal         |
| Alpha: How transparency is shown                                         | tile, off / alpha only / highlight / zebras / flat colour / checkerboard | Only NDI and OMT carry alpha                                                                  |
| Alpha: Matte / highlight colour, Highlight / zebra strength              | tile, colour / strength                                                  | Black and white have their own buttons — flipping between them reveals a premultiplied key    |
| Alpha: Also write a key file                                             | tile, state                                                              | `take.mp4` + `take_key.mp4`, for the formats that cannot hold a key themselves                |
| Recording: Tile record / Record all tiles                                | tile, start / stop / toggle                                              |                                                                                               |
| Recording: Quality mode                                                  | quality / optimized                                                      |                                                                                               |
| Tally: Force state                                                       | tile, program / preview / off                                            | A forced state wins over the mixer until it is explicitly released                            |
| Tally: Force state (toggle)                                              | tile, state                                                              | Press to force, press again to release                                                        |
| Tally: Release forced state / Release all forced states                  | tile                                                                     | Hands the tile back to the mixer — not the same as forcing it to `off`                        |
| Tally: Map tile to mixer input                                           | tile, input number or name                                               |                                                                                               |
| Tally: Tile follows the mixer                                            | tile, state                                                              |                                                                                               |
| Tally: Display mode / Appearance                                         | border / badge, right / left / text tally, colours                       |                                                                                               |
| Tally: Mixer connection (receive from)                                   | none / vMix / ATEM / TSL UMD / OBS, host, port                           | QMonitor only ever reads from the mixer — it never sends it a command                         |
| Alarm: Acknowledge / Acknowledge all                                     | tile                                                                     | **Acknowledging silences an alarm; only the fault stopping clears it**                        |
| Alarm: Arm tile / Arm one condition                                      | tile, condition, state                                                   | Nine conditions; the five video ones ship disarmed                                            |
| Alarm: Audible alert                                                     | state                                                                    |                                                                                               |
| Journal: Export session report                                           | TXT / CSV, keep everything / warning and above / critical only           | Written **on the QMonitor machine**; the path comes back in Companion's log                   |
| Journal: Clear                                                           | —                                                                        | Irreversible. Active alarms are untouched                                                     |
| Preset: Recall configuration                                             | name, restore sources too / presentation only                            | Bound by name, not by an internal id. Recording tiles are never touched                       |
| Preset: Save current configuration / Delete a configuration              | name                                                                     | Saving never overwrites — a name already taken gets a suffix                                  |
| App: Language                                                            | Français / English                                                       |                                                                                               |

## Feedbacks

67 feedbacks. The ones marked **animated** redraw between updates.

| Feedback                                                             | Type     | Description                                                                            |
| -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Connection is OK                                                     | boolean  | The module is reaching QMonitor                                                        |
| Layout matches / Window is fullscreen / Global audio is muted        | boolean  |                                                                                        |
| Recording quality mode matches / UI language matches                 | boolean  |                                                                                        |
| Tile is the active tile / is solo fullscreen / has a source          | boolean  |                                                                                        |
| Tile source kind matches                                             | boolean  | NDI, OMT, SRT, RTSP, HTTP, WebRTC, USB, DeckLink, web page, no source                  |
| Tile: VU meters / Focus peaking / Scopes / Label / Infos overlay on  | boolean  |                                                                                        |
| **Tile: a given scope is on screen**                                 | boolean  | Layout-aware: the selected scope in Side/Full, any of the four panels in Bottom/Quad   |
| Tile: selected scope matches (Side / Full layouts)                   | boolean  | The narrower one — the value _Feature: Scope type_ sets                                |
| Tile: scopes layout matches / dynamic range matches / Infos line on  | boolean  | The range feedback reports the **setting**, not what Auto resolved to                  |
| Tile: Black & white / False colours / Zebras / Markers / Reticle on  | boolean  |                                                                                        |
| Tile: Reference frozen / Comparison showing / in a given mode        | boolean  | Frozen and showing are separate on purpose                                             |
| **Tile comparing — pulsing (animated)**                              | advanced | The button pulses cyan while a comparison is on screen                                 |
| Tile: LUT applied / has a LUT loaded / a given LUT is applied        | boolean  | `applied` means the picture really carries the conversion                              |
| **Tile: LUT switched on but NOT reaching the picture**               | boolean  | The amber warning — the one LUT failure an operator cannot spot unaided                |
| Tile: an alpha view is on / a given alpha mode is selected           | boolean  |                                                                                        |
| Tile: the source is genuinely keyed (measured)                       | boolean  | Measured from the frames, not read off the format                                      |
| Tile: alpha view on, but this source carries no alpha                | boolean  |                                                                                        |
| Tile: the key will be recorded as a second file                      | boolean  |                                                                                        |
| Tile is recording / Any tile is recording                            | boolean  |                                                                                        |
| **Tile recording — pulsing** / **Any recording — pulsing**           | advanced | The button pulses red while recording                                                  |
| **Tile VU meter — live vertical bars (animated)**                    | advanced | A moving VU meter drawn right on the button. Works on every source kind                |
| Tile audio level above threshold                                     | boolean  | The audio-present indicator                                                            |
| Tile peaking colour (shows the colour)                               | advanced | Paints the button with the peaking colour actually in use                              |
| Tally: Tile state matches / forced to a given state / origin matches | boolean  | Why a tile is lit, not just that it is                                                 |
| **Tally: Tile lit — uses QMonitor colours**                          | advanced | Takes the exact colours set in QMonitor's UI, so the wall matches the screen           |
| Tally: Tile state is forced / Any tile is forced                     | boolean  |                                                                                        |
| Tally: Tile mixer state is stale / Any mixer state is stale          | boolean  |                                                                                        |
| Tally: Tile follows the mixer / Display mode matches                 | boolean  |                                                                                        |
| Tally: Mixer link is up / configured but link is down                | boolean  | A dark tally wall means "nothing on air" **or** "the switcher stopped talking"         |
| Alarm: Any alarm active / Tile has an alarm / Tile is armed          | boolean  |                                                                                        |
| **Alarm: Latest incident (text + colour)**                           | advanced | Tile, condition and detail, blinking red until acknowledged, then solid amber          |
| **Alarm: Tile alarm (text + colour)**                                | advanced | The same, for one camera. Reads `T2 / OK` when all is well                             |
| Alarm: Audible alert is on                                           | boolean  |                                                                                        |
| Journal: Entry count (text + colour) / Has entries                   | advanced | Amber when some of the entries are critical                                            |
| Preset: Name and contents / Exists                                   | advanced | Dim when no preset by that name exists, so a renamed one looks wrong rather than empty |

## Variables

All variables are prefixed with `$(videopathe-qmonitor:…)` — 39 global, plus 48 per tile for tiles 1 to 4.

**Connection & app** — `connection_status`, `server_url`, `app_version`, `app_platform`, `api_version`

**Views & audio** — `layout`, `active_tile`, `fullscreen_tile`, `window_fullscreen`, `global_audio_muted`,
`language`

**Recording** — `any_recording`, `recording_count`, `recording_duration`, `recording_quality`

**Tally** — `tally_display`, `tally_forced_count`, `tally_program_tiles`, `tally_mixer_kind`,
`tally_mixer_status`, `tally_mixer_host`, `tally_mixer_inputs`

**Alarms** — `alarm_count`, `alarm_unacknowledged`, `alarm_latest`, `alarm_latest_tile`,
`alarm_latest_label`, `alarm_latest_type`, `alarm_latest_detail`, `alarm_latest_acknowledged`,
`alarm_tiles`, `alarm_history_count`

**Journal, presets & LUTs** — `journal_count`, `journal_critical`, `journal_warning`, `journal_dropped`,
`preset_count`, `preset_names`, `lut_count`

**Per tile** (`tile_N_…`, N = 1…4):

- _source_ — `label`, `source_kind`, `source_name`, `has_source`, `active`
- _features_ — `vu`, `peaking`, `peaking_color`, `scopes`, `scope_layout`, `scope_type`,
  `scopes_on_screen`, `scope_dynamic_range`, `labels`, `info`, `info_summary`
- _stats_ — `codec`, `resolution`, `fps`, `real_fps`, `bitrate_kbps`, `audio_channels`, `audio_peak`
- _recording_ — `recording`, `rec_status`, `rec_duration`
- _tally_ — `tally`, `tally_origin`, `tally_forced`, `tally_input`, `tally_follows`
- _compare_ — `frozen`, `comparing`, `compare_mode`, `compare_position`
- _LUT_ — `lut`, `lut_applied`, `lut_enabled`, `lut_strength`, `lut_size`
- _alpha_ — `alpha_mode`, `alpha_presence`, `alpha_transparent`, `alpha_key_recording`
- _alarms_ — `alarm_count`, `alarm`, `alarm_detail`, `alarm_armed`

> **Watch `tile_N_lut_applied`, not `tile_N_lut_enabled`.** They differ when a LUT is switched on and is not
> reaching the picture — the picture then looks plausible and is not converted.
>
> **`tile_N_scopes_on_screen` is the one for a button face.** In Bottom and Quad it lists the four panels
> actually drawn, which `tile_N_scope_type` cannot.

## Presets

Ready-made buttons, grouped in the Presets tab. Every preset also carries a "connection lost" feedback that
turns the button dark red when QMonitor is unreachable.

- **Views** — layout 1–4, previous / next tile, active tile readout, window fullscreen
- **Active tile features** — VU meters, focus peaking, scopes, tile label, Infos overlay
- **Active tile assist** — black & white, false colours, zebras, markers, reticle
- **Scopes** — layout (bottom / side / quad / full), the five scope types, one-press "… full screen" keys,
  dynamic range, and a per-tile readout of what is actually on screen. Includes ready-made _Diamond in
  bottom panel 4_ and _Diamond in quad panel 4_ keys, since the Diamond is in no default panel
- **Freeze & compare** — freeze / release toggle, the four modes, wipe position, and a pulsing
  "comparing" key
- **3D LUT** — apply / bypass, the first library positions, strength, and the amber "not reaching the
  picture" warning
- **Alpha** — alpha only, checkerboard, over black, over white, highlight, zebras, key-file toggle
- **Audio** — global mute, per-tile channel routing
- **Live VU meters** — one animated bar per tile
- **Recording** — per-tile and all-tile pulsing REC keys, quality mode
- **Tally — lamps (display only)** — pure indicators with no action attached, in QMonitor's own colours, so
  a stray press cannot override the truth from the very button meant to display it
- **Tally — control** — press to force, press again to release; the feedback is wired so the key lights only
  while _it_ is the one holding the tile
- **Tally — appearance & link** — rendering, and the health of the mixer connection. **The link button is
  worth a key**: only it tells "nothing on air" from "the switcher stopped talking"
- **Alarms** — latest alarm (press to acknowledge), one key per tile, alarm count, acknowledge all
- **Alarms — arming** — one key per tile and per condition, plus the audible alert and the journal
- **Journal** — export TXT / CSV, entry count, clear
- **Configuration presets** — recall by name, presentation-only recall, save
- **Readouts** — connection status, per-tile source and format readouts

## Development

```sh
corepack enable
yarn install
yarn build      # compiles TypeScript to dist/
yarn dev        # watch mode — recommended while testing with Companion
yarn lint       # eslint
yarn format     # applies prettier
yarn package    # builds a .tgz for Companion
```

To test in Companion developer mode, set Companion's **Developer modules path** to the _parent_ folder
containing `companion-module-videopathe-qmonitor` — not to the module folder itself — then add a
**Videopathe: QMonitor** connection. In watch mode, Companion reloads the module when the files are rebuilt.

## API reference

- `GET /api/status` — full state snapshot (tiles, scopes, LUT, alpha, recording, tally, alarms, journal)
- `GET /api/events` — a `text/event-stream` pushing state changes as they happen. The module reconnects on
  its own with a widening delay, and keeps a 5 s poll heartbeat behind it
- `GET /api/cmd/<id>?param=value` — every command. Empty params are dropped, so `tile` left blank targets
  the active tile; the response reports `ok`, `tile` and `hasSource`
- `GET /api/commands` — machine-readable command manifest
- `GET /docs` — interactive documentation

QMonitor exposes that documentation from its own interface (**language menu → API Documentation**, i.e.
`http://<host>:2228/docs`). The server listens on `0.0.0.0`.

## Troubleshooting

- **Connection failure** — check the IP address and that both machines are on the same network, and confirm
  the server is up from QMonitor's _API Documentation_ button.
- **Tally lags behind the mixer** — make sure **Live event stream** is enabled. Without it, tally can only
  be as fresh as the poll interval.
- **Choppy VU meters** — lower the poll interval (e.g. `150 ms`) and make sure _Animate_ is enabled.
- **A tile action does nothing** — the tile probably has no source. Watch `tile_N_has_source` or the
  _Tile has a source_ feedback.
- **No VU levels on an SRT / RTSP / HTTP / WebRTC / screen-capture source** — those are measured through
  QMonitor's WebAudio analyser, which only runs when the tile's VU meters are switched **on** in QMonitor.
  The meter does not have to be visible. Native sources (NDI, OMT, USB, DeckLink) are unaffected.
- **The Diamond key stays dark on a Bottom or Quad layout** — the Diamond is in no default panel. Assign it
  with _Feature: Scope panel content_, or use the ready-made presets.
- **A LUT is on but the picture is unconverted** — that is `lut_enabled` without `lut_applied`. Use the
  amber _LUT switched on but NOT reaching the picture_ feedback rather than the plain on-state.
- **An alarm will not clear** — by design. Companion can acknowledge an alarm; only the fault stopping
  clears it. Acknowledging silences the blink and leaves the button amber while the fault is still there.
- **A recalled preset left some tiles alone** — recording tiles are never touched. The action logs how many
  were skipped.

## License

MIT
