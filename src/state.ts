import { combineRgb } from '@companion-module/base'

// ---- Snapshot shape (mirrors RemoteControlBridge.buildSnapshot in QMonitor) ----

export interface TileStats {
	sourceName?: string
	codec?: string
	width?: number
	height?: number
	fps?: number
	realFps?: number
	bitrateKbps?: number
	audioCodec?: string
	audioChannels?: number
	audioSampleRate?: number
	audioTracks?: number
	audioLevelsDb?: number[]
	audioPeakLevelsDb?: number[]
	audioPeak?: number
	vuChannelCount?: number
	framesReceived?: number
	framesRendered?: number
	infoLines?: string[]
}

export interface TileAssistState {
	monochrome?: boolean
	falseColor?: boolean
	zebras?: boolean
	markers?: boolean
	markerCount?: number
	reticle?: boolean
}

// Freeze & compare. `frozen` and `showing` are separate because they are
// separate intentions: a reference can be held while the comparison is hidden,
// and a button that conflated the two could not offer "put the live picture
// back but keep what I froze".
export interface TileCompareState {
	frozen?: boolean
	showing?: boolean
	mode?: string
	axis?: string
	position?: number
	blend?: number
	gain?: number
	swap?: boolean
	frozenAt?: number
	width?: number
	height?: number
}

// 3D LUT. `enabled` and `applied` are separate for the same reason `frozen` and
// `showing` are: a LUT can be switched on and still not reach the picture — the
// page ran out of GPU contexts, or this machine's library does not have the
// file. An operator cannot see that difference in the picture, so a surface
// must be able to show it.
export interface TileLutState {
	name?: string
	id?: string
	enabled?: boolean
	applied?: boolean
	strength?: number
	size?: number
	available?: boolean
	status?: string
}

export interface TileAlphaState {
	mode?: string
	/** Selected AND on a source that can carry alpha. Not the same as `mode`. */
	applied?: boolean
	capable?: boolean
	color?: string
	opacity?: number
	checkerSize?: number
	recordKey?: boolean
	/** Measured from the frames: unknown | none | partial | keyed. */
	presence?: string
	transparentPercent?: number
}

export interface LutSummary {
	index?: number
	id?: string
	name?: string
	title?: string
	size?: number
	addedAt?: number
}

// The scope panels a tile draws, per layout. Only the layout in use is on
// screen: `bottom` and `quad` render these four slots, while `side` and `full`
// render the single `scopeType` instead. A surface that ignored that difference
// would light a Diamond button on a tile whose Diamond is in a hidden layout.
export interface TileScopeSlots {
	bottom?: string[]
	quad?: string[]
}

// How the scopes are reading the signal. `dynamicRange` is the SETTING; note
// that `resolvedDynamicRange` in the snapshot only reflects an explicit hdr/sdr
// choice — when the setting is `auto`, what the detection actually resolved to
// is computed at render time and is not published, so this module deliberately
// does not surface it as a value an operator could mistake for a measurement.
export interface TileScopeSettings {
	unit?: string
	range?: string
	dynamicRange?: string
	resolvedDynamicRange?: string
	resolvedHdrTransfer?: string
	colorSpace?: string
	vectorTargets?: string
	skinTone?: boolean
	traceThickness?: string
	gain?: number
	center?: number
}

export interface TileRecordingState {
	requested?: boolean
	status?: string
	profile?: string
	elapsedMs?: number
}

// Mirrors tallyToRemoteState() in QMonitor's src/tally.js. `origin` is the field
// that makes this trustworthy: a tile stuck on red for an hour is either on air
// or forgotten, and only the origin tells them apart.
export interface TileTallyState {
	state?: string
	origin?: string
	stale?: boolean
	forced?: boolean
	mixerInput?: string
	// Whether the tile follows the mixer. Gates the mixer only — a forced state
	// from the API still applies, so a Companion button is never a silent no-op.
	enabled?: boolean
	updatedAt?: number
}

