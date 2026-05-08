import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  getUserAvatarUrl,
  getUserDisplayName,
  getUserInitials,
} from '../lib/userProfile'
import { EXPLORE_CATEGORIES } from '../lib/exploreCategories'

interface CreatorUsernameStepProps {
  user: User | null
  onSave: (creatorUsername: string, categoryId: number) => void
  onSignOut: () => void
}

export function CreatorUsernameStep({
  user,
  onSave,
  onSignOut,
}: CreatorUsernameStepProps) {
  const [creatorUsername, setCreatorUsername] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')
  const displayName = getUserDisplayName(user)
  const avatarUrl = getUserAvatarUrl(user)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextUsername = creatorUsername.trim().replace(/^@+/, '')

    if (!nextUsername) {
      setError('Creator username is required.')
      return
    }

    if (!categoryId) {
      setError('Choose the content category that is most similar to you.')
      return
    }

    onSave(nextUsername, Number(categoryId))
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-dot" />
          <span>ScriptStream</span>
        </div>

        <div className="auth-user-card">
          {avatarUrl ? (
            <img className="profile-avatar" src={avatarUrl} alt="" />
          ) : (
            <div className="profile-avatar" aria-hidden="true">
              {getUserInitials(user)}
            </div>
          )}
          <div className="auth-user-copy">
            <span className="auth-user-name">{displayName}</span>
            <span className="auth-user-email">{user?.email}</span>
          </div>
        </div>

        <h1 className="auth-heading">Finish signing in</h1>
        <p className="auth-sub">
          Add your creator profile details so ScriptStream can personalize your
          AI context, media uploads, and Explore feed.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Creator Username
            <input
              type="text"
              className="auth-input"
              value={creatorUsername}
              onChange={(e) => {
                setCreatorUsername(e.target.value)
                setError('')
              }}
              placeholder="your-username"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="auth-label">
            Content most similar to you
            <select
              className="auth-input"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setError('')
              }}
            >
              <option value="">Select a category</option>
              {EXPLORE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit">
            Continue
          </button>
        </form>

        <button type="button" className="auth-secondary-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
