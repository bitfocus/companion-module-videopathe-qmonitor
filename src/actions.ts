import type { CompanionActionDefinition, CompanionInputFieldDropdown } from '@companion-module/base'
import {
	ALARM_CONDITION_CHOICES,
	ALPHA_COLOR_CHOICES,
	ALPHA_MODE_CHOICES,
	PRESET_SOURCE_CHOICES,
	JOURNAL_FORMAT_CHOICES,
	JOURNAL_SEVERITY_CHOICES,
	ALARM_TYPE_CHOICES,
	COMPARE_AXIS_CHOICES,
	COMPARE_MODE_CHOICES,
	INFO_OPTION_CHOICES,
	LANGUAGE_CHOICES,
	LUT_STRENGTH_CHOICES,
	LAYOUT_CHOICES,
	PEAK_COLOR_CHOICES,
	PEAK_SENSITIVITY_CHOICES,
	MIXER_KIND_CHOICES,
	QUALITY_CHOICES,
	SCOPE_DYNAMIC_RANGE_CHOICES,
	SCOPE_LAYOUT_CHOICES,
	SCOPE_SLOT_CHOICES,
	SCOPE_SLOT_CONTENT_CHOICES,
	SCOPE_SLOT_LAYOUT_CHOICES,
	SCOPE_TYPE_CHOICES,
	STATE_CHOICES,
	TALLY_DISPLAY_CHOICES,
	TALLY_STATE_CHOICES,
	TILE_CHOICES,
	TSL_FIELD_CHOICES,
} from './choices.js'
import type { ModuleInstance } from './main.js'

function tileOption(): CompanionInputFieldDropdown {
	return {
		id: 'tile',
		type: 'dropdown',
		label: 'Tile',
		default: '',
		choices: TILE_CHOICES,
	}
}

function stateOption(): CompanionInputFieldDropdown {
	return {
		id: 'state',
		type: 'dropdown',
		label: 'Action',
		default: '',
		choices: STATE_CHOICES,
	}
}

function hexFromColorNumber(value: unknown): string {
	const number = Number(value)
	if (!Number.isFinite(number)) return '#ff2d9b'
	return `#${(number & 0xffffff).toString(16).padStart(6, '0')}`
}

