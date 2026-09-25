import { InstanceBase, InstanceStatus, type SomeCompanionConfigField, runEntrypoint } from '@companion-module/base'
import { buildBaseUrl, buildCommandUrl, consumeEventStream, fetchJson, type CommandResult } from './api.js'
import { UpdateActions } from './actions.js'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import {
	clampNumber,
	dbToRatio,
	getResolvedTile,
	safeNumber,
	type QMonitorSnapshot,
	type TileSnapshot,
} from './state.js'
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
const EVENT_RECONNECT_MAX_MS = 60_000

// When QMonitor cannot be reached, retrying four times a second serves nobody:
// the app is not running or the host is wrong, and every attempt is a log line.
// After a failure the next poll waits twice as long as the last one, up to a
// minute, and the configured cadence comes back the moment a poll succeeds.
const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 60_000

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
	/** Delay before the next poll while QMonitor is unreachable; see RETRY_MIN_MS. */
	private retryDelay = RETRY_MIN_MS
	private consecutiveFailures = 0
	private lastStatus: InstanceStatus | undefined
	private lastStatusMessage: string | null | undefined
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
		this.resetBackoff()
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

	/**
	 * Companion forwards every status update as-is, so calling it four times a
	 * second with the same "connection refused" is four log lines a second.
	 * Only a real change goes through.
	 */
	private setStatus(status: InstanceStatus, message?: string | null): void {
		const normalized = message ?? null
		if (status === this.lastStatus && normalized === this.lastStatusMessage) return
		this.lastStatus = status
		this.lastStatusMessage = normalized
		this.updateStatus(status, normalized ?? undefined)
	}

	private resetBackoff(): void {
		this.retryDelay = RETRY_MIN_MS
		this.consecutiveFailures = 0
	}

	private startPolling(runImmediately: boolean): void {
		this.stopPolling()
		if (!this.hasValidConfig()) {
			this.setStatus(InstanceStatus.BadConfig)
			this.connected = false
			this.pushVariables()
			this.checkFeedbacks()
			return
		}
		if (!this.connected) this.setStatus(InstanceStatus.Connecting)
		if (runImmediately) void this.refreshState()
		else this.scheduleNextPoll()
	}

	/**
	 * One-shot timer rather than setInterval: the delay depends on how the last
	 * poll went, and the timer is only armed once the previous request is done so
	 * a slow host is never asked twice at once.
	 */
	private scheduleNextPoll(): void {
		if (this.pollTimer) clearTimeout(this.pollTimer)
		if (!this.hasValidConfig()) return
		this.pollTimer = setTimeout(() => {
			this.pollTimer = undefined
			void this.refreshState()
		}, this.pollIntervalMs())
	}

	private pollIntervalMs(): number {
		if (!this.connected && this.consecutiveFailures > 0) return this.retryDelay
		if (this.eventStreamLive) return LIVE_HEARTBEAT_MS
		return Math.max(150, safeNumber(this.config.pollInterval, 250))
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer)
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
		// The heartbeat cadence differs from the polling cadence, so a pending
		// timer has to be re-armed rather than left waiting at the old rate.
		if (this.pollTimer) this.scheduleNextPoll()
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
					this.markConnected()
					this.pushVariables()
					this.checkFeedbacks()
				},
				controller.signal,
			)
		} catch (error) {
			// Only worth a line while QMonitor itself answers: an unreachable host
			// is already reported (once) by the poller, and repeating it here for
			// every retry is exactly the noise the backoff exists to avoid.
			if (controller === this.eventStreamAbort && this.connected) {
				this.log('debug', `Event stream unavailable: ${error instanceof Error ? error.message : String(error)}`)
			}
		}

		if (controller !== this.eventStreamAbort || controller.signal.aborted) return
		this.setEventStreamLive(false)
		// Unreachable host: leave the retry to the poller, which backs off on its
		// own and reopens the stream as soon as a poll gets through.
		if (!this.connected) {
			this.eventStreamAbort = undefined
			return
		}
		// The stream ended or never opened while the app is up (an old QMonitor
		// without /api/events, say). Retry with a widening delay.
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
			this.markConnected()
			this.pushVariables()
			this.checkFeedbacks()
		} catch (error) {
			if (controller !== this.abortController || controller.signal.aborted) return
			this.markDisconnected(error instanceof Error ? error.message : String(error))
			this.pushVariables()
			this.checkFeedbacks()
		} finally {
			this.pollInFlight = false
			// Not after destroy() or a config change: those own the next poll.
			if (controller === this.abortController && !controller.signal.aborted) this.scheduleNextPoll()
		}
	}

	private markConnected(): void {
		const wasConnected = this.connected
		this.connected = true
		this.lastError = null
		this.setStatus(InstanceStatus.Ok)
		if (wasConnected) return
		if (this.consecutiveFailures > 0) this.log('info', `Connected to QMonitor at ${this.getBaseUrl()}`)
		this.resetBackoff()
		// The stream gave up while the host was down; now that it answers, bring
		// the low-latency path back.
		if (!this.eventStreamAbort) this.startEventStream()
	}

	private markDisconnected(message: string): void {
		this.connected = false
		this.lastError = message
		this.consecutiveFailures += 1
		this.setStatus(InstanceStatus.ConnectionFailure, message)
		// One line when the link drops, then silence until it is back: the status
		// badge already says it is down, and a log that repeats it every poll
		// buries whatever else is going on in Companion.
		if (this.consecutiveFailures === 1) {
			this.log('warn', `Cannot reach QMonitor at ${this.getBaseUrl()}: ${message} — retrying with backoff`)
		}
		// 1 s, 2 s, 4 s … 60 s between attempts.
		this.retryDelay = this.consecutiveFailures === 1 ? RETRY_MIN_MS : Math.min(RETRY_MAX_MS, this.retryDelay * 2)
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
			this.setStatus(InstanceStatus.BadConfig)
			return undefined
		}
		const url = buildCommandUrl(this.getBaseUrl(), commandId, params)
		// Bound to the instance lifecycle like refreshState(): an answer landing
		// after destroy() or a config change must not touch state.
		const controller = this.abortController
		try {
			const result = await fetchJson<CommandResult>(url, { method: 'GET', signal: controller.signal })
			if (controller !== this.abortController || controller.signal.aborted) return undefined
			if (result?.ok === false) {
				this.log('warn', `Command ${commandId} rejected: ${result.error ?? 'unknown'} (${url})`)
			} else {
				this.log('debug', `Command ${commandId} ok (${url})`)
			}
			// Reflect the change quickly rather than waiting for the next poll tick.
			void this.refreshState()
			return result
		} catch (error) {
			if (controller !== this.abortController || controller.signal.aborted) return undefined
			// A button press is a deliberate act, so its failure is always worth
			// a line — unlike the poller's, which would repeat it every tick.
			const message = error instanceof Error ? error.message : String(error)
			this.log('error', `Command ${commandId} failed: ${message}`)
			this.markDisconnected(message)
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
				next[channel] = clampNumber(
					target >= previous ? target : Math.max(target, previous - VU_RELEASE_PER_TICK),
					0,
					100,
				)
			}
			this.vuChannels.set(tile.index, next)
			if (
				tile.recording?.requested === true ||
				['recording', 'starting', 'requested'].includes(String(tile.recording?.status ?? '').toLowerCase())
			) {
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
		return (this.snapshot?.tiles?.find((tile) => tile.index === index)?.stats?.audioLevelsDb ?? []).map(
			(db) => dbToRatio(db) * 100,
		)
	}

	private pushVariables(): void {
		this.setVariableValues(buildVariableValues(this))
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
