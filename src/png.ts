import { deflateSync } from 'node:zlib'

// Minimal dependency-free PNG (8-bit RGBA) encoder — enough to draw a VU meter
// straight onto a Companion button via the advanced feedback `png64` field.

const CRC_TABLE = ((): Int32Array => {
	const table = new Int32Array(256)
	for (let n = 0; n < 256; n += 1) {
		let c = n
		for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		table[n] = c
	}
	return table
})()

function crc32(buffer: Buffer): number {
	let crc = 0xffffffff
	for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
	return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4)
	length.writeUInt32BE(data.length, 0)
	const typeBuffer = Buffer.from(type, 'ascii')
	const crc = Buffer.alloc(4)
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
	return Buffer.concat([length, typeBuffer, data, crc])
}

export function encodePng(width: number, height: number, rgba: Buffer): string {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(width, 0)
	ihdr.writeUInt32BE(height, 4)
	ihdr[8] = 8 // bit depth
	ihdr[9] = 6 // colour type: RGBA
	const stride = width * 4
	const raw = Buffer.alloc((stride + 1) * height)
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0 // filter type: none
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
	}
	const idat = deflateSync(raw)
	return Buffer.concat([
		signature,
		pngChunk('IHDR', ihdr),
		pngChunk('IDAT', idat),
		pngChunk('IEND', Buffer.alloc(0)),
	]).toString('base64')
}

type RGB = [number, number, number]

const ZONES: { green: { bright: RGB; dim: RGB }; yellow: { bright: RGB; dim: RGB }; red: { bright: RGB; dim: RGB } } = {
	green: { bright: [52, 210, 123], dim: [16, 52, 34] },
	yellow: { bright: [248, 198, 69], dim: [66, 52, 18] },
	red: { bright: [255, 90, 79], dim: [70, 26, 24] },
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value))
}

export interface VuChannel {
	level: number // 0-100
	peak?: number // 0-100
}

export interface VuMeterOptions {
	channels: VuChannel[]
	yellowRatio: number // 0-1 threshold position
	redRatio: number // 0-1 threshold position
	width?: number
	height?: number
}

export function drawVuMeterPng({ channels, yellowRatio, redRatio, width = 72, height = 72 }: VuMeterOptions): string {
	const rgba = Buffer.alloc(width * height * 4)
	const bg: RGB = [12, 18, 28]
	for (let i = 0; i < width * height; i += 1) {
		rgba[i * 4] = bg[0]
		rgba[i * 4 + 1] = bg[1]
		rgba[i * 4 + 2] = bg[2]
		rgba[i * 4 + 3] = 255
	}

	const setPixel = (x: number, y: number, color: RGB): void => {
		if (x < 0 || x >= width || y < 0 || y >= height) return
		const offset = (y * width + x) * 4
		rgba[offset] = color[0]
		rgba[offset + 1] = color[1]
		rgba[offset + 2] = color[2]
		rgba[offset + 3] = 255
	}

	const count = Math.max(1, channels.length)
	const padX = 3
	const gap = count > 1 ? (count > 4 ? 1 : 2) : 0
	const meterTop = 4
	const meterBottom = height - 4
	const meterHeight = meterBottom - meterTop
	const usableWidth = width - padX * 2 - gap * (count - 1)
	const barWidth = Math.max(1, Math.floor(usableWidth / count))

	const yellow = clamp01(yellowRatio)
	const red = clamp01(Math.max(yellowRatio, redRatio))

	for (let c = 0; c < count; c += 1) {
		const x0 = padX + c * (barWidth + gap)
		const level = clamp01((channels[c]?.level ?? 0) / 100)
		const peak = channels[c]?.peak != null ? clamp01((channels[c].peak as number) / 100) : null
		for (let y = meterTop; y < meterBottom; y += 1) {
			const frac = (meterBottom - 1 - y) / (meterHeight - 1) // 0 bottom → 1 top
			const zone = frac <= yellow ? ZONES.green : frac <= red ? ZONES.yellow : ZONES.red
			const color = frac <= level ? zone.bright : zone.dim
			for (let x = x0; x < x0 + barWidth; x += 1) setPixel(x, y, color)
		}
		if (peak != null && peak > 0.01) {
			const py = Math.round(meterBottom - 1 - peak * (meterHeight - 1))
			for (let x = x0; x < x0 + barWidth; x += 1) {
				setPixel(x, py, [235, 245, 255])
			}
		}
	}

	return encodePng(width, height, rgba)
}