// QMonitor's connector to a switcher. Read-only by design: QMonitor receives
// tally, it never sends commands to the mixer. `status` is what turns a dark
// tally wall from a mystery into a diagnosis.
export interface TallyMixerState {
	kind?: string
	host?: string
	port?: number
	tslField?: string
	supported?: boolean
	status?: string
	error?: string
	inputCount?: number
}

export interface TallyStyleState {
	programColor?: string
	previewColor?: string
	opacity?: number
	thickness?: number
	/** Lamp width as a % of the tile, badge mode. Sent by the appearance action. */
	lampSize?: number
}

// One live incident. `detailText` is pre-rendered by QMonitor in the app's
// current language: "Channels 2, 4", "42 of 50 fps". Re-implementing those nine
// formatters here would be a second source of truth, and the one that drifts.
export interface AlarmEntry {
	id?: string
	incidentId?: string
	tile?: number
	tileLabel?: string
	type?: string
	label?: string
	detail?: Record<string, unknown>
	detailText?: string
	sourceKind?: string
	sourceName?: string
	startedAt?: number
	elapsedMs?: number
	acknowledged?: boolean
}

export interface TileAlarmState {
	enabled?: boolean
	soundEnabled?: boolean
	activeCount?: number
	unacknowledgedCount?: number
	types?: string[]
	latest?: AlarmEntry | null
	armed?: Record<string, boolean>
}

// Counts only. QMonitor deliberately does not publish the journal entries: an
// eight-hour session would bloat a snapshot Companion polls several times a
// second, and the API is unauthenticated. `journal.export` writes the file on
// the host and returns its path.
export interface JournalState {
	count?: number
	dropped?: number
	info?: number
	warning?: number
	critical?: number
	lastAt?: number
}

export interface PresetSummary {
	index?: number
	id?: string
	name?: string
	savedAt?: number
	layout?: string
	hasSources?: boolean
	sourceCount?: number
}

export interface AlarmsState {
	activeCount?: number
	unacknowledgedCount?: number
	latest?: AlarmEntry | null
	active?: AlarmEntry[]
	historyCount?: number
}

export interface TileSnapshot {
	index: number
	id: string
	visible?: boolean
	isActive?: boolean
	isFullscreen?: boolean
	label?: string
	sourceKind?: string
	sourceName?: string
	hasSource?: boolean
	vu?: boolean
	vuYellowDb?: number
	vuRedDb?: number
	peaking?: boolean
	peakingColor?: string
	peakingSensitivity?: string
	peakingCustomColor?: string
	scopes?: boolean
	scopeLayout?: string
	scopeType?: string
	scopeSlots?: TileScopeSlots
	scopeSettings?: TileScopeSettings
	labels?: boolean
	info?: boolean
	infoOptions?: Record<string, boolean>
	assist?: TileAssistState
	compare?: TileCompareState
	lut?: TileLutState
	alpha?: TileAlphaState
	audioMonitor?: { left?: number; right?: number }
	recording?: TileRecordingState
	tally?: TileTallyState
	alarms?: TileAlarmState
	stats?: TileStats
}

export interface QMonitorSnapshot {
	app?: string
	version?: string
	apiVersion?: number
	platform?: string
	updatedAt?: number
	layout?: string
	tileCount?: number
	activeTileIndex?: number
	fullscreenTileIndex?: number
	windowFullscreen?: boolean
	globalAudioMuted?: boolean
	recordingQualityMode?: string
	language?: string
	tallyDisplay?: string
	tallyStyle?: TallyStyleState
	tallyMixer?: TallyMixerState
	alarms?: AlarmsState
	journal?: JournalState
	presets?: PresetSummary[]
	luts?: LutSummary[]
	tiles?: TileSnapshot[]
}

export const RECORDING_STATUSES_ACTIVE = new Set(['recording', 'starting', 'requested'])

