import type { DropdownChoice } from '@companion-module/base'

// "" = the active tile; 1-4 target a specific tile.
export const TILE_CHOICES: DropdownChoice[] = [
	{ id: '', label: 'Active tile' },
	{ id: '1', label: 'Tile 1' },
	{ id: '2', label: 'Tile 2' },
	{ id: '3', label: 'Tile 3' },
	{ id: '4', label: 'Tile 4' },
]

// Same list but without the "active" entry, for feedbacks/variables that must
// point at a concrete tile.
export const TILE_INDEX_CHOICES: DropdownChoice[] = [
	{ id: 1, label: 'Tile 1' },
	{ id: 2, label: 'Tile 2' },
	{ id: 3, label: 'Tile 3' },
	{ id: 4, label: 'Tile 4' },
]

// Feedback tile picker: 0 = the currently active tile (default), 1-4 = a
// specific tile. Lets a single button follow whatever tile is selected.
export const TILE_FEEDBACK_CHOICES: DropdownChoice[] = [
	{ id: 0, label: 'Active tile' },
	{ id: 1, label: 'Tile 1' },
	{ id: 2, label: 'Tile 2' },
	{ id: 3, label: 'Tile 3' },
	{ id: 4, label: 'Tile 4' },
]

export const STATE_CHOICES: DropdownChoice[] = [
	{ id: '', label: 'Toggle' },
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
]

export const LAYOUT_CHOICES: DropdownChoice[] = [
	{ id: '1', label: '1 tile' },
	{ id: '2', label: '2 tiles' },
	{ id: '3', label: '3 tiles' },
	{ id: '4', label: '4 tiles' },
]

export const PEAK_COLOR_CHOICES: DropdownChoice[] = [
	{ id: 'green', label: 'Green' },
	{ id: 'amber', label: 'Amber' },
	{ id: 'red', label: 'Red' },
	{ id: 'cyan', label: 'Cyan' },
	{ id: 'custom', label: 'Custom (uses stored colour)' },
]

export const PEAK_SENSITIVITY_CHOICES: DropdownChoice[] = [
	{ id: 'low', label: 'Low' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'high', label: 'High' },
]

export const SCOPE_LAYOUT_CHOICES: DropdownChoice[] = [
	{ id: 'bottom', label: 'Bottom' },
	{ id: 'side', label: 'Side' },
	{ id: 'quad', label: 'Quad' },
	{ id: 'full', label: 'Full' },
]

// The scopes QMonitor can draw, in the order its own picker lists them. Diamond
// is last because it is the specialist: it is the one that shows GAMUT — RGB
// values that fall outside the legal cube — which no waveform or vectorscope
// makes visible on its own.
export const SCOPE_TYPE_CHOICES: DropdownChoice[] = [
	{ id: 'waveform', label: 'Waveform' },
	{ id: 'parade', label: 'RGB Parade' },
	{ id: 'vectorscope', label: 'Vectorscope' },
	{ id: 'histogram', label: 'Histogram' },
	{ id: 'diamond', label: 'Diamond (gamut)' },
]

// How the scopes read the signal. `auto` follows the source's transfer metadata
// and falls back to SDR — which is the right default, and also the reason the
// other two exist: a source that declares nothing, or declares it wrongly, has
// to be forced or the graticule is drawn against the wrong reference.
export const SCOPE_DYNAMIC_RANGE_CHOICES: DropdownChoice[] = [
	{ id: 'auto', label: 'Auto (from the source metadata)' },
	{ id: 'sdr', label: 'SDR' },
	{ id: 'hdr', label: 'HDR' },
]

// Panels addressable by `tile.scopes.slot`. Bottom has 4 scope strips; Quad has
// 4 panels, one of which holds the image — picking Image for a panel swaps it
// with whichever panel currently holds it.
export const SCOPE_SLOT_LAYOUT_CHOICES: DropdownChoice[] = [
	{ id: 'bottom', label: 'Bottom' },
	{ id: 'quad', label: 'Quad' },
]

