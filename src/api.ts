export function buildBaseUrl(host: string, port: number): string {
	const normalizedHost = String(host || '').trim()
	return `http://${normalizedHost}:${port}`
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 8_000): Promise<T> {
	const controller = new AbortController()
	const abortSignal = init?.signal
	const onAbort = (): void => controller.abort()

	if (abortSignal) {
		if (abortSignal.aborted) controller.abort()
		else abortSignal.addEventListener('abort', onAbort, { once: true })
	}

	const timer = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, { ...init, signal: controller.signal })
		const text = await response.text()
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}${text ? `: ${text}` : ''}`)
		}
		return (text ? JSON.parse(text) : {}) as T
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError' && !abortSignal?.aborted) {
			throw new Error(`Request timed out after ${timeoutMs}ms`)
		}
		throw error
	} finally {
		clearTimeout(timer)
		abortSignal?.removeEventListener('abort', onAbort)
	}
}

/**
 * QMonitor commands are simple GET calls: /api/cmd/<id>?param=value. Empty
 * params are dropped so "tile" left blank targets the active tile.
 */
export function buildCommandUrl(baseUrl: string, commandId: string, params: Record<string, string | number | undefined>): string {
	const query = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) continue
		const stringValue = String(value).trim()
		if (stringValue !== '') query.set(key, stringValue)
	}
	const suffix = query.toString()
	return `${baseUrl}/api/cmd/${commandId}${suffix ? `?${suffix}` : ''}`
}

/**
 * Read a `text/event-stream` and hand each `data:` payload to `onMessage`.
 *
 * Resolves when the stream ends, throws when it cannot be opened. Written on top
 * of `fetch` rather than `EventSource` so it shares the module's existing abort
 * plumbing, and so a Companion runtime that ships EventSource disabled still
 * gets the low-latency path instead of silently falling back to polling.
 */
export async function consumeEventStream(
	url: string,
	onMessage: (data: string) => void,
	signal: AbortSignal,
): Promise<void> {
	const response = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal })
	if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
	if (!response.body) throw new Error('event stream has no body')

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	// SSE frames are separated by a blank line, and a frame can straddle chunk
	// boundaries — so everything after the last separator stays buffered.
	let buffer = ''

	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) return
			buffer += decoder.decode(value, { stream: true })

			let separator = buffer.indexOf('\n\n')
			while (separator >= 0) {
				const frame = buffer.slice(0, separator)
				buffer = buffer.slice(separator + 2)
				const data = frame
					.split('\n')
					.filter((line) => line.startsWith('data:'))
					.map((line) => line.slice(5).trimStart())
					.join('\n')
				if (data) onMessage(data)
				separator = buffer.indexOf('\n\n')
			}
		}
	} finally {
		// Releasing the lock lets the abort actually tear the socket down.
		try {
			reader.releaseLock()
		} catch {
			/* already released */
		}
	}
}

export interface CommandResult {
	ok?: boolean
	command?: string
	error?: string
	tile?: number
	hasSource?: boolean
	value?: unknown
	[key: string]: unknown
}
