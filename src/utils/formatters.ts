export function formatEmailDate(internalDate: number): string {
  const date = new Date(internalDate)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  const isThisYear = date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatFullDate(internalDate: number): string {
  return new Date(internalDate).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function getAvatarColor(email: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-600', 'bg-green-600', 'bg-teal-600', 'bg-cyan-600',
    'bg-sky-600', 'bg-blue-600', 'bg-indigo-600', 'bg-violet-600',
    'bg-purple-600', 'bg-fuchsia-600', 'bg-pink-600', 'bg-rose-600',
  ]
  let hash = 0
  for (const char of email) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return colors[Math.abs(hash) % colors.length]
}
