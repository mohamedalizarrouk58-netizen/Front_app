import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Mic, Paperclip, SendHorizontal, Square, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { extractApiErrorMessage } from '../../lib/api'
import { validateMessageAttachment } from '../../lib/messageAttachments'
import { recordFromStream } from '../../lib/audioRecording'
import {
  MIC_ERROR,
  canUseMicrophoneApi,
  isSecureRecordingContext,
  mapMicErrorToI18nKey,
  probeMicrophone,
  queryMicrophonePermission,
  requestMicrophoneStream,
} from '../../lib/microphoneAccess'

function MessengerComposer({
  value,
  onChange,
  onSendText,
  onSendImage,
  onSendFile,
  onSendAudio,
  sending = false,
  disabled = false,
}) {
  const { t } = useTranslation()
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const audioFileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [recording, setRecording] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const [micError, setMicError] = useState('')
  const [micIssueCode, setMicIssueCode] = useState('')
  const [micReady, setMicReady] = useState(false)
  const [micPermission, setMicPermission] = useState('unknown')
  const [requestingMic, setRequestingMic] = useState(false)
  const [probingMic, setProbingMic] = useState(false)
  const mediaStreamRef = useRef(null)
  const activeRecordingRef = useRef(null)

  const canSendText = Boolean(value.trim()) && !sending && !disabled && !uploadingAudio && !uploadingFile
  const showMic =
    !value.trim() &&
    !imagePreview &&
    !sending &&
    !disabled &&
    !uploadingAudio &&
    !uploadingFile &&
    micIssueCode !== MIC_ERROR.NO_DEVICE
  const canRecord = canUseMicrophoneApi() && isSecureRecordingContext()
  const showInsecureHelp = !isSecureRecordingContext()
  const isBusy = sending || uploadingAudio || uploadingFile || recording || probingMic

  const cleanupStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    activeRecordingRef.current = null
  }

  const refreshMicPermission = async () => {
    const state = await queryMicrophonePermission()
    setMicPermission(state)
    return state
  }

  const setMicFailure = (code) => {
    setMicIssueCode(code)
    setMicError(t(mapMicErrorToI18nKey(code)))
    setMicReady(false)
    if (code === MIC_ERROR.DENIED) {
      setMicPermission('denied')
    }
  }

  const applyProbeResult = (probe) => {
    if (probe.ok) {
      setMicIssueCode('')
      setMicError('')
      setMicReady(true)
      return
    }

    setMicFailure(probe.code || MIC_ERROR.UNKNOWN)
  }

  const runMicProbe = async () => {
    setProbingMic(true)
    try {
      const probe = await probeMicrophone()
      applyProbeResult(probe)
      return probe
    } finally {
      setProbingMic(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    let permissionStatus = null

    async function init() {
      const state = await refreshMicPermission()
      if (cancelled) {
        return
      }

      if (navigator.permissions?.query) {
        try {
          permissionStatus = await navigator.permissions.query({ name: 'microphone' })
          permissionStatus.onchange = () => {
            if (!cancelled) {
              setMicPermission(permissionStatus.state)
              if (permissionStatus.state === 'granted') {
                void runMicProbe()
              } else if (permissionStatus.state === 'denied') {
                setMicFailure(MIC_ERROR.DENIED)
              }
            }
          }
        } catch {
          // Permissions API not fully supported.
        }
      }

      if (state === 'granted') {
        await runMicProbe()
      } else if (state === 'denied') {
        setMicFailure(MIC_ERROR.DENIED)
      }
    }

    void init()

    return () => {
      cancelled = true
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
      cleanupStream()
    }
  }, [t])

  const handleImagePick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file?.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview({ file, previewUrl: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleFilePick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    const sizeError = validateMessageAttachment(file)
    if (sizeError) {
      setFileError(t('messages.fileTooLarge'))
      return
    }

    if (!onSendFile) {
      setFileError(t('messages.sendError'))
      return
    }

    if (disabled) {
      setFileError(t('messages.selectFirst'))
      return
    }

    setUploadingFile(true)
    setFileError('')
    setMicError('')
    try {
      await onSendFile(file)
    } catch (requestError) {
      setFileError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAudioFilePick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setUploadingAudio(true)
    setMicError('')
    setMicIssueCode('')
    try {
      await onSendAudio?.(file)
    } catch (requestError) {
      setMicError(extractApiErrorMessage(requestError, t('messages.sendError')))
    } finally {
      setUploadingAudio(false)
    }
  }

  const sendImage = async () => {
    if (!imagePreview?.file || isBusy) {
      return
    }

    await onSendImage?.(imagePreview.file, value.trim())
    setImagePreview(null)
    onChange('')
  }

  const stopRecording = async () => {
    const session = activeRecordingRef.current
    if (!session) {
      return
    }

    setUploadingAudio(true)
    setMicError('')

    try {
      const file = await session.stop()
      cleanupStream()
      setRecording(false)
      await onSendAudio?.(file)
    } catch (error) {
      cleanupStream()
      setRecording(false)
      if (error?.code || error?.message === 'EMPTY_RECORDING' || error?.message === 'RECORDER_ERROR') {
        setMicFailure(error.code || error.message || MIC_ERROR.UNKNOWN)
      } else {
        setMicError(extractApiErrorMessage(error, t('messages.sendError')))
      }
    } finally {
      setUploadingAudio(false)
    }
  }

  const requestMicAccess = async () => {
    setRequestingMic(true)
    setMicError('')

    try {
      const probe = await probeMicrophone()
      if (probe.ok) {
        setMicPermission('granted')
        applyProbeResult(probe)
      } else {
        setMicFailure(probe.code || MIC_ERROR.UNKNOWN)
        await refreshMicPermission()
      }
    } catch (error) {
      setMicFailure(error.code || MIC_ERROR.UNKNOWN)
      await refreshMicPermission()
    } finally {
      setRequestingMic(false)
    }
  }

  const startRecording = async () => {
    if (isBusy || recording) {
      return
    }

    if (disabled) {
      setMicError(t('messages.selectFirst'))
      return
    }

    if (!canRecord) {
      setMicError(t(mapMicErrorToI18nKey(MIC_ERROR.INSECURE)))
      return
    }

    setMicError('')

    try {
      const stream = await requestMicrophoneStream()
      mediaStreamRef.current = stream
      setMicPermission('granted')
      setMicIssueCode('')
      setMicReady(true)

      const session = recordFromStream(stream)
      activeRecordingRef.current = session
      setRecording(true)
    } catch (error) {
      cleanupStream()
      setRecording(false)
      setMicFailure(error.code || MIC_ERROR.UNKNOWN)
      await refreshMicPermission()
    }
  }

  const toggleRecording = () => {
    if (recording) {
      void stopRecording()
      return
    }
    void startRecording()
  }

  return (
    <div className="space-y-2">
      {imagePreview ? (
        <div className="relative inline-block">
          <img
            src={imagePreview.previewUrl}
            alt=""
            className="h-24 w-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
          />
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 rounded-full bg-slate-800 text-white p-1 shadow-md"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {showInsecureHelp ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">{t('messages.micInsecure')}</p>
          <p className="mt-1 text-amber-800">{t('messages.micInsecureHelp')}</p>
        </div>
      ) : null}

      {probingMic ? (
        <p className="text-[11px] text-slate-500">{t('messages.micChecking')}</p>
      ) : null}

      {micReady && !micError && !recording && !probingMic ? (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{t('messages.micReady')}</p>
      ) : null}

      {micError && !showInsecureHelp ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
          <p className="font-medium">{micError}</p>
          {micIssueCode === MIC_ERROR.DENIED ? (
            <p className="mt-1 leading-relaxed">{t('messages.micDeniedHelp')}</p>
          ) : null}
          {micIssueCode === MIC_ERROR.NO_DEVICE ? (
            <p className="mt-1 leading-relaxed">{t('messages.micNoDeviceHelp')}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {micIssueCode === MIC_ERROR.NO_DEVICE ? (
              <button
                type="button"
                disabled={isBusy || disabled}
                onClick={() => audioFileInputRef.current?.click()}
                className="rounded-full bg-[#0084ff] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0073e6] disabled:opacity-50"
              >
                {t('messages.uploadVoiceFile')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={requestingMic || !canRecord}
                  onClick={() => void requestMicAccess()}
                  className="rounded-full bg-[#0084ff] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#0073e6] disabled:opacity-50"
                >
                  {requestingMic ? t('messages.micChecking') : t('messages.micEnableButton')}
                </button>
                <button
                  type="button"
                  disabled={requestingMic || !canRecord || disabled}
                  onClick={() => void startRecording()}
                  className="rounded-full border border-rose-300 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {t('messages.micRetryRecord')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {recording ? (
        <div className="flex items-center gap-2 text-sm text-rose-600 animate-pulse">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          {t('messages.recordingActive')}
        </div>
      ) : null}

      {uploadingAudio ? (
        <p className="text-[11px] text-slate-500">{t('messages.sendingVoice')}</p>
      ) : null}

      {uploadingFile ? (
        <p className="text-[11px] text-slate-500">{t('messages.sendingFile')}</p>
      ) : null}

      {fileError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          {fileError}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImagePick}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => void handleFilePick(event)}
        />
        <input
          ref={audioFileInputRef}
          type="file"
          accept="audio/*,.webm,.ogg,.mp3,.m4a,.wav"
          className="hidden"
          onChange={(event) => void handleAudioFilePick(event)}
        />

        <button
          type="button"
          disabled={isBusy}
          onClick={() => imageInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0084ff] hover:bg-[#0084ff]/10 transition-colors disabled:opacity-40"
          title={t('messages.attachImage')}
        >
          <ImageIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          disabled={isBusy || disabled}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0084ff] hover:bg-[#0084ff]/10 transition-colors disabled:opacity-40"
          title={t('messages.attachFile')}
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <div className="flex flex-1 items-center min-h-[44px] rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#242526] px-4 shadow-sm focus-within:border-[#0084ff]/40 focus-within:ring-2 focus-within:ring-[#0084ff]/15 transition-all">
          <textarea
            className="w-full resize-none bg-transparent text-[15px] text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 min-h-[24px] max-h-28 py-2 leading-snug"
            placeholder={t('messages.writePlaceholder')}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={1}
            disabled={isBusy}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (imagePreview) {
                  void sendImage()
                } else if (canSendText) {
                  void onSendText()
                }
              }
            }}
          />
        </div>

        {imagePreview ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void sendImage()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white hover:bg-[#0073e6] shadow-md transition-all disabled:opacity-40"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        ) : recording ? (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 shadow-md transition-all"
            title={t('messages.stopRecording')}
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : showMic ? (
          <button
            type="button"
            disabled={isBusy || !canRecord}
            onClick={toggleRecording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white hover:bg-[#0073e6] shadow-md transition-all disabled:opacity-40"
            title={t('messages.tapToRecord')}
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSendText}
            onClick={() => void onSendText()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white hover:bg-[#0073e6] shadow-md transition-all disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {canRecord && !showInsecureHelp ? (
          <button
            type="button"
            disabled={isBusy || disabled}
            onClick={() => audioFileInputRef.current?.click()}
            className={`text-[11px] underline-offset-2 hover:underline disabled:opacity-50 ${
              micIssueCode === MIC_ERROR.NO_DEVICE
                ? 'font-medium text-[#0084ff]'
                : 'text-slate-500 hover:text-[#0084ff]'
            }`}
          >
            {t('messages.uploadVoiceFile')}
          </button>
        ) : null}
        <span className="text-[11px] text-slate-400">{t('messages.attachmentHint')}</span>
      </div>
    </div>
  )
}

export default MessengerComposer
