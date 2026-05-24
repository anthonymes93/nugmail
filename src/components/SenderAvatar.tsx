import { useState } from 'react'
import { getInitials, getAvatarColor } from '../utils/formatters'

interface SenderAvatarProps {
  email: string
  name: string
  size?: number
  className?: string
}

export default function SenderAvatar({ email, name, size = 36, className = '' }: SenderAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const domain = email.split('@')[1] ?? ''
  const color = getAvatarColor(email)
  const initials = getInitials(name)
  const fontSize = size <= 28 ? '9px' : size <= 36 ? '13px' : '15px'

  if (domain && !imgFailed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-contain bg-white flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${color} ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initials}
    </div>
  )
}
