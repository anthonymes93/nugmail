import { useAuth } from '../contexts/AuthContext'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { Mail, Plus } from 'lucide-react'

export default function LoginPage() {
  const { accounts } = useAuth()
  const { login } = useGoogleAuth()
  const isAddingAccount = accounts.length > 0

  return (
    <div className="min-h-screen bg-g-bg flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-g-blue rounded-full flex items-center justify-center">
            <Mail size={24} className="text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-800">Nugmail</span>
        </div>

        {isAddingAccount ? (
          <p className="text-gray-500 text-sm text-center leading-relaxed">
            Add another Google account to your unified inbox.
          </p>
        ) : (
          <p className="text-gray-500 text-sm text-center leading-relaxed">
            Sign in with your Google account to access your Gmail inbox.
          </p>
        )}

        <button
          onClick={() => login()}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-5 py-3 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          {isAddingAccount ? <Plus size={18} /> : <GoogleIcon />}
          {isAddingAccount ? 'Add another account' : 'Sign in with Google'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          We only request access to your Gmail data.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.41-4.47-3.29H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.83A8 8 0 0 0 .98 9c0 1.29.31 2.51.85 3.59l2.68-2.07z"/>
      <path fill="#EA4335" d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.15 4.41l2.68 2.07c.63-1.89 2.39-3.9 4.47-3.9z"/>
    </svg>
  )
}
