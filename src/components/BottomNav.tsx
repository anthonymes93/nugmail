import { NavLink } from 'react-router-dom'
import { Inbox, Star, Send, FileText, Mail } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/starred', label: 'Starred', icon: Star },
  { to: '/sent', label: 'Sent', icon: Send },
  { to: '/drafts', label: 'Drafts', icon: FileText },
]

interface BottomNavProps {
  onCompose: () => void
}

export default function BottomNav({ onCompose }: BottomNavProps) {
  return (
    <nav className="md:hidden flex items-center bg-white border-t border-gray-200 pb-safe">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? 'text-g-blue' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`rounded-full px-3 py-1 ${isActive ? 'bg-g-selected' : ''}`}>
                <Icon size={20} />
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Compose FAB */}
      <button
        onClick={onCompose}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#c2e7ff] rounded-2xl shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow active:scale-95"
        aria-label="Compose"
      >
        <Mail size={22} className="text-gray-800" />
      </button>
    </nav>
  )
}
