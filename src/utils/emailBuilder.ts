export function buildMimeMessage(params: {
  to: string
  from: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
}): string {
  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ]

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`)
    lines.push(`References: ${params.references ?? params.inReplyTo}`)
  }

  lines.push('', params.body)

  const message = lines.join('\r\n')
  const bytes = new TextEncoder().encode(message)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
