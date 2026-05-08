import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { SaveStatus } from '../types'
import {
  formatCreatorUsername,
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from '../lib/userProfile'

interface TopBarProps {
  title: string
  onTitleChange: (next: string) => void
  saveStatus: SaveStatus
  user: User | null
  creatorUsername: string
  onOpenSettings: () => void
}

export function TopBar({
  title,
  onTitleChange,
  saveStatus,
  user,
  creatorUsername,
  onOpenSettings,
}: TopBarProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const displayName = getUserDisplayName(user)
  const avatarUrl = getUserAvatarUrl(user)

  const commit = () => {
    const next = draft.trim() || 'Untitled script'
    onTitleChange(next)
    setDraft(next)
    setEditing(false)
  }

  return (
    <header className="topbar">
      <div className="topbar-left" />

      <div className="topbar-center">
        {editing ? (
          <input
            className="title-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            className="title-button"
            onClick={() => {
              setDraft(title)
              setEditing(true)
            }}
          >
            {title}
          </button>
        )}
        <span className={`save-status save-${saveStatus}`}>
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed'}
          {saveStatus === 'idle' && ' '}
        </span>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" aria-label="Settings" onClick={onOpenSettings}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          className="topbar-profile"
          onClick={onOpenSettings}
          aria-label={`Signed in as ${displayName}`}
        >
          <span className="topbar-profile-copy">
            <span>{displayName}</span>
            <span>{formatCreatorUsername(creatorUsername)}</span>
          </span>
          {avatarUrl ? (
            <img className="avatar" src={avatarUrl} alt="" />
          ) : (
            <span className="avatar" aria-hidden="true">
              {getUserInitials(user)}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
