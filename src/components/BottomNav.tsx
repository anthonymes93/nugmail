import { useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Inbox, Star, Target, Flame, Mail, CheckCircle } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/starred', label: 'Starred', icon: Star },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/hott', label: 'Hott', icon: Flame },
]

interface BottomNavProps {
  onCompose: () => void
}

export default function BottomNav({ onCompose }: BottomNavProps) {
  const { pathname } = useLocation()
  const [toastMounted, setToastMounted] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNavClick = () => {
    document.getElementById('mail-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })

    // Reset any in-flight timer
    if (timerRef.current) clearTimeout(timerRef.current)

    setToastMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)))

    timerRef.current = setTimeout(() => {
      setToastVisible(false)
      timerRef.current = setTimeout(() => setToastMounted(false), 350)
    }, 2000)
  }

  return (
    <>
      <nav
        className="md:hidden flex items-center bg-white border-t border-gray-200 flex-shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={(e) => {
              if (pathname === to) {
                e.preventDefault()
                handleNavClick()
              }
            }}
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
      </nav>

      {/* Compose FAB — sits above the nav bar including safe area */}
      <button
        onClick={onCompose}
        className="md:hidden fixed right-4 w-14 h-14 bg-[#c2e7ff] rounded-2xl shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow active:scale-95 z-20"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Compose"
      >
        <Mail size={22} className="text-gray-800" />
      </button>

      {toastMounted && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white pointer-events-none"
          style={{ opacity: toastVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}
        >
          <CheckCircle size={72} className="text-green-400" strokeWidth={1.5} />
          <p className="text-3xl font-semibold text-gray-800 tracking-tight">You're Great!</p>
        </div>
      )}
    </>
  )
}
