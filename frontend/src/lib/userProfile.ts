import type { User } from '@supabase/supabase-js'

function stringMetadata(user: User | null, key: string): string {
  const value = user?.user_metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function getUserDisplayName(user: User | null): string {
  return (
    stringMetadata(user, 'full_name') ||
    stringMetadata(user, 'name') ||
    user?.email?.split('@')[0] ||
    'Creator'
  )
}

export function getUserAvatarUrl(user: User | null): string {
  return stringMetadata(user, 'avatar_url') || stringMetadata(user, 'picture')
}

export function getUserInitials(user: User | null): string {
  const displayName = getUserDisplayName(user)
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return (initials || user?.email?.[0] || 'C').toUpperCase()
}

export function formatCreatorUsername(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}