export function safeNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Companion hands option values back as `unknown`. They are primitives in
 * practice, but `String()` on an `unknown` turns an object into
 * `[object Object]` — which would then be compared against a real value and
 * silently never match. Narrowing first and falling back is the honest answer.
 */
export function optionString(value: unknown, fallback = ''): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	return fallback
}

export function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function getTile(snapshot: QMonitorSnapshot | undefined, index: number): TileSnapshot | undefined {
	return snapshot?.tiles?.find((tile) => tile.index === index)
}

// The snapshot reports `layout` as an id ('one'|'two'|'three'|'four') — this is
// the ACTIVE layout (tiles shown), unlike `tileCount` which is the total tiles.
const LAYOUT_TILE_COUNT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 }
export function layoutTileCount(layout: string | undefined): number {
	const key = String(layout ?? '').toLowerCase()
	return LAYOUT_TILE_COUNT[key] ?? safeNumber(key, 0)
}

// Feedback/preset tile option: 0 (or empty) means "the active tile".
export function resolveTileIndex(snapshot: QMonitorSnapshot | undefined, option: unknown): number {
	const value = Number(option)
	if (!Number.isFinite(value) || value <= 0) return safeNumber(snapshot?.activeTileIndex, 1)
	return value
}

export function getResolvedTile(snapshot: QMonitorSnapshot | undefined, option: unknown): TileSnapshot | undefined {
	return getTile(snapshot, resolveTileIndex(snapshot, option))
}

// dBFS (floor -60) → 0-1 meter ratio.
export function dbToRatio(db: number): number {
	return clampNumber((db + 60) / 60, 0, 1)
}

export function isTileRecording(tile: TileSnapshot | undefined): boolean {
	if (!tile?.recording) return false
	if (tile.recording.requested === true) return true
	return RECORDING_STATUSES_ACTIVE.has(String(tile.recording.status ?? '').toLowerCase())
}

export function anyTileRecording(snapshot: QMonitorSnapshot | undefined): boolean {
	return (snapshot?.tiles ?? []).some((tile) => isTileRecording(tile))
}

export function countRecordingTiles(snapshot: QMonitorSnapshot | undefined): number {
	return (snapshot?.tiles ?? []).filter((tile) => isTileRecording(tile)).length
}

// mm:ss, or h:mm:ss past an hour, from a millisecond duration.
export function formatDuration(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(safeNumber(ms) / 1000))
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const pad = (value: number): string => String(value).padStart(2, '0')
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

export function recordingElapsedText(tile: TileSnapshot | undefined): string {
	if (!isTileRecording(tile)) return ''
	return formatDuration(safeNumber(tile?.recording?.elapsedMs))
}

export function longestRecordingElapsedMs(snapshot: QMonitorSnapshot | undefined): number {
	let max = 0
	for (const tile of snapshot?.tiles ?? []) {
		if (isTileRecording(tile)) max = Math.max(max, safeNumber(tile.recording?.elapsedMs))
	}
	return max
}

// ---- VU meter helpers ----

// A green → amber → red colour for a 0-100 level, brightened with the level so
// the button visibly "lights up" as audio rises.
export function vuColor(level: number): number {
	const clamped = clampNumber(level, 0, 100)
	const intensity = 0.35 + 0.65 * (clamped / 100)
	let red: number
	let green: number
	const blue = 0
	if (clamped < 60) {
		red = Math.round(40 * intensity)
		green = Math.round(220 * intensity)
	} else if (clamped < 85) {
		red = Math.round(230 * intensity)
		green = Math.round(200 * intensity)
	} else {
		red = Math.round(240 * intensity)
		green = Math.round(50 * intensity)
	}
	return combineRgb(red, green, blue)
}

const BAR_BLOCKS = ['░', '░', '▒', '▒', '▓', '▓', '█', '█', '█', '█']

