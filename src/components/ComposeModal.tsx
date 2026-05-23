import { useState } from 'react'
import { X, Minimize2, Maximize2, Send, Trash2, ChevronDown } from 'lucide-react'
import { useSendEmail } from '../hooks/useSendEmail'
import { useAuth } from '../contexts/AuthContext'

interface ComposeModalProps {
  onClose: () => void
  replyTo?: string
  replySubject?: string
  inReplyTo?: string
  fromAccountEmail?: string
}

export default function ComposeModal({ onClose, replyTo, replySubject, inReplyTo, fromAccountEmail }: ComposeModalProps) {
  const { accounts } = useAuth()
  const defaultAccount = fromAccountEmail ?? accounts[0]?.user.email ?? ''

  const [to, setTo] = useState(replyTo ?? '')
  const [subject, setSubject] = useState(replySubject ?? '')
  const [body, setBody] = useState('')
  const [fromEmail, setFromEmail] = useState(defaultAccount)
  const [minimized, setMinimized] = useState(false)

  const sendEmail = useSendEmail()

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) return
    try {
      await sendEmail.mutateAsync({ to, subject, body, inReplyTo, fromAccountEmail: fromEmail })
      onClose()
    } catch (err) {
      console.error('Send failed', err)
    }
  }

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50 bg-[#404040] text-white rounded-t-xl shadow-2xl w-72">
        <div className="flex items-center justify-between px-4 py-2 cursor-pointer" onClick={() => setMinimized(false)}>
          <span className="text-sm font-medium truncate">{subject || 'New Message'}</span>
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); setMinimized(false) }} className="p-1 rounded hover:bg-white/20">
              <Maximize2 size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose() }} className="p-1 rounded hover:bg-white/20">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />
      <div className="fixed z-50 bg-white shadow-2xl flex flex-col bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh] md:bottom-4 md:right-6 md:left-auto md:rounded-xl md:w-[520px] md:max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#404040] text-white px-4 py-3 rounded-t-2xl md:rounded-t-xl flex-shrink-0">
          <span className="text-sm font-medium">{inReplyTo ? 'Reply' : 'New Message'}</span>
          <div className="flex gap-1">
            <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-white/20">
              <Minimize2 size={14} />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/20">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* From selector (only if multiple accounts) */}
        {accounts.length > 1 && (
          <div className="border-b border-gray-200 px-4 flex items-center gap-2">
            <span className="text-xs text-gray-400 flex-shrink-0">From</span>
            <div className="relative flex-1">
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full py-3 text-sm outline-none bg-transparent appearance-none pr-6 cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.user.email} value={acc.user.email}>
                    {acc.user.name} &lt;{acc.user.email}&gt;
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-gray-200 px-4">
            <input
              type="email"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full py-3 text-sm outline-none placeholder-gray-400"
            />
          </div>
          <div className="border-b border-gray-200 px-4">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full py-3 text-sm outline-none placeholder-gray-400"
            />
          </div>
          <textarea
            placeholder="Compose email"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1 px-4 py-3 text-sm outline-none resize-none placeholder-gray-400 min-h-32"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={sendEmail.isPending || !to.trim() || !body.trim()}
            className="flex items-center gap-2 bg-g-blue text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={15} />
            {sendEmail.isPending ? 'Sending…' : 'Send'}
          </button>
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Discard"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {sendEmail.isError && (
          <p className="px-4 pb-3 text-xs text-red-600">Failed to send. Please try again.</p>
        )}
      </div>
    </>
  )
}
