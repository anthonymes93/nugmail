import { NavLink } from 'react-router-dom'
import {
  Inbox, Star, Send, FileText, AlertCircle, Trash2, Pencil, ChevronDown, X
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onCompose: () => void
}

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/starred', label: 'Starred', icon: Star },
  { to: '/sent', label: 'Sent', icon: Send },
  { to: '/drafts', label: 'Drafts', icon: FileText },
  { to: '/spam', label: 'Spam', icon: AlertCircle },
  { to: '/trash', label: 'Trash', icon: Trash2 },
]

export default function Sidebar({ open, onClose, onCompose }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-g-bg z-40 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:flex md:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 h-14 md:hidden">
          <span className="text-xl font-semibold text-gray-700">Nugmail</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Logo (desktop) */}
        <div className="hidden md:flex items-center gap-2 px-4 h-14">
          <span className="text-xl font-semibold text-gray-700">Nugmail</span>
        </div>

        {/* Compose button */}
        <div className="px-3 mb-2">
          <button
            onClick={() => { onCompose(); onClose() }}
            className="flex items-center gap-3 bg-[#c2e7ff] hover:bg-[#a8d5f5] text-gray-800 font-medium rounded-2xl px-5 py-4 w-full transition-colors"
          >
            <Pencil size={20} />
            Compose
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-g-selected text-gray-900 font-semibold'
                    : 'text-gray-700 hover:bg-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          <div className="mt-1">
            <button className="flex items-center gap-4 px-4 py-2 w-full rounded-full text-sm text-gray-700 hover:bg-white">
              <ChevronDown size={18} />
              More
            </button>
          </div>
        </nav>
      </aside>
    </>
  )
}