// A 10-cell horizontal bar string for a 0-100 level.
export function vuBar(level: number): string {
	const filled = Math.round(clampNumber(level, 0, 100) / 10)
	let bar = ''
	for (let i = 0; i < 10; i += 1) bar += i < filled ? '█' : BAR_BLOCKS[i]
	return bar
}

export function peakDbLabel(tile: TileSnapshot | undefined): string {
	const levels = tile?.stats?.audioLevelsDb
	if (!Array.isArray(levels) || levels.length === 0) return ''
	const peak = Math.max(...levels.filter((value) => Number.isFinite(value)))
	if (!Number.isFinite(peak)) return ''
	return `${peak <= -60 ? '-∞' : Math.round(peak)} dB`
}

export function formatResolution(tile: TileSnapshot | undefined): string {
	const width = safeNumber(tile?.stats?.width)
	const height = safeNumber(tile?.stats?.height)
	if (width <= 0 || height <= 0) return ''
	return `${width}×${height}`
}

export function normalizeHexColor(color: string | undefined | null): string {
	if (typeof color !== 'string') return ''
	const match = /^#?([0-9a-fA-F]{6})$/.exec(color.trim())
	return match ? `#${match[1].toLowerCase()}` : ''
}

// ---- Scope helpers ----
//
// The one thing a scope surface has to get right: which scope is ON SCREEN is
// not the same question as which scope is SELECTED. `bottom` and `quad` draw
// four panels from `scopeSlots` and ignore `scopeType` entirely; `side` and
// `full` draw `scopeType` and ignore the slots. A button that only read
// `scopeType` would sit dark on a tile showing four scopes, one of which is the
// very one it is bound to.

/** How a scope id reads on a button face. */
const SCOPE_TYPE_LABELS: Record<string, string> = {
	waveform: 'WAVEFORM',
	parade: 'PARADE',
	vectorscope: 'VECTOR',
	histogram: 'HISTO',
	diamond: 'DIAMOND',
	image: 'IMAGE',
}

export function scopeTypeLabel(type: string | undefined): string {
	const key = String(type ?? '').toLowerCase()
	return SCOPE_TYPE_LABELS[key] ?? key.toUpperCase()
}

export function scopeLayout(tile: TileSnapshot | undefined): string {
	return String(tile?.scopeLayout ?? 'bottom').toLowerCase()
}

export function scopeType(tile: TileSnapshot | undefined): string {
	return String(tile?.scopeType ?? 'waveform').toLowerCase()
}

/** The layouts that draw four panels from `scopeSlots` instead of `scopeType`. */
const MULTI_PANEL_LAYOUTS = new Set(['bottom', 'quad'])

export function isMultiPanelScopeLayout(tile: TileSnapshot | undefined): boolean {
	return MULTI_PANEL_LAYOUTS.has(scopeLayout(tile))
}

/** The panels the tile's CURRENT layout draws, lowercased. Empty in side/full. */
export function scopeSlotsInUse(tile: TileSnapshot | undefined): string[] {
	const layout = scopeLayout(tile)
	if (!MULTI_PANEL_LAYOUTS.has(layout)) return []
	const slots = layout === 'quad' ? tile?.scopeSlots?.quad : tile?.scopeSlots?.bottom
	return (slots ?? []).map((slot) => String(slot).toLowerCase())
}

/**
 * Is this scope actually being drawn on the tile right now?
 *
 * Layout-aware, and gated on the scopes being switched on at all — this is what
 * a "Diamond is up" key should light from, not the selected-scope value.
 */
export function tileShowsScope(tile: TileSnapshot | undefined, type: string | undefined): boolean {
	if (tile?.scopes !== true) return false
	const wanted = (type ?? '').toLowerCase()
	if (!wanted) return false
	if (isMultiPanelScopeLayout(tile)) return scopeSlotsInUse(tile).includes(wanted)
	return scopeType(tile) === wanted
}

