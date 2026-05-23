import type { GmailMessage, GmailMessagePart, ParsedEmail } from '../types/gmail'

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    try {
      return atob(padded)
    } catch {
      return ''
    }
  }
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function findPart(part: GmailMessagePart, mimeType: string): GmailMessagePart | undefined {
  if (part.mimeType === mimeType) return part
  if (part.parts) {
    for (const p of part.parts) {
      const found = findPart(p, mimeType)
      if (found) return found
    }
  }
  return undefined
}

function hasAttachmentParts(part: GmailMessagePart): boolean {
  if (part.filename && part.filename.length > 0 && part.body.attachmentId) return true
  return part.parts?.some(hasAttachmentParts) ?? false
}

export function parseFromAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<(.+?)>$/)
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, '')
    return { name: name || match[2].trim(), email: match[2].trim() }
  }
  return { name: from.trim(), email: from.trim() }
}

export function parseGmailMessage(message: GmailMessage): ParsedEmail {
  const headers = message.payload?.headers ?? []
  const from = getHeader(headers, 'from')
  const { name: fromName, email: fromEmail } = parseFromAddress(from)

  const htmlPart = findPart(message.payload, 'text/html')
  const textPart = findPart(message.payload, 'text/plain')

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds ?? [],
    snippet: message.snippet ?? '',
    internalDate: parseInt(message.internalDate, 10),
    from,
    fromName: fromName || fromEmail,
    fromEmail,
    to: getHeader(headers, 'to'),
    cc: getHeader(headers, 'cc') || undefined,
    replyTo: getHeader(headers, 'reply-to') || undefined,
    subject: getHeader(headers, 'subject') || '(no subject)',
    bodyHtml: htmlPart?.body?.data ? decodeBase64Url(htmlPart.body.data) : undefined,
    bodyText: textPart?.body?.data ? decodeBase64Url(textPart.body.data) : undefined,
    hasAttachments: hasAttachmentParts(message.payload),
    isUnread: message.labelIds?.includes('UNREAD') ?? false,
    isStarred: message.labelIds?.includes('STARRED') ?? false,
    isImportant: message.labelIds?.includes('IMPORTANT') ?? false,
    accountEmail: '',
  }
}
