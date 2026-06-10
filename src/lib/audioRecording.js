const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
]

const EXTENSION_BY_MIME = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'video/webm': 'webm',
}

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }

  return ''
}

export function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase().split(';')[0].trim()
  return EXTENSION_BY_MIME[normalized] || 'webm'
}

export function createAudioFileFromBlob(blob) {
  const mimeType = blob.type || getSupportedAudioMimeType() || 'audio/webm'
  const extension = extensionForMimeType(mimeType)
  return new File([blob], `voice-message.${extension}`, { type: mimeType })
}

/** Create MediaRecorder with several MIME / option fallbacks (Windows/Edge safe). */
export function createMediaRecorder(stream) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder not supported')
  }

  const mimeType = getSupportedAudioMimeType()
  const attempts = []

  if (mimeType) {
    attempts.push({ mimeType })
  }
  attempts.push(undefined)

  for (const options of attempts) {
    try {
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream)
      return { recorder, mimeType: recorder.mimeType || mimeType || 'audio/webm' }
    } catch {
      // Try next option.
    }
  }

  throw new Error('MediaRecorder could not start')
}

/**
 * Record from an open mic stream until stop() is called.
 * Returns { stop, mimeType } — call stop() to finish and get the audio File.
 */
export function recordFromStream(stream) {
  const { recorder, mimeType } = createMediaRecorder(stream)
  const chunks = []

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  let stopPromise = null
  let stopResolve = null
  let stopReject = null

  stopPromise = new Promise((resolve, reject) => {
    stopResolve = resolve
    stopReject = reject
  })

  recorder.onstop = () => {
    const blobType = mimeType || recorder.mimeType || 'audio/webm'
    const blob = new Blob(chunks, { type: blobType })
    if (blob.size === 0) {
      stopReject(new Error('EMPTY_RECORDING'))
      return
    }
    stopResolve(createAudioFileFromBlob(blob))
  }

  recorder.onerror = () => {
    stopReject(new Error('RECORDER_ERROR'))
  }

  try {
    recorder.start()
  } catch {
    try {
      recorder.start(500)
    } catch (startError) {
      stopReject(startError)
    }
  }

  return {
    mimeType,
    stop: () => {
      if (recorder.state !== 'inactive') {
        try {
          recorder.requestData()
        } catch {
          // ignore
        }
        recorder.stop()
      }
      return stopPromise
    },
  }
}
