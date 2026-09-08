/**
 * Sound effects synthesized with WebAudio: zero assets, zero requests.
 * These are the menu blips that make navigation feel like a video game.
 */
type Cue = 'move' | 'confirm' | 'back' | 'toggle' | 'open' | 'error'

let ctx: AudioContext | null = null
let enabled = true

const MUTE_KEY = 'arcana:sfx-muted'

if (typeof localStorage !== 'undefined') {
  enabled = localStorage.getItem(MUTE_KEY) !== '1'
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOptions {
  freq: number
  to?: number
  type?: OscillatorType
  duration?: number
  gain?: number
  delay?: number
}

function tone({ freq, to, type = 'square', duration = 0.08, gain = 0.05, delay = 0 }: ToneOptions) {
  const ac = audio()
  if (!ac) return
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function noise(duration = 0.06, gain = 0.03) {
  const ac = audio()
  if (!ac) return
  const frames = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, frames, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2
  const src = ac.createBufferSource()
  const amp = ac.createGain()
  amp.gain.value = gain
  src.buffer = buffer
  src.connect(amp).connect(ac.destination)
  src.start()
}

const CUES: Record<Cue, () => void> = {
  move: () => tone({ freq: 520, to: 720, duration: 0.05, gain: 0.035 }),
  confirm: () => {
    tone({ freq: 660, to: 990, type: 'sawtooth', duration: 0.09, gain: 0.045 })
    tone({ freq: 990, to: 1480, type: 'square', duration: 0.12, gain: 0.035, delay: 0.06 })
    noise(0.09, 0.02)
  },
  back: () => tone({ freq: 420, to: 190, type: 'triangle', duration: 0.12, gain: 0.045 }),
  toggle: () => {
    tone({ freq: 880, duration: 0.035, gain: 0.03 })
    noise(0.03, 0.02)
  },
  open: () => {
    tone({ freq: 300, to: 620, type: 'sawtooth', duration: 0.18, gain: 0.04 })
    tone({ freq: 450, to: 930, type: 'square', duration: 0.22, gain: 0.03, delay: 0.05 })
  },
  error: () => tone({ freq: 180, to: 120, type: 'square', duration: 0.16, gain: 0.05 }),
}

export function play(cue: Cue) {
  if (!enabled) return
  try {
    CUES[cue]()
  } catch {
    /* audio must never break the interface */
  }
}

export function isMuted() {
  return !enabled
}

export function setMuted(muted: boolean) {
  enabled = !muted
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (!muted) play('toggle')
}
