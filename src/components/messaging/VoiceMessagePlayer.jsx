import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function VoiceMessagePlayer({ src, mine = false }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) {
      return undefined
    }

    setPlaying(false)
    setProgress(0)
    setDuration(0)
    setError(false)
    audio.load()

    const syncDuration = () => {
      const value = audio.duration
      if (Number.isFinite(value) && value > 0) {
        setDuration(value)
      }
    }

    const onTimeUpdate = () => setProgress(audio.currentTime || 0)
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
    }
    const onError = () => {
      setPlaying(false)
      setError(true)
    }

    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('canplay', syncDuration)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('durationchange', syncDuration)
      audio.removeEventListener('canplay', syncDuration)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [src])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !src || error) {
      return
    }

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    try {
      await audio.play()
      setPlaying(true)
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    } catch {
      setPlaying(false)
      setError(true)
    }
  }

  const ratio = duration > 0 ? progress / duration : 0
  const barCount = 24

  if (!src) {
    return null
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={error}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
          mine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#0084ff]/10 hover:bg-[#0084ff]/20 text-[#0084ff]'
        }`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-6">
          {Array.from({ length: barCount }).map((_, index) => {
            const threshold = index / barCount
            const active = ratio >= threshold
            const height = 6 + ((index % 5) + 1) * 3

            return (
              <span
                key={index}
                className={`w-[3px] rounded-full transition-colors ${
                  active
                    ? mine
                      ? 'bg-white'
                      : 'bg-[#0084ff]'
                    : mine
                      ? 'bg-white/35'
                      : 'bg-slate-300 dark:bg-slate-600'
                }`}
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
        <p className={`text-[11px] mt-1 ${mine ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
          {error ? '—' : formatDuration(playing ? progress : duration)}
        </p>
      </div>

      <audio ref={audioRef} src={src} preload="auto" className="hidden" />
    </div>
  )
}

export default VoiceMessagePlayer