export function UpdateActions(self: ModuleInstance): void {
	const tileToggle = (name: string, commandId: string): CompanionActionDefinition => ({
		name,
		options: [tileOption(), stateOption()],
		callback: async (event) =>
			self.sendCommand(commandId, {
				tile: String(event.options.tile ?? ''),
				state: String(event.options.state ?? ''),
			}),
	})

	self.setActionDefinitions({
		refresh_state: {
			name: 'General: Refresh state now',
			options: [],
			callback: async () => {
				await self.refreshState()
			},
		},

		// ---- View & layout ----
		layout_set: {
			name: 'View: Set layout (tile count)',
			options: [{ id: 'value', type: 'dropdown', label: 'Layout', default: '2', choices: LAYOUT_CHOICES }],
			callback: async (event) => self.sendCommand('layout.set', { value: String(event.options.value ?? '') }),
		},
		active_set: {
			name: 'View: Select active tile',
			options: [
				{
					id: 'value',
					type: 'dropdown',
					label: 'Tile',
					default: '1',
					choices: [
						{ id: '1', label: 'Tile 1' },
						{ id: '2', label: 'Tile 2' },
						{ id: '3', label: 'Tile 3' },
						{ id: '4', label: 'Tile 4' },
					],
				},
			],
			callback: async (event) => self.sendCommand('active.set', { value: String(event.options.value ?? '') }),
		},
		active_next: {
			name: 'View: Select next tile',
			options: [],
			callback: async () => self.sendCommand('active.next', {}),
		},
		active_previous: {
			name: 'View: Select previous tile',
			options: [],
			callback: async () => self.sendCommand('active.previous', {}),
		},
		window_fullscreen: {
			name: 'View: Window fullscreen',
			options: [stateOption()],
			callback: async (event) => self.sendCommand('window.fullscreen', { state: String(event.options.state ?? '') }),
		},
		tile_fullscreen: {
			name: 'View: Tile solo fullscreen',
			options: [tileOption(), stateOption()],
			callback: async (event) =>
				self.sendCommand('tile.fullscreen', {
					tile: String(event.options.tile ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},

		// ---- Audio ----
		audio_mute_all: {
			name: 'Audio: Global mute',
			options: [stateOption()],
			callback: async (event) => self.sendCommand('audio.muteAll', { state: String(event.options.state ?? '') }),
		},
		tile_audio_monitor: {
			name: 'Audio: Route monitored channels',
			options: [
				tileOption(),
				{ id: 'left', type: 'number', label: 'Left channel (1-16)', default: 1, min: 1, max: 16 },
				{ id: 'right', type: 'number', label: 'Right channel (1-16)', default: 2, min: 1, max: 16 },
			],
			callback: async (event) =>
				self.sendCommand('tile.audio.monitor', {
					tile: String(event.options.tile ?? ''),
					left: Number(event.options.left),
					right: Number(event.options.right),
				}),
		},

		// ---- Monitoring features ----
		tile_vu: tileToggle('Feature: VU meters', 'tile.vu'),
		tile_peaking: tileToggle('Feature: Focus peaking', 'tile.peaking'),
		tile_peaking_color: {
			name: 'Feature: Focus peaking colour',
			options: [
				tileOption(),
				{ id: 'color', type: 'dropdown', label: 'Colour', default: 'green', choices: PEAK_COLOR_CHOICES },
				{
					id: 'customColor',
					type: 'colorpicker',
					label: 'Custom colour',
					default: 0xff2d9b,
					isVisible: (options) => options.color === 'custom',
				},
			],
			callback: async (event) => {
				const color = String(event.options.color ?? 'green')
				const value = color === 'custom' ? hexFromColorNumber(event.options.customColor) : color
				return self.sendCommand('tile.peaking.color', { tile: String(event.options.tile ?? ''), value })
			},
		},
		tile_peaking_sensitivity: {
			name: 'Feature: Focus peaking sensitivity',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Sensitivity', default: 'medium', choices: PEAK_SENSITIVITY_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.peaking.sensitivity', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_scopes: tileToggle('Feature: Scopes', 'tile.scopes'),
		tile_scopes_layout: {
			name: 'Feature: Scopes layout',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Layout', default: 'bottom', choices: SCOPE_LAYOUT_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.scopes.layout', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_scopes_type: {
			name: 'Feature: Scope type',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Scope', default: 'waveform', choices: SCOPE_TYPE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.scopes.type', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_scopes_slot: {
			name: 'Feature: Scope panel content',
			options: [
				tileOption(),
				{ id: 'layout', type: 'dropdown', label: 'Layout', default: 'quad', choices: SCOPE_SLOT_LAYOUT_CHOICES },
				{ id: 'slot', type: 'dropdown', label: 'Panel', default: '1', choices: SCOPE_SLOT_CHOICES },
				{ id: 'value', type: 'dropdown', label: 'Content', default: 'waveform', choices: SCOPE_SLOT_CONTENT_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.scopes.slot', {
					tile: String(event.options.tile ?? ''),
					layout: String(event.options.layout ?? ''),
					slot: String(event.options.slot ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		// The scopes read a signal against a reference, and the reference is not
		// self-evident: a source that declares nothing, or declares its transfer
		// wrongly, gets drawn against the wrong graticule and reads as legal when it
		// is not. Auto is right almost always, which is exactly why the override
		// needs to be one press away on the days it is not.
		tile_scopes_dynamic_range: {
			name: 'Feature: Scopes dynamic range (SDR / HDR)',
			description:
				'Auto follows the source transfer metadata and falls back to SDR. Force SDR or HDR for a source that declares nothing, or declares it wrongly.',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Range', default: 'auto', choices: SCOPE_DYNAMIC_RANGE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.scopes.dynamic-range', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_labels: tileToggle('Feature: Tile label', 'tile.labels'),
		tile_info: tileToggle('Feature: Infos overlay', 'tile.info'),
		tile_info_option: {
			name: 'Feature: Infos line',
			options: [
				tileOption(),
				{ id: 'option', type: 'dropdown', label: 'Line', default: 'codec', choices: INFO_OPTION_CHOICES },
				stateOption(),
			],
			callback: async (event) =>
				self.sendCommand('tile.info.option', {
					tile: String(event.options.tile ?? ''),
					option: String(event.options.option ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},

		// ---- Image assistance ----
		tile_assist_monochrome: tileToggle('Assist: Black & white', 'tile.assist.monochrome'),
		tile_assist_false_color: tileToggle('Assist: False colours', 'tile.assist.falseColor'),
		tile_assist_zebras: tileToggle('Assist: Zebras', 'tile.assist.zebras'),
		tile_assist_markers: tileToggle('Assist: Markers', 'tile.assist.markers'),
		tile_assist_reticle: tileToggle('Assist: Reticle', 'tile.assist.reticle'),

		// ---- Freeze & compare ----
		// Freezing is a monitoring act: the tile keeps receiving and recording the
		// live signal while the reference is held against it on screen.
		tile_freeze: tileToggle('Compare: Freeze reference', 'tile.freeze'),
		tile_compare: tileToggle('Compare: Show comparison', 'tile.compare'),
		// The one an operator actually wants on a key: press to freeze what is on
		// screen and start comparing, press again to drop it and go back to live.
		tile_freeze_toggle: {
			name: 'Compare: Freeze / release (toggle)',
			options: [tileOption()],
			callback: async (event) => {
				const tile = String(event.options.tile ?? '')
				const frozen = self.getTileByOption(tile)?.compare?.frozen === true
				return self.sendCommand('tile.freeze', { tile, state: frozen ? 'off' : 'on' })
			},
		},
		tile_compare_mode: {
			name: 'Compare: Mode',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Mode', default: 'wipe', choices: COMPARE_MODE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.compare.mode', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_compare_axis: {
			name: 'Compare: Seam direction',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Seam', default: 'vertical', choices: COMPARE_AXIS_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.compare.axis', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		// A number rather than a dropdown: this is what a rotary or a fader is
		// wired to, and useVariables lets a surface feed it a live value.
		tile_compare_position: {
			name: 'Compare: Wipe position',
			options: [
				tileOption(),
				{ id: 'value', type: 'textinput', label: 'Position (0-100 %)', default: '50', useVariables: true },
			],
			callback: async (event) =>
				self.sendCommand('tile.compare.position', {
					tile: String(event.options.tile ?? ''),
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
				}),
		},
		tile_compare_blend: {
			name: 'Compare: Blend amount',
			options: [
				tileOption(),
				{ id: 'value', type: 'textinput', label: 'Reference weight (0-100 %)', default: '50', useVariables: true },
			],
			callback: async (event) =>
				self.sendCommand('tile.compare.blend', {
					tile: String(event.options.tile ?? ''),
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
				}),
		},
		tile_compare_gain: {
			name: 'Compare: Difference gain',
			options: [
				tileOption(),
				{ id: 'value', type: 'textinput', label: 'Gain (1-16)', default: '4', useVariables: true },
			],
			callback: async (event) =>
				self.sendCommand('tile.compare.gain', {
					tile: String(event.options.tile ?? ''),
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
				}),
		},
		tile_compare_swap: tileToggle('Compare: Swap sides', 'tile.compare.swap'),

		// ---- 3D LUT ----
		// The module names a LUT, it never carries one: the file is loaded on the
		// QMonitor machine, from the Assistances panel. What a control surface is
		// good for is switching between conversions already there, and taking one
		// out for a second to see what is really in the signal.
		tile_lut: tileToggle('LUT: Apply / bypass', 'tile.lut'),
		tile_lut_load: {
			name: 'LUT: Put a LUT on a tile',
			options: [
				tileOption(),
				{
					id: 'value',
					type: 'textinput',
					label: 'LUT name, or its position in the library (1, 2, 3…)',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (event) =>
				self.sendCommand('tile.lut.load', {
					tile: String(event.options.tile ?? ''),
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
				}),
		},
		tile_lut_clear: {
			name: 'LUT: Take the LUT off a tile',
			options: [tileOption()],
			callback: async (event) => self.sendCommand('tile.lut.clear', { tile: String(event.options.tile ?? '') }),
		},
		tile_lut_strength: {
			name: 'LUT: Strength',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Strength', default: '100', choices: LUT_STRENGTH_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.lut.strength', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},

		// ---- Alpha ----
		// Only NDI and OMT carry alpha. These actions are accepted on any tile
		// but have nothing to draw elsewhere, which is what `tile_alpha_applied`
		// is for — a button that lights only when the mode is actually reaching
		// a picture that has transparency in it.
		tile_alpha_mode: {
			name: 'Alpha: How transparency is shown',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Mode', default: 'checker', choices: ALPHA_MODE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.alpha', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_alpha_color: {
			name: 'Alpha: Matte / highlight colour',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Colour', default: 'black', choices: ALPHA_COLOR_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.alpha.color', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		tile_alpha_opacity: {
			name: 'Alpha: Highlight / zebra strength',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'Strength', default: '85', choices: LUT_STRENGTH_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tile.alpha.opacity', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		// Deliberately "also": ProRes 4444 and VP9 WebM already keep the alpha in
		// the file itself, so this switch is purely about a discrete matte beside
		// it — not about whether the transparency is recorded at all.
		tile_alpha_key: tileToggle('Alpha: Also write a key file', 'tile.alpha.key'),

		// ---- Recording ----
		tile_record: {
			name: 'Recording: Tile record',
			options: [tileOption(), stateOption()],
			callback: async (event) =>
				self.sendCommand('tile.record', {
					tile: String(event.options.tile ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},
		record_all: {
			name: 'Recording: Record all tiles',
			options: [stateOption()],
			callback: async (event) => self.sendCommand('record.all', { state: String(event.options.state ?? '') }),
		},
		recording_quality: {
			name: 'Recording: Quality mode',
			options: [{ id: 'value', type: 'dropdown', label: 'Quality', default: 'quality', choices: QUALITY_CHOICES }],
			callback: async (event) => self.sendCommand('recording.quality', { value: String(event.options.value ?? '') }),
		},

		// ---- Tally ----
		// Forcing and releasing are two different intentions, not one command with
		// a magic value: "force this dark" and "hand it back to the mixer" produce
		// the same border and must stay distinguishable on a button wall.
		tally_set: {
			name: 'Tally: Force state',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'State', default: 'program', choices: TALLY_STATE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('tally.set', {
					tile: String(event.options.tile ?? ''),
					value: String(event.options.value ?? ''),
				}),
		},
		// One button that lights while it holds the tile and clears when pressed
		// again — the shape an operator expects from a "take control" key.
		tally_toggle: {
			name: 'Tally: Force state (toggle)',
			options: [
				tileOption(),
				{ id: 'value', type: 'dropdown', label: 'State', default: 'program', choices: TALLY_STATE_CHOICES },
			],
			callback: async (event) => {
				const tile = String(event.options.tile ?? '')
				const wanted = String(event.options.value ?? 'program')
				const current = self.getTileByOption(tile)
				const holdsThisState = current?.tally?.forced === true && String(current?.tally?.state ?? '') === wanted
				return holdsThisState
					? self.sendCommand('tally.release', { tile })
					: self.sendCommand('tally.set', { tile, value: wanted })
			},
		},
		tally_release: {
			name: 'Tally: Release forced state',
			options: [tileOption()],
			callback: async (event) => self.sendCommand('tally.release', { tile: String(event.options.tile ?? '') }),
		},
		tally_clear_all: {
			name: 'Tally: Release all forced states',
			options: [],
			callback: async () => self.sendCommand('tally.clearAll', {}),
		},
		tally_input: {
			name: 'Tally: Map tile to mixer input',
			options: [
				tileOption(),
				{ id: 'value', type: 'textinput', label: 'Mixer input (number or name)', default: '', useVariables: true },
			],
			callback: async (event) =>
				self.sendCommand('tally.input', {
					tile: String(event.options.tile ?? ''),
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
				}),
		},
		tally_display: {
			name: 'Tally: Display mode',
			options: [{ id: 'value', type: 'dropdown', label: 'Display', default: 'border', choices: TALLY_DISPLAY_CHOICES }],
			callback: async (event) => self.sendCommand('tally.display', { value: String(event.options.value ?? '') }),
		},
		tally_style: {
			name: 'Tally: Appearance',
			options: [
				{ id: 'program', type: 'colorpicker', label: 'On-air colour', default: 0xef4444 },
				{ id: 'preview', type: 'colorpicker', label: 'Preview colour', default: 0x22c55e },
				{ id: 'opacity', type: 'number', label: 'Opacity (0.2-1)', default: 0.9, min: 0.2, max: 1, step: 0.05 },
				{ id: 'thickness', type: 'number', label: 'Thickness (px)', default: 4, min: 1, max: 16 },
				{ id: 'lampSize', type: 'number', label: 'Lamp width (% of tile, badge mode)', default: 22, min: 6, max: 90 },
			],
			callback: async (event) =>
				self.sendCommand('tally.style', {
					program: hexFromColorNumber(event.options.program),
					preview: hexFromColorNumber(event.options.preview),
					opacity: Number(event.options.opacity),
					thickness: Number(event.options.thickness),
					lampSize: Number(event.options.lampSize),
				}),
		},

		tally_follow: {
			name: 'Tally: Tile follows the mixer',
			options: [tileOption(), stateOption()],
			callback: async (event) =>
				self.sendCommand('tally.follow', {
					tile: String(event.options.tile ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},
		// Points QMonitor at a switcher to RECEIVE from. It does not control the
		// switcher — useful for swapping studios or restoring a preset.
		tally_mixer: {
			name: 'Tally: Mixer connection (receive from)',
			options: [
				{ id: 'kind', type: 'dropdown', label: 'Mixer', default: 'vmix', choices: MIXER_KIND_CHOICES },
				{
					id: 'host',
					type: 'textinput',
					label: 'IP address',
					default: '',
					useVariables: true,
					isVisible: (options) => options.kind !== 'tsl' && options.kind !== 'none',
				},
				{
					id: 'port',
					type: 'number',
					label: 'Port (0 = protocol default)',
					default: 0,
					min: 0,
					max: 65535,
					isVisible: (options) => options.kind !== 'none',
				},
				{
					id: 'tslField',
					type: 'dropdown',
					label: 'Program lamp',
					default: 'right',
					choices: TSL_FIELD_CHOICES,
					isVisible: (options) => options.kind === 'tsl',
				},
				{
					id: 'password',
					type: 'textinput',
					label: 'obs-websocket password (leave blank if disabled)',
					default: '',
					isVisible: (options) => options.kind === 'obs',
				},
			],
			callback: async (event) => {
				const kind = String(event.options.kind ?? '')
				return self.sendCommand('tally.mixer', {
					kind,
					host: await self.parseVariablesInString(String(event.options.host ?? '')),
					port: Number(event.options.port),
					tslField: String(event.options.tslField ?? 'right'),
					// Only sent for OBS: the command is write-only server-side, but
					// there is no reason to put it on the wire for other protocols.
					password: kind === 'obs' ? String(event.options.password ?? '') : undefined,
				})
			},
		},

		// ---- Alarms ----
		//
		// Acknowledging is the whole reason alarms belong on a control surface: the
		// operator is looking at the desk, not at the QMonitor screen. Note there is
		// no "clear" action anywhere here — QMonitor resolves an alarm when the
		// FAULT goes away, and a remote button that could erase a live fault would
		// be a way to hide an incident rather than to handle one.
		alarm_ack: {
			name: 'Alarm: Acknowledge',
			description:
				'Silences an alarm without clearing it — it disappears on its own once the fault does. With the tile left on "Latest alarm", acknowledges whatever went off most recently.',
			options: [
				{
					id: 'tile',
					type: 'dropdown',
					label: 'Tile',
					default: 'latest',
					choices: [{ id: 'latest', label: 'Latest alarm (any tile)' }, ...TILE_CHOICES],
				},
				{ id: 'type', type: 'dropdown', label: 'Condition', default: 'any', choices: ALARM_TYPE_CHOICES },
			],
			callback: async (event) => {
				const tile = String(event.options.tile ?? 'latest')
				const type = String(event.options.type ?? 'any')
				return self.sendCommand('alarm.ack', {
					tile: tile === 'latest' ? undefined : tile,
					type: type === 'any' ? undefined : type,
				})
			},
		},
		alarm_ack_all: {
			name: 'Alarm: Acknowledge all',
			options: [],
			callback: async () => self.sendCommand('alarm.ackAll', {}),
		},
		alarm_enable: {
			name: 'Alarm: Arm tile',
			description: 'Arms or disarms every alarm on a tile.',
			options: [tileOption(), stateOption()],
			callback: async (event) =>
				self.sendCommand('alarm.enable', {
					tile: String(event.options.tile ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},
		alarm_condition: {
			name: 'Alarm: Arm one condition',
			options: [
				tileOption(),
				{ id: 'type', type: 'dropdown', label: 'Condition', default: 'black', choices: ALARM_CONDITION_CHOICES },
				stateOption(),
			],
			callback: async (event) =>
				self.sendCommand('alarm.condition', {
					tile: String(event.options.tile ?? ''),
					type: String(event.options.type ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},
		alarm_sound: {
			name: 'Alarm: Audible alert',
			options: [tileOption(), stateOption()],
			callback: async (event) =>
				self.sendCommand('alarm.sound', {
					tile: String(event.options.tile ?? ''),
					state: String(event.options.state ?? ''),
				}),
		},
		alarm_clear_history: {
			name: 'Alarm: Clear journal',
			description: 'Empties the alarm journal. Active alarms are untouched.',
			options: [],
			callback: async () => self.sendCommand('alarm.clearHistory', {}),
		},

		// ---- Session journal ----
		//
		// The report is written BY QMONITOR, on the machine QMonitor runs on, and
		// the action returns the path. Streaming an eight-hour session back over an
		// unauthenticated HTTP response would be both large and a disclosure — and
		// Companion has nowhere to put a file anyway.
		journal_export: {
			name: 'Journal: Export session report',
			description:
				'Writes the report on the QMonitor machine. Desktop: Documents/QMonitor Reports. Android: Download/QMonitor. The filename is timestamped, so pressing twice never overwrites.',
			options: [
				{ id: 'format', type: 'dropdown', label: 'Format', default: 'txt', choices: JOURNAL_FORMAT_CHOICES },
				{
					id: 'tile',
					type: 'dropdown',
					label: 'Tile',
					default: '',
					choices: [{ id: '', label: 'All tiles' }, ...TILE_CHOICES.filter((choice) => choice.id !== '')],
				},
				{ id: 'severity', type: 'dropdown', label: 'Keep', default: '', choices: JOURNAL_SEVERITY_CHOICES },
			],
			callback: async (event) => {
				const result = await self.sendCommandForResult('journal.export', {
					format: String(event.options.format ?? 'txt'),
					tile: String(event.options.tile ?? ''),
					severity: String(event.options.severity ?? ''),
				})
				// Surfaced in the log because there is no other way to learn where
				// the file landed from a button press.
				if (result?.ok && typeof result.path === 'string') {
					self.log('info', `Session report written to ${result.path}`)
				} else if (result?.ok === false) {
					self.log('warn', `Session report not written: ${String(result.error ?? 'unknown')}`)
				}
			},
		},
		journal_clear: {
			name: 'Journal: Clear',
			description: 'Empties the session journal. Irreversible; active alarms are untouched.',
			options: [],
			callback: async () => self.sendCommand('journal.clear', {}),
		},

		// ---- Configuration presets ----
		//
		// Bound BY NAME, not by id: an operator sets up "Plateau A" on a key, and
		// that key has to keep working after the preset is re-saved or imported on
		// another machine, where the generated id will differ.
		preset_recall: {
			name: 'Preset: Recall configuration',
			description:
				'Recalls a saved setup: layout, sources, scopes, VU meters, alarm thresholds, assists. Tiles that are RECORDING are always left untouched.',
			options: [
				{ id: 'value', type: 'textinput', label: 'Preset name', default: '', useVariables: true },
				{ id: 'sources', type: 'dropdown', label: 'Sources', default: '', choices: PRESET_SOURCE_CHOICES },
			],
			callback: async (event) => {
				const result = await self.sendCommandForResult('preset.recall', {
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
					sources: String(event.options.sources ?? ''),
				})
				// Skipped tiles are the one thing a button press cannot show, and the
				// one thing an operator needs to know afterwards.
				if (result?.ok && Number(result.skippedRecordingTiles) > 0) {
					self.log('warn', `Preset recalled, but ${String(result.skippedRecordingTiles)} recording tile(s) were left untouched`)
				} else if (result?.ok === false) {
					self.log('warn', `Preset not recalled: ${String(result.error ?? 'unknown')}`)
				}
			},
		},
		preset_save: {
			name: 'Preset: Save current configuration',
			description: 'Saves the current setup under a name. Never overwrites — a name already taken gets a suffix.',
			options: [
				{ id: 'value', type: 'textinput', label: 'Preset name', default: '', useVariables: true },
				{ id: 'sources', type: 'dropdown', label: 'Sources', default: '', choices: PRESET_SOURCE_CHOICES },
			],
			callback: async (event) =>
				self.sendCommand('preset.save', {
					value: await self.parseVariablesInString(String(event.options.value ?? '')),
					sources: String(event.options.sources ?? ''),
				}),
		},

		// Deliberately the only preset action with no ready-made button in the
		// Presets tab: recalling the wrong preset is a mistake an operator can undo,
		// and deleting one is not. It stays available for a surface that genuinely
		// manages a library, but nobody gets it on a key by accident.
		preset_delete: {
			name: 'Preset: Delete a configuration',
			description: 'Deletes a saved setup on the QMonitor machine. Irreversible.',
			options: [{ id: 'value', type: 'textinput', label: 'Preset name', default: '', useVariables: true }],
			callback: async (event) => {
				const name = await self.parseVariablesInString(String(event.options.value ?? ''))
				if (name.trim() === '') {
					// An empty field would otherwise send `preset.delete` with no value and
					// get a silent rejection — worse than saying nothing happened.
					self.log('warn', 'Preset not deleted: no preset name given')
					return
				}
				const result = await self.sendCommandForResult('preset.delete', { value: name })
				if (result?.ok === false) {
					self.log('warn', `Preset not deleted: ${String(result.error ?? 'unknown')}`)
				}
			},
		},

		// ---- Application ----
		app_language: {
			name: 'App: Language',
			options: [{ id: 'value', type: 'dropdown', label: 'Language', default: 'en', choices: LANGUAGE_CHOICES }],
			callback: async (event) => self.sendCommand('app.language', { value: String(event.options.value ?? '') }),
		},
	})
}
