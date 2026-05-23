import type { GmailMessage, GmailMessagesResponse, GmailLabelsResponse } from '../types/gmail'

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function apiFetch<T>(token: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const msg = (err as { error?: { message?: string } }).error?.message ?? `API ${res.status}`
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const gmailService = {
  listMessages(token: string, labelIds: string[], pageToken?: string, q?: string) {
    const params = new URLSearchParams({ maxResults: '25' })
    labelIds.forEach((id) => params.append('labelIds', id))
    if (pageToken) params.set('pageToken', pageToken)
    if (q) params.set('q', q)
    return apiFetch<GmailMessagesResponse>(token, `/messages?${params}`)
  },

  async batchGetMessageMetadata(token: string, ids: string[]): Promise<GmailMessage[]> {
    const METADATA_HEADERS = ['From', 'To', 'Subject', 'Date']
    const params = new URLSearchParams({
      format: 'metadata',
      ...Object.fromEntries(METADATA_HEADERS.map((h) => [`metadataHeaders`, h])),
    })
    METADATA_HEADERS.forEach((h) => params.append('metadataHeaders', h))
    return Promise.all(
      ids.map((id) => apiFetch<GmailMessage>(token, `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`))
    )
  },

  getMessage(token: string, id: string) {
    return apiFetch<GmailMessage>(token, `/messages/${id}?format=full`)
  },

  modifyMessage(token: string, id: string, addLabelIds: string[], removeLabelIds: string[]) {
    return apiFetch(token, `/messages/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    })
  },

  trashMessage(token: string, id: string) {
    return apiFetch(token, `/messages/${id}/trash`, { method: 'POST' })
  },

  sendMessage(token: string, raw: string) {
    return apiFetch(token, '/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    })
  },

  listLabels(token: string) {
    return apiFetch<GmailLabelsResponse>(token, '/labels')
  },

  getProfile(token: string) {
    return apiFetch<{ emailAddress: string }>(token, '/profile')
  },
}
