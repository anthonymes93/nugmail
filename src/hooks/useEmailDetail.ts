import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { gmailService } from '../services/gmail'
import { parseGmailMessage } from '../utils/emailParser'

export function useEmailDetail(messageId: string | undefined, accountEmail: string | undefined) {
  const { getToken } = useAuth()
  const token = accountEmail ? getToken(accountEmail) : undefined

  return useQuery({
    queryKey: ['email', messageId, accountEmail],
    queryFn: async () => {
      const msg = await gmailService.getMessage(token!, messageId!)
      return { ...parseGmailMessage(msg), accountEmail: accountEmail! }
    },
    enabled: !!token && !!messageId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEmailActions() {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['emailList'] })
    qc.invalidateQueries({ queryKey: ['email'] })
  }

  const star = useMutation({
    mutationFn: ({ id, starred, accountEmail }: { id: string; starred: boolean; accountEmail: string }) => {
      const token = getToken(accountEmail)!
      return gmailService.modifyMessage(token, id, starred ? ['STARRED'] : [], starred ? [] : ['STARRED'])
    },
    onSuccess: invalidate,
  })

  const markRead = useMutation({
    mutationFn: ({ id, read, accountEmail }: { id: string; read: boolean; accountEmail: string }) => {
      const token = getToken(accountEmail)!
      return gmailService.modifyMessage(token, id, read ? [] : ['UNREAD'], read ? ['UNREAD'] : [])
    },
    onSuccess: invalidate,
  })

  const archive = useMutation({
    mutationFn: ({ id, accountEmail }: { id: string; accountEmail: string }) => {
      const token = getToken(accountEmail)!
      return gmailService.modifyMessage(token, id, [], ['INBOX'])
    },
    onSuccess: invalidate,
  })

  const trash = useMutation({
    mutationFn: ({ id, accountEmail }: { id: string; accountEmail: string }) => {
      const token = getToken(accountEmail)!
      return gmailService.trashMessage(token, id)
    },
    onSuccess: invalidate,
  })

  return { star, markRead, archive, trash }
}
