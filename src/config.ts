import type { SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	host: string
	port: number
	pollInterval: number
	animate: boolean
	liveEvents: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'QMonitor HTTP API',
			value:
				'Point this module at the machine running QMonitor. The remote-control server listens on port 2228 by default (Desktop and Android). Open QMonitor → language menu → "API Documentation" to see the live endpoint list.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'QMonitor host / IP',
			width: 8,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			default: 2228,
			min: 1,
			max: 65535,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (ms) — lower = snappier VU meters',
			width: 6,
			default: 250,
			min: 150,
			max: 10000,
		},
		{
			type: 'checkbox',
			id: 'animate',
			label: 'Animate VU meters & recording buttons',
			width: 6,
			default: true,
		},
		{
			type: 'checkbox',
			id: 'liveEvents',
			label: 'Live event stream (recommended for tally)',
			width: 12,
			default: true,
		},
		{
			type: 'static-text',
			id: 'liveEventsInfo',
			width: 12,
			label: '',
			value:
				'With the live stream on, state changes are pushed instead of polled — tally lights follow the mixer in a few milliseconds instead of up to one poll interval. Polling keeps running as a slow heartbeat, so nothing breaks if the stream is unavailable.',
		},
	]
}