/** The scopes on screen, in panel order — "WAVEFORM · PARADE · DIAMOND". */
export function tileScopeSummary(tile: TileSnapshot | undefined): string {
	if (tile?.scopes !== true) return ''
	if (!isMultiPanelScopeLayout(tile)) return scopeTypeLabel(scopeType(tile))
	return scopeSlotsInUse(tile)
		.filter((slot) => slot !== 'image')
		.map((slot) => scopeTypeLabel(slot))
		.join(' · ')
}

/**
 * The dynamic-range SETTING (auto | sdr | hdr).
 *
 * Deliberately not the resolved value: when the setting is `auto`, QMonitor
 * resolves it from the source's transfer metadata at render time and does not
 * publish the result, so anything this module reported as "resolved" would read
 * SDR on an HDR source. Better a surface that shows the honest setting than one
 * that shows a measurement it does not have.
 */
export function scopeDynamicRange(tile: TileSnapshot | undefined): string {
	return String(tile?.scopeSettings?.dynamicRange ?? 'auto').toLowerCase()
}

// ---- Tally helpers ----

export function tallyState(tile: TileSnapshot | undefined): string {
	return String(tile?.tally?.state ?? 'off').toLowerCase()
}

export function tallyOrigin(tile: TileSnapshot | undefined): string {
	return String(tile?.tally?.origin ?? 'off').toLowerCase()
}

export function isTallyForced(tile: TileSnapshot | undefined): boolean {
	return tile?.tally?.forced === true
}

/** `match` accepts the extra 'any' value, which no single tally state carries. */
export function tallyMatches(tile: TileSnapshot | undefined, match: unknown): boolean {
	const state = tallyState(tile)
	const wanted = optionString(match, 'program').toLowerCase()
	if (wanted === 'any') return state === 'program' || state === 'preview'
	return state === wanted
}

export function countForcedTallies(snapshot: QMonitorSnapshot | undefined): number {
	return (snapshot?.tiles ?? []).filter((tile) => isTallyForced(tile)).length
}

export function anyTallyStale(snapshot: QMonitorSnapshot | undefined): boolean {
	return (snapshot?.tiles ?? []).some((tile) => tile.tally?.stale === true)
}

// The colours QMonitor is actually drawing, so a Companion button matches the
// wall instead of guessing red/green. Falls back to the broadcast convention.
// How a source kind should READ on a button. The snapshot uses lowercase ids
// because they are protocol values; a button face is not the place for them.
// DeckLink and WebRTC keep their real casing — shouting DECKLINK is not the
// same thing as writing it properly.
const SOURCE_KIND_LABELS: Record<string, string> = {
	ndi: 'NDI',
	omt: 'OMT',
	srt: 'SRT',
	rtsp: 'RTSP',
	http: 'HTTP',
	webrtc: 'WebRTC',
	usb: 'USB',
	decklink: 'DeckLink',
	webpage: 'Web',
	none: '—',
}

export function sourceKindLabel(kind: string | undefined): string {
	const key = String(kind ?? 'none').toLowerCase()
	return SOURCE_KIND_LABELS[key] ?? key.toUpperCase()
}

export function tileFollowsMixer(tile: TileSnapshot | undefined): boolean {
	return tile?.tally?.enabled !== false
}

/** 'connected' and 'listening' both mean the link is up; TSL only ever listens. */
export function isMixerLinkUp(snapshot: QMonitorSnapshot | undefined): boolean {
	const status = String(snapshot?.tallyMixer?.status ?? 'idle').toLowerCase()
	return status === 'connected' || status === 'listening'
}

export function isMixerConfigured(snapshot: QMonitorSnapshot | undefined): boolean {
	const kind = String(snapshot?.tallyMixer?.kind ?? 'none').toLowerCase()
	return kind !== '' && kind !== 'none'
}