export const SCOPE_SLOT_CHOICES: DropdownChoice[] = [
	{ id: '1', label: 'Panel 1' },
	{ id: '2', label: 'Panel 2' },
	{ id: '3', label: 'Panel 3' },
	{ id: '4', label: 'Panel 4' },
]

export const SCOPE_SLOT_CONTENT_CHOICES: DropdownChoice[] = [
	{ id: 'image', label: 'Image (Quad only)' },
	{ id: 'waveform', label: 'Waveform' },
	{ id: 'parade', label: 'RGB Parade' },
	{ id: 'vectorscope', label: 'Vectorscope' },
	{ id: 'histogram', label: 'Histogram' },
	{ id: 'diamond', label: 'Diamond (gamut)' },
]

// A forced tally. `off` is a real value here — "keep this tile dark whatever the
// mixer says" — which is why releasing has its own action rather than being an
// `off` in this list.
export const TALLY_STATE_CHOICES: DropdownChoice[] = [
	{ id: 'program', label: 'Program (on air)' },
	{ id: 'preview', label: 'Preview' },
	{ id: 'off', label: 'Off' },
]

// Which switcher QMonitor RECEIVES tally from. It never sends commands back:
// the only outbound bytes are a vMix subscription and the ATEM acknowledgement,
// both of which mean "keep talking to me".
export const MIXER_KIND_CHOICES: DropdownChoice[] = [
	{ id: 'none', label: 'None' },
	{ id: 'vmix', label: 'vMix (TCP)' },
	{ id: 'atem', label: 'ATEM (UDP)' },
	{ id: 'tsl', label: 'TSL UMD (listens)' },
	{ id: 'obs', label: 'OBS (WebSocket — also works on Android)' },
]

export const TSL_FIELD_CHOICES: DropdownChoice[] = [
	{ id: 'right', label: 'Right tally' },
	{ id: 'left', label: 'Left tally' },
	{ id: 'text', label: 'Text tally' },
]

export const TALLY_DISPLAY_CHOICES: DropdownChoice[] = [
	{ id: 'border', label: 'Border' },
	{ id: 'badge', label: 'Badge' },
]

// Feedback matcher. `any` covers the common "is this tile lit at all" button.
export const TALLY_MATCH_CHOICES: DropdownChoice[] = [
	{ id: 'program', label: 'Program (on air)' },
	{ id: 'preview', label: 'Preview' },
	{ id: 'any', label: 'Program or preview' },
	{ id: 'off', label: 'Off' },
]

export const INFO_OPTION_CHOICES: DropdownChoice[] = [
	{ id: 'codec', label: 'Codec' },
	{ id: 'audio', label: 'Audio' },
	{ id: 'bitrate', label: 'Bitrate' },
	{ id: 'link', label: 'Link / transport' },
	{ id: 'frames', label: 'Frames' },
	{ id: 'realFps', label: 'Real FPS' },
	{ id: 'perf', label: 'Performance' },
]

export const QUALITY_CHOICES: DropdownChoice[] = [
	{ id: 'quality', label: 'Quality' },
	{ id: 'optimized', label: 'Optimized' },
]

export const LANGUAGE_CHOICES: DropdownChoice[] = [
	{ id: 'fr', label: 'Français' },
	{ id: 'en', label: 'English' },
]

export const SOURCE_KIND_CHOICES: DropdownChoice[] = [
	{ id: 'ndi', label: 'NDI' },
	{ id: 'omt', label: 'OMT' },
	{ id: 'srt', label: 'SRT' },
	{ id: 'rtsp', label: 'RTSP' },
	{ id: 'http', label: 'HTTP' },
	{ id: 'webrtc', label: 'WebRTC' },
	{ id: 'usb', label: 'USB / UVC' },
	{ id: 'decklink', label: 'DeckLink' },
	{ id: 'webpage', label: 'Web page' },
	{ id: 'none', label: 'No source' },
]

