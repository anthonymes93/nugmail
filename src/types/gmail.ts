export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
  messagesUnread?: number
  threadsUnread?: number
  color?: { textColor: string; backgroundColor: string }
}

export interface GmailMessageHeader {
  name: string
  value: string
}

export interface GmailMessageBody {
  size: number
  data?: string
  attachmentId?: string
}

export interface GmailMessagePart {
  partId?: string
  mimeType: string
  filename?: string
  headers: GmailMessageHeader[]
  body: GmailMessageBody
  parts?: GmailMessagePart[]
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  payload: GmailMessagePart
  sizeEstimate?: number
}

export interface GmailMessageListItem {
  id: string
  threadId: string
}

export interface GmailMessagesResponse {
  messages?: GmailMessageListItem[]
  nextPageToken?: string
  resultSizeEstimate: number
}

export interface GmailLabelsResponse {
  labels: GmailLabel[]
}

export interface ParsedEmail {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: number
  from: string
  fromName: string
  fromEmail: string
  to: string
  cc?: string
  replyTo?: string
  subject: string
  bodyHtml?: string
  bodyText?: string
  hasAttachments: boolean
  isUnread: boolean
  isStarred: boolean
  isImportant: boolean
  accountEmail: string
}

export interface User {
  email: string
  name: string
  picture: string
}

export interface Account {
  accessToken: string
  tokenExpiry: number
  user: User
}
