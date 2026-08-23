import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import {
	formatDuration,
	formatResolution,
	getTile,
	isTileRecording,
	layoutTileCount,
	longestRecordingElapsedMs,
	recordingElapsedText,
	safeNumber,
	scopeDynamicRange,
	scopeLayout,
	scopeType,
	tileScopeSummary,
	countForcedTallies,
	isTallyForced,
	sourceKindLabel,
	tallyOrigin,
	tallyState,
	tileFollowsMixer,
	alarmSummary,
	alarmTypeLabel,
	latestAlarm,
	type QMonitorSnapshot,
} from './state.js'
import type { ModuleInstance } from './main.js'

const TILE_INDEXES = [1, 2, 3, 4]

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: CompanionVariableDefinition[] = [
		{ variableId: 'connection_status', name: 'Connection status' },
		{ variableId: 'server_url', name: 'Server URL' },
		{ variableId: 'app_version', name: 'QMonitor version' },
		{ variableId: 'app_platform', name: 'QMonitor platform (win32/darwin/android)' },
		{ variableId: 'api_version', name: 'QMonitor remote API version' },
		{ variableId: 'layout', name: 'Layout (tile count)' },
		{ variableId: 'active_tile', name: 'Active tile index' },
		{ variableId: 'fullscreen_tile', name: 'Solo fullscreen tile index (0 = none)' },
		{ variableId: 'window_fullscreen', name: 'Window fullscreen (true/false)' },
		{ variableId: 'global_audio_muted', name: 'Global audio muted (true/false)' },
		{ variableId: 'recording_quality', name: 'Recording quality mode' },
		{ variableId: 'language', name: 'UI language' },
		{ variableId: 'any_recording', name: 'Any tile recording (true/false)' },
		{ variableId: 'recording_count', name: 'Number of tiles recording' },
		{ variableId: 'recording_duration', name: 'Longest active recording duration (m:ss)' },
		{ variableId: 'tally_display', name: 'Tally display mode (border/badge)' },
		{ variableId: 'tally_forced_count', name: 'Number of tiles with a forced tally' },
		{ variableId: 'tally_program_tiles', name: 'Tiles on air (comma-separated)' },
		{ variableId: 'tally_mixer_kind', name: 'Mixer QMonitor receives tally from' },
		{ variableId: 'tally_mixer_status', name: 'Mixer link status' },
		{ variableId: 'tally_mixer_host', name: 'Mixer address' },
		{ variableId: 'tally_mixer_inputs', name: 'Mixer inputs seen' },
		{ variableId: 'alarm_count', name: 'Active alarms' },
		{ variableId: 'alarm_unacknowledged', name: 'Unacknowledged alarms' },
		{ variableId: 'alarm_latest', name: 'Latest alarm (tile · condition · detail)' },
		{ variableId: 'alarm_latest_tile', name: 'Latest alarm: tile index' },
		{ variableId: 'alarm_latest_label', name: 'Latest alarm: tile label' },
		{ variableId: 'alarm_latest_type', name: 'Latest alarm: condition' },
		{ variableId: 'alarm_latest_detail', name: 'Latest alarm: detail (channels, fps, format…)' },
		{ variableId: 'alarm_latest_acknowledged', name: 'Latest alarm acknowledged (true/false)' },
		{ variableId: 'alarm_tiles', name: 'Tiles in alarm (comma-separated)' },
		{ variableId: 'alarm_history_count', name: 'Journal entries' },
		{ variableId: 'journal_count', name: 'Session journal: entries' },
		{ variableId: 'journal_critical', name: 'Session journal: critical entries' },
		{ variableId: 'journal_warning', name: 'Session journal: warnings' },
		{ variableId: 'journal_dropped', name: 'Session journal: entries removed by retention' },
		{ variableId: 'preset_count', name: 'Configuration presets saved' },
		{ variableId: 'lut_count', name: 'LUTs in the library on that machine' },
		{ variableId: 'preset_names', name: 'Configuration preset names (comma-separated)' },
	]

	for (const index of TILE_INDEXES) {
		definitions.push(
			{ variableId: `tile_${index}_label`, name: `Tile ${index} — label` },
			{ variableId: `tile_${index}_source_kind`, name: `Tile ${index} — source kind (NDI, OMT, DeckLink…)` },
			{ variableId: `tile_${index}_source_name`, name: `Tile ${index} — source name` },
			{ variableId: `tile_${index}_has_source`, name: `Tile ${index} — has source` },
			{ variableId: `tile_${index}_active`, name: `Tile ${index} — is active` },
			{ variableId: `tile_${index}_vu`, name: `Tile ${index} — VU on` },
			{ variableId: `tile_${index}_peaking`, name: `Tile ${index} — peaking on` },
			{ variableId: `tile_${index}_peaking_color`, name: `Tile ${index} — peaking colour` },
			{ variableId: `tile_${index}_scopes`, name: `Tile ${index} — scopes on` },
			{ variableId: `tile_${index}_scope_layout`, name: `Tile ${index} — scopes layout (bottom/side/quad/full)` },
			{ variableId: `tile_${index}_scope_type`, name: `Tile ${index} — selected scope (Side / Full layouts)` },
			// What is DRAWN, which in Bottom and Quad is the four panels rather than
			// the selected scope. This is the one to put on a button face.
			{ variableId: `tile_${index}_scopes_on_screen`, name: `Tile ${index} — scopes on screen (panel order)` },
			{ variableId: `tile_${index}_scope_dynamic_range`, name: `Tile ${index} — scopes range setting (auto/sdr/hdr)` },
			{ variableId: `tile_${index}_labels`, name: `Tile ${index} — label on` },
			{ variableId: `tile_${index}_info`, name: `Tile ${index} — infos on` },
			{ variableId: `tile_${index}_recording`, name: `Tile ${index} — recording` },
			{ variableId: `tile_${index}_rec_status`, name: `Tile ${index} — recording status` },
			{ variableId: `tile_${index}_rec_duration`, name: `Tile ${index} — recording duration (m:ss)` },
			{ variableId: `tile_${index}_codec`, name: `Tile ${index} — codec` },
			{ variableId: `tile_${index}_resolution`, name: `Tile ${index} — resolution` },
			{ variableId: `tile_${index}_fps`, name: `Tile ${index} — nominal fps` },
			{ variableId: `tile_${index}_real_fps`, name: `Tile ${index} — measured fps` },
			{ variableId: `tile_${index}_bitrate_kbps`, name: `Tile ${index} — bitrate (kbps)` },
			{ variableId: `tile_${index}_audio_channels`, name: `Tile ${index} — audio channels` },
			{ variableId: `tile_${index}_audio_peak`, name: `Tile ${index} — audio peak (0-100)` },
			{ variableId: `tile_${index}_info_summary`, name: `Tile ${index} — Infos overlay text` },
			{ variableId: `tile_${index}_tally`, name: `Tile ${index} — tally state (program/preview/off)` },
			{ variableId: `tile_${index}_tally_origin`, name: `Tile ${index} — tally origin (mixer/forced/off)` },
			{ variableId: `tile_${index}_tally_forced`, name: `Tile ${index} — tally forced` },
			{ variableId: `tile_${index}_tally_input`, name: `Tile ${index} — mapped mixer input` },
			{ variableId: `tile_${index}_tally_follows`, name: `Tile ${index} — follows the mixer` },
			{ variableId: `tile_${index}_frozen`, name: `Tile ${index} — reference frozen` },
			{ variableId: `tile_${index}_comparing`, name: `Tile ${index} — comparison showing` },
			{ variableId: `tile_${index}_compare_mode`, name: `Tile ${index} — comparison mode` },
			{ variableId: `tile_${index}_compare_position`, name: `Tile ${index} — wipe position (%)` },
			{ variableId: `tile_${index}_lut`, name: `Tile ${index} — LUT name (empty when none)` },
			// `lut_applied` and `lut_enabled` differ when a LUT is switched on but
			// is not reaching the picture. Both are published so a button can say
			// which of the two it means.
			{ variableId: `tile_${index}_lut_applied`, name: `Tile ${index} — LUT actually applied` },
			{ variableId: `tile_${index}_lut_enabled`, name: `Tile ${index} — LUT switched on` },
			{ variableId: `tile_${index}_lut_strength`, name: `Tile ${index} — LUT strength (%)` },
			{ variableId: `tile_${index}_lut_size`, name: `Tile ${index} — LUT cube size (17, 33, 65…)` },
			{
				variableId: `tile_${index}_alpha_mode`,
				name: `Tile ${index} — alpha view (off, alpha, highlight, zebra, matte, checker)`,
			},
			// Measured from the frames, not read off the format: an RGBA feed with
			// a uniformly opaque alpha channel reports `none`, which is the answer
			// an operator needs before turning a mode on.
			{
				variableId: `tile_${index}_alpha_presence`,
				name: `Tile ${index} — alpha measured (unknown, none, partial, keyed)`,
			},
			{
				variableId: `tile_${index}_alpha_transparent`,
				name: `Tile ${index} — share of the picture that is transparent (%)`,
			},
			{ variableId: `tile_${index}_alpha_key_recording`, name: `Tile ${index} — the key is recorded as a second file` },
			// These four are written by buildVariableValues below. Without a
			// definition they never appear in Companion's variable picker, so an
			// operator can only use them by knowing the name and typing it blind.
			{ variableId: `tile_${index}_alarm_count`, name: `Tile ${index} — active alarms` },
			{ variableId: `tile_${index}_alarm`, name: `Tile ${index} — latest alarm condition` },
			{ variableId: `tile_${index}_alarm_detail`, name: `Tile ${index} — latest alarm detail (channels, fps…)` },
			{ variableId: `tile_${index}_alarm_armed`, name: `Tile ${index} — alarms armed` },
		)
	}

	self.setVariableDefinitions(definitions)
}

