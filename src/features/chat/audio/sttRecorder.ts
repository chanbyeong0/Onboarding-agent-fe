import { buildApiUrl } from '../../../lib/apiClient'

export type SttStatusEvent = {
  type: 'status'
  status: number
  confidence?: number
  speech_score?: number
  speech_duration?: number
}

export type SttResultEvent = {
  type: 'stt'
  text: string
  confidence?: number
  speech_path?: string
  speech_duration?: number
}

export type SttRecorderOptions = {
  token: string
  language?: 'ko' | 'ja'
  onReady?: () => void
  onStatus?: (event: SttStatusEvent) => void
  onResult: (event: SttResultEvent) => void
  onError: (message: string) => void
  onClose?: () => void
}

export type SttRecorderSession = {
  stop: () => void
}

const TARGET_SAMPLE_RATE = 16000
const CHUNK_BYTES = 3200

const workletSource = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (input && input[0]) {
      this.port.postMessage(input[0])
    }
    return true
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor)
`

function buildSttWebSocketUrl(token: string, language: 'ko' | 'ja'): string {
  const apiUrl = buildApiUrl(`/api/v1/stt/ws?token=${encodeURIComponent(token)}&language=${language}`)
  const absoluteUrl = apiUrl.startsWith('http') ? apiUrl : new URL(apiUrl, window.location.origin).toString()
  return absoluteUrl.replace(/^http/i, 'ws')
}

function downsampleTo16k(input: Float32Array, sourceSampleRate: number): Float32Array {
  if (sourceSampleRate === TARGET_SAMPLE_RATE) {
    return input
  }

  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = Math.floor(i * ratio)
    output[i] = input[sourceIndex] ?? 0
  }

  return output
}

type PcmBytes = Uint8Array<ArrayBufferLike>

function floatToInt16Pcm(input: Float32Array): PcmBytes {
  const buffer = new ArrayBuffer(input.length * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }

  return new Uint8Array(buffer)
}

function appendChunk(current: PcmBytes, next: PcmBytes): PcmBytes {
  const merged = new Uint8Array(current.length + next.length)
  merged.set(current, 0)
  merged.set(next, current.length)
  return merged
}

function parseServerMessage(raw: string): SttStatusEvent | SttResultEvent | { type: 'ready' } | { type: 'error'; error: string } | null {
  try {
    const data = JSON.parse(raw) as { type?: string; error?: string }
    if (data.type === 'ready' || data.type === 'status' || data.type === 'stt' || data.type === 'error') {
      return data as SttStatusEvent | SttResultEvent | { type: 'ready' } | { type: 'error'; error: string }
    }
  } catch {
    return null
  }
  return null
}

export async function startStt(options: SttRecorderOptions): Promise<SttRecorderSession> {
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    throw new Error('마이크 입력은 HTTPS 환경에서만 사용할 수 있습니다.')
  }
  if (!('AudioWorkletNode' in window)) {
    throw new Error('이 브라우저는 AudioWorklet을 지원하지 않습니다.')
  }

  const language = options.language ?? 'ko'
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  const audioContext = new AudioContext()
  const blobUrl = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }))
  await audioContext.audioWorklet.addModule(blobUrl)
  URL.revokeObjectURL(blobUrl)

  const source = audioContext.createMediaStreamSource(stream)
  const worklet = new AudioWorkletNode(audioContext, 'pcm-capture-processor')
  const ws = new WebSocket(buildSttWebSocketUrl(options.token, language))
  ws.binaryType = 'arraybuffer'

  let closed = false
  let ready = false
  let pending: PcmBytes = new Uint8Array()

  function cleanup() {
    if (closed) {
      return
    }
    closed = true
    worklet.port.onmessage = null
    source.disconnect()
    worklet.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
    options.onClose?.()
  }

  worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (!ready || ws.readyState !== WebSocket.OPEN) {
      return
    }

    const downsampled = downsampleTo16k(event.data, audioContext.sampleRate)
    pending = appendChunk(pending, floatToInt16Pcm(downsampled))

    while (pending.length >= CHUNK_BYTES) {
      ws.send(pending.slice(0, CHUNK_BYTES))
      pending = pending.slice(CHUNK_BYTES)
    }
  }

  ws.onmessage = (event) => {
    if (typeof event.data !== 'string') {
      return
    }

    const message = parseServerMessage(event.data)
    if (!message) {
      return
    }

    if (message.type === 'ready') {
      ready = true
      options.onReady?.()
      return
    }
    if (message.type === 'status') {
      options.onStatus?.(message)
      return
    }
    if (message.type === 'stt') {
      options.onResult(message)
      cleanup()
      return
    }
    if (message.type === 'error') {
      options.onError(message.error)
      cleanup()
    }
  }

  ws.onerror = () => {
    options.onError('STT WebSocket 연결 중 오류가 발생했습니다.')
    cleanup()
  }

  ws.onclose = () => {
    cleanup()
  }

  source.connect(worklet)
  worklet.connect(audioContext.destination)

  return { stop: cleanup }
}
