import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { gmailService } from '../services/gmail'
import { parseGmailMessage } from '../utils/emailParser'
import type { ParsedEmail } from '../types/gmail'

type PageTokenMap = Record<string, string | undefined>

export function useEmailList(labelId: string, searchQuery?: string) {
  const { activeAccounts } = useAuth()
  const accountKey = activeAccounts.map((a) => a.user.email).join(',')

  const query = useInfiniteQuery({
    queryKey: ['emailList', labelId, searchQuery ?? '', accountKey],
    queryFn: async ({ pageParam }) => {
      const tokenMap = (pageParam as PageTokenMap | undefined) ?? {}

      const results = await Promise.all(
        activeAccounts.map(async (account) => {
          const labelIds = searchQuery ? [] : [labelId]
          const listRes = await gmailService.listMessages(
            account.accessToken,
            labelIds,
            tokenMap[account.user.email],
            searchQuery
          )
          const ids = listRes.messages?.map((m) => m.id) ?? []
          if (ids.length === 0) {
            return { emails: [] as ParsedEmail[], nextPageToken: undefined, accountEmail: account.user.email }
          }
          const messages = await gmailService.batchGetMessageMetadata(account.accessToken, ids)
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
    enabled: activeAccounts.length > 0,
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