export function tallyButtonColor(snapshot: QMonitorSnapshot | undefined, state: string): number {
	const style = snapshot?.tallyStyle
	const hex =
		state === 'program'
			? normalizeHexColor(style?.programColor) || '#ef4444'
			: normalizeHexColor(style?.previewColor) || '#22c55e'
	const value = Number.parseInt(hex.slice(1), 16)
	return Number.isFinite(value) ? value : combineRgb(239, 68, 68)
}

export function getContrastingTextColor(bgcolor: number): number {
	const red = (bgcolor >> 16) & 0xff
	const green = (bgcolor >> 8) & 0xff
	const blue = bgcolor & 0xff
	const luminance = red * 0.299 + green * 0.587 + blue * 0.114
	return luminance >= 150 ? combineRgb(0, 0, 0) : combineRgb(255, 255, 255)
}

// ---- Alarm helpers ----
//
// An alarm surface has one job that a tally surface does not: it must be
// impossible to ignore, and equally impossible to leave ringing. So the state
// below distinguishes UNACKNOWLEDGED (blinking, demands a decision) from
// ACKNOWLEDGED (still faulty, but somebody has seen it) — the same distinction
// QMonitor's own alarm centre makes.

/** How a type reads on a button face. The API ids are kebab-case protocol values. */
const ALARM_TYPE_LABELS: Record<string, string> = {
	'signal-loss': 'SIGNAL',
	freeze: 'FREEZE',
	black: 'BLACK',
	'frame-rate': 'FPS',
	'format-change': 'FORMAT',
	'bitrate-drop': 'BITRATE',
	silence: 'SILENCE',
	clipping: 'CLIP',
	'dead-channel': 'CHANNEL',
}

export function alarmTypeLabel(type: string | undefined): string {
	const key = String(type ?? '').toLowerCase()
	return ALARM_TYPE_LABELS[key] ?? key.replace(/-/g, ' ').toUpperCase()
}

export function activeAlarms(snapshot: QMonitorSnapshot | undefined): AlarmEntry[] {
	return snapshot?.alarms?.active ?? []
}

export function latestAlarm(snapshot: QMonitorSnapshot | undefined): AlarmEntry | undefined {
	return snapshot?.alarms?.latest ?? undefined
}

export function alarmCount(snapshot: QMonitorSnapshot | undefined): number {
	return safeNumber(snapshot?.alarms?.activeCount, 0)
}

export function unacknowledgedAlarmCount(snapshot: QMonitorSnapshot | undefined): number {
	return safeNumber(snapshot?.alarms?.unacknowledgedCount, 0)
}

/**
 * The alarms on one tile, optionally narrowed to a type.
 *
 * 'any' is the extra value the dropdowns carry, which no single alarm has: a
 * button watching one camera usually wants "anything wrong", not one condition.
 */
export function tileAlarms(tile: TileSnapshot | undefined, type: unknown = 'any'): string[] {
	const types = tile?.alarms?.types ?? []
	const wanted = optionString(type, 'any').toLowerCase()
	if (wanted === 'any' || wanted === '') return types
	return types.filter((entry) => String(entry).toLowerCase() === wanted)
}

export function tileHasAlarm(tile: TileSnapshot | undefined, type: unknown = 'any'): boolean {
	return tileAlarms(tile, type).length > 0
}

export function tileAlarmsArmed(tile: TileSnapshot | undefined): boolean {
	return tile?.alarms?.enabled !== false
}

export function isAlarmConditionArmed(tile: TileSnapshot | undefined, type: unknown): boolean {
	const key = optionString(type).toLowerCase()
	if (key === '' || key === 'any') return tileAlarmsArmed(tile)
	return Boolean(tile?.alarms?.armed?.[key])
}

/**
 * Is anything on this tile still waiting for somebody to look at it?
 *
 * This — not "is there an alarm" — is what drives the blink: a fault an operator
 * has already acknowledged should stay visible without continuing to shout.
 */
