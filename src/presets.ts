import {
	combineRgb,
	type CompanionButtonPresetDefinition,
	type CompanionOptionValues,
	type CompanionPresetDefinitions,
} from '@companion-module/base'
import type { ModuleInstance } from './main.js'

const MODULE_ID = 'videopathe-qmonitor'
const BLACK = combineRgb(0, 0, 0)
const WHITE = combineRgb(255, 255, 255)
const PANEL = combineRgb(24, 32, 46)

export function UpdatePresets(self: ModuleInstance): void {
	void self
	const presets: CompanionPresetDefinitions = {}
	const variable = (name: string): string => `$(${MODULE_ID}:${name})`

	const disconnected = {
		feedbackId: 'connected',
		options: {},
		isInverted: true,
		style: { bgcolor: combineRgb(80, 20, 20), color: WHITE },
	}

	// Feedbacks declared `type: 'advanced'` in feedbacks.ts. They compute their own
	// colours and text, so a preset must NOT hand them a `style` override: a
	// preset feedback carrying `style` is treated as the boolean kind, and the
	// advanced result is then discarded — the button silently keeps its static
	// face and looks like the feedback was never wired at all. That is exactly how
	// the alarm buttons shipped broken, so the helper below now strips it rather
	// than trusting every call site to remember.
	const ADVANCED_FEEDBACKS = new Set([
		'tile_vu_meter',
		'tile_recording_pulse',
		'any_recording_pulse',
		'tile_peaking_color',
		'tile_tally_color',
		'alarm_active',
		'alarm_latest',
		'journal_state',
		'preset_button',
		'tile_alarm',
		'tile_alarm_button',
		'tile_comparing_pulse',
	])

	function button(
		id: string,
		category: string,
		name: string,
		style: CompanionButtonPresetDefinition['style'],
		actions: { actionId: string; options?: CompanionOptionValues }[],
		feedbacks: CompanionButtonPresetDefinition['feedbacks'] = [],
	): void {
		presets[id] = {
			type: 'button',
			category,
			name,
			style: { show_topbar: false, ...style },
			steps: actions.length ? [{ down: actions.map((a) => ({ actionId: a.actionId, options: a.options ?? {} })), up: [] }] : [{ down: [], up: [] }],
			feedbacks: [
				disconnected,
				...feedbacks.map((entry) =>
					ADVANCED_FEEDBACKS.has(entry.feedbackId)
						? { feedbackId: entry.feedbackId, options: entry.options }
						: entry,
				),
			],
		}
	}

	// ---- Views ----
	for (const count of [1, 2, 3, 4]) {
		button(
			`layout_${count}`,
			'Views',
			`Layout ${count}`,
			{ text: `${count} TILE${count > 1 ? 'S' : ''}`, size: '18', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'layout_set', options: { value: String(count) } }],
			[{ feedbackId: 'layout_matches', options: { value: String(count) }, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
		)
	}
	for (const index of [1, 2, 3, 4]) {
		button(
			`active_${index}`,
			'Views',
			`Select tile ${index}`,
			{ text: `TILE ${index}\n${variable(`tile_${index}_source_kind`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'active_set', options: { value: String(index) } }],
			[{ feedbackId: 'tile_active', options: { tile: index }, style: { bgcolor: combineRgb(250, 204, 21), color: BLACK } }],
		)
	}
	button('active_prev', 'Views', 'Previous tile', { text: '◀ PREV', size: '18', color: WHITE, bgcolor: PANEL }, [{ actionId: 'active_previous' }])
	button('active_next', 'Views', 'Next tile', { text: 'NEXT ▶', size: '18', color: WHITE, bgcolor: PANEL }, [{ actionId: 'active_next' }])
	button(
		'window_fullscreen',
		'Views',
		'Window fullscreen',
		{ text: 'FULL\nSCREEN', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'window_fullscreen', options: { state: '' } }],
		[{ feedbackId: 'window_fullscreen', options: {}, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
	)

	// ---- Active-tile features (toggle, lights up when on) ----
	const featurePresets: { id: string; label: string; actionId: string; feedbackId: string }[] = [
		{ id: 'vu', label: 'VU', actionId: 'tile_vu', feedbackId: 'tile_vu' },
		{ id: 'peaking', label: 'PEAK', actionId: 'tile_peaking', feedbackId: 'tile_peaking' },
		{ id: 'scopes', label: 'SCOPES', actionId: 'tile_scopes', feedbackId: 'tile_scopes' },
		{ id: 'labels', label: 'LABEL', actionId: 'tile_labels', feedbackId: 'tile_labels' },
		{ id: 'info', label: 'INFOS', actionId: 'tile_info', feedbackId: 'tile_info' },
	]
	for (const feature of featurePresets) {
		button(
			`active_${feature.id}`,
			'Active tile features',
			`Active: ${feature.label}`,
			{ text: feature.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: feature.actionId, options: { tile: '', state: '' } }],
			[{ feedbackId: feature.feedbackId, options: { tile: 0 }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// ---- Assist (active tile) ----
	const assistPresets: { id: string; label: string; actionId: string; feedbackId: string; bg: number }[] = [
		{ id: 'monochrome', label: 'B&W', actionId: 'tile_assist_monochrome', feedbackId: 'tile_assist_monochrome', bg: combineRgb(148, 163, 184) },
		{ id: 'false_color', label: 'FALSE\nCOLOR', actionId: 'tile_assist_false_color', feedbackId: 'tile_assist_false_color', bg: combineRgb(234, 179, 8) },
		{ id: 'zebras', label: 'ZEBRAS', actionId: 'tile_assist_zebras', feedbackId: 'tile_assist_zebras', bg: combineRgb(234, 179, 8) },
		{ id: 'markers', label: 'MARKERS', actionId: 'tile_assist_markers', feedbackId: 'tile_assist_markers', bg: combineRgb(59, 130, 246) },
		{ id: 'reticle', label: 'RETICLE', actionId: 'tile_assist_reticle', feedbackId: 'tile_assist_reticle', bg: combineRgb(59, 130, 246) },
	]
	for (const assist of assistPresets) {
		button(
			`active_assist_${assist.id}`,
			'Active tile assist',
			`Active: ${assist.label.replace('\n', ' ')}`,
			{ text: assist.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: assist.actionId, options: { tile: '', state: '' } }],
			[{ feedbackId: assist.feedbackId, options: { tile: 0 }, style: { bgcolor: assist.bg, color: BLACK } }],
		)
	}

	// ---- Scopes ----
	//
	// Two things a scope surface has to respect, and they are the same two the
	// module's feedbacks are built on.
	//
	// First: the Bottom and Quad layouts draw four panels from the SLOTS and
	// ignore the selected scope entirely, while Side and Full draw the SELECTED
	// one. So the "scope type" keys below pair with `tile_scope_type` — the value
	// they actually set — and the keys that put a scope up for real pair with
	// `tile_scope_visible`, which is layout-aware.
	//
	// Second: Diamond is in no default slot. Out of the box Bottom carries
	// waveform/parade/vector/histogram and Quad carries image/waveform/vector/
	// histogram, so on a multi-panel layout the Diamond has to be ASSIGNED to a
	// panel before it can be seen — hence the two panel keys at the end.
	const scopeLayoutPresets: { id: string; label: string; value: string }[] = [
		{ id: 'bottom', label: 'SCOPES\nBOTTOM', value: 'bottom' },
		{ id: 'side', label: 'SCOPES\nSIDE', value: 'side' },
		{ id: 'quad', label: 'SCOPES\nQUAD', value: 'quad' },
		{ id: 'full', label: 'SCOPES\nFULL', value: 'full' },
	]
	for (const layout of scopeLayoutPresets) {
		button(
			`scope_layout_${layout.id}`,
			'Scopes',
			`Active: ${layout.value} layout`,
			{ text: layout.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_scopes_layout', options: { tile: '', value: layout.value } }],
			[{ feedbackId: 'tile_scope_layout', options: { tile: 0, value: layout.value }, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
		)
	}

	const scopeTypePresets: { id: string; label: string; value: string }[] = [
		{ id: 'waveform', label: 'WAVE\nFORM', value: 'waveform' },
		{ id: 'parade', label: 'RGB\nPARADE', value: 'parade' },
		{ id: 'vectorscope', label: 'VECTOR\nSCOPE', value: 'vectorscope' },
		{ id: 'histogram', label: 'HISTO\nGRAM', value: 'histogram' },
		{ id: 'diamond', label: 'DIA\nMOND', value: 'diamond' },
	]
	for (const scope of scopeTypePresets) {
		button(
			`scope_type_${scope.id}`,
			'Scopes',
			`Active: select ${scope.value} (Side / Full layouts)`,
			{ text: scope.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_scopes_type', options: { tile: '', value: scope.value } }],
			[{ feedbackId: 'tile_scope_type', options: { tile: 0, value: scope.value }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// The keys that work from ANY state: switch the scopes on, go full, and put
	// the scope up. Three existing actions in one press — which is what an
	// operator reaching for a gamut check actually wants, rather than three keys
	// and the knowledge of which layout they happened to be left in.
	for (const scope of scopeTypePresets) {
		button(
			`scope_full_${scope.id}`,
			'Scopes',
			`Active: ${scope.value}, full screen`,
			{ text: `${scope.label}\nFULL`, size: '14', color: WHITE, bgcolor: PANEL },
			[
				{ actionId: 'tile_scopes', options: { tile: '', state: 'on' } },
				{ actionId: 'tile_scopes_layout', options: { tile: '', value: 'full' } },
				{ actionId: 'tile_scopes_type', options: { tile: '', value: scope.value } },
			],
			[{ feedbackId: 'tile_scope_visible', options: { tile: 0, value: scope.value }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// Diamond into a panel of the multi-panel layouts. Panel 4 in Bottom and Quad
	// alike, because that is the histogram slot in both default sets and the
	// histogram is the scope a Diamond most nearly replaces — same question about
	// the same values, asked in a way that also shows the gamut.
	for (const layout of ['bottom', 'quad'] as const) {
		button(
			`scope_slot_diamond_${layout}`,
			'Scopes',
			`Active: Diamond in ${layout} panel 4`,
			{ text: `DIA\nMOND\nP4 ${layout === 'quad' ? 'QUAD' : 'BTM'}`, size: '14', color: WHITE, bgcolor: PANEL },
			[
				{ actionId: 'tile_scopes', options: { tile: '', state: 'on' } },
				{ actionId: 'tile_scopes_layout', options: { tile: '', value: layout } },
				{ actionId: 'tile_scopes_slot', options: { tile: '', layout, slot: '4', value: 'diamond' } },
			],
			[{ feedbackId: 'tile_scope_visible', options: { tile: 0, value: 'diamond' }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// Auto is right almost always. These are for the day it is not: a source that
	// declares no transfer, or declares the wrong one, is read against the wrong
	// graticule and looks legal when it is not.
	const scopeRangePresets: { id: string; label: string; value: string }[] = [
		{ id: 'auto', label: 'RANGE\nAUTO', value: 'auto' },
		{ id: 'sdr', label: 'RANGE\nSDR', value: 'sdr' },
		{ id: 'hdr', label: 'RANGE\nHDR', value: 'hdr' },
	]
	for (const range of scopeRangePresets) {
		button(
			`scope_range_${range.id}`,
			'Scopes',
			`Active: scopes read as ${range.value}`,
			{ text: range.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_scopes_dynamic_range', options: { tile: '', value: range.value } }],
			[{ feedbackId: 'tile_scope_dynamic_range', options: { tile: 0, value: range.value }, style: { bgcolor: combineRgb(217, 119, 6), color: BLACK } }],
		)
	}

	// Readouts rather than controls: in Bottom and Quad none of the button faces
	// above can say what is actually on screen, and these can. Per tile, not per
	// "active tile" — a face printing one tile's scopes while the key follows
	// whichever tile is selected would be wrong three times out of four.
	for (const index of [1, 2, 3, 4]) {
		button(
			`scope_readout_${index}`,
			'Scopes',
			`Tile ${index}: scopes on / off, showing what is up`,
			{
				text: `SCOPES ${index}\n${variable(`tile_${index}_scopes_on_screen`)}`,
				size: '14',
				color: WHITE,
				bgcolor: PANEL,
			},
			[{ actionId: 'tile_scopes', options: { tile: String(index), state: '' } }],
			[{ feedbackId: 'tile_scopes', options: { tile: index }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// ---- Freeze & compare ----
	// The workhorse: one key that freezes what is on screen and starts comparing,
	// and drops it on the next press. It pulses while a comparison is up, because
	// a frozen picture on a wall is the one state that can be mistaken for a live
	// one and a static tint is exactly what an eye stops noticing.
	button(
		'compare_freeze_active',
		'Freeze & compare',
		'Active: freeze / release',
		{ text: 'FREEZE', size: '18', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_freeze_toggle', options: { tile: '' } }],
		[{ feedbackId: 'tile_comparing_pulse', options: { tile: 0 } }],
	)
	button(
		'compare_show_active',
		'Freeze & compare',
		'Active: show / hide comparison',
		// No mode variable on the face: the variables are per tile and this button
		// follows the ACTIVE one, so printing tile 1's mode here would be wrong
		// three times out of four.
		{ text: 'COMPARE', size: '18', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_compare', options: { tile: '', state: '' } }],
		[{ feedbackId: 'tile_comparing', options: { tile: 0 }, style: { bgcolor: combineRgb(6, 182, 212), color: BLACK } }],
	)
	const compareModePresets: { id: string; label: string; value: string }[] = [
		{ id: 'wipe', label: 'WIPE', value: 'wipe' },
		{ id: 'blend', label: 'BLEND', value: 'blend' },
		{ id: 'difference', label: 'DIFF', value: 'difference' },
		{ id: 'side_by_side', label: 'SIDE\nBY SIDE', value: 'side-by-side' },
	]
	for (const mode of compareModePresets) {
		button(
			`compare_mode_${mode.id}`,
			'Freeze & compare',
			`Active: ${mode.label.replace('\n', ' ')} mode`,
			{ text: mode.label, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_compare_mode', options: { tile: '', value: mode.value } }],
			[{ feedbackId: 'tile_compare_mode', options: { tile: 0, value: mode.value }, style: { bgcolor: combineRgb(6, 182, 212), color: BLACK } }],
		)
	}
	button(
		'compare_swap_active',
		'Freeze & compare',
		'Active: swap sides',
		{ text: 'SWAP\nSIDES', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_compare_swap', options: { tile: '', state: '' } }],
		[],
	)
	// Fixed seam positions, so a wipe can be driven from keys on a surface that
	// has no rotary. 0 and 100 are the A/B flip an operator uses to see whether
	// anything moved at all.
	for (const position of [0, 25, 50, 75, 100]) {
		button(
			`compare_position_${position}`,
			'Freeze & compare',
			`Active: wipe at ${position}%`,
			{ text: `WIPE\n${position}%`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_compare_position', options: { tile: '', value: String(position) } }],
			[],
		)
	}
	for (const index of [1, 2, 3, 4]) {
		button(
			`compare_freeze_${index}`,
			'Freeze & compare',
			`Tile ${index}: freeze / release`,
			{ text: `FREEZE\n${index}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_freeze_toggle', options: { tile: String(index) } }],
			[{ feedbackId: 'tile_comparing_pulse', options: { tile: index } }],
		)
	}

	// ---- 3D LUT ----
	// The file is loaded on the QMonitor machine; these buttons switch between
	// what is already in its library, and take a conversion out for a second —
	// which is how an operator checks whether what they are seeing is in the
	// signal or in the LUT.
	button(
		'lut_bypass_active',
		'3D LUT',
		'Active: apply / bypass the LUT',
		{ text: `LUT\n${variable('tile_1_lut')}`, size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_lut', options: { tile: '', state: '' } }],
		[
			{
				feedbackId: 'tile_lut_applied',
				options: { tile: 0 },
				style: { bgcolor: combineRgb(139, 92, 246), color: WHITE },
			},
			// Amber wins by being listed last: a LUT that is switched on and not
			// reaching the picture is the state worth shouting about, and it is the
			// one the operator cannot see in the picture itself.
			{
				feedbackId: 'tile_lut_failing',
				options: { tile: 0 },
				style: { bgcolor: combineRgb(245, 158, 11), color: BLACK },
			},
		],
	)
	// The library is per machine and its contents are not known when these presets
	// are built, so the slots are by POSITION. `tile_lut_load` also takes a name,
	// which is what to type once the operator knows what is loaded.
	for (const slot of [1, 2, 3]) {
		button(
			`lut_load_${slot}`,
			'3D LUT',
			`Active: load LUT ${slot} from the library`,
			{ text: `LUT ${slot}`, size: '18', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_lut_load', options: { tile: '', value: String(slot) } }],
			[
				{
					feedbackId: 'tile_lut_applied',
					options: { tile: 0 },
					style: { bgcolor: combineRgb(139, 92, 246), color: WHITE },
				},
			],
		)
	}
	button(
		'lut_clear_active',
		'3D LUT',
		'Active: take the LUT off',
		{ text: 'NO\nLUT', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_lut_clear', options: { tile: '' } }],
		[],
	)
	for (const strength of ['100', '50', '0']) {
		button(
			`lut_strength_${strength}`,
			'3D LUT',
			`Active: LUT at ${strength}%`,
			{ text: `LUT\n${strength}%`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_lut_strength', options: { tile: '', value: strength } }],
			[],
		)
	}
	for (const index of [1, 2, 3, 4]) {
		button(
			`lut_bypass_${index}`,
			'3D LUT',
			`Tile ${index}: apply / bypass`,
			{ text: `LUT ${index}\n${variable(`tile_${index}_lut`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_lut', options: { tile: String(index), state: '' } }],
			[
				{
					feedbackId: 'tile_lut_applied',
					options: { tile: index },
					style: { bgcolor: combineRgb(139, 92, 246), color: WHITE },
				},
				{
					feedbackId: 'tile_lut_failing',
					options: { tile: index },
					style: { bgcolor: combineRgb(245, 158, 11), color: BLACK },
				},
			],
		)
	}

	// ---- Alpha ----
	// The modes worth a physical button are the two that answer different
	// questions: the checkerboard says "where is it transparent", alpha-only says
	// "is this key any good". The rest are refinements of those two.
	for (const mode of ['checker', 'alpha', 'highlight', 'off']) {
		button(
			`alpha_${mode}`,
			'Alpha',
			`Active: alpha view — ${mode}`,
			{ text: `ALPHA\n${mode.toUpperCase()}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_alpha_mode', options: { tile: '', value: mode } }],
			[
				{
					feedbackId: 'tile_alpha_mode_is',
					options: { tile: 0, value: mode },
					style: { bgcolor: combineRgb(14, 165, 233), color: WHITE },
				},
				// Amber last so it wins: a mode selected on a source with no alpha
				// is doing nothing, and nothing in the picture would say so.
				{
					feedbackId: 'tile_alpha_incapable',
					options: { tile: 0 },
					style: { bgcolor: combineRgb(245, 158, 11), color: BLACK },
				},
			],
		)
	}
	// Over black, then over white. Two buttons because the CHECK is the pair:
	// flipping between them is what reveals a premultiplied source being
	// composited as straight, and no single button can perform a comparison.
	for (const shade of ['black', 'white']) {
		button(
			`alpha_over_${shade}`,
			'Alpha',
			`Active: composite over ${shade}`,
			{ text: `OVER\n${shade.toUpperCase()}`, size: '14', color: WHITE, bgcolor: PANEL },
			[
				{ actionId: 'tile_alpha_mode', options: { tile: '', value: 'matte' } },
				{ actionId: 'tile_alpha_color', options: { tile: '', value: shade } },
			],
			[],
		)
	}
	// Measured, so this lights only on a feed that really is keyed — not on every
	// RGBA source in the rack.
	button(
		'alpha_keyed_active',
		'Alpha',
		'Active: is this source keyed?',
		{ text: `KEYED?\n${variable('tile_1_alpha_transparent')}%`, size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'refresh_state', options: {} }],
		[
			{
				feedbackId: 'tile_alpha_keyed',
				options: { tile: 0 },
				style: { bgcolor: combineRgb(6, 182, 212), color: BLACK },
			},
		],
	)
	button(
		'alpha_record_key_active',
		'Alpha',
		'Active: record the key as a second file',
		{ text: 'REC\nKEY', size: '18', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_alpha_key', options: { tile: '', state: '' } }],
		[
			{
				feedbackId: 'tile_alpha_key_recording',
				options: { tile: 0 },
				style: { bgcolor: combineRgb(190, 24, 93), color: WHITE },
			},
		],
	)
	for (const index of [1, 2, 3, 4]) {
		button(
			`alpha_checker_${index}`,
			'Alpha',
			`Tile ${index}: checkerboard on / off`,
			{ text: `ALPHA ${index}`, size: '18', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_alpha_mode', options: { tile: String(index), value: 'checker' } }],
			[
				{
					feedbackId: 'tile_alpha_mode_is',
					options: { tile: index, value: 'checker' },
					style: { bgcolor: combineRgb(14, 165, 233), color: WHITE },
				},
			],
		)
	}

	// ---- Audio ----
	button(
		'audio_mute_all',
		'Audio',
		'Global mute',
		{ text: 'MUTE\nALL', size: '18', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'audio_mute_all', options: { state: '' } }],
		[{ feedbackId: 'global_audio_muted', options: {}, style: { bgcolor: combineRgb(220, 38, 38), color: WHITE } }],
	)

	// ---- Live VU meters (animated) — vertical multi-channel bars on the button ----
	button(
		'vu_meter_active',
		'Live VU meters',
		'VU meter — active tile (animated)',
		{ text: '', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tile_vu', options: { tile: '', state: '' } }],
		[{ feedbackId: 'tile_vu_meter', options: { tile: 0 } }],
	)
	for (const index of [1, 2, 3, 4]) {
		button(
			`vu_meter_${index}`,
			'Live VU meters',
			`VU meter — tile ${index} (animated)`,
			{ text: '', size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_vu', options: { tile: String(index), state: '' } }],
			[{ feedbackId: 'tile_vu_meter', options: { tile: index } }],
		)
	}

	// ---- Recording (animated pulse + live duration) ----
	for (const index of [1, 2, 3, 4]) {
		button(
			`record_tile_${index}`,
			'Recording',
			`Record tile ${index} (pulsing + duration)`,
			{ text: `⏺ REC ${index}\n${variable(`tile_${index}_rec_duration`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tile_record', options: { tile: String(index), state: '' } }],
			[{ feedbackId: 'tile_recording_pulse', options: { tile: index } }],
		)
	}
	button(
		'record_all',
		'Recording',
		'Record all tiles (pulsing + duration)',
		{ text: `⏺ REC ALL\n${variable('recording_duration')}`, size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'record_all', options: { state: '' } }],
		[{ feedbackId: 'any_recording_pulse', options: {} }],
	)
	button(
		'recording_quality',
		'Recording',
		'Recording quality: Quality',
		{ text: `QUAL\n${variable('recording_quality')}`, size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'recording_quality', options: { value: 'quality' } }],
		[{ feedbackId: 'recording_quality', options: { value: 'quality' }, style: { bgcolor: combineRgb(139, 92, 246), color: WHITE } }],
	)

	// ---- Tally ----
	//
	// The default buttons are TOGGLES, not one-shots. An operator who forces a
	// tile red must be able to release it from the same key without hunting for a
	// second button — a forced tally nobody remembers forcing is how a tally wall
	// loses its credibility. The lit state comes from `tile_tally_forced_state`,
	// so the key is only bright while it is the one holding the tile.
	// Ready-made ON/OFF keys: one press forces the state, the next hands the tile
	// back to the mixer, and the key is lit only while IT is the one holding it.
	// Drop one on a page and it works — no feedback to wire up by hand.
	for (const index of [1, 2, 3, 4]) {
		button(
			`tally_pgm_${index}`,
			'Tally — control (press to force, press again to release)',
			`Tile ${index} — force PROGRAM`,
			{ text: `PGM ${index}\n${variable(`tile_${index}_label`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tally_toggle', options: { tile: String(index), value: 'program' } }],
			[
				{ feedbackId: 'tile_tally_color', options: { tile: index } },
				{
					feedbackId: 'tile_tally_forced_state',
					options: { tile: index, value: 'program' },
					style: { color: BLACK },
				},
			],
		)
		button(
			`tally_pvw_${index}`,
			'Tally — control (press to force, press again to release)',
			`Tile ${index} — force PREVIEW`,
			{ text: `PVW ${index}\n${variable(`tile_${index}_label`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tally_toggle', options: { tile: String(index), value: 'preview' } }],
			[
				{ feedbackId: 'tile_tally_color', options: { tile: index } },
				{
					feedbackId: 'tile_tally_forced_state',
					options: { tile: index, value: 'preview' },
					style: { color: BLACK },
				},
			],
		)
		// Forcing a tile DARK is a distinct intention from releasing it, and an
		// operator needs it when a camera must stay off the wall on purpose.
		button(
			`tally_off_${index}`,
			'Tally — control (press to force, press again to release)',
			`Tile ${index} — force OFF`,
			{ text: `OFF ${index}\n${variable(`tile_${index}_label`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tally_toggle', options: { tile: String(index), value: 'off' } }],
			[{
				feedbackId: 'tile_tally_forced_state',
				options: { tile: index, value: 'off' },
				style: { bgcolor: combineRgb(217, 119, 6), color: BLACK },
			}],
		)
	}
	// Pure lamps. No action at all, so a nervous finger cannot override the truth
	// from the very button meant to display it. The whole key takes the colour
	// QMonitor is drawing, which is what makes a wall of these readable at a
	// glance from across the gallery.
	for (const index of [1, 2, 3, 4]) {
		button(
			`tally_lamp_${index}`,
			'Tally — lamps (display only)',
			`Tile ${index} tally lamp`,
			{
				text: `${index}\n${variable(`tile_${index}_label`)}`,
				size: '18',
				color: WHITE,
				bgcolor: combineRgb(12, 16, 24),
			},
			[],
			[
				{ feedbackId: 'tile_tally_color', options: { tile: index } },
				{
					feedbackId: 'tile_tally_stale',
					options: { tile: index },
					style: { bgcolor: combineRgb(120, 53, 15), color: WHITE },
				},
			],
		)
	}
	// A lamp with no text whatsoever — colour only, for a dedicated tally wall.
	for (const index of [1, 2, 3, 4]) {
		button(
			`tally_lamp_bare_${index}`,
			'Tally — lamps (display only)',
			`Tile ${index} tally lamp — colour only`,
			{ text: '', size: '18', color: WHITE, bgcolor: combineRgb(12, 16, 24) },
			[],
			[{ feedbackId: 'tile_tally_color', options: { tile: index } }],
		)
	}
	button(
		'tally_lamp_active',
		'Tally — lamps (display only)',
		'Active tile tally lamp',
		{
			text: `ACTIVE\n${variable('active_tile')}`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(12, 16, 24),
		},
		[],
		[{ feedbackId: 'tile_tally_color', options: { tile: 0 } }],
	)
	button(
		'tally_release_active',
		'Tally — control (press to force, press again to release)',
		'Release forced tally — active tile',
		{ text: 'TALLY\nRELEASE', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tally_release', options: { tile: '' } }],
		[{ feedbackId: 'tile_tally_forced', options: { tile: 0 }, style: { bgcolor: combineRgb(217, 119, 6), color: BLACK } }],
	)
	button(
		'tally_clear_all',
		'Tally — control (press to force, press again to release)',
		'Release every forced tally',
		{ text: `TALLY\nCLEAR ALL\n${variable('tally_forced_count')}`, size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tally_clear_all', options: {} }],
		[{ feedbackId: 'any_tally_forced', options: {}, style: { bgcolor: combineRgb(217, 119, 6), color: BLACK } }],
	)
	button(
		'tally_display_border',
		'Tally — appearance & link',
		'Tally display: Border',
		{ text: 'TALLY\nBORDER', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tally_display', options: { value: 'border' } }],
		[{ feedbackId: 'tally_display', options: { value: 'border' }, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
	)
	button(
		'tally_display_badge',
		'Tally — appearance & link',
		'Tally display: Badge',
		{ text: 'TALLY\nBADGE', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'tally_display', options: { value: 'badge' } }],
		[{ feedbackId: 'tally_display', options: { value: 'badge' }, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
	)

	// The health of the link itself. Without it, a dark tally wall is ambiguous:
	// nothing on air, or the switcher stopped talking? This button answers that.
	button(
		'tally_mixer_link',
		'Tally — appearance & link',
		'Mixer link status',
		{
			text: `${variable('tally_mixer_kind')}\n${variable('tally_mixer_status')}\n${variable('tally_mixer_inputs')} in`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(15, 23, 35),
		},
		[],
		[
			{ feedbackId: 'mixer_link_up', options: {}, style: { bgcolor: combineRgb(20, 60, 30), color: WHITE } },
			{ feedbackId: 'mixer_link_down', options: {}, style: { bgcolor: combineRgb(120, 20, 20), color: WHITE } },
		],
	)
	for (const index of [1, 2, 3, 4]) {
		button(
			`tally_follow_${index}`,
			'Tally — appearance & link',
			`Tile ${index} follows the mixer`,
			{ text: `FOLLOW ${index}\n${variable(`tile_${index}_tally_input`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'tally_follow', options: { tile: String(index), state: '' } }],
			[{ feedbackId: 'tile_tally_follows', options: { tile: index }, style: { bgcolor: combineRgb(34, 197, 94), color: BLACK } }],
		)
	}

	// ---- Alarms ----
	//
	// The pairing asked for, ready-made: the FEEDBACK paints the button (blinking
	// red while unacknowledged, amber once seen) and the ACTION on the same button
	// acknowledges it. One key, and an operator never has to look at the QMonitor
	// screen to know something broke or to say they have seen it.
	//
	// Nothing here can clear a fault. QMonitor resolves an alarm when the fault
	// stops; a button that could erase a live one would be a way to hide an
	// incident rather than handle it.
	button(
		'alarm_latest',
		'Alarms',
		'Latest alarm (press to acknowledge)',
		{ text: 'ALARMS', size: '14', color: WHITE, bgcolor: combineRgb(15, 23, 35) },
		[{ actionId: 'alarm_ack', options: { tile: 'latest', type: 'any' } }],
		[{ feedbackId: 'alarm_latest', options: { showDetail: true } }],
	)
	button(
		'alarm_latest_compact',
		'Alarms',
		'Latest alarm, no detail line (press to acknowledge)',
		{ text: 'ALARMS', size: '18', color: WHITE, bgcolor: combineRgb(15, 23, 35) },
		[{ actionId: 'alarm_ack', options: { tile: 'latest', type: 'any' } }],
		[{ feedbackId: 'alarm_latest', options: { showDetail: false } }],
	)
	button(
		'alarm_count',
		'Alarms',
		'Alarm count (press to acknowledge all)',
		{
			text: `ALARMS\n${variable('alarm_count')}`,
			size: '18',
			color: WHITE,
			bgcolor: combineRgb(15, 23, 35),
		},
		[{ actionId: 'alarm_ack_all', options: {} }],
		[{ feedbackId: 'alarm_active', options: {} }],
	)
	button(
		'alarm_ack_all',
		'Alarms',
		'Acknowledge all',
		{ text: 'ACK\nALL', size: '18', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'alarm_ack_all', options: {} }],
		[{ feedbackId: 'alarm_active', options: {} }],
	)
	// One key per camera: shows OK until that tile faults, then the condition and
	// its detail — "CHANNEL / Channels 2, 4" — and acknowledges on press.
	for (const index of [1, 2, 3, 4]) {
		button(
			`alarm_tile_${index}`,
			'Alarms',
			`Tile ${index} alarm (press to acknowledge)`,
			{ text: `T${index}`, size: '14', color: WHITE, bgcolor: combineRgb(15, 23, 35) },
			[{ actionId: 'alarm_ack', options: { tile: String(index), type: 'any' } }],
			[{ feedbackId: 'tile_alarm_button', options: { tile: index } }],
		)
	}
	for (const index of [1, 2, 3, 4]) {
		button(
			`alarm_arm_${index}`,
			'Alarms — arming',
			`Arm tile ${index}`,
			{ text: `ARM ${index}\n${variable(`tile_${index}_label`)}`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'alarm_enable', options: { tile: String(index), state: '' } }],
			[{ feedbackId: 'alarm_armed', options: { tile: index, type: 'any' }, style: { bgcolor: combineRgb(21, 128, 61), color: WHITE } }],
		)
	}
	// The five video conditions ship disarmed, so a one-press key per condition is
	// how they actually get turned on from a surface.
	for (const [type, label] of [
		['black', 'BLACK'],
		['freeze', 'FREEZE'],
		['frame-rate', 'FPS'],
		['bitrate-drop', 'BITRATE'],
		['dead-channel', 'CHANNEL'],
	] as [string, string][]) {
		button(
			`alarm_condition_${type}`,
			'Alarms — arming',
			`Arm "${label}" on the active tile`,
			{ text: `${label}\nALARM`, size: '14', color: WHITE, bgcolor: PANEL },
			[{ actionId: 'alarm_condition', options: { tile: '', type, state: '' } }],
			[{ feedbackId: 'alarm_armed', options: { tile: 0, type }, style: { bgcolor: combineRgb(21, 128, 61), color: WHITE } }],
		)
	}
	button(
		'alarm_sound',
		'Alarms — arming',
		'Audible alert (active tile)',
		{ text: 'ALARM\nSOUND', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'alarm_sound', options: { tile: '', state: '' } }],
		[{ feedbackId: 'alarm_sound_enabled', options: { tile: 0 }, style: { bgcolor: combineRgb(59, 130, 246), color: WHITE } }],
	)
	button(
		'alarm_journal',
		'Alarms — arming',
		'Journal entries (press to clear)',
		{
			text: `JOURNAL\n${variable('alarm_history_count')}`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(15, 23, 35),
		},
		[{ actionId: 'alarm_clear_history', options: {} }],
	)

	// ---- Session journal ----
	//
	// One key per format, because "export the report" at the end of a shoot is a
	// single press and should not need a menu. The filename is timestamped, so a
	// double press produces two files rather than overwriting the first.
	button(
		'journal_export_txt',
		'Journal',
		'Export report (TXT)',
		{ text: 'EXPORT\nTXT', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'journal_export', options: { format: 'txt', tile: '', severity: '' } }],
	)
	button(
		'journal_export_csv',
		'Journal',
		'Export report (CSV)',
		{ text: 'EXPORT\nCSV', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'journal_export', options: { format: 'csv', tile: '', severity: '' } }],
	)
	// The report an insurer or a client actually reads: the incidents, without a
	// morning of threshold tuning in front of them.
	button(
		'journal_export_critical',
		'Journal',
		'Export incidents only (TXT)',
		{ text: 'EXPORT\nINCIDENTS', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'journal_export', options: { format: 'txt', tile: '', severity: 'warning' } }],
	)
	button(
		'journal_count',
		'Journal',
		'Journal entries (press to export TXT)',
		{ text: 'JOURNAL', size: '14', color: WHITE, bgcolor: combineRgb(15, 23, 35) },
		[{ actionId: 'journal_export', options: { format: 'txt', tile: '', severity: '' } }],
		[{ feedbackId: 'journal_state', options: {} }],
	)

	// ---- Configuration presets ----
	//
	// The name is left blank on purpose: a preset key is meaningless until it is
	// pointed at one of YOUR setups, and pre-filling a guess would ship a button
	// that looks configured and does nothing.
	button(
		'config_preset_recall',
		'Configuration presets',
		'Recall a preset (set the name in the action)',
		{ text: 'PRESET', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'preset_recall', options: { value: '', sources: '' } }],
		[{ feedbackId: 'preset_button', options: { value: '' } }],
	)
	button(
		'config_preset_recall_presentation',
		'Configuration presets',
		'Recall a preset — presentation only',
		{ text: 'PRESET\nLOOK', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'preset_recall', options: { value: '', sources: 'off' } }],
		[{ feedbackId: 'preset_button', options: { value: '' } }],
	)
	button(
		'config_preset_save',
		'Configuration presets',
		'Save the current setup',
		{ text: 'SAVE\nPRESET', size: '14', color: WHITE, bgcolor: PANEL },
		[{ actionId: 'preset_save', options: { value: '', sources: '' } }],
	)

	// ---- Readouts (variables, no action) ----
	for (const index of [1, 2, 3, 4]) {
		button(`readout_tile_${index}`, 'Readouts', `Tile ${index} info`, {
			text: `T${index} ${variable(`tile_${index}_source_kind`)}\n${variable(`tile_${index}_resolution`)}\n${variable(`tile_${index}_codec`)}`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(15, 23, 35),
		}, [])
	}
	button('readout_status', 'Readouts', 'Connection status', {
		text: `QMonitor\n${variable('connection_status')}\nL${variable('layout')} A${variable('active_tile')}`,
		size: '14',
		color: WHITE,
		bgcolor: combineRgb(15, 23, 35),
	}, [], [{ feedbackId: 'connected', options: {}, style: { bgcolor: combineRgb(20, 60, 30), color: WHITE } }])

	button('readout_alarm', 'Readouts', 'Latest alarm (read-only)', {
		text: `${variable('alarm_latest_label')}\n${variable('alarm_latest_type')}\n${variable('alarm_latest_detail')}`,
		size: '14',
		color: WHITE,
		bgcolor: combineRgb(15, 23, 35),
	}, [])

	self.setPresetDefinitions(presets)
}
