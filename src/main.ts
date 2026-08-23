import { InstanceBase, InstanceStatus, type SomeCompanionConfigField, runEntrypoint } from '@companion-module/base'
import { buildBaseUrl, buildCommandUrl, consumeEventStream, fetchJson, type CommandResult } from './api.js'
import { UpdateActions } from './actions.js'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { clampNumber, dbToRatio, getResolvedTile, safeNumber, type QMonitorSnapshot, type TileSnapshot } from './state.js'
import { UpgradeScripts } from './upgrades.js'
import { buildVariableValues, UpdateVariableDefinitions } from './variables.js'

const ANIMATION_INTERVAL_MS = 80
const VU_RELEASE_PER_TICK = 7

// Alarm blink half-period. ~2.2 Hz: fast enough to be impossible to miss in
// peripheral vision, slow enough not to read as a broken button. Acknowledged
// alarms stop blinking and stay solid — the fault is still there, but somebody
// has seen it, and a surface that keeps shouting after that gets ignored.
const ALARM_BLINK_MS = 450

// While the live stream is up, polling drops to a slow heartbeat instead of
// stopping: a stream can stall without closing, and a wall of buttons showing a
// state from ten minutes ago is worse than one that is merely a second late.
const LIVE_HEARTBEAT_MS = 5_000
const EVENT_RECONNECT_MIN_MS = 1_000
const EVENT_RECONNECT_MAX_MS = 15_000

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	snapshot: QMonitorSnapshot | undefined
	lastError: string | null = null
	pulsePhase = 0.5
	/** Square wave driving the alarm blink; see ALARM_BLINK_MS. */
	alarmBlinkOn = true

	private pollTimer: NodeJS.Timeout | undefined
	private animationTimer: NodeJS.Timeout | undefined
	private pollInFlight = false
	private abortController = new AbortController()
	private connected = false
	private eventStreamAbort: AbortController | undefined
	private eventReconnectTimer: NodeJS.Timeout | undefined
	private eventReconnectDelay = EVENT_RECONNECT_MIN_MS
	private eventStreamLive = false
	// Per-tile, per-channel animated VU levels (0-100), fast attack / slow release.
	private readonly vuChannels = new Map<number, number[]>()

	constructor(internal: unknown) {
		super(internal)
	}

	get isConnected(): boolean {
		return this.connected
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		UpdateVariableDefinitions(this)
		this.pushVariables()
		this.startPolling(true)
		this.startEventStream()
		this.startAnimation()
	}

	async destroy(): Promise<void> {
		this.abortController.abort()
		this.stopPolling()
		this.stopEventStream()
		this.stopAnimation()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.abortController.abort()
		this.abortController = new AbortController()
		this.pollInFlight = false
		this.config = config
		this.snapshot = undefined
		this.connected = false
		this.vuChannels.clear()
		this.pushVariables()
		this.checkFeedbacks()
		this.startPolling(true)
		this.startEventStream()
		this.startAnimation()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	getBaseUrl(): string {
		return buildBaseUrl(this.config?.host ?? '', safeNumber(this.config?.port, 2228))
	}

	private hasValidConfig(): boolean {
		return !!this.config?.host?.trim() && safeNumber(this.config?.port) > 0
	}

	// ---- Polling ----

	private startPolling(runImmediately: boolean): void {
		this.stopPolling()
		if (!this.hasValidConfig()) {
			this.updateStatus(InstanceStatus.BadConfig)
			this.connected = false
			this.pushVariables()
			this.checkFeedbacks()
			return
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.pollTimer = setInterval(() => void this.refreshState(), this.pollIntervalMs())
		if (runImmediately) void this.refreshState()
	}

	private pollIntervalMs(): number {
		if (this.eventStreamLive) return LIVE_HEARTBEAT_MS
		return Math.max(150, safeNumber(this.config.pollInterval, 400))
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer)
			this.pollTimer = undefined
		}
	}

	// ---- Live event stream ----
	//
	// Latency is the feature for tally: a light that arrives a poll interval late
	// can have an operator cut a camera that is still on air. The stream pushes
	// each state change instead, and polling stays on as a heartbeat behind it.

	private startEventStream(): void {
		this.stopEventStream()
		if (this.config?.liveEvents === false || !this.hasValidConfig()) return
		const controller = new AbortController()
		this.eventStreamAbort = controller
		void this.runEventStream(controller)
	}

	private stopEventStream(): void {
		if (this.eventReconnectTimer) {
			clearTimeout(this.eventReconnectTimer)
			this.eventReconnectTimer = undefined
		}
		this.eventStreamAbort?.abort()
		this.eventStreamAbort = undefined
		this.setEventStreamLive(false)
	}

	private setEventStreamLive(live: boolean): void {
		if (this.eventStreamLive === live) return
		this.eventStreamLive = live
		// The heartbeat cadence differs from the polling cadence, so the timer has
		// to be rebuilt rather than left running at the old rate.
		this.startPolling(false)
	}

	private async runEventStream(controller: AbortController): Promise<void> {
		const url = `${this.getBaseUrl()}/api/events`
		try {
			await consumeEventStream(
				url,
				(data) => {
					if (controller !== this.eventStreamAbort) return
					let snapshot: QMonitorSnapshot
					try {
						snapshot = JSON.parse(data) as QMonitorSnapshot
					} catch {
						return
					}
					// A first frame arriving proves the endpoint exists — some builds
					// (Android) may not serve it, and those must keep polling.
					this.eventReconnectDelay = EVENT_RECONNECT_MIN_MS
					this.setEventStreamLive(true)
					this.snapshot = snapshot
					this.connected = true
					this.lastError = null
					this.updateStatus(InstanceStatus.Ok)
					this.pushVariables()
					this.checkFeedbacks()
				},
				controller.signal,
			)
		} catch (error) {
			if (controller === this.eventStreamAbort) {
				this.log('debug', `Event stream unavailable: ${error instanceof Error ? error.message : String(error)}`)
			}
		}

		if (controller !== this.eventStreamAbort || controller.signal.aborted) return
		// The stream ended or never opened. Fall back to polling and retry with a
		// widening delay so an old QMonitor without /api/events is not hammered.
		this.setEventStreamLive(false)
		const delay = this.eventReconnectDelay
		this.eventReconnectDelay = Math.min(EVENT_RECONNECT_MAX_MS, delay * 2)
		this.eventReconnectTimer = setTimeout(() => {
			this.eventReconnectTimer = undefined
			if (controller !== this.eventStreamAbort) return
			this.startEventStream()
		}, delay)
	}

	async refreshState(): Promise<void> {
		if (this.pollInFlight || !this.hasValidConfig()) return
		this.pollInFlight = true
		const controller = this.abortController
		try {
			const snapshot = await fetchJson<QMonitorSnapshot>(`${this.getBaseUrl()}/api/status`, {
				signal: controller.signal,
			})
			if (controller !== this.abortController) return
			this.snapshot = snapshot
			this.connected = true
			this.lastError = null
			this.updateStatus(InstanceStatus.Ok)
			this.pushVariables()
			this.checkFeedbacks()
		} catch (error) {
			if (controller !== this.abortController || controller.signal.aborted) return
			this.connected = false
			this.lastError = error instanceof Error ? error.message : String(error)
			this.updateStatus(InstanceStatus.ConnectionFailure, this.lastError)
			this.pushVariables()
			this.checkFeedbacks()
		} finally {
			this.pollInFlight = false
		}
	}

	// ---- Command dispatch ----

	/**
	 * Fire a command and ignore the answer.
	 *
	 * Companion action callbacks must resolve to `void`, so this is what almost
	 * everything calls. Use [sendCommandForResult] when the answer carries
	 * something the snapshot does not.
	 */
	async sendCommand(commandId: string, params: Record<string, string | number | undefined>): Promise<void> {
		await this.sendCommandForResult(commandId, params)
	}

	/**
	 * @returns the command's result — `journal.export` answers with the path the
	 *          report was written to, which is the only way a button press can
	 *          tell anyone where the file went.
	 */
	async sendCommandForResult(
		commandId: string,
		params: Record<string, string | number | undefined>,
	): Promise<CommandResult | undefined> {
		if (!this.hasValidConfig()) {
			this.updateStatus(InstanceStatus.BadConfig)
			return undefined
		}
		const url = buildCommandUrl(this.getBaseUrl(), commandId, params)
		try {
			const result = await fetchJson<CommandResult>(url, { method: 'GET' })
			if (result?.ok === false) {
				this.log('warn', `Command ${commandId} rejected: ${result.error ?? 'unknown'} (${url})`)
			} else {
				this.log('debug', `Command ${commandId} ok (${url})`)
			}
			// Reflect the change quickly rather than waiting for the next poll tick.
			void this.refreshState()
			return result
		} catch (error) {
			this.connected = false
			this.lastError = error instanceof Error ? error.message : String(error)
			this.log('error', `Command ${commandId} failed: ${this.lastError}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, this.lastError)
			this.checkFeedbacks()
			return undefined
		}
	}

	// ---- Animation (VU meters + recording pulse) ----

	private startAnimation(): void {
		this.stopAnimation()
		if (this.config?.animate === false) return
		this.animationTimer = setInterval(() => this.animationTick(), ANIMATION_INTERVAL_MS)
	}

	private stopAnimation(): void {
		if (this.animationTimer) {
			clearInterval(this.animationTimer)
			this.animationTimer = undefined
		}
	}

	private animationTick(): void {
		// Smooth 0..1 pulse for the recording buttons (~0.8 s period).
		this.pulsePhase = 0.5 + 0.5 * Math.sin(Date.now() / 350)

		// Fast attack / slow release per-channel VU levels, like a real meter.
		let anyRecording = false
		for (const tile of this.snapshot?.tiles ?? []) {
			const targets = (tile.stats?.audioLevelsDb ?? []).map((db) => dbToRatio(db) * 100)
			const current = this.vuChannels.get(tile.index) ?? []
			const next: number[] = []
			for (let channel = 0; channel < targets.length; channel += 1) {
				const target = targets[channel]
				const previous = current[channel] ?? 0
				next[channel] = clampNumber(target >= previous ? target : Math.max(target, previous - VU_RELEASE_PER_TICK), 0, 100)
			}
			this.vuChannels.set(tile.index, next)
			if (tile.recording?.requested === true || ['recording', 'starting', 'requested'].includes(String(tile.recording?.status ?? '').toLowerCase())) {
				anyRecording = true
			}
		}

		// Blink only while something is unacknowledged, and only redraw on the
		// EDGE — at 80 ms a tick this would otherwise repaint the alarm buttons
		// twelve times a second to show the same thing.
		const blinkOn = Math.floor(Date.now() / ALARM_BLINK_MS) % 2 === 0
		const blinkFlipped = blinkOn !== this.alarmBlinkOn
		this.alarmBlinkOn = blinkOn

		if (!this.connected) return
		if (blinkFlipped && safeNumber(this.snapshot?.alarms?.unacknowledgedCount) > 0) {
			this.checkFeedbacks('alarm_active', 'alarm_latest', 'tile_alarm', 'tile_alarm_button')
		}
		if (anyRecording) {
			this.checkFeedbacks('tile_vu_meter', 'tile_recording_pulse', 'any_recording_pulse')
		} else {
			this.checkFeedbacks('tile_vu_meter')
		}
	}

	/** Resolve an action's tile dropdown ('' = active tile) against the snapshot. */
	getTileByOption(option: unknown): TileSnapshot | undefined {
		return getResolvedTile(this.snapshot, option)
	}

	getAnimatedVuChannels(index: number): number[] {
		const animated = this.vuChannels.get(index)
		if (animated && animated.length > 0) return animated
		// Fall back to the instantaneous snapshot levels before the first tick.
		return (this.snapshot?.tiles?.find((tile) => tile.index === index)?.stats?.audioLevelsDb ?? []).map((db) => dbToRatio(db) * 100)
	}

	private pushVariables(): void {
		this.setVariableValues(buildVariableValues(this))
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