export function tileHasUnacknowledgedAlarm(tile: TileSnapshot | undefined): boolean {
	return safeNumber(tile?.alarms?.unacknowledgedCount, 0) > 0
}

/**
 * A tile label that fits a 72x72 key.
 *
 * Source names arrive long and parenthesised — "QUINTUS-SURFACE (vMix - Output
 * 1)" is 33 characters, which wraps to three lines and pushes the condition and
 * its detail off the button entirely. The parenthetical is the first thing to
 * go: it names the sender's output, which the operator already knows, while the
 * condition is the part they do not.
 */
export function shortTileLabel(label: string | undefined, max = 14): string {
	const raw = String(label ?? '').trim()
	const trimmed = raw.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || raw
	if (trimmed.length <= max) return trimmed
	// Cut on a word boundary rather than mid-word: "QUINTUS-SURFACE" becomes
	// "QUINTUS", which an operator recognises, and not "QUINTUS-SURFA…", which
	// only looks broken.
	const boundary = trimmed.slice(0, max + 1).search(/[\s\-_/|·]+[^\s\-_/|·]*$/)
	if (boundary >= 4) return trimmed.slice(0, boundary)
	return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

/** "Cam 2 · Dead channel · Channels 2, 4" — everything needed to act, on one line. */
export function alarmSummary(alarm: AlarmEntry | undefined): string {
	if (!alarm) return ''
	const parts = [alarm.tileLabel || (alarm.tile ? `Tile ${alarm.tile}` : ''), alarm.label || alarmTypeLabel(alarm.type)]
	if (alarm.detailText) parts.push(alarm.detailText)
	return parts.filter(Boolean).join(' \u00b7 ')
}

/** Button text for the latest incident: short enough for a 72x72 key. */
export function alarmButtonText(alarm: AlarmEntry | undefined): string {
	if (!alarm) return 'NO\nALARM'
	const lines = [shortTileLabel(alarm.tileLabel) || `T${alarm.tile ?? '?'}`, alarmTypeLabel(alarm.type)]
	if (alarm.detailText) lines.push(alarm.detailText)
	return lines.join('\n')
}

// ---- Session journal ----

export function journalCount(snapshot: QMonitorSnapshot | undefined): number {
	return safeNumber(snapshot?.journal?.count, 0)
}

export function journalCriticalCount(snapshot: QMonitorSnapshot | undefined): number {
	return safeNumber(snapshot?.journal?.critical, 0)
}

/** "128 entries" / "128 (3 crit)" — short enough for a key, honest about severity. */
export function journalButtonText(snapshot: QMonitorSnapshot | undefined): string {
	const count = journalCount(snapshot)
	const critical = journalCriticalCount(snapshot)
	if (count === 0) return 'JOURNAL\nEMPTY'
	return `JOURNAL\n${count}${critical > 0 ? ` / ${critical}!` : ''}`
}

// ---- Configuration presets ----

export function configPresets(snapshot: QMonitorSnapshot | undefined): PresetSummary[] {
	return snapshot?.presets ?? []
}

/**
 * Match the preset a button is bound to.
 *
 * Bound BY NAME, not by id: an operator sets up "Plateau A" on a key, and that
 * key must keep working after the preset is re-saved on another machine, where
 * the generated id will differ.
 */
export function findConfigPreset(
	snapshot: QMonitorSnapshot | undefined,
	reference: unknown,
): PresetSummary | undefined {
	const key = optionString(reference).trim().toLowerCase()
	if (!key) return undefined
	return configPresets(snapshot).find(
		(preset) => String(preset.name ?? '').toLowerCase() === key || String(preset.id ?? '') === String(reference),
	)
}

export function presetButtonText(preset: PresetSummary | undefined, fallback: string): string {
	if (!preset) return fallback
	const name = shortTileLabel(preset.name, 12)
	const detail = preset.hasSources === false ? 'PRES' : `${safeNumber(preset.sourceCount)} SRC`
	return `${name}\n${detail}`
}
