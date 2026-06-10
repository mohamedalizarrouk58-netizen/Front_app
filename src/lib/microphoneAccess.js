export const MIC_ERROR = {
  INSECURE: 'INSECURE',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  DENIED: 'DENIED',
  NO_DEVICE: 'NO_DEVICE',
  BUSY: 'BUSY',
  EMPTY: 'EMPTY',
  RECORDER: 'RECORDER',
  UNKNOWN: 'UNKNOWN',
}

export function isSecureRecordingContext() {
  return typeof window !== 'undefined' && window.isSecureContext
}

export function canUseMicrophoneApi() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  )
}

export async function queryMicrophonePermission() {
  if (!canUseMicrophoneApi() || !navigator.permissions?.query) {
    return 'unknown'
  }

  try {
    const status = await navigator.permissions.query({ name: 'microphone' })
    return status.state
  } catch {
    return 'unknown'
  }
}

export async function countAudioInputDevices() {
  if (!canUseMicrophoneApi() || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    return 0
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'audioinput').length
  } catch {
    return 0
  }
}

function mapNativeMicError(nativeError) {
  const mapped = new Error(nativeError?.message || 'Microphone error')
  const name = nativeError?.name || ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    mapped.code = MIC_ERROR.DENIED
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    mapped.code = MIC_ERROR.NO_DEVICE
  } else if (name === 'NotReadableError' || name === 'TrackStartError') {
    mapped.code = MIC_ERROR.BUSY
  } else if (name === 'SecurityError') {
    mapped.code = MIC_ERROR.INSECURE
  } else {
    mapped.code = MIC_ERROR.UNKNOWN
  }

  return mapped
}

export async function requestMicrophoneStream() {
  if (!isSecureRecordingContext()) {
    const error = new Error('Microphone requires a secure context')
    error.code = MIC_ERROR.INSECURE
    throw error
  }

  if (!canUseMicrophoneApi()) {
    const error = new Error('Microphone API not supported')
    error.code = MIC_ERROR.NOT_SUPPORTED
    throw error
  }

  // Simplest constraints first — some Windows setups fail with advanced audio flags.
  const constraintsList = [
    { audio: true, video: false },
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    },
  ]

  let lastError = null

  for (const constraints of constraintsList) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const hasLiveTrack = stream.getAudioTracks().some((track) => track.readyState === 'live')
      if (!hasLiveTrack) {
        stream.getTracks().forEach((track) => track.stop())
        const error = new Error('No live audio track')
        error.code = MIC_ERROR.NO_DEVICE
        throw error
      }
      return stream
    } catch (nativeError) {
      lastError = nativeError?.code ? nativeError : mapNativeMicError(nativeError)
    }
  }

  if (lastError?.code) {
    throw lastError
  }

  const error = new Error('Microphone unavailable')
  error.code = MIC_ERROR.UNKNOWN
  throw error
}

/** Opens the mic briefly to verify hardware is available (not just browser permission). */
export async function probeMicrophone() {
  try {
    const stream = await requestMicrophoneStream()
    const label = stream.getAudioTracks()[0]?.label || ''
    stream.getTracks().forEach((track) => track.stop())
    const deviceCount = await countAudioInputDevices()
    return { ok: true, deviceCount, label }
  } catch (error) {
    return {
      ok: false,
      code: error.code || MIC_ERROR.UNKNOWN,
      deviceCount: await countAudioInputDevices(),
    }
  }
}

export function mapMicErrorToI18nKey(codeOrMessage) {
  switch (codeOrMessage) {
    case MIC_ERROR.INSECURE:
      return 'messages.micInsecure'
    case MIC_ERROR.NOT_SUPPORTED:
      return 'messages.micUnavailable'
    case MIC_ERROR.DENIED:
      return 'messages.micDenied'
    case MIC_ERROR.NO_DEVICE:
      return 'messages.micNoDevice'
    case MIC_ERROR.BUSY:
      return 'messages.micDeviceBusy'
    case MIC_ERROR.EMPTY:
    case 'EMPTY_RECORDING':
      return 'messages.recordingTooShort'
    case MIC_ERROR.RECORDER:
    case 'RECORDER_ERROR':
      return 'messages.micRecorderError'
    default:
      return 'messages.micError'
  }
}
