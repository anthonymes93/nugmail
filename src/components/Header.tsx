import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, ArrowLeft, X, Plus, LogOut, UserMinus, Bell, BellOff, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { getAvatarColor, getInitials } from '../utils/formatters'
import { usePushNotifications } from '../hooks/usePushNotifications'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { accounts, removeAccount, clearAll } = useAuth()
  const { login } = useGoogleAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { enabled: notifEnabled, sound: notifSound, permission: notifPermission, isSupported: notifSupported, enable: enableNotif, disable: disableNotif, toggleSound } = usePushNotifications()

  const isEmailDetail = location.pathname.startsWith('/email/')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue.trim())}`)
      setSearchOpen(false)
      setSearchValue('')
    }
  }

  if (searchOpen) {
    return (
      <header className="flex items-center gap-2 px-2 py-2 bg-g-bg border-b border-gray-200 h-14">
        <button onClick={() => setSearchOpen(false)} className="p-2 rounded-full hover:bg-white">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <input
            autoFocus
            type="search"
            placeholder="Search mail"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-transparent outline-none text-gray-800 text-base placeholder-gray-400"
          />
        </form>
        {searchValue && (
          <button onClick={() => setSearchValue('')} className="p-2 rounded-full hover:bg-white">
            <X size={18} className="text-gray-500" />
          </button>
        )}
      </header>
    )
  }

  return (
    <header className="flex items-center gap-2 px-2 py-2 bg-g-bg border-b border-gray-200 h-14 relative">
      {isEmailDetail ? (
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white md:hidden">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
      ) : (
        <button onClick={onMenuClick} className="p-2 rounded-full hover:bg-white md:hidden">
          <Menu size={20} className="text-gray-600" />
        </button>
      )}

      <div className="flex-1 mx-1">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <span className="text-gray-500 text-sm">Search in mail</span>
        </button>
      </div>

      {/* Account avatars stack */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center"
          aria-label="Accounts"
        >
          {accounts.length <= 1 ? (
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-g-blue transition-all">
              {accounts[0] ? (
                accounts[0].user.picture ? (
                  <img src={accounts[0].user.picture} alt={accounts[0].user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(accounts[0].user.email)}`}>
                    {getInitials(accounts[0].user.name)}
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-gray-300" />
              )}
            </div>
          ) : (
            <div className="flex -space-x-2">
              {accounts.slice(0, 3).map((acc, i) => (
                <div key={acc.user.email} className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white" style={{ zIndex: accounts.length - i }}>
                  {acc.user.picture ? (
                    <img src={acc.user.picture} alt={acc.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(acc.user.email)}`}>
                      {getInitials(acc.user.name)}
                    </div>
                  )}
                </div>
              ))}
              {accounts.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-400 ring-2 ring-white flex items-center justify-center text-white text-xs font-medium">
                  +{accounts.length - 3}
                </div>
              )}
            </div>
          )}
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-64">
              {/* Account list */}
              {accounts.map((acc) => (
                <div key={acc.user.email} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {acc.user.picture ? (
                      <img src={acc.user.picture} alt={acc.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(acc.user.email)}`}>
                        {getInitials(acc.user.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{acc.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{acc.user.email}</p>
                  </div>
                  <button
                    onClick={() => { removeAccount(acc.user.email); setMenuOpen(false) }}
                    className="p-1 rounded-full hover:bg-gray-200 flex-shrink-0"
                    aria-label="Remove account"
                  >
                    <UserMinus size={15} className="text-gray-400" />
                  </button>
                </div>
              ))}

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => { setMenuOpen(false); login() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={16} className="text-gray-500" />
                  Add another account
                </button>
                <button
                  onClick={() => { clearAll(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign out all accounts
                </button>
              </div>

              {notifSupported && (
                <div className="border-t border-gray-100 mt-1 pt-1">
                  {notifPermission === 'denied' ? (
                    <p className="px-4 py-2.5 text-xs text-red-500">
                      Notifications blocked — enable in iOS Settings
                    </p>
                  ) : (
                    <button
                      onClick={async () => {
                        if (notifEnabled) await disableNotif()
                        else await enableNotif()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {notifEnabled
                        ? <BellOff size={16} className="text-gray-500" />
                        : <Bell size={16} className="text-gray-500" />}
                      {notifEnabled ? 'Disable notifications' : 'Enable notifications'}
                    </button>
                  )}
                  {notifEnabled && (
                    <button
                      onClick={() => toggleSound(!notifSound)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {notifSound
                        ? <Volume2 size={16} className="text-gray-500" />
                        : <VolumeX size={16} className="text-gray-500" />}
                      Sound {notifSound ? 'on' : 'off'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