function boolText(value: boolean | undefined): string {
	return value === true ? 'true' : 'false'
}

export function buildVariableValues(self: ModuleInstance): CompanionVariableValues {
	const snapshot: QMonitorSnapshot | undefined = self.snapshot
	const values: CompanionVariableValues = {
		connection_status: self.isConnected ? 'ok' : (self.lastError ? 'connection_failure' : 'disconnected'),
		server_url: self.getBaseUrl(),
		app_version: snapshot?.version ?? '',
		app_platform: snapshot?.platform ?? '',
		api_version: safeNumber(snapshot?.apiVersion),
		layout: layoutTileCount(snapshot?.layout),
		active_tile: safeNumber(snapshot?.activeTileIndex),
		fullscreen_tile: safeNumber(snapshot?.fullscreenTileIndex),
		window_fullscreen: boolText(snapshot?.windowFullscreen),
		global_audio_muted: boolText(snapshot?.globalAudioMuted),
		recording_quality: snapshot?.recordingQualityMode ?? '',
		language: snapshot?.language ?? '',
		any_recording: boolText((snapshot?.tiles ?? []).some((tile) => isTileRecording(tile))),
		recording_count: (snapshot?.tiles ?? []).filter((tile) => isTileRecording(tile)).length,
		recording_duration: formatDuration(longestRecordingElapsedMs(snapshot)),
		tally_display: snapshot?.tallyDisplay ?? 'border',
		tally_forced_count: countForcedTallies(snapshot),
		tally_program_tiles: (snapshot?.tiles ?? [])
			.filter((tile) => tallyState(tile) === 'program')
			.map((tile) => tile.index)
			.join(', '),
		tally_mixer_kind: snapshot?.tallyMixer?.kind ?? 'none',
		tally_mixer_status: snapshot?.tallyMixer?.status ?? 'idle',
		tally_mixer_host: snapshot?.tallyMixer?.host ?? '',
		tally_mixer_inputs: safeNumber(snapshot?.tallyMixer?.inputCount),
		alarm_count: safeNumber(snapshot?.alarms?.activeCount),
		alarm_unacknowledged: safeNumber(snapshot?.alarms?.unacknowledgedCount),
		// The whole incident on one line, ready to drop on a button or into a
		// trigger's log message.
		alarm_latest: alarmSummary(latestAlarm(snapshot)),
		alarm_latest_tile: safeNumber(latestAlarm(snapshot)?.tile),
		alarm_latest_label: latestAlarm(snapshot)?.tileLabel ?? '',
		alarm_latest_type: alarmTypeLabel(latestAlarm(snapshot)?.type ?? ''),
		alarm_latest_detail: latestAlarm(snapshot)?.detailText ?? '',
		alarm_latest_acknowledged: boolText(latestAlarm(snapshot)?.acknowledged),
		alarm_tiles: (snapshot?.alarms?.active ?? [])
			.map((alarm) => alarm.tile)
			.filter((tile, position, all) => tile != null && all.indexOf(tile) === position)
			.join(', '),
		alarm_history_count: safeNumber(snapshot?.alarms?.historyCount),
		journal_count: safeNumber(snapshot?.journal?.count),
		journal_critical: safeNumber(snapshot?.journal?.critical),
		journal_warning: safeNumber(snapshot?.journal?.warning),
		journal_dropped: safeNumber(snapshot?.journal?.dropped),
		preset_count: (snapshot?.presets ?? []).length,
		lut_count: (snapshot?.luts ?? []).length,
		preset_names: (snapshot?.presets ?? []).map((preset) => preset.name ?? '').filter(Boolean).join(', '),
	}

	for (const index of TILE_INDEXES) {
		const tile = getTile(snapshot, index)
		const stats = tile?.stats
		values[`tile_${index}_label`] = tile?.label ?? ''
		// Display casing, not the protocol id: this variable exists to be put on
		// a button face. Feedbacks match on the snapshot, never on this.
		values[`tile_${index}_source_kind`] = sourceKindLabel(tile?.sourceKind)
		values[`tile_${index}_source_name`] = tile?.sourceName ?? ''
		values[`tile_${index}_has_source`] = boolText(tile?.hasSource)
		values[`tile_${index}_active`] = boolText(tile?.isActive)
		values[`tile_${index}_vu`] = boolText(tile?.vu)
		values[`tile_${index}_peaking`] = boolText(tile?.peaking)
		values[`tile_${index}_peaking_color`] = tile?.peakingColor ?? ''
		values[`tile_${index}_scopes`] = boolText(tile?.scopes)
		values[`tile_${index}_scope_layout`] = scopeLayout(tile)
		values[`tile_${index}_scope_type`] = scopeType(tile)
		values[`tile_${index}_scopes_on_screen`] = tileScopeSummary(tile)
		values[`tile_${index}_scope_dynamic_range`] = scopeDynamicRange(tile)
		values[`tile_${index}_labels`] = boolText(tile?.labels)
		values[`tile_${index}_info`] = boolText(tile?.info)
		values[`tile_${index}_recording`] = boolText(isTileRecording(tile))
		values[`tile_${index}_rec_status`] = tile?.recording?.status ?? 'idle'
		values[`tile_${index}_rec_duration`] = recordingElapsedText(tile)
		values[`tile_${index}_codec`] = stats?.codec ?? ''
		values[`tile_${index}_resolution`] = formatResolution(tile)
		values[`tile_${index}_fps`] = safeNumber(stats?.fps)
		values[`tile_${index}_real_fps`] = Math.round(safeNumber(stats?.realFps) * 100) / 100
		values[`tile_${index}_bitrate_kbps`] = safeNumber(stats?.bitrateKbps)
		values[`tile_${index}_audio_channels`] = safeNumber(stats?.audioChannels)
		values[`tile_${index}_audio_peak`] = safeNumber(stats?.audioPeak)
		values[`tile_${index}_info_summary`] = Array.isArray(stats?.infoLines) ? stats.infoLines.join(' · ') : ''
		values[`tile_${index}_tally`] = tallyState(tile)
		values[`tile_${index}_tally_origin`] = tallyOrigin(tile)
		values[`tile_${index}_tally_forced`] = boolText(isTallyForced(tile))
		values[`tile_${index}_tally_input`] = tile?.tally?.mixerInput ?? ''
		values[`tile_${index}_tally_follows`] = boolText(tileFollowsMixer(tile))
		values[`tile_${index}_frozen`] = boolText(tile?.compare?.frozen)
		values[`tile_${index}_comparing`] = boolText(tile?.compare?.showing)
		values[`tile_${index}_compare_mode`] = tile?.compare?.mode ?? ''
		values[`tile_${index}_compare_position`] = Math.round(safeNumber(tile?.compare?.position))
		values[`tile_${index}_lut`] = tile?.lut?.name ?? ''
		values[`tile_${index}_lut_applied`] = boolText(tile?.lut?.applied)
		values[`tile_${index}_lut_enabled`] = boolText(tile?.lut?.enabled)
		values[`tile_${index}_lut_strength`] = Math.round(safeNumber(tile?.lut?.strength, 100))
		values[`tile_${index}_lut_size`] = safeNumber(tile?.lut?.size)
		values[`tile_${index}_alpha_mode`] = tile?.alpha?.mode ?? 'off'
		values[`tile_${index}_alpha_presence`] = tile?.alpha?.presence ?? 'unknown'
		values[`tile_${index}_alpha_transparent`] = safeNumber(tile?.alpha?.transparentPercent)
		values[`tile_${index}_alpha_key_recording`] = boolText(tile?.alpha?.recordKey)
		values[`tile_${index}_alarm_count`] = safeNumber(tile?.alarms?.activeCount)
		values[`tile_${index}_alarm`] = alarmTypeLabel(tile?.alarms?.latest?.type ?? '')
		values[`tile_${index}_alarm_detail`] = tile?.alarms?.latest?.detailText ?? ''
		values[`tile_${index}_alarm_armed`] = boolText(tile?.alarms?.enabled !== false)
	}

	return values
}
