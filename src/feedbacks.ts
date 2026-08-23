import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import {
	ALARM_TYPE_CHOICES,
	ALPHA_MODE_CHOICES,
	COMPARE_MODE_CHOICES,
	INFO_OPTION_CHOICES,
	LANGUAGE_CHOICES,
	LAYOUT_CHOICES,
	QUALITY_CHOICES,
	SCOPE_DYNAMIC_RANGE_CHOICES,
	SCOPE_LAYOUT_CHOICES,
	SCOPE_TYPE_CHOICES,
	SOURCE_KIND_CHOICES,
	TALLY_DISPLAY_CHOICES,
	TALLY_MATCH_CHOICES,
	TALLY_STATE_CHOICES,
	TILE_FEEDBACK_CHOICES,
	TILE_INDEX_CHOICES,
} from './choices.js'
import { drawVuMeterPng } from './png.js'
import {
	dbToRatio,
	getContrastingTextColor,
	getResolvedTile,
	getTile,
	isTileRecording,
	layoutTileCount,
	normalizeHexColor,
	resolveTileIndex,
	safeNumber,
	scopeDynamicRange,
	scopeLayout,
	scopeType,
	tileShowsScope,
	anyTallyStale,
	countForcedTallies,
	isMixerConfigured,
	isMixerLinkUp,
	isTallyForced,
	tileFollowsMixer,
	tallyButtonColor,
	tallyMatches,
	tallyOrigin,
	tallyState,
	alarmButtonText,
	alarmCount,
	alarmTypeLabel,
	isAlarmConditionArmed,
	latestAlarm,
	shortTileLabel,
	tileAlarmsArmed,
	tileHasAlarm,
	tileHasUnacknowledgedAlarm,
	unacknowledgedAlarmCount,
	journalButtonText,
	journalCount,
	findConfigPreset,
	presetButtonText,
	journalCriticalCount,
	type TileSnapshot,
} from './state.js'
import type { ModuleInstance } from './main.js'

// The alarm palette. Two reds, not one: the dim red is the "off" half of the
// blink, and a blink to black would read as a button that has gone out rather
// than one that is calling for attention.
const ALARM_RED = combineRgb(220, 38, 38)
const ALARM_RED_DIM = combineRgb(80, 12, 12)
const ALARM_AMBER = combineRgb(217, 119, 6)

const PEAK_COLOR_HEX: Record<string, string> = {
	green: '#63ff79',
	amber: '#ffd452',
	red: '#ff6157',
	cyan: '#55d9ff',
}

function tileFeedbackOption(label = 'Tile') {
	return { id: 'tile', type: 'dropdown' as const, label, default: 0, choices: TILE_FEEDBACK_CHOICES }
}

function tileConcreteOption(label = 'Tile') {
	return { id: 'tile', type: 'dropdown' as const, label, default: 1, choices: TILE_INDEX_CHOICES }
}

