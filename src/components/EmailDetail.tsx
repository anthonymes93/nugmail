import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Star, Archive, Trash2, MoreVertical,
  Reply, ReplyAll, Forward, Loader2, Mail
} from 'lucide-react'
import { useEmailDetail, useEmailActions } from '../hooks/useEmailDetail'
import { formatFullDate, getInitials, getAvatarColor } from '../utils/formatters'
import ComposeModal from './ComposeModal'
import DOMPurify from 'dompurify'

export default function EmailDetail() {
  const { messageId } = useParams<{ messageId: string }>()
  const [searchParams] = useSearchParams()
  const accountEmail = searchParams.get('acc') ?? ''
  const navigate = useNavigate()

  const { data: email, isLoading, isError } = useEmailDetail(messageId, accountEmail)
  const { star, archive, trash } = useEmailActions()
  const [replyOpen, setReplyOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !email?.bodyHtml) return
    const onLoad = () => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 40 + 'px'
      }
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [email?.bodyHtml])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (isError || !email) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Mail size={32} />
        <p className="text-sm">Failed to load email.</p>
        <button onClick={() => navigate(-1)} className="text-g-blue text-sm">Go back</button>
      </div>
    )
  }

  const avatarColor = getAvatarColor(email.fromEmail)
  const initials = getInitials(email.fromName)
  const bodyContent = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, { USE_PROFILES: { html: true } })
    : (email.bodyText ?? email.snippet)

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100">
          <div className="flex-1" />
          <button
            onClick={() => star.mutate({ id: email.id, starred: !email.isStarred, accountEmail: email.accountEmail })}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Star size={20} className={email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'} />
          </button>
          <button
            onClick={() => archive.mutate({ id: email.id, accountEmail: email.accountEmail }, { onSuccess: () => navigate(-1) })}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Archive"
          >
            <Archive size={20} className="text-gray-500" />
          </button>
          <button
            onClick={() => trash.mutate({ id: email.id, accountEmail: email.accountEmail }, { onSuccess: () => navigate(-1) })}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Delete"
          >
            <Trash2 size={20} className="text-gray-500" />
          </button>
          <div className="relative">
            <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-full hover:bg-gray-100">
              <MoreVertical size={20} className="text-gray-500" />
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
                <div className="absolute right-0 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-40">
                  <button
                    onClick={() => { setShowMore(false); setReplyOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Forward size={16} />
                    Forward
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-auto px-4 pt-4 pb-32 max-w-3xl mx-auto w-full">
          <h1 className="text-xl font-normal text-gray-900 mb-4 leading-snug">{email.subject}</h1>

          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${avatarColor}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 text-sm">{email.fromName}</span>
                <span className="text-xs text-gray-500">{formatFullDate(email.internalDate)}</span>
              </div>
              <p className="text-xs text-gray-500">
                to {email.to}
                {email.cc && `, cc: ${email.cc}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">via {email.accountEmail}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            {email.bodyHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={bodyContent}
                sandbox="allow-same-origin"
                className="w-full border-none overflow-hidden"
                style={{ minHeight: '200px' }}
                title="Email body"
              />
            ) : (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {bodyContent}
              </pre>
            )}
          </div>
        </div>

        {/* Reply bar */}
        <div className="fixed bottom-0 left-0 right-0 md:relative bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Reply size={16} />
            Reply
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ReplyAll size={16} />
            Reply all
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Forward size={16} />
            Forward
          </button>
        </div>
      </div>

      {replyOpen && (
        <ComposeModal
          onClose={() => setReplyOpen(false)}
          replyTo={email.replyTo ?? email.from}
          replySubject={email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`}
          inReplyTo={email.id}
          fromAccountEmail={email.accountEmail}
        />
      )}
    </>
  )
}