// Alarm conditions, in the order QMonitor's alarm centre lists them. The ids are
// the API's own type names, so a dropdown value goes straight onto the wire.
export const ALARM_TYPE_CHOICES: DropdownChoice[] = [
	{ id: 'any', label: 'Any alarm' },
	{ id: 'signal-loss', label: 'Signal loss' },
	{ id: 'freeze', label: 'Freeze' },
	{ id: 'black', label: 'Black picture' },
	{ id: 'frame-rate', label: 'Frame rate' },
	{ id: 'format-change', label: 'Format change' },
	{ id: 'bitrate-drop', label: 'Bitrate collapse' },
	{ id: 'silence', label: 'Silence' },
	{ id: 'clipping', label: 'Clipping' },
	{ id: 'dead-channel', label: 'Dead audio channel' },
]

/** Same list without 'any' — arming a condition needs a single, concrete one. */
export const ALARM_CONDITION_CHOICES: DropdownChoice[] = ALARM_TYPE_CHOICES.filter((choice) => choice.id !== 'any')

// How a frozen reference is held against the live picture. Side by side is
// offered here because the API accepts it everywhere; QMonitor itself says on
// the tile when a source cannot draw it (Android's native surfaces).
export const COMPARE_MODE_CHOICES: DropdownChoice[] = [
	{ id: 'wipe', label: 'Wipe' },
	{ id: 'blend', label: 'Blend' },
	{ id: 'difference', label: 'Difference' },
	{ id: 'side-by-side', label: 'Side by side' },
]

// Doses an operator actually reaches for. A LUT at anything but 100 is a
// diagnostic view ("how much of this is the conversion?"), not a grade — so the
// list is short and 100 is the default everywhere.
export const LUT_STRENGTH_CHOICES: DropdownChoice[] = [
	{ id: '100', label: '100 % (full)' },
	{ id: '75', label: '75 %' },
	{ id: '50', label: '50 %' },
	{ id: '25', label: '25 %' },
	{ id: '0', label: '0 % (no effect)' },
]

// How transparency is shown. `alpha` is first after off because it is the one
// that actually judges a key: holes and chewed edges are invisible when the
// matte is drawn on top of a busy picture.
export const ALPHA_MODE_CHOICES: DropdownChoice[] = [
	{ id: 'off', label: 'Off' },
	{ id: 'alpha', label: 'Alpha only (matte in greyscale)' },
	{ id: 'highlight', label: 'Highlight the transparent areas' },
	{ id: 'zebra', label: 'Zebras over the transparent areas' },
	{ id: 'matte', label: 'Composite over a flat colour' },
	{ id: 'checker', label: 'Composite over a checkerboard' },
]

// Black and white first, and by name: switching between the two is the classic
// check for a source that is premultiplied when it should be straight, and it
// deserves a button rather than a hex code.
export const ALPHA_COLOR_CHOICES: DropdownChoice[] = [
	{ id: 'black', label: 'Black (over black)' },
	{ id: 'white', label: 'White (over white)' },
	{ id: '#ff00ff', label: 'Magenta' },
	{ id: '#00ff00', label: 'Green' },
	{ id: '#0000ff', label: 'Blue' },
]

export const COMPARE_AXIS_CHOICES: DropdownChoice[] = [
	{ id: 'vertical', label: 'Vertical seam' },
	{ id: 'horizontal', label: 'Horizontal seam' },
]

export const JOURNAL_FORMAT_CHOICES: DropdownChoice[] = [
	{ id: 'txt', label: 'TXT (readable report)' },
	{ id: 'csv', label: 'CSV (spreadsheet)' },
]

/** Severity is a FLOOR here, matching the app: "warning" keeps criticals too. */
export const JOURNAL_SEVERITY_CHOICES: DropdownChoice[] = [
	{ id: '', label: 'Everything' },
	{ id: 'warning', label: 'Warning and above' },
	{ id: 'critical', label: 'Critical only' },
]

export const PRESET_SOURCE_CHOICES: DropdownChoice[] = [
	{ id: '', label: 'Restore sources too' },
	{ id: 'off', label: 'Presentation only (leave what is on air)' },
]
