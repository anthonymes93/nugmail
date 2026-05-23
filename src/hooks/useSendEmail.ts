import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { gmailService } from '../services/gmail'
import { buildMimeMessage } from '../utils/emailBuilder'

interface SendParams {
  to: string
  subject: string
  body: string
  fromAccountEmail: string
  inReplyTo?: string
  references?: string
}

export function useSendEmail() {
  const { accounts, getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: SendParams) => {
      const account = accounts.find((a) => a.user.email === params.fromAccountEmail)
      const token = getToken(params.fromAccountEmail)
      if (!token || !account) throw new Error('Account not found or token expired')
      const raw = buildMimeMessage({
        to: params.to,
        subject: params.subject,
        body: params.body,
        from: `${account.user.name} <${account.user.email}>`,
        inReplyTo: params.inReplyTo,
        references: params.references,
      })
      return gmailService.sendMessage(token, raw)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emailList', 'SENT'] })
    },
  })
}
