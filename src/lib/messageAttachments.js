export const MAX_MESSAGE_ATTACHMENT_BYTES = 20 * 1024 * 1024

export function validateMessageAttachment(file, maxBytes = MAX_MESSAGE_ATTACHMENT_BYTES) {
  if (!file) {
    return 'No file selected.'
  }

  if (file.size > maxBytes) {
    return 'File must be 20 MB or smaller.'
  }

  return ''
}