function hexToRgb(hex: string): [number, number, number] | null {
	const normalized = normalizeHexColor(hex)
	if (!normalized) return null
	return [
		Number.parseInt(normalized.slice(1, 3), 16),
		Number.parseInt(normalized.slice(3, 5), 16),
		Number.parseInt(normalized.slice(5, 7), 16),
	]
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const tileBoolean = (
		name: string,
		read: (tile: TileSnapshot | undefined) => boolean,
		bgcolor: number,
		color = combineRgb(0, 0, 0),
	) => ({
		name,
		type: 'boolean' as const,
		defaultStyle: { bgcolor, color },
		options: [tileFeedbackOption()],
		callback: (feedback: { options: Record<string, unknown> }): boolean =>
			read(getResolvedTile(self.snapshot, feedback.options.tile)),
	})

	const feedbacks: CompanionFeedbackDefinitions = {
		connected: {
			name: 'Connection is OK',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => self.isConnected,
		},

		// ---- Global state ----
		layout_matches: {
			name: 'Layout matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [{ id: 'value', type: 'dropdown', label: 'Layout', default: '2', choices: LAYOUT_CHOICES }],
			callback: (feedback) => String(layoutTileCount(self.snapshot?.layout)) === String(feedback.options.value),
		},
		window_fullscreen: {
			name: 'Window is fullscreen',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.snapshot?.windowFullscreen === true,
		},
		global_audio_muted: {
			name: 'Global audio is muted',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(220, 38, 38), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => self.snapshot?.globalAudioMuted === true,
		},
		recording_quality: {
			name: 'Recording quality mode matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			options: [{ id: 'value', type: 'dropdown', label: 'Quality', default: 'quality', choices: QUALITY_CHOICES }],
			callback: (feedback) => String(self.snapshot?.recordingQualityMode ?? '') === String(feedback.options.value),
		},
		language_matches: {
			name: 'UI language matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [{ id: 'value', type: 'dropdown', label: 'Language', default: 'en', choices: LANGUAGE_CHOICES }],
			callback: (feedback) => String(self.snapshot?.language ?? '') === String(feedback.options.value),
		},

		// ---- Per-tile state ----
		tile_active: {
			name: 'Tile is the active tile',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(250, 204, 21), color: combineRgb(0, 0, 0) },
			options: [tileConcreteOption()],
			callback: (feedback) => getTile(self.snapshot, Number(feedback.options.tile))?.isActive === true,
		},
		tile_fullscreen: {
			name: 'Tile is solo fullscreen',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [tileFeedbackOption()],
			callback: (feedback) => getResolvedTile(self.snapshot, feedback.options.tile)?.isFullscreen === true,
		},
		tile_has_source: tileBoolean('Tile has a source', (tile) => tile?.hasSource === true, combineRgb(34, 197, 94)),
		tile_source_kind: {
			name: 'Tile source kind matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(16, 185, 129), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'kind', type: 'dropdown', label: 'Source kind', default: 'ndi', choices: SOURCE_KIND_CHOICES },
			],
			callback: (feedback) =>
				String(getResolvedTile(self.snapshot, feedback.options.tile)?.sourceKind ?? 'none') ===
				String(feedback.options.kind),
		},
		tile_vu: tileBoolean('Tile: VU meters on', (tile) => tile?.vu === true, combineRgb(34, 197, 94)),
		tile_peaking: tileBoolean('Tile: Focus peaking on', (tile) => tile?.peaking === true, combineRgb(34, 197, 94)),
		tile_scopes: tileBoolean('Tile: Scopes on', (tile) => tile?.scopes === true, combineRgb(34, 197, 94)),
		// The feedback a scope key should actually use.
		//
		// "Which scope is up" and "which scope is selected" are different questions:
		// the Bottom and Quad layouts draw four panels from the slots and ignore the
		// selected scope entirely. A key bound to Diamond that only read `scopeType`
		// would sit dark on a tile that is showing a Diamond in panel 3.
		tile_scope_visible: {
			name: 'Tile: a given scope is on screen',
			description:
				'Layout-aware: matches the selected scope in Side and Full, and any of the four panels in Bottom and Quad. Off entirely when the scopes are off.',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Scope', default: 'waveform', choices: SCOPE_TYPE_CHOICES },
			],
			callback: (feedback) =>
				tileShowsScope(getResolvedTile(self.snapshot, feedback.options.tile), String(feedback.options.value ?? '')),
		},
		// The narrower one: what the single-scope layouts are set to, whether or not
		// that layout is the one in use. Wired to the "Scope type" action, which sets
		// exactly this value.
		tile_scope_type: {
			name: 'Tile: selected scope matches (Side / Full layouts)',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Scope', default: 'waveform', choices: SCOPE_TYPE_CHOICES },
			],
			callback: (feedback) =>
				scopeType(getResolvedTile(self.snapshot, feedback.options.tile)) === String(feedback.options.value),
		},
		tile_scope_layout: {
			name: 'Tile: scopes layout matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Layout', default: 'bottom', choices: SCOPE_LAYOUT_CHOICES },
			],
			callback: (feedback) =>
				scopeLayout(getResolvedTile(self.snapshot, feedback.options.tile)) === String(feedback.options.value),
		},
		// Matches the SETTING, not a measurement — see scopeDynamicRange() in
		// state.ts for why a resolved value is not offered here.
		tile_scope_dynamic_range: {
			name: 'Tile: scopes dynamic range matches',
			description:
				'Matches the setting (auto / SDR / HDR), not what Auto resolved to — QMonitor does not publish that.',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(217, 119, 6), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Range', default: 'auto', choices: SCOPE_DYNAMIC_RANGE_CHOICES },
			],
			callback: (feedback) =>
				scopeDynamicRange(getResolvedTile(self.snapshot, feedback.options.tile)) === String(feedback.options.value),
		},
		tile_labels: tileBoolean('Tile: Label on', (tile) => tile?.labels === true, combineRgb(34, 197, 94)),
		tile_info: tileBoolean('Tile: Infos overlay on', (tile) => tile?.info === true, combineRgb(34, 197, 94)),
		tile_info_option: {
			name: 'Tile: Infos line on',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'option', type: 'dropdown', label: 'Line', default: 'codec', choices: INFO_OPTION_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				return tile?.info === true && tile.infoOptions?.[String(feedback.options.option)] === true
			},
		},
		tile_assist_monochrome: tileBoolean(
			'Tile: Black & white on',
			(tile) => tile?.assist?.monochrome === true,
			combineRgb(148, 163, 184),
		),
		tile_assist_false_color: tileBoolean(
			'Tile: False colours on',
			(tile) => tile?.assist?.falseColor === true,
			combineRgb(234, 179, 8),
		),
		tile_assist_zebras: tileBoolean(
			'Tile: Zebras on',
			(tile) => tile?.assist?.zebras === true,
			combineRgb(234, 179, 8),
		),
		tile_assist_markers: tileBoolean(
			'Tile: Markers on',
			(tile) => tile?.assist?.markers === true,
			combineRgb(59, 130, 246),
		),
		tile_assist_reticle: tileBoolean(
			'Tile: Reticle on',
			(tile) => tile?.assist?.reticle === true,
			combineRgb(59, 130, 246),
		),

		// ---- Freeze & compare ----
		// Cyan, not green: a frozen picture is not a healthy state to leave a wall
		// in, and it must never read like "everything is fine".
		tile_frozen: tileBoolean(
			'Tile: Reference frozen',
			(tile) => tile?.compare?.frozen === true,
			combineRgb(6, 182, 212),
			combineRgb(0, 0, 0),
		),
		tile_comparing: tileBoolean(
			'Tile: Comparison showing',
			(tile) => tile?.compare?.showing === true,
			combineRgb(6, 182, 212),
			combineRgb(0, 0, 0),
		),
		tile_compare_mode: {
			name: 'Tile: Comparison in a given mode',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(6, 182, 212), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Mode', default: 'wipe', choices: COMPARE_MODE_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				return tile?.compare?.showing === true && String(tile.compare?.mode ?? '') === String(feedback.options.value)
			},
		},
		// A comparison left running on a wall is the one state that can be mistaken
		// for a live picture, so it gets movement rather than a colour: the eye
		// catches a change where it stops noticing a tint.
		tile_comparing_pulse: {
			name: 'Tile comparing — pulsing (animated)',
			type: 'advanced',
			options: [tileFeedbackOption()],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				if (tile?.compare?.showing !== true) return {}
				const brightness = 0.45 + 0.55 * self.pulsePhase
				return {
					bgcolor: combineRgb(Math.round(6 * brightness), Math.round(182 * brightness), Math.round(212 * brightness)),
					color: combineRgb(255, 255, 255),
					text: '❄ FROZEN',
				}
			},
		},

		// ---- 3D LUT ----
		// `applied` rather than `enabled`: the point of a feedback here is to show
		// what the picture actually carries. A tile whose LUT is switched on but
		// not reaching the picture must NOT light up green — that is precisely the
		// case the operator cannot see for themselves.
		tile_lut_applied: tileBoolean(
			'Tile: LUT applied',
			(tile) => tile?.lut?.applied === true,
			combineRgb(139, 92, 246),
			combineRgb(255, 255, 255),
		),
		tile_lut_loaded: tileBoolean(
			'Tile: has a LUT loaded (applied or bypassed)',
			(tile) => Boolean(tile?.lut?.id),
			combineRgb(76, 29, 149),
			combineRgb(255, 255, 255),
		),
		// The warning that matters. A LUT the operator believes is on, and is not:
		// the library does not have the file, or the machine ran out of GPU
		// contexts. Amber, because it is not a fault in the signal.
		tile_lut_failing: tileBoolean(
			'Tile: LUT switched on but NOT reaching the picture',
			(tile) => tile?.lut?.enabled === true && tile?.lut?.applied !== true,
			combineRgb(245, 158, 11),
			combineRgb(0, 0, 0),
		),
		tile_lut_named: {
			name: 'Tile: a given LUT is applied',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(139, 92, 246), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'textinput', label: 'LUT name', default: '', useVariables: true },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				if (tile?.lut?.applied !== true) return false
				const wanted = String(feedback.options.value ?? '')
					.trim()
					.toLowerCase()
				return wanted !== '' && String(tile.lut?.name ?? '').toLowerCase() === wanted
			},
		},

		// ---- Alpha ----
		tile_alpha_applied: tileBoolean(
			'Tile: an alpha view is on',
			(tile) => tile?.alpha?.applied === true,
			combineRgb(14, 165, 233),
			combineRgb(255, 255, 255),
		),
		// The one worth a button of its own. "This feed is genuinely keyed" is
		// measured from the frames, not read off the format — every NDI sender
		// produces RGBA and almost none of them are keyed, so a feedback based on
		// the format would light up across the whole rack and mean nothing.
		tile_alpha_keyed: tileBoolean(
			'Tile: the source is genuinely keyed (measured)',
			(tile) => tile?.alpha?.presence === 'keyed' || tile?.alpha?.presence === 'partial',
			combineRgb(6, 182, 212),
			combineRgb(0, 0, 0),
		),
		// A mode selected on a source that cannot carry alpha. Amber rather than
		// red: nothing is broken, the operator is just looking at a control that
		// has nothing to act on.
		tile_alpha_incapable: tileBoolean(
			'Tile: alpha view on, but this source carries no alpha',
			(tile) => tile?.alpha?.mode !== undefined && tile?.alpha?.mode !== 'off' && tile?.alpha?.capable !== true,
			combineRgb(245, 158, 11),
			combineRgb(0, 0, 0),
		),
		tile_alpha_key_recording: tileBoolean(
			'Tile: the key will be recorded as a second file',
			(tile) => tile?.alpha?.recordKey === true,
			combineRgb(190, 24, 93),
			combineRgb(255, 255, 255),
		),
		tile_alpha_mode_is: {
			name: 'Tile: a given alpha mode is selected',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(14, 165, 233), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'Mode', default: 'checker', choices: ALPHA_MODE_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				return String(tile?.alpha?.mode ?? 'off') === String(feedback.options.value ?? '')
			},
		},

		// ---- Recording ----
		tile_recording: tileBoolean(
			'Tile is recording',
			(tile) => isTileRecording(tile),
			combineRgb(220, 38, 38),
			combineRgb(255, 255, 255),
		),
		any_recording: {
			name: 'Any tile is recording',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(220, 38, 38), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => (self.snapshot?.tiles ?? []).some((tile) => isTileRecording(tile)),
		},
		tile_recording_pulse: {
			name: 'Tile recording — pulsing (animated)',
			type: 'advanced',
			options: [tileFeedbackOption()],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				if (!isTileRecording(tile)) return {}
				const brightness = 0.4 + 0.6 * self.pulsePhase
				return {
					bgcolor: combineRgb(Math.round(230 * brightness), Math.round(30 * brightness), Math.round(30 * brightness)),
					color: combineRgb(255, 255, 255),
					text: '● REC',
				}
			},
		},
		any_recording_pulse: {
			name: 'Any recording — pulsing (animated)',
			type: 'advanced',
			options: [],
			callback: () => {
				if (!(self.snapshot?.tiles ?? []).some((tile) => isTileRecording(tile))) return {}
				const brightness = 0.4 + 0.6 * self.pulsePhase
				return {
					bgcolor: combineRgb(Math.round(230 * brightness), Math.round(30 * brightness), Math.round(30 * brightness)),
					color: combineRgb(255, 255, 255),
				}
			},
		},

		// ---- Animated: live vertical VU meter drawn on the button ----
		// Every source kind now publishes levels: the native ones from their PCM
		// pipe, the rest from QMonitor's WebAudio analyser. The meter reads the
		// same `audioLevelsDb` either way and does not need to know which.
		tile_vu_meter: {
			name: 'Tile VU meter — live vertical bars',
			type: 'advanced',
			options: [tileFeedbackOption()],
			callback: (feedback) => {
				const index = resolveTileIndex(self.snapshot, feedback.options.tile)
				const tile = getTile(self.snapshot, index)
				if (!tile?.hasSource) {
					return { text: 'no\nsource', bgcolor: combineRgb(20, 26, 38), color: combineRgb(110, 130, 150) }
				}
				const levels = self.getAnimatedVuChannels(index)
				const peaksDb = tile.stats?.audioPeakLevelsDb ?? []
				// Follow the count of channels QMonitor actually displays for this
				// tile (honours the forced channel-layout setting), padding with
				// silent columns / truncating the measured levels as needed.
				const columnCount = Math.max(1, safeNumber(tile.stats?.vuChannelCount, levels.length || 2))
				const channels = Array.from({ length: columnCount }, (_unused, channelIndex) => ({
					level: safeNumber(levels[channelIndex]),
					peak: Number.isFinite(peaksDb[channelIndex]) ? dbToRatio(peaksDb[channelIndex]) * 100 : undefined,
				}))
				return {
					png64: drawVuMeterPng({
						channels,
						yellowRatio: dbToRatio(safeNumber(tile.vuYellowDb, -8)),
						redRatio: dbToRatio(safeNumber(tile.vuRedDb, -3)),
					}),
				}
			},
		},

		// ---- Peaking colour swatch ----
		tile_peaking_color: {
			name: 'Tile peaking colour (shows the colour)',
			type: 'advanced',
			options: [tileFeedbackOption()],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				if (!tile?.peaking) return {}
				const hex =
					tile.peakingColor === 'custom'
						? (tile.peakingCustomColor ?? '')
						: (PEAK_COLOR_HEX[String(tile.peakingColor)] ?? '')
				const rgb = hexToRgb(hex)
				if (!rgb) return {}
				const bg = combineRgb(rgb[0], rgb[1], rgb[2])
				return { bgcolor: bg, color: getContrastingTextColor(bg) }
			},
		},

		// ---- Tally ----
		//
		// Two questions an operator asks, and they are not the same one: "is this
		// tile on air?" and "why is it on air?". A tile forced red three hours ago
		// looks identical to one the mixer just lit, so `origin` gets its own
		// feedback rather than being folded into the state.
		tile_tally: {
			name: 'Tally: Tile state matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(239, 68, 68), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{ id: 'match', type: 'dropdown', label: 'State', default: 'program', choices: TALLY_MATCH_CHOICES },
			],
			callback: (feedback) =>
				tallyMatches(getResolvedTile(self.snapshot, feedback.options.tile), feedback.options.match),
		},
		// Uses the colours QMonitor is actually drawing, so the button matches the
		// wall even after the operator recolours the tally.
		tile_tally_color: {
			name: 'Tally: Tile lit — uses QMonitor colours',
			type: 'advanced',
			options: [tileFeedbackOption()],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				const state = tallyState(tile)
				if (state !== 'program' && state !== 'preview') return {}
				const bg = tallyButtonColor(self.snapshot, state)
				return { bgcolor: bg, color: getContrastingTextColor(bg) }
			},
		},
		tile_tally_forced: {
			name: 'Tally: Tile state is forced',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(217, 119, 6), color: combineRgb(0, 0, 0) },
			options: [tileFeedbackOption()],
			callback: (feedback) => isTallyForced(getResolvedTile(self.snapshot, feedback.options.tile)),
		},
		// The toggle action's companion: lit only while THIS button holds the tile,
		// so pressing it again is visibly the way to hand it back to the mixer.
		tile_tally_forced_state: {
			name: 'Tally: Tile forced to a given state',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(217, 119, 6), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'value', type: 'dropdown', label: 'State', default: 'program', choices: TALLY_STATE_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				return isTallyForced(tile) && tallyState(tile) === String(feedback.options.value)
			},
		},
		tile_tally_origin: {
			name: 'Tally: Tile state origin matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{
					id: 'origin',
					type: 'dropdown',
					label: 'Origin',
					default: 'mixer',
					choices: [
						{ id: 'mixer', label: 'Mixer' },
						{ id: 'forced', label: 'Forced (API / Companion)' },
						{ id: 'off', label: 'None' },
					],
				},
			],
			callback: (feedback) =>
				tallyOrigin(getResolvedTile(self.snapshot, feedback.options.tile)) === String(feedback.options.origin),
		},
		// A mixer that stopped talking must not leave a tile pretending to be on
		// air. QMonitor expires the state; this surfaces the fact it happened.
		tile_tally_stale: {
			name: 'Tally: Tile mixer state is stale',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(120, 53, 15), color: combineRgb(255, 255, 255) },
			options: [tileFeedbackOption()],
			callback: (feedback) => getResolvedTile(self.snapshot, feedback.options.tile)?.tally?.stale === true,
		},
		any_tally_forced: {
			name: 'Tally: Any tile is forced',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(217, 119, 6), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => countForcedTallies(self.snapshot) > 0,
		},
		any_tally_stale: {
			name: 'Tally: Any mixer state is stale',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(120, 53, 15), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => anyTallyStale(self.snapshot),
		},
		tile_tally_follows: {
			name: 'Tally: Tile follows the mixer',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [tileFeedbackOption()],
			callback: (feedback) => tileFollowsMixer(getResolvedTile(self.snapshot, feedback.options.tile)),
		},
		// The button that saves a night: a dark tally wall is either "nothing is
		// on air" or "the link died", and only this tells them apart.
		mixer_link_up: {
			name: 'Tally: Mixer link is up',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [],
			callback: () => isMixerLinkUp(self.snapshot),
		},
		mixer_link_down: {
			name: 'Tally: Mixer configured but link is down',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(220, 38, 38), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => isMixerConfigured(self.snapshot) && !isMixerLinkUp(self.snapshot),
		},
		tally_display: {
			name: 'Tally: Display mode matches',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [{ id: 'value', type: 'dropdown', label: 'Display', default: 'border', choices: TALLY_DISPLAY_CHOICES }],
			callback: (feedback) => String(self.snapshot?.tallyDisplay ?? 'border') === String(feedback.options.value),
		},

		// ---- Alarms ----
		//
		// Two colours and one rule: RED while nobody has acknowledged it (and it
		// blinks — see ALARM_BLINK_MS in main.ts), AMBER once somebody has. The
		// distinction matters more than it looks: an acknowledged alarm is still a
		// live fault, and a surface that stops showing it entirely would let a bad
		// camera run all night.
		alarm_active: {
			name: 'Alarm: Any alarm active',
			description: 'Blinks red while an alarm is unacknowledged, then holds amber.',
			type: 'advanced',
			options: [],
			callback: () => {
				const unacknowledged = unacknowledgedAlarmCount(self.snapshot)
				if (unacknowledged > 0) {
					return self.alarmBlinkOn
						? { bgcolor: ALARM_RED, color: combineRgb(255, 255, 255) }
						: { bgcolor: ALARM_RED_DIM, color: combineRgb(255, 255, 255) }
				}
				if (alarmCount(self.snapshot) > 0) {
					return { bgcolor: ALARM_AMBER, color: combineRgb(0, 0, 0) }
				}
				return {}
			},
		},
		// The one-button answer to "what just went wrong?". No tile to configure:
		// it follows whatever fired last, which is what an operator reacts to.
		alarm_latest: {
			name: 'Alarm: Latest incident (text + colour)',
			description:
				'Shows the most recent alarm — tile, condition and detail — blinking red until acknowledged. Pair with the "Acknowledge" action for a press-to-clear button.',
			type: 'advanced',
			options: [
				{
					id: 'showDetail',
					type: 'checkbox',
					label: 'Include the detail line (channels, fps, format…)',
					default: true,
				},
			],
			callback: (feedback) => {
				const alarm = latestAlarm(self.snapshot)
				if (!alarm) {
					return { text: 'NO\nALARM', bgcolor: combineRgb(0, 0, 0), color: combineRgb(90, 90, 90) }
				}
				const text =
					feedback.options.showDetail === false
						? `${shortTileLabel(alarm.tileLabel) || `T${alarm.tile ?? '?'}`}\n${alarmTypeLabel(alarm.type)}`
						: alarmButtonText(alarm)
				if (alarm.acknowledged === true) {
					return { text, bgcolor: ALARM_AMBER, color: combineRgb(0, 0, 0) }
				}
				return {
					text,
					bgcolor: self.alarmBlinkOn ? ALARM_RED : ALARM_RED_DIM,
					color: combineRgb(255, 255, 255),
				}
			},
		},
		tile_alarm: {
			name: 'Alarm: Tile has an alarm',
			type: 'advanced',
			options: [
				tileFeedbackOption(),
				{ id: 'type', type: 'dropdown', label: 'Condition', default: 'any', choices: ALARM_TYPE_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				if (!tileHasAlarm(tile, feedback.options.type)) return {}
				// The blink follows the TILE's acknowledgement, not the global one:
				// a button watching camera 2 must keep flashing while camera 2 is
				// unattended, even if somebody just cleared camera 3.
				if (!tileHasUnacknowledgedAlarm(tile)) {
					return { bgcolor: ALARM_AMBER, color: combineRgb(0, 0, 0) }
				}
				return {
					bgcolor: self.alarmBlinkOn ? ALARM_RED : ALARM_RED_DIM,
					color: combineRgb(255, 255, 255),
				}
			},
		},
		tile_alarm_button: {
			name: 'Alarm: Tile alarm (text + colour)',
			description: 'A per-camera alarm key: shows the condition and detail when that tile faults.',
			type: 'advanced',
			options: [tileConcreteOption()],
			callback: (feedback) => {
				const tile = getTile(self.snapshot, Number(feedback.options.tile))
				const alarm = tile?.alarms?.latest
				const name = shortTileLabel(tile?.label || tile?.sourceName) || `Tile ${feedback.options.tile}`
				if (!alarm) {
					// Deliberately NOT blank: a dark key is indistinguishable from an
					// unconfigured one, and "OK" is the state an operator wants to see
					// at a glance on a wall of cameras.
					return { text: `${name}\nOK`, color: combineRgb(120, 120, 120) }
				}
				const text = `${name}\n${alarmTypeLabel(alarm.type)}${alarm.detailText ? `\n${alarm.detailText}` : ''}`
				if (!tileHasUnacknowledgedAlarm(tile)) {
					return { text, bgcolor: ALARM_AMBER, color: combineRgb(0, 0, 0) }
				}
				return { text, bgcolor: self.alarmBlinkOn ? ALARM_RED : ALARM_RED_DIM, color: combineRgb(255, 255, 255) }
			},
		},
		alarm_armed: {
			name: 'Alarm: Tile is armed',
			description: 'Lit while the tile is watching. Also matches a single condition.',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(21, 128, 61), color: combineRgb(255, 255, 255) },
			options: [
				tileFeedbackOption(),
				{ id: 'type', type: 'dropdown', label: 'Condition', default: 'any', choices: ALARM_TYPE_CHOICES },
			],
			callback: (feedback) => {
				const tile = getResolvedTile(self.snapshot, feedback.options.tile)
				// A condition armed on a tile whose master switch is off is not armed.
				return tileAlarmsArmed(tile) && isAlarmConditionArmed(tile, feedback.options.type)
			},
		},
		alarm_sound_enabled: {
			name: 'Alarm: Audible alert is on',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(59, 130, 246), color: combineRgb(255, 255, 255) },
			options: [tileFeedbackOption()],
			callback: (feedback) => getResolvedTile(self.snapshot, feedback.options.tile)?.alarms?.soundEnabled === true,
		},

		// ---- Session journal ----
		journal_state: {
			name: 'Journal: Entry count (text + colour)',
			description: 'Shows how many entries the session journal holds, and how many of them are critical.',
			type: 'advanced',
			options: [],
			callback: () => {
				const count = journalCount(self.snapshot)
				if (count === 0) return { text: journalButtonText(self.snapshot), color: combineRgb(110, 110, 110) }
				// Amber, never red: a full journal is a record, not a fault. Red
				// here would compete with the alarm keys for an operator's eye.
				return {
					text: journalButtonText(self.snapshot),
					bgcolor: journalCriticalCount(self.snapshot) > 0 ? combineRgb(120, 53, 15) : combineRgb(30, 41, 59),
					color: combineRgb(255, 255, 255),
				}
			},
		},
		journal_has_entries: {
			name: 'Journal: Has entries',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(30, 41, 59), color: combineRgb(255, 255, 255) },
			options: [],
			callback: () => journalCount(self.snapshot) > 0,
		},

		// ---- Configuration presets ----
		preset_button: {
			name: 'Preset: Name and contents',
			description:
				'Shows the preset a key is bound to, and whether it carries sources. Dim when no preset by that name exists.',
			type: 'advanced',
			options: [{ id: 'value', type: 'textinput', label: 'Preset name', default: '' }],
			callback: (feedback) => {
				const wanted = String(feedback.options.value ?? '')
				const preset = findConfigPreset(self.snapshot, wanted)
				if (!preset) {
					// Never silently blank: a key bound to a preset that has been
					// renamed or deleted must look wrong, not look empty.
					return { text: presetButtonText(undefined, wanted || 'PRESET'), color: combineRgb(120, 120, 120) }
				}
				return {
					text: presetButtonText(preset, wanted),
					bgcolor: combineRgb(30, 41, 59),
					color: combineRgb(255, 255, 255),
				}
			},
		},
		preset_exists: {
			name: 'Preset: Exists',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(30, 41, 59), color: combineRgb(255, 255, 255) },
			options: [{ id: 'value', type: 'textinput', label: 'Preset name', default: '' }],
			callback: (feedback) => Boolean(findConfigPreset(self.snapshot, feedback.options.value)),
		},

		// ---- Audio present (level threshold) ----
		tile_audio_active: {
			name: 'Tile audio level above threshold',
			type: 'boolean',
			defaultStyle: { bgcolor: combineRgb(34, 197, 94), color: combineRgb(0, 0, 0) },
			options: [
				tileFeedbackOption(),
				{ id: 'threshold', type: 'number', label: 'Level threshold (0-100)', default: 5, min: 0, max: 100 },
			],
			callback: (feedback) =>
				safeNumber(getResolvedTile(self.snapshot, feedback.options.tile)?.stats?.audioPeak) >=
				Number(feedback.options.threshold),
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
