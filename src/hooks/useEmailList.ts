import { useInfiniteQuery } from '@tanstack/react-query'
import { isAccountActive, useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from './useGoogleAuth'
import { gmailService, isGmailApiError } from '../services/gmail'
import { parseGmailMessage } from '../utils/emailParser'
import type { ParsedEmail } from '../types/gmail'

type PageTokenMap = Record<string, string | undefined>

export function useEmailList(labelId: string, searchQuery?: string) {
  const { accounts } = useAuth()
  const { refreshAccount } = useGoogleAuth()
  const accountKey = accounts.map((a) => `${a.user.email}:${a.tokenExpiry}`).join(',')

  const query = useInfiniteQuery({
    queryKey: ['emailList', labelId, searchQuery ?? '', accountKey],
    queryFn: async ({ pageParam }) => {
      const tokenMap = (pageParam as PageTokenMap | undefined) ?? {}

      const results = await Promise.all(
        accounts.map(async (account) => {
          const getFreshToken = async () => {
            if (isAccountActive(account)) return account.accessToken
            const refreshedToken = await refreshAccount(account.user.email)
            if (!refreshedToken) throw new Error('Session expired. Sign in again to reload your mail.')
            return refreshedToken
          }

          let token = await getFreshToken()
          const labelIds = searchQuery ? [] : [labelId]

          const listMessages = () =>
            gmailService.listMessages(token, labelIds, tokenMap[account.user.email], searchQuery)

          const listRes = await listMessages().catch(async (error) => {
            if (!isGmailApiError(error) || error.status !== 401) throw error
            const refreshedToken = await refreshAccount(account.user.email)
            if (!refreshedToken) throw new Error('Session expired. Sign in again to reload your mail.')
            token = refreshedToken
            return listMessages()
          })

          const ids = listRes.messages?.map((m) => m.id) ?? []
          if (ids.length === 0) {
            return { emails: [] as ParsedEmail[], nextPageToken: undefined, accountEmail: account.user.email }
          }
          const messages = await gmailService.batchGetMessageMetadata(token, ids).catch(async (error) => {
            if (!isGmailApiError(error) || error.status !== 401) throw error
            const refreshedToken = await refreshAccount(account.user.email)
            if (!refreshedToken) throw new Error('Session expired. Sign in again to reload your mail.')
            token = refreshedToken
            return gmailService.batchGetMessageMetadata(token, ids)
          })
          return {
            emails: messages.map((msg) => ({
              ...parseGmailMessage(msg),
              accountEmail: account.user.email,
            })),
            nextPageToken: listRes.nextPageToken,
            accountEmail: account.user.email,
          }
        })
      )

      // Merge all emails across accounts, sorted newest first
      const allEmails = results.flatMap((r) => r.emails)
      allEmails.sort((a, b) => b.internalDate - a.internalDate)

      const nextTokens: PageTokenMap = {}
      for (const r of results) {
        if (r.nextPageToken) nextTokens[r.accountEmail] = r.nextPageToken
      }

      return {
        emails: allEmails,
        nextPageToken: Object.keys(nextTokens).length > 0 ? nextTokens : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    initialPageParam: undefined as PageTokenMap | undefined,
    enabled: accounts.length > 0,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  return {
    emails: query.data?.pages.flatMap((p) => p.emails) ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching && !query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: !!query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  }
}
