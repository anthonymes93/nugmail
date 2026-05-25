import { useEffect, useRef } from 'react'
import { useEmailList } from './useEmailList'
import { usePushNotifications } from './usePushNotifications'

export function useInboxNotifications() {
  const { emails, isLoading } = useEmailList('INBOX')
  const { notify } = usePushNotifications()
  const seenIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (isLoading || emails.length === 0) return

    const currentIds = new Set(emails.map((e) => e.id))

    // First load — initialize without notifying
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds
      return
    }

    const newEmails = emails.filter((e) => !seenIdsRef.current!.has(e.id))
    seenIdsRef.current = currentIds

    if (newEmails.length === 0) return

    // Notify for up to 3 new emails to avoid notification flood
    for (const email of newEmails.slice(0, 3)) {
      void notify({
        title: email.subject || '(no subject)',
        body: email.fromName || email.fromEmail || email.from,
        messageId: email.id,
      })
    }
  }, [emails, isLoading, notify])
}
